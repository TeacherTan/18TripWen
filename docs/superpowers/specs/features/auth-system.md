# 用户认证系统 — 已实现参考摘要

**状态：Phase 1 已完成**（commit `152a812`）

---

## 实现路径

1. Express 后端 + PostgreSQL 连接（`server/db/index.js`）
2. `schema.sql` 建三张表：`users / check_in_spots / check_ins`
3. 认证路由（`server/routes/auth.js`）：
   - `POST /api/auth/nfc` — 按 `nfc_token` 查用户 → 签发 JWT，`registered` 字段区分新老用户
   - `POST /api/auth/register` — Bearer JWT + `{username, password, city}` → 绑定账号
   - `POST /api/auth/login` — 用户名密码登录
   - `POST /api/auth/refresh` — 续期（剩余 < 7 天时前端自动调用）
   - `GET  /api/auth/me` — 返回当前用户
4. 前端全局状态：`AuthContext`（`src/context/AuthContext.jsx`）
5. NFC 登录 hook：`useNfcLogin`（`src/hooks/useNfcLogin.js`）
   - 检测 `?nfc=TOKEN` → 调接口 → 已注册跳 `/welcome`，未注册跳 `/register`
6. 页面：`Register.jsx` / `Login.jsx` / `Welcome.jsx`

## 关键约定

- JWT 存 `localStorage`，有效期 30 天
- `is_registered` 字段区分"已碰卡未注册"与"已完成注册"
- `deactivated_at` 软删除，停用后无法登录但数据保留
- `nfc_token` 在用户创建时自动生成（UUID v4），挂失时通过 `regen-token` 接口重新生成
- `Welcome.jsx`：有 `city` 显示「你好，{city}」，无则通用文案

## 测试账号

- admin：用户名 `admin` / 密码 `admin123`（`npm run db:reset` 后从终端复制 `nfc_token`）
