# 18TRIP 测试手册

**版本：** v0.2 完成（Phase 1-3 + 成就列表 + 地图 + 场馆图）
**前置依赖：** Docker、Node 18+
**测试环境：** 本地开发（`localhost:5173` 前端 / `localhost:3000` 后端 / Docker Postgres 5432）

---

## 一、环境准备

```bash
# 1. 安装依赖（首次）
npm install

# 2. 拷贝环境变量
cp .env.example .env

# 3. 启动 Postgres + 初始化数据库 + 灌入 seed
npm run db:reset

# 4. 启动前后端（并行）
npm run dev
```

启动成功标志：
- 终端出现 `[server] listening on http://localhost:3000`
- 终端出现 `VITE v8 ready in xxx ms` + `Local: http://localhost:5173/`

`npm run db:reset` 会重建表并打印新的 **admin nfc_token**，请记下用于后续测试。

---

## 二、测试账号与 mock 数据

### 管理员
| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |
| 角色 | `admin` |
| nfc_token | 每次 `db:reset` 后从终端复制 |

### 全成就测试用户（自动解锁前端测试用）
| 字段 | 值 |
|------|-----|
| 用户名 | `testuser` |
| 密码 | `test123` |
| 角色 | `user`（非 admin） |
| 用途 | 由 `seed-testuser.js` 自动为其插入所有 active spot 的 check_in，登录后 Profile 页 18 个成就全部解锁 |

### 18 个 mock 打卡点（spot_token 固定，可直接拼接 URL 测试）

数据源：`server/scripts/seed-spots.js`。token 命名空间：
- `a0000000-...` → 4 个场地（朝/昼/夕/夜班），display_order 1-4
- `b0000000-...` → 10 个 NPC，display_order 5-14
- `c0000000-...` → 4 个其他成就，display_order 15-18

| # | 类型 | 名称 | spot_token |
|---|------|------|------------|
| 1 | venue | 朝班 | `a0000000-0000-0000-0000-000000000001` |
| 2 | venue | 昼班 | `a0000000-0000-0000-0000-000000000002` |
| 3 | venue | 夕班 | `a0000000-0000-0000-0000-000000000003` |
| 4 | venue | 夜班 | `a0000000-0000-0000-0000-000000000004` |
| 5 | npc | 大黑 可不可 | `b0000000-0000-0000-0000-000000000001` |
| 6 | npc | 西园 练牙 | `b0000000-0000-0000-0000-000000000002` |
| 7 | npc | 鹿 礼光 | `b0000000-0000-0000-0000-000000000003` |
| 8 | npc | 衣川 季肋 | `b0000000-0000-0000-0000-000000000004` |
| 9 | npc | 斜木七基 | `b0000000-0000-0000-0000-000000000005` |
| 10 | npc | 久乐间 潮 | `b0000000-0000-0000-0000-000000000006` |
| 11 | npc | 夏烧 千弥 | `b0000000-0000-0000-0000-000000000007` |
| 12 | npc | 木之内 太绪 | `b0000000-0000-0000-0000-000000000008` |
| 13 | npc | 白光 糖衣 | `b0000000-0000-0000-0000-000000000009` |
| 14 | npc | 白光 琉衣 | `b0000000-0000-0000-0000-00000000000a` |
| 15 | extra | 计划通（自动解锁） | `c0000000-0000-0000-0000-000000000001` |
| 16 | extra | 命运所指向 | `c0000000-0000-0000-0000-000000000002` |
| 17 | extra | 那位神秘的画家 | `c0000000-0000-0000-0000-000000000003` |
| 18 | extra | 我全都要 | `c0000000-0000-0000-0000-000000000004` |

> **计划通** 不需要 NFC 触发：每次成功打卡后服务端检查前 14 个 base 是否全解锁，达成则自动 INSERT。物理 NFC 卡只需要烧录其余 17 个 token。

---

## 三、关键测试 URL（浏览器直接打开）

将 `<NFC_TOKEN>` 替换为 db:reset 输出的 admin token 或后台新建用户的 nfc_token。

| 场景 | URL |
|------|-----|
| 首页 | `http://localhost:5173/` |
| NFC 登录（已注册） | `http://localhost:5173/?nfc=<ADMIN_NFC_TOKEN>` |
| NFC 登录（未注册→注册页） | `http://localhost:5173/?nfc=<NEW_USER_NFC_TOKEN>` |
| 密码登录 | `http://localhost:5173/login` |
| 欢迎页 | `http://localhost:5173/welcome` |
| 成就墙 | `http://localhost:5173/profile` |
| 打卡（朝班，venue 1） | `http://localhost:5173/?spot=a0000000-0000-0000-0000-000000000001` |
| testuser 全成就页 | 密码登录 `testuser` / `test123` 后 `http://localhost:5173/profile` |
| 管理后台 | `http://localhost:5173/admin` |

> 未登录访问 `/?spot=...` 会自动跳到 `/login?next=...`，登录后跳回打卡链路。

---

## 四、测试用例清单

### 4.1 认证（Phase 1）

| ID | 场景 | 预期 |
|----|------|------|
| AUTH-01 | 全新用户碰 NFC（未注册） | 跳 `/register`，表单有用户名/密码/城市三项 |
| AUTH-02 | 填写注册表单提交 | 跳 `/welcome`，标题显示「你好，{city}」 |
| AUTH-03 | 已注册用户碰 NFC | 直接跳 `/welcome` |
| AUTH-04 | 密码登录 | 跳 `/welcome` |
| AUTH-05 | 错误密码 | 提示「invalid credentials」 |
| AUTH-06 | 重复用户名注册 | 提示「username already taken」 |
| AUTH-07 | 刷新页面 | 自动从 localStorage 恢复会话（无需重新登录） |
| AUTH-08 | 退出登录 | 清除 JWT，跳回首页 |
| AUTH-09 | 无效 nfc token | 提示「invalid nfc token」 |
| AUTH-10 | Welcome 页用户无 city 字段 | 显示「欢迎来到 18TRIP」 |

