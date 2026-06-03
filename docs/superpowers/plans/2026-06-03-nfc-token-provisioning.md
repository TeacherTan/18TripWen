# NFC Token 录入与管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 NFC token 录入所需的批量生成 + 本地备份脚本、打卡点 token 导出脚本，以及后台多选批量「清空注册信息 / 重置为新卡」功能（含颜色互换二次确认）。

**Architecture:** 两个独立的 Node 脚本（`generate-cards.js`、`export-spot-tokens.js`）直连现有 `pool`，产出 gitignored 的 `local/*.csv` 备份；后台新增两个幂等的批量端点（保留 token），前端 `AdminUsers.jsx` 加多选与二次确认弹窗。

**Tech Stack:** Node 18+ (ESM, `node:crypto`/`node:fs`), Express 4, PostgreSQL 16 (`pg`), React 19。

**测试约定：** 本项目无自动化测试框架。验证方式沿用既有约定——脚本对本地 DB 真实运行 + `psql` 核对、`server/api.http` / `curl` 联调、前端手动核对。每个 Task 的「验证」步骤都给出可直接执行的命令与预期输出。

**前置：** 实现前先确保本地 DB 可用：`npm run db:reset`（会打印 admin nfc_token，后续 api.http 联调需要）。

---

### Task 1: 脚手架（local 目录、.gitignore、npm 脚本）

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: 把 `local/` 加入 `.gitignore`**

在 `.gitignore` 末尾「Server / Backend」段落后追加：

```gitignore

# 本地 token 备份（永不进 git）
local/
```

- [ ] **Step 2: 在 `package.json` 的 `scripts` 中新增三条脚本**

在 `"db:seed"` 那一行之后追加：

```json
    "cards:generate": "node server/scripts/generate-cards.js",
    "cards:import": "node server/scripts/generate-cards.js --import",
    "cards:export-spots": "node server/scripts/export-spot-tokens.js"
```

注意：上一行 `"db:seed": "..."` 结尾要补英文逗号。

- [ ] **Step 3: 验证 JSON 合法**

Run: `node -e "require('./package.json'); console.log('package.json OK')"`
Expected: 打印 `package.json OK`，无报错。

- [ ] **Step 4: 验证 gitignore 生效**

Run: `mkdir -p local && touch local/probe.csv && git check-ignore local/probe.csv`
Expected: 输出 `local/probe.csv`（表示已被忽略）。随后 `rm local/probe.csv`。

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json
git commit -S -m "chore(cards): add local backup dir to gitignore + npm scripts"
```

---

### Task 2: `generate-cards.js` — 生成模式

**Files:**
- Create: `server/scripts/generate-cards.js`

参数解析需同时支持本 Task（generate）与 Task 3（import）。本 Task 一次性写出完整文件，Task 3 不再改文件、只验证 import 分支。

- [ ] **Step 1: 创建 `server/scripts/generate-cards.js`**

```js
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pool } from '../db/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { count: 300, baseUrl: 'https://18trip.tyzhome.xyz', outPath: 'local/nfc-cards.csv', importPath: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count') out.count = parseInt(args[++i], 10);
    else if (args[i] === '--base-url') out.baseUrl = args[++i];
    else if (args[i] === '--out') out.outPath = args[++i];
    else if (args[i] === '--import') out.importPath = args[++i];
  }
  return out;
}

