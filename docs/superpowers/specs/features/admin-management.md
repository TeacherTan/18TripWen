# 功能文档：后台管理系统

**优先级：P1**
**依赖：用户认证系统、打卡与成就系统**

---

## 功能概述

管理员通过 NFC 登录后，根据 `role === 'admin'` 访问后台管理功能。包括：用户管理、打卡点管理、用户信息转移、补卡挂失。

---

## 管理员初始化

通过 seed 脚本创建首个管理员：

```bash
npm run seed:admin -- --username admin --password <password>
```

脚本逻辑：
1. 检查是否已存在 admin 用户，若存在则跳过
2. 插入一条 `role = 'admin'`、`is_registered = true` 的用户记录
3. 输出生成的 `nfc_token`，供写入管理员 NFC 身份卡

---

## 用户管理

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 列出所有用户（支持 `?search=` 搜索） |
| POST | `/api/admin/users` | 新增用户（自动生成 nfc_token） |
| PUT | `/api/admin/users/:id` | 修改用户信息 |
| PUT | `/api/admin/users/:id/deactivate` | 停用用户（软删除） |
| POST | `/api/admin/users/:id/regen-token` | 重新生成 nfc_token |

### 新增用户

```json
POST /api/admin/users
{
  "name": "张三",
  "city": "长沙"
}
```

返回包含 `nfc_token`，管理员据此写入 NFC 卡。

### 软删除

不使用 DELETE，而是设置 `deactivated_at` 字段。停用后用户无法登录，但打卡记录保留。

users 表增加字段：

```sql
ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMPTZ;
```

---

## 打卡点管理

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/spots` | 列出所有打卡点 |
| POST | `/api/admin/spots` | 新增打卡点 |
| PUT | `/api/admin/spots/:id` | 修改打卡点（名称、启停） |
| PUT | `/api/admin/spots/:id/deactivate` | 停用打卡点（软删除） |

### 软删除

check_in_spots 已有 `active` 字段，停用时设 `active = false`。不删除记录，保留打卡历史。

---

## 用户信息转移

**场景：** 用户 NFC 卡丢失，换了新卡；或需要将 A 账号的数据迁移到 B 账号。

### API

```
POST /api/admin/users/transfer
{
  "sourceUserId": "uuid",
  "targetUserId": "uuid"
}
```

**逻辑：**
1. 验证两个用户均存在且未停用
2. 将 source 的打卡记录（check_ins）迁移到 target：`UPDATE check_ins SET user_id = target WHERE user_id = source`
3. 将 source 的成就（achievements）迁移到 target，跳过 target 已有的成就
4. 保留 source 的 nfc_token（新卡写入新 token 后 regen 即可）
5. 停用 source 账号（设 deactivated_at）
6. 返回迁移结果摘要

**约束：**
- source 和 target 不能相同
- 迁移后 source 账号停用，不可逆
- 打卡记录迁移不违反 UNIQUE 约束（目标用户在对应点位没有记录）

---

## 补卡

**场景：** 用户在某个打卡点碰了 NFC 但系统未记录（网络问题等），管理员手动补录。

### API

```
POST /api/admin/check-ins/supplement
{
  "userId": "uuid",
  "spotId": "uuid"
}
```

**逻辑：**
1. 验证用户和打卡点均存在且活跃
2. 检查是否已有记录，有则返回提示
3. INSERT check_ins
4. 检查成就
5. 返回补卡结果

---

## 挂失

**场景：** 用户报告 NFC 卡丢失，需要作废旧卡 token 防止他人冒用。

### API

```
POST /api/admin/users/:id/report-loss
```

**逻辑：**
1. 重新生成该用户的 `nfc_token`
2. 旧 token 立即失效（后续碰触找不到对应用户）
3. 用户可通过用户名密码继续登录
4. 返回新 `nfc_token`，管理员写入新 NFC 卡交付用户
5. 已签发的 JWT 仍有效至过期（30 天策略下可接受）

**用户自助挂失（可选）：**

```
POST /api/auth/report-loss
Bearer JWT + { password }
```

需验证密码后才能挂失，防止他人操作。

---

## 数据库变更汇总

```sql
-- users 表新增字段
ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMPTZ;

-- check_in_spots 已有 active 字段，无需额外变更
```

---

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/admin` | AdminLayout.jsx | 管理后台布局（侧边栏导航） |
| `/admin/users` | AdminUsers.jsx | 用户列表，搜索、新增、停用、挂失、转移 |
| `/admin/spots` | AdminSpots.jsx | 打卡点列表，新增、停用 |
| `/admin/check-ins` | AdminCheckIns.jsx | 补卡操作、打卡记录查看 |

管理后台仅 `role === 'admin'` 可访问，前端通过路由守卫，后端通过 `requireAdmin` 中间件。
