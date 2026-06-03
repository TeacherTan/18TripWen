# NFC Token 录入与管理 — 设计文档

日期：2026-06-03
分支：dev-v0.3

## 背景

活动即将给 NFC 卡录入 token。当前实现存在三处缺口：

1. **参与者卡批量生成缺失** —— `users.nfc_token` 自动生成，但只能通过 `POST /api/admin/users` 一张张创建，没有批量生成 300 张卡的脚本，也没有本地备份。
2. **录入误触无法快速恢复** —— 录入过程中误触刷卡会写入登录/注册信息，后台只能逐行 `regen-token`，无法批量「清空注册信息」或「重置为新卡」，且没有多选。
3. **打卡点 token 无导出清单** —— 19 个打卡点 token 已在 `seed-spots.js` 中固定（4 venue + 10 npc + 5 extra），但没有可供写卡核对的导出清单。

本设计补齐这三处。

## 目标与非目标

**目标**

- 批量生成 300 张参与者卡 token，并在本地（非 git）留存 CSV 备份。
- 备份可「恢复重灌」：`db:reset` 或重装服务器后能还原同一批 token。
- 后台支持多选 + 两类批量操作：「仅清空注册信息」与「完全重置为新卡」，均带二次确认弹窗。
- 导出 19 个打卡点 token 清单到本地，便于写卡核对。

**非目标**

- 不改动 `seed-spots.js` 既有的 19 个固定 token 生成逻辑。
- 不把 300 张卡纳入 `db:reset`（避免每次重置重新生成、丢失批次）。
- 不实现写卡硬件交互（写卡由外部 NFC 工具完成，本项目只产出 token / URL 清单）。

## Part A — 参与者卡批量生成与本地备份

### 新脚本 `server/scripts/generate-cards.js`

两种模式：

- **Generate**

  ```
  node server/scripts/generate-cards.js --count 300 --base-url https://tyzhome.xyz --out local/nfc-cards.csv
  ```

  - 生成 `count` 个随机 UUID token（默认 `gen_random_uuid()` 由 DB 生成，确保唯一）。
  - 为每个 token 插入一行空白用户：`role='user'`、`is_registered=false`、其余字段为空。
  - 写出 CSV 备份到 `--out`（默认 `local/nfc-cards.csv`）。

- **Import / Restore**

  ```
  node server/scripts/generate-cards.js --import local/nfc-cards.csv
  ```

  - 读取 CSV 的 `nfc_token` 列，逐行插入空白用户。
  - SQL 使用 `INSERT ... ON CONFLICT (nfc_token) DO NOTHING`，幂等；`db:reset` 或新服务器后可还原同一批 token。

### CSV 格式

列：`index,nfc_token,login_url`

```
index,nfc_token,login_url
1,3f2a...,https://tyzhome.xyz/?nfc=3f2a...
2,9c81...,https://tyzhome.xyz/?nfc=9c81...
```

`login_url = <base-url>/?nfc=<nfc_token>`。`--base-url` 默认 `https://tyzhome.xyz`。

### 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--count <n>` | `300` | 生成数量（仅 generate 模式） |
| `--base-url <url>` | `https://tyzhome.xyz` | 拼接 `login_url` 的站点根 |
| `--out <path>` | `local/nfc-cards.csv` | CSV 输出路径（generate 模式） |
| `--import <path>` | —— | 切换为 import 模式，从 CSV 还原 |

`--count` 与 `--import` 互斥；同时给出时报错退出。

### 本地备份目录

- 新增 `local/` 目录，加入 `.gitignore`。
- 这是脱离服务器的持久备份；备份文件永不进 git。

### npm 脚本

```json
"cards:generate": "node server/scripts/generate-cards.js",
"cards:import": "node server/scripts/generate-cards.js --import"
```

`cards:import` 需追加 CSV 路径，例如 `npm run cards:import -- local/nfc-cards.csv`。

## Part B — 打卡点 token 导出（19 个）

`seed-spots.js` 中 19 个 token 保持现状，不改。

### 新脚本 `server/scripts/export-spot-tokens.js`

```
node server/scripts/export-spot-tokens.js --base-url https://tyzhome.xyz --out local/spot-tokens.csv
```

- 从 DB 读取全部 `check_in_spots`（按 `display_order` 升序）。
- 写出 CSV 到 `local/spot-tokens.csv`。

CSV 列：`display_order,type,name,spot_token,spot_url`

```
display_order,type,name,spot_token,spot_url
1,venue,朝班,a0000000-0000-0000-0000-000000000001,https://tyzhome.xyz/?spot=a0000000-0000-0000-0000-000000000001
```

`spot_url = <base-url>/?spot=<spot_token>`。

npm 脚本：

```json
"cards:export-spots": "node server/scripts/export-spot-tokens.js"
```

## Part C — 后台批量清空 / 重置（含二次确认）

### 后端 `server/routes/admin.js`