// 在事务内逐行插入；ON CONFLICT 保证幂等。返回真正插入的行数。
async function insertTokens(tokens) {
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (const t of tokens) {
      const { rowCount } = await client.query(
        `INSERT INTO users (nfc_token, role, is_registered)
         VALUES ($1, 'user', false)
         ON CONFLICT (nfc_token) DO NOTHING`,
        [t],
      );
      inserted += rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return inserted;
}

function writeCsv(outPath, tokens, baseUrl) {
  mkdirSync(dirname(outPath), { recursive: true });
  const lines = ['index,nfc_token,login_url'];
  tokens.forEach((t, i) => lines.push(`${i + 1},${t},${baseUrl}/?nfc=${t}`));
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
}

function readTokensFromCsv(importPath) {
  const raw = readFileSync(importPath, 'utf8');
  const rows = raw.split(/\r?\n/).filter(Boolean);
  const tokens = [];
  for (let i = 1; i < rows.length; i++) { // 跳过表头
    const token = rows[i].split(',')[1]?.trim();
    if (token && UUID_RE.test(token)) tokens.push(token);
  }
  return tokens;
}

async function main() {
  const opts = parseArgs();

  if (opts.importPath) {
    const tokens = readTokensFromCsv(opts.importPath);
    if (tokens.length === 0) throw new Error(`no valid nfc_token found in ${opts.importPath}`);
    const inserted = await insertTokens(tokens);
    console.log(`[generate-cards] import: ${tokens.length} 个 token 读取，${inserted} 个新插入，${tokens.length - inserted} 个已存在跳过`);
    await pool.end();
    return;
  }

  if (!Number.isInteger(opts.count) || opts.count <= 0) {
    throw new Error(`--count must be a positive integer, got: ${opts.count}`);
  }
  const tokens = Array.from({ length: opts.count }, () => randomUUID());
  const inserted = await insertTokens(tokens);
  writeCsv(opts.outPath, tokens, opts.baseUrl);
  console.log(`[generate-cards] generate: ${opts.count} 张卡已创建（${inserted} 新插入），CSV 写入 ${opts.outPath}`);
  console.log(`[generate-cards] base-url: ${opts.baseUrl}`);
  await pool.end();
}

main().catch((err) => {
  console.error('[generate-cards] failed:', err.message);
  pool.end();
  process.exit(1);
});
```

- [ ] **Step 2: 生成模式冒烟测试（5 张）**

Run: `node server/scripts/generate-cards.js --count 5 --out local/smoke-cards.csv`
Expected: 打印 `generate: 5 张卡已创建（5 新插入），CSV 写入 local/smoke-cards.csv`。

- [ ] **Step 3: 核对 CSV 内容与格式**

Run: `cat local/smoke-cards.csv`
Expected: 第一行 `index,nfc_token,login_url`；随后 5 行，每行形如 `1,<uuid>,https://18trip.tyzhome.xyz/?nfc=<uuid>`。

- [ ] **Step 4: 核对 DB 行数**

Run: `docker compose exec -T postgres psql -U 18trip -d 18trip -c "SELECT count(*) FROM users WHERE is_registered = false AND role = 'user';"`
Expected: count ≥ 5（包含这 5 张新空白卡）。

- [ ] **Step 5: 清理冒烟数据并提交**

```bash
# 删除冒烟插入的 5 张卡（用 CSV 里的 token）
docker compose exec -T postgres psql -U 18trip -d 18trip -c \
  "DELETE FROM users WHERE nfc_token IN ($(tail -n +2 local/smoke-cards.csv | cut -d',' -f2 | sed "s/.*/'&'/" | paste -sd, -));"
rm -f local/smoke-cards.csv
git add server/scripts/generate-cards.js
git commit -S -m "feat(cards): add generate-cards.js generate mode"
```

---

### Task 3: `generate-cards.js` — import / 恢复模式验证

**Files:**
- 无新增改动（import 分支已在 Task 2 写入）。本 Task 只验证恢复能力。

- [ ] **Step 1: 生成一批并保留 CSV**

Run: `node server/scripts/generate-cards.js --count 3 --out local/restore-test.csv`
Expected: 打印 `3 张卡已创建（3 新插入）`。

- [ ] **Step 2: 删除这 3 张卡，模拟 DB 丢失**

Run:
```bash
docker compose exec -T postgres psql -U 18trip -d 18trip -c \
  "DELETE FROM users WHERE nfc_token IN ($(tail -n +2 local/restore-test.csv | cut -d',' -f2 | sed "s/.*/'&'/" | paste -sd, -));"
```
Expected: `DELETE 3`。

- [ ] **Step 3: 从备份 CSV 恢复**

Run: `node server/scripts/generate-cards.js --import local/restore-test.csv`
Expected: 打印 `import: 3 个 token 读取，3 个新插入，0 个已存在跳过`。

- [ ] **Step 4: 验证幂等（再次 import 不重复插入）**

Run: `node server/scripts/generate-cards.js --import local/restore-test.csv`
Expected: 打印 `3 个 token 读取，0 个新插入，3 个已存在跳过`。

- [ ] **Step 5: 清理并提交**

```bash
docker compose exec -T postgres psql -U 18trip -d 18trip -c \
  "DELETE FROM users WHERE nfc_token IN ($(tail -n +2 local/restore-test.csv | cut -d',' -f2 | sed "s/.*/'&'/" | paste -sd, -));"
rm -f local/restore-test.csv
git commit -S --allow-empty -m "test(cards): verify generate-cards.js import/restore is idempotent"
```

---

### Task 4: `export-spot-tokens.js` — 打卡点导出

**Files:**
- Create: `server/scripts/export-spot-tokens.js`

- [ ] **Step 1: 创建 `server/scripts/export-spot-tokens.js`**

```js
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pool, query } from '../db/index.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseUrl: 'https://18trip.tyzhome.xyz', outPath: 'local/spot-tokens.csv' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base-url') out.baseUrl = args[++i];
    else if (args[i] === '--out') out.outPath = args[++i];
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const { rows } = await query(
    `SELECT display_order, type, name, spot_token
     FROM check_in_spots
     ORDER BY display_order ASC`,
  );

  mkdirSync(dirname(opts.outPath), { recursive: true });
  const lines = ['display_order,type,name,spot_token,spot_url'];
  for (const r of rows) {
    lines.push(`${r.display_order},${r.type},${r.name},${r.spot_token},${opts.baseUrl}/?spot=${r.spot_token}`);
  }
  writeFileSync(opts.outPath, lines.join('\n') + '\n', 'utf8');

  console.log(`[export-spot-tokens] 导出 ${rows.length} 个打卡点到 ${opts.outPath}`);
  await pool.end();
}

main().catch((err) => {
  console.error('[export-spot-tokens] failed:', err.message);
  pool.end();
  process.exit(1);
});
```

- [ ] **Step 2: 运行导出**

Run: `node server/scripts/export-spot-tokens.js`
Expected: 打印 `导出 19 个打卡点到 local/spot-tokens.csv`（若 `db:reset` 已灌 seed）。

- [ ] **Step 3: 核对 CSV**

Run: `cat local/spot-tokens.csv`
Expected: 表头 `display_order,type,name,spot_token,spot_url`；19 行数据；venue 行的 token 形如 `a0000000-0000-0000-0000-000000000001`，url 形如 `https://18trip.tyzhome.xyz/?spot=<token>`。

- [ ] **Step 4: Commit**

```bash
rm -f local/spot-tokens.csv
git add server/scripts/export-spot-tokens.js
git commit -S -m "feat(cards): add export-spot-tokens.js for 19 checkpoint tokens"
```

---

### Task 5: 后端批量端点 `clear-registration` / `reset-card`

**Files:**
- Modify: `server/routes/admin.js`（在 `report-loss` 端点之后、`/users/transfer` 之前插入）

- [ ] **Step 1: 在 `server/routes/admin.js` 插入两个端点**

在第 128 行 `report-loss` 端点的 `});` 之后、`// POST /api/admin/users/transfer` 注释之前插入：

```js
// POST /api/admin/users/clear-registration — 批量仅清空注册信息（保留 token 与打卡）
router.post('/users/clear-registration', async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    const { rowCount } = await query(
      `UPDATE users
       SET username = NULL, password_hash = NULL, city = NULL, is_registered = false
       WHERE id = ANY($1::uuid[]) AND role <> 'admin' AND deactivated_at IS NULL`,
      [ids],
    );
    res.json({ affected: rowCount });
  } catch (err) { next(err); }
});

// POST /api/admin/users/reset-card — 批量重置为新卡（清注册信息 + 删打卡，保留 token）
router.post('/users/reset-card', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    await client.query('BEGIN');
    const eligible = await client.query(
      `SELECT id FROM users
       WHERE id = ANY($1::uuid[]) AND role <> 'admin' AND deactivated_at IS NULL`,
      [ids],
    );
    const eligibleIds = eligible.rows.map((r) => r.id);
    if (eligibleIds.length === 0) {
      await client.query('COMMIT');
      return res.json({ affected: 0, deleted_check_ins: 0 });
    }
    const del = await client.query(
      `DELETE FROM check_ins WHERE user_id = ANY($1::uuid[])`,
      [eligibleIds],
    );
    const upd = await client.query(
      `UPDATE users
       SET username = NULL, password_hash = NULL, city = NULL, is_registered = false
       WHERE id = ANY($1::uuid[])`,
      [eligibleIds],
    );
    await client.query('COMMIT');
    res.json({ affected: upd.rowCount, deleted_check_ins: del.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});
```

- [ ] **Step 2: 启动后端**

Run: `node server/index.js`（另开终端；或确认 `npm run dev` 已在跑）。
Expected: 监听 3000，无报错。

- [ ] **Step 3: 准备一张测试卡并联调 `clear-registration`**

先造一张已注册的卡（用现有补卡/注册流程或直接 SQL）。最简方式用 SQL 造一张并取 id：
```bash
docker compose exec -T postgres psql -U 18trip -d 18trip -c \
  "INSERT INTO users (username, password_hash, city, is_registered) VALUES ('clrtest','x','长沙',true) RETURNING id;"
```
取 admin JWT（用 seed 打印的 admin nfc_token 调 `/auth/nfc`），然后：
```bash
curl -s -X POST http://localhost:3000/api/admin/users/clear-registration \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" \
  -d '{"ids":["<CLRTEST_ID>"]}'
```
Expected: `{"affected":1}`。再查该行：username/city 应为 null，is_registered=false。

- [ ] **Step 4: 联调 `reset-card`（删打卡）**

给上面那张卡补一条打卡，再 reset：
```bash
curl -s -X POST http://localhost:3000/api/admin/users/reset-card \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" \
  -d '{"ids":["<CLRTEST_ID>"]}'
```
Expected: `{"affected":1,"deleted_check_ins":<n>}`，且 token 仍在（未变）。

- [ ] **Step 5: 联调入参校验与 admin 跳过**

```bash
# 空数组 → 400
curl -s -X POST http://localhost:3000/api/admin/users/clear-registration \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" -d '{"ids":[]}'
# admin 自己的 id → affected:0
curl -s -X POST http://localhost:3000/api/admin/users/reset-card \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" -d '{"ids":["<ADMIN_USER_ID>"]}'
```
Expected: 第一条 `{"error":"ids must be a non-empty array"}`（HTTP 400）；第二条 `{"affected":0,"deleted_check_ins":0}`。

- [ ] **Step 6: 清理测试卡并提交**

```bash
docker compose exec -T postgres psql -U 18trip -d 18trip -c \
  "DELETE FROM users WHERE username = 'clrtest' OR (username IS NULL AND city IS NULL AND id='<CLRTEST_ID>');"
git add server/routes/admin.js
git commit -S -m "feat(admin): add bulk clear-registration and reset-card endpoints"
```

---

### Task 6: 前端多选 + 批量操作栏

**Files:**
- Modify: `src/pages/admin/AdminUsers.jsx`

- [ ] **Step 1: 在 `AdminUsers` 组件加选中态，并在 `load()` 清空选中**

在第 10 行 `const [modal, setModal] = useState(null)` 之后新增：

```jsx
  const [selected, setSelected] = useState(() => new Set())
  const [confirm, setConfirm] = useState(null) // { action: 'clear' | 'reset', count }
```

在 `load` 的 `try` 内、`setUsers(data.users)` 之后新增一行：

```jsx
      setSelected(new Set())
```

- [ ] **Step 2: 新增选择与批量提交逻辑**

在 `onAction` 函数（第 48 行 `}` 结束）之后新增：

```jsx
  const isEligible = (u) => !u.deactivated_at && u.role !== 'admin'
  const eligibleUsers = users.filter(isEligible)
  const allSelected = eligibleUsers.length > 0 && eligibleUsers.every((u) => selected.has(u.id))

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(eligibleUsers.map((u) => u.id)))
  }

  const runBulk = async (action) => {
    const ids = [...selected]
    const path = action === 'reset' ? '/admin/users/reset-card' : '/admin/users/clear-registration'
    try {
      const res = await apiFetch(path, { method: 'POST', body: { ids } })
      const extra = res.deleted_check_ins != null ? `，删除打卡 ${res.deleted_check_ins} 条` : ''
      alert(`操作完成：影响 ${res.affected} 张卡${extra}`)
      setConfirm(null)
      load()
    } catch (err) {
      alert(`操作失败：${err.message}`)
    }
  }
```

- [ ] **Step 3: 在工具栏下方加批量操作栏**

在 `{error && ...}`（第 74 行）那一行**之前**插入：

```jsx
      {selected.size > 0 && (
        <div className="admin-bulkbar">
          <span>已选 {selected.size} 项</span>
          <button className="secondary" onClick={() => setConfirm({ action: 'clear', count: selected.size })}>仅清空注册信息</button>
          <button className="secondary" onClick={() => setConfirm({ action: 'reset', count: selected.size })}>完全重置为新卡</button>
          <button className="secondary" onClick={() => setSelected(new Set())}>取消选择</button>
        </div>
      )}
```

- [ ] **Step 4: 表格加勾选列（表头 + 每行）**

在 `<thead>` 的 `<tr>` 内、`<th>用户名</th>` 之前插入表头单元格：

```jsx
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="全选" />
              </th>
```

在 `<tbody>` 每行 `<tr ...>` 内、`<td>{u.username ...}</td>` 之前插入：

```jsx
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    disabled={!isEligible(u)}
                    onChange={() => toggleOne(u.id)}
                    aria-label="选择该卡"
                  />
                </td>
```

把「无数据」那行的 `colSpan={6}` 改为 `colSpan={7}`（多了一列）。

- [ ] **Step 5: 渲染确认弹窗**

在文件返回 JSX 末尾、`{modal?.type === 'transfer' && (...)}` 之后插入：

```jsx
      {confirm && (
        <ConfirmBulkModal
          action={confirm.action}
          count={confirm.count}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runBulk(confirm.action)}
        />
      )}
```

（`ConfirmBulkModal` 组件在 Task 7 定义；本步骤先引用，Task 7 前页面会因未定义而报错，属预期。）

- [ ] **Step 6: 提交（与 Task 7 一起验证）**

```bash
git add src/pages/admin/AdminUsers.jsx
git commit -S -m "feat(admin): multi-select + bulk action bar on users page"
```

---

### Task 7: 确认弹窗组件 + 颜色互换样式

**Files:**
- Modify: `src/pages/admin/AdminUsers.jsx`（文件末尾新增组件）
- Modify: `src/styles/admin.css`

- [ ] **Step 1: 在 `AdminUsers.jsx` 文件末尾新增 `ConfirmBulkModal` 组件**

在 `TransferModal` 函数之后追加：

```jsx
function ConfirmBulkModal({ action, count, onCancel, onConfirm }) {
  const isReset = action === 'reset'
  const title = isReset ? '完全重置为新卡' : '仅清空注册信息'
  const desc = isReset
    ? `将清空 ${count} 张卡的注册信息，并删除其全部打卡记录，恢复为出厂空白卡。卡片 token 保留不变。`
    : `将清空 ${count} 张卡的注册信息（用户名/密码/城市），打卡记录与卡片 token 均保留。`
  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <h2>{title}</h2>
        <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{desc}</p>
        <p style={{ fontSize: '0.85rem', color: '#f87171' }}>此操作不可撤销，请确认无误后再继续。</p>
        <div className="actions confirm-swap">
          <button type="button" className="confirm-danger" onClick={onConfirm}>确认{title}</button>
          <button type="button" className="cancel-primary" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在 `src/styles/admin.css` 末尾新增样式（批量栏 + 颜色互换）**

```css
/* 批量操作栏 */
.admin-bulkbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #cbd5e1;
}