### 4.2 打卡与成就墙（Phase 2）

| ID | 场景 | 预期 |
|----|------|------|
| CHK-01 | 已登录扫 spot_01 | 跳 `/checkin`，显示「打卡成功」+ 槽位脉冲动画 |
| CHK-02 | 再次扫同一 spot | 显示「你已在此打过卡」，进度不变 |
| CHK-03 | 未登录扫 spot | 跳 `/login?next=...`，登录后自动完成打卡 |
| CHK-04 | 无效 spot token | 提示「打卡失败：invalid or inactive spot」 |
| CHK-05 | 打满 14 个 base 点（4 venue + 10 npc） | Profile 进度显示「已集齐 15/18」，「计划通」自动解锁 |
| CHK-06 | Profile 未解锁槽位 | 显示黑色方块占位 |
| CHK-07 | Profile 已解锁槽位 | 显示渐变占位（设计师交付后替换为图纸） |
| CHK-08 | 已停用的 spot 扫码 | 提示「invalid or inactive spot」 |

### 4.3 后台管理（Phase 3）

| ID | 场景 | 预期 |
|----|------|------|
| ADM-01 | 普通用户访问 `/admin` | 跳回首页 |
| ADM-02 | admin 登录后访问 `/admin` | 进入 AdminLayout |
| ADM-03 | 用户管理列出现有用户 | 表格显示 username/city/role/nfc_token |
| ADM-04 | 新增空白用户 | 返回 nfc_token 给前台写卡 |
| ADM-05 | 重发 NFC（regen-token） | 旧 nfc_token 失效，新 token 显示在弹窗 |
| ADM-06 | 挂失 | 同 regen-token，且文案提示「旧卡已失效」 |
| ADM-07 | 停用用户 | 用户从默认列表消失，勾选「含已停用」可见 |
| ADM-08 | admin 停用自己 | 报错「cannot deactivate yourself」 |
| ADM-09 | 用户数据迁移 | source 的打卡迁到 target，source 被停用 |
| ADM-10 | 打卡点新增 | 列表立即出现新点位，spot_token 自动生成 |
| ADM-11 | 打卡点停用→重新启用 | 状态切换正常 |
| ADM-12 | 手动补卡 | 出现在打卡记录里 |
| ADM-13 | 重复补卡 | 提示 409 already checked in |
| ADM-14 | 打卡记录按用户/打卡点筛选 | 列表只剩匹配项 |

---

## 五、手动 API 调试

VS Code 安装 **REST Client** 扩展，打开 `server/api.http`，逐条「Send Request」即可。

接口 #2（NFC 登录）的 `jwt` 会被自动捕获，后续 #3-#23 均自动复用，**无需手动复制 token**。

仅需手动替换的占位符：
- `REPLACE_WITH_ADMIN_NFC_TOKEN` → db:reset 输出的 token
- `REPLACE_USER_ID` / `REPLACE_SPOT_ID` 等 → 从列表接口的返回里复制

---

## 六、移动端真机测试

1. 确认电脑与手机在同一 WiFi（Vite 已配 `host: 0.0.0.0`）
2. 电脑 IP 例：`192.168.x.x`，手机浏览器访问 `http://192.168.x.x:5173/`
3. NFC 写卡工具推荐 **NFC Tools**（iOS / Android 均有），芯片 **NTAG213**
4. 写入内容：
   - 身份卡 → `https://tyzhome.xyz/?nfc=<NFC_TOKEN>`
   - 打卡点 → `https://tyzhome.xyz/?spot=<SPOT_TOKEN>`
   - 本地真机测试时将域名替换为电脑 IP

### iOS 注意
- 浏览器路径优先：iOS 碰 NFC 默认打开 Safari，不会跳到已安装的 PWA。
- 设计层面已接受此限制（详见设计文档「开放问题 #8」）。

---

## 七、数据库直查

```bash
# 进入 Postgres
docker compose exec postgres psql -U 18trip -d 18trip

# 常用查询
\dt                                       -- 列出所有表
SELECT username, role, is_registered, nfc_token FROM users;
SELECT name, asset_key, display_order, active FROM check_in_spots ORDER BY display_order;
SELECT u.username, s.name, ci.checked_at FROM check_ins ci
  JOIN users u ON u.id = ci.user_id
  JOIN check_in_spots s ON s.id = ci.spot_id
  ORDER BY ci.checked_at DESC;
```

---

## 八、重置环境

```bash
npm run db:reset      # 重建表 + 重灌 seed（管理员 nfc_token 会变）
npm run db:down       # 停 Postgres 容器（数据保留在 volume）
docker compose down -v   # 彻底删容器和数据
```

---

## 九、当前已知待办（不阻塞测试）

| 项 | 说明 |
|----|------|
| 设计稿 | 成就墙 6 张图纸 + 黑色轮廓占位待设计师交付，已在 `AchievementSlot` 留资源接入点 |
| 头像上传 | adapter 已搭好（`server/storage/`），UI 与接口未实现，等设计稿 |
| iOS PWA NFC | 系统级限制，方案默认走浏览器路径 |
| 部署 | 域名 `tyzhome.xyz` 已确定，云服务器待开通后接 Nginx + Let's Encrypt |