新增两个批量端点。两者都**保留 `nfc_token`**（卡片已物理写入，只清数据），都**跳过 admin 用户与已停用行**，均在事务中执行，返回受影响数量。

- `POST /api/admin/users/clear-registration`

  ```
  body: { ids: string[] }
  ```

  - `UPDATE users SET username = NULL, password_hash = NULL, city = NULL, is_registered = false`
    `WHERE id = ANY($ids) AND role <> 'admin' AND deactivated_at IS NULL`
  - **保留** check_ins。
  - 返回 `{ affected: <n> }`。

- `POST /api/admin/users/reset-card`

  ```
  body: { ids: string[] }
  ```

  - 事务内先 `DELETE FROM check_ins WHERE user_id = ANY($ids)`，再执行与上面相同的 `UPDATE` 清空注册信息。
  - 恢复成出厂空白卡。
  - 返回 `{ affected: <n>, deleted_check_ins: <n> }`。

**校验**

- `ids` 缺失或非数组 → `400`。
- `ids` 为空数组 → `400`。
- 过滤后 `affected` 可能为 0（全是 admin / 已停用），照常返回 `200` 与 `affected: 0`。

### 前端 `src/pages/admin/AdminUsers.jsx`

**多选**

- 新增勾选列：表头一个「全选」复选框，每行一个复选框。
- 用 `Set<userId>` 维护选中态；搜索 / 刷新后清空选中。
- 仅可勾选未停用、非 admin 的行（admin 行复选框禁用）。

**批量操作栏**

- 当选中 ≥ 1 行时，工具栏区域出现操作栏，显示「已选 N 项」及两个按钮：
  - 「仅清空注册信息」→ 调 `clear-registration`
  - 「完全重置为新卡」→ 调 `reset-card`

**二次确认弹窗（颜色互换）**

- 复用现有 `.admin-modal` 结构，新增一个 `ConfirmModal` 组件。
- 弹窗文案说明将影响的卡数量与操作含义。
- **颜色互换**：为避免肌肉记忆误点，安全的「取消」按钮用醒目的主色（primary），危险的「确认」按钮用低调的次级样式（secondary/muted）。用户必须刻意去点那个不显眼的按钮才能继续。
- 通过新增 CSS class（如 `.confirm-swap` 修饰 `.actions` 内按钮）实现，写入 `src/styles/admin.css`。

**调用后**

- 成功后 `alert` 受影响数量，清空选中，`load()` 刷新列表。

### 前端 API 调用

沿用 `apiFetch(path, { method: 'POST', body })`，无需改动 `client.js`。

## 数据流

```
[generate-cards.js] --count 300 --> DB (300 blank users) + local/nfc-cards.csv
                                          |
                          (db:reset / 新服务器，DB 清空)
                                          |
[generate-cards.js] --import local/nfc-cards.csv --> DB 还原同一批 token (idempotent)

[seed-spots.js] (既有) --> 19 fixed spot tokens in DB
[export-spot-tokens.js] --> local/spot-tokens.csv  (写卡核对清单)

[Admin UI] 多选行 --> clear-registration / reset-card --> DB 清空注册信息(/删除打卡)，保留 token
```

## 错误处理

- 脚本：DB 连接失败、CSV 读写失败 → 打印错误、`pool.end()`、`process.exit(1)`。
- import 模式 CSV 缺 `nfc_token` 列或无有效 UUID → 报错退出，不做部分写入以外的破坏（`ON CONFLICT DO NOTHING` 保证幂等）。
- 后端端点：入参校验返回 `400`；DB 异常走既有 `next(err)` 错误中间件。

## 测试策略

- **脚本**：在本地 DB 上跑 `generate-cards.js --count 5`，核对 DB 行数与 CSV 内容一致；`db:reset` 后 `--import` 还原，核对 token 一致且无重复插入。`export-spot-tokens.js` 输出 19 行。
- **后端**：用 `server/api.http` 增加请求，覆盖 `clear-registration` / `reset-card` 的成功、空数组 400、admin 行被跳过、reset 删除 check_ins 等场景。
- **前端**：手动验证多选、全选、两类二次确认弹窗（含颜色互换）、操作后刷新。
- 更新 `docs/testing.md` 增补对应用例。

## 受影响文件清单

| 文件 | 改动 |
|------|------|
| `server/scripts/generate-cards.js` | 新增 |
| `server/scripts/export-spot-tokens.js` | 新增 |
| `server/routes/admin.js` | 新增两个批量端点 |
| `src/pages/admin/AdminUsers.jsx` | 多选 + 批量操作栏 + 二次确认弹窗 |
| `src/styles/admin.css` | 颜色互换确认弹窗样式、操作栏样式 |
| `.gitignore` | 新增 `local/` |
| `package.json` | 新增 `cards:generate` / `cards:import` / `cards:export-spots` |
| `server/api.http` | 新增联调请求 |
| `docs/testing.md` | 增补测试用例 |