.admin-bulkbar button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #0c1116;
  color: #cbd5e1;
  cursor: pointer;
}

/* 二次确认：颜色互换，防误触 —— 取消用醒目主色，确认用低调次级样式 */
.admin-modal .actions.confirm-swap {
  justify-content: space-between;
}

.admin-modal .actions.confirm-swap .cancel-primary {
  background: #4caf50;
  color: white;
  font-weight: 600;
}

.admin-modal .actions.confirm-swap .confirm-danger {
  background: transparent;
  color: #94a3b8;
  border: 1px solid #334155;
}
```

- [ ] **Step 3: 启动前端并打开用户管理页**

确保 `npm run dev` 在跑。用 admin 账号登录后台，访问 `/admin/users`。
Expected: 页面正常渲染，每行最左有复选框，表头有全选框。

- [ ] **Step 4: 验证多选与操作栏**

勾选 2 张未注册/普通卡。
Expected: 出现批量操作栏「已选 2 项」，含三个按钮；admin 行的复选框置灰不可选。

- [ ] **Step 5: 验证颜色互换确认弹窗**

点「完全重置为新卡」。
Expected: 弹窗出现；**取消**按钮为醒目绿色、**确认重置**为低调灰色描边；文案说明影响 2 张卡且会删打卡。点确认后 alert 影响数量、列表刷新、选中清空。

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/AdminUsers.jsx src/styles/admin.css
git commit -S -m "feat(admin): color-swapped confirm modal for bulk clear/reset"
```

