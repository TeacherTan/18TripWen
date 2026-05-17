# 后台管理系统 — 已实现参考摘要

**状态：Phase 3 已完成**（commit `caefef3`）

---

## 实现路径

1. 中间件：`requireAdmin`（`server/middleware/requireAdmin.js`）— `role === 'admin'` 守卫
2. 管理路由（`server/routes/admin.js`）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 列出所有用户（支持 `?search=`） |
| POST | `/api/admin/users` | 新增用户（自动生成 nfc_token） |
| PUT | `/api/admin/users/:id` | 修改用户信息 |
| PUT | `/api/admin/users/:id/deactivate` | 停用用户（设 `deactivated_at`） |
| POST | `/api/admin/users/:id/regen-token` | 重新生成 nfc_token（挂失用） |
| POST | `/api/admin/users/transfer` | 转移打卡记录（换卡/账号合并） |
| GET | `/api/admin/spots` | 列出所有打卡点 |
| POST | `/api/admin/spots` | 新增打卡点 |
| PUT | `/api/admin/spots/:id` | 修改打卡点 |
| PUT | `/api/admin/spots/:id/deactivate` | 停用打卡点（设 `active=false`） |
| GET | `/api/admin/check-ins` | 查看打卡记录 |
| POST | `/api/admin/check-ins/supplement` | 补卡 |

3. 前端页面（`src/pages/admin/`）：`AdminLayout` → 侧边栏导航 → `AdminUsers / AdminSpots / AdminCheckIns`
4. 路由守卫：`/admin/*` 仅 `role === 'admin'` 可访问

## 关键约定

- 软删除：用户设 `deactivated_at`，打卡点设 `active=false`，历史记录保留
- 挂失 = `regen-token`，旧 token 立即失效，已签发 JWT 仍有效至 30 天过期
- 转移（transfer）后 source 账号自动停用，不可逆

## 初始化

```bash
npm run db:reset   # 建表 + seed admin（打印 admin nfc_token）
```
