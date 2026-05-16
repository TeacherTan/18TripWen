# 功能文档：用户认证系统

**优先级：P0（最高）**
**依赖：无，被所有其他功能依赖**

---

## 功能概述

提供 NFC 碰触登录、用户名密码登录、用户注册三种认证方式。确保活动当天用户不会因登录失效而无法打卡。

---

## 认证流程

### 流程一：NFC 碰触登录（已有账号）

```
用户碰触 NFC 身份卡
  → 浏览器打开 https://tyzhome.xyz/?nfc=<TOKEN>
  → 前端检测 ?nfc=TOKEN
  → POST /api/auth/nfc { token }
  → 后端查 users 表 nfc_token 字段
    ├─ 找到且已注册（有 username + password）→ 返回 { jwt, user, registered: true }
    │   → 前端存 JWT，跳转 /welcome
    └─ 找到但未注册（无 username）→ 返回 { jwt, user, registered: false }
        → 前端存 JWT，跳转 /register
```

### 流程二：NFC 碰触 + 注册（新用户）

```
用户碰触 NFC 身份卡
  → 后端返回 registered: false
  → 前端跳转 /register
  → 用户填写：用户名、密码、城市
  → POST /api/auth/register { username, password, city }
  → 后端将信息绑定到当前 NFC token 对应的 user 记录
  → 返回 { jwt, user }
  → 前端更新 JWT，跳转 /welcome
```

### 流程三：用户名密码登录

```
用户打开网站
  → 点击"登录"入口
  → 输入用户名 + 密码
  → POST /api/auth/login { username, password }
  → 后端验证
    ├─ 成功 → 返回 { jwt, user }
    └─ 失败 → 返回 401
  → 前端存 JWT，跳转 /welcome
```

### 流程四：会话恢复

```
App 启动，URL 无 ?nfc/?spot 参数
  → 读取 localStorage JWT
  → 解析检查有效性
    ├─ 有效 → 恢复登录状态，检查续期
    └─ 无效/不存在 → 匿名状态
```

---

## JWT 设计

**Payload：**
```json
{
  "userId": "uuid",
  "username": "张三",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**策略：**
- 有效期 **30 天**，确保活动期间不会失效
- 存储：`localStorage.setItem('jwt', token)`
- 续期：App 每次启动检查 JWT 剩余有效期，剩余 < 7 天时自动调用 `/api/auth/refresh`
- `/api/auth/refresh` 只接受未过期的 JWT
- 过期后需重新通过 NFC 或用户名密码登录

---

## 数据库变更

### users 表

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50) UNIQUE,                  -- 注册后设置
  password_hash TEXT,                                 -- 注册后设置，bcrypt
  name          VARCHAR(50),                          -- 兼容旧字段，注册时可与 username 相同
  city          VARCHAR(50),
  avatar_url    TEXT,
  nfc_token     UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  role          VARCHAR(20) NOT NULL DEFAULT 'user', -- user | admin
  is_registered BOOLEAN NOT NULL DEFAULT false,       -- 是否完成注册
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**关键字段说明：**
- `username` / `password_hash`：注册前为 NULL，注册后填充
- `is_registered`：区分"已碰卡未注册"和"已注册"状态
- `nfc_token`：创建时自动生成，供 NFC 卡写入

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/nfc` | `{ token }` → `{ jwt, user, registered }` |
| POST | `/api/auth/register` | `Bearer JWT` + `{ username, password, city }` → `{ jwt, user }` |
| POST | `/api/auth/login` | `{ username, password }` → `{ jwt, user }` |
| POST | `/api/auth/refresh` | `Bearer JWT` → `{ jwt }` |
| GET | `/api/auth/me` | `Bearer JWT` → `user` |

### POST /api/auth/nfc 详细

- 查找 `nfc_token = token` 的用户
- 不存在 → 返回 404（无效 NFC 卡）
- 存在 → 签发 JWT，返回 `registered` 字段指示是否已完成注册
- JWT 中包含 `userId`，注册接口据此绑定信息

### POST /api/auth/register 详细

- 需要 Bearer JWT（通过 NFC 登录获得的临时 JWT）
- 校验 username 唯一性
- bcrypt 哈希密码
- 更新 `username`、`password_hash`、`city`、`is_registered = true`
- 签发新 JWT（包含 username）

### POST /api/auth/login 详细

- 查找 `username` 对应的用户
- bcrypt 验证密码
- 签发 JWT

---

## 前端页面与路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/register` | Register.jsx | 注册页：用户名、密码、城市 |
| `/login` | Login.jsx | 密码登录页 |
| `/welcome` | Welcome.jsx | 个性化欢迎页 |

### App 启动逻辑（认证部分）

```
URL 含 ?nfc=TOKEN？
  ├─ 是 → POST /api/auth/nfc
  │        ├─ registered: true → 存 JWT → navigate('/welcome', replace)
  │        └─ registered: false → 存 JWT → navigate('/register', replace)
  └─ 否 → 检查 localStorage JWT
           ├─ 有效 → 恢复登录状态，检查续期
           └─ 无效 → 匿名状态
```

---

## 欢迎页（Welcome.jsx）

个性化欢迎页根据用户注册时填写的 `city` 字段动态展示文案：

```
有 city 字段 → 显示 "你好，{city}"（如 "你好，长沙"）
无 city 字段 → 显示通用文案（如 "欢迎来到 18TRIP"）
```

city 值直接来自 JWT payload 中的用户信息，无需额外接口请求。

---

## 登录状态 UI

- **已登录**：Menu 栏最右侧显示用户头像，点击进入 `/profile`
- **未登录**：Menu 栏最右侧显示登录图标，点击进入 `/login`
- 全局状态通过 `AuthContext` 管理

---

## 开放问题

- 注册页是否需要手机号/邮箱（当前方案不要求）