---

### Task 8: 联调脚本与测试文档

**Files:**
- Modify: `server/api.http`
- Modify: `docs/testing.md`

- [ ] **Step 1: 在 `server/api.http` 末尾追加批量端点请求**

```
### ===== v0.3 token 批量管理 =====

### E. 批量仅清空注册信息（保留 token 与打卡）
POST {{baseUrl}}/admin/users/clear-registration
Authorization: Bearer {{adminJwt}}
Content-Type: application/json

{
  "ids": ["REPLACE_USER_ID_1", "REPLACE_USER_ID_2"]
}

### F. 批量完全重置为新卡（清注册 + 删打卡）
POST {{baseUrl}}/admin/users/reset-card
Authorization: Bearer {{adminJwt}}
Content-Type: application/json

{
  "ids": ["REPLACE_USER_ID_1"]
}
```

- [ ] **Step 2: 在 `docs/testing.md` 增补用例**

在合适章节追加（紧扣已实现行为）：

```markdown
## token 批量管理（v0.3）

- 批量「仅清空注册信息」：多选后调用 `/admin/users/clear-registration`，断言响应 `affected` 等于符合条件的卡数，username/city 置空、is_registered=false、check_ins 仍在、nfc_token 不变。
- 批量「完全重置为新卡」：调用 `/admin/users/reset-card`，断言 `affected` 与 `deleted_check_ins`，该卡 check_ins 清零、nfc_token 不变。
- admin 行与已停用行：勾选框禁用；即便伪造 id 传入，响应中这些行不计入 `affected`。
- 二次确认弹窗：取消键为绿色主色、确认键为灰色次级样式（防误触）。

## token 生成与备份（v0.3）

- `npm run cards:generate -- --count 300`：DB 新增 300 张空白卡，`local/nfc-cards.csv` 含 301 行（表头 + 300）。
- `npm run cards:import -- local/nfc-cards.csv`：DB 丢失后从备份还原同一批 token，二次执行为全部「已存在跳过」（幂等）。
- `npm run cards:export-spots`：导出 19 个打卡点到 `local/spot-tokens.csv`。
```

- [ ] **Step 3: 校验 markdown 无残留占位**

Run: `grep -n "REPLACE_USER_ID" server/api.http`
Expected: 仅匹配到 api.http 中刻意保留的占位（提示联调时替换），docs/testing.md 无此类占位。

- [ ] **Step 4: Commit**

```bash
git add server/api.http docs/testing.md
git commit -S -m "docs(cards): api.http requests + testing cases for token provisioning"
```

---

### Task 9: 正式生成 300 张卡（部署前一次性执行，可选在本地预演）

**Files:** 无代码改动；这是运行步骤，建议部署/活动前执行一次。

- [ ] **Step 1: 生成 300 张正式卡 + 备份**

Run: `npm run cards:generate -- --count 300`
Expected: `300 张卡已创建（300 新插入），CSV 写入 local/nfc-cards.csv`。

- [ ] **Step 2: 导出打卡点清单**

Run: `npm run cards:export-spots`
Expected: `导出 19 个打卡点到 local/spot-tokens.csv`。

- [ ] **Step 3: 离线备份两份 CSV**

把 `local/nfc-cards.csv` 与 `local/spot-tokens.csv` 复制到 git 仓库之外的安全位置（如个人加密盘）。这是脱离服务器的最终备份。
Expected: 两份 CSV 已在仓库外留存；`git status` 不显示它们（已被 `local/` 忽略）。

---

## 实现完成后

全部 Task 完成、本地验证通过后，使用 superpowers:finishing-a-development-branch 决定如何整合（当前在 `dev-v0.3` 分支）。
