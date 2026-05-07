# NFC 身份认证与用户系统设计

**日期：** 2026-05-07  
**项目：** 18TRIP OnLy 长沙 活动站  
**范围：** NFC 碰触登录、用户系统、PWA 深链接、个性化欢迎页

---

## 背景与目标

将现有 React + Vite PWA 活动站扩展为支持 NFC 身份认证的完整系统。用户通过碰触 NFC 贴纸访问网站，系统识别身份后展示个性化欢迎页，并在整个 PWA 会话中保持登录状态。

**约束：**
- 用户上限 500 人，支持动态新增
- 必须兼容 iOS 和 Android
- 登录状态保持 7 天滑动续期
- 安全性要求为活动级别（非金融/医疗数据）

---

## 技术选型

| 层级 | 选型 |
|------|------|
| 前端 | React + Vite（现有）+ React Router |
| PWA | vite-plugin-pwa（现有） |
| 后端 | Node.js + Express.js |
| 数据库 | PostgreSQL |
| 认证 | JWT 存 localStorage，7 天有效期 |
| 存储 | 可替换 Storage Adapter（S3 / 阿里云 OSS / 腾讯云 COS） |

---

## 整体架构

```
NFC 芯片（URL: https://yoursite.com/?nfc=TOKEN）
  │
  ▼
手机系统
  ├─ 已安装 PWA → 在 PWA 内打开（自动，scope="/" 覆盖）
  └─ 未安装     → 浏览器打开，显示"添加到主屏幕"提示
  │
  ▼
前端 React App
  ├─ 检测 ?nfc=TOKEN → POST /api/auth/nfc → 存 JWT → 跳 /welcome
  └─ 检测 localStorage JWT → 恢复登录状态 / 检查续期
  │
  ▼
Express.js 后端
  ├─ 验证 TOKEN → 查 PostgreSQL → 颁发 JWT
  └─ 管理接口（新增用户、重置 token 等）
  │
  ▼
PostgreSQL + Storage（OSS/S3）
```

---

## NFC Token 设计

- 每个用户拥有一个**永久唯一 UUID v4 token**，写入 NFC 芯片
- Token 可重复使用（每次碰触均可登录）
- 管理员可通过 `POST /api/admin/users/:id/regen-token` 重新生成 token，旧 token 立即失效
- NFC 芯片写入内容：`https://yoursite.com/?nfc=<UUID>`

---

## PWA 深链接行为

无需额外开发。PWA manifest 的 `scope` 为 `/`，`/?nfc=TOKEN` 在 scope 内：
- **已安装 PWA**：系统自动在 PWA 内打开该 URL
- **未安装**：在浏览器中打开，正常流程，可提示安装
- **iOS / Android** 均适用此机制

---

## 数据库结构

### users 表

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50)  NOT NULL,
  city        VARCHAR(50)  NOT NULL,
  age         SMALLINT,
  contact     VARCHAR(100),
  avatar_url  TEXT,                          -- 存储服务上的图片地址
  nfc_token   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  role        VARCHAR(20)  NOT NULL DEFAULT 'user',  -- user | admin
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/nfc` | `{ token }` → `{ jwt, user }`，NFC 登录 |
| POST | `/api/auth/refresh` | `Bearer JWT` → `{ jwt }`，续期 |
| GET  | `/api/auth/me` | `Bearer JWT` → `user`，获取当前用户 |

### 用户管理（admin only）

管理员通过同样的 NFC 碰触流程登录，其 `role` 字段值为 `admin`。后端 `authenticate` 中间件验证 JWT 后，`requireAdmin` 中间件检查 `role === 'admin'`，否则返回 403。管理员账户在数据库中手动创建。



| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/admin/users` | 列出所有用户 |
| POST   | `/api/admin/users` | 新增用户，自动生成 nfc_token |
| PUT    | `/api/admin/users/:id` | 修改用户信息 |
| POST   | `/api/admin/users/:id/regen-token` | 重新生成 nfc_token |
| DELETE | `/api/admin/users/:id` | 删除用户 |

### 存储

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/upload/presign` | 返回预签名上传 URL，前端直传，不经后端 |

存储层通过环境变量 `STORAGE_PROVIDER=s3|aliyun|tencent` 切换，底层用 adapter 封装各云厂商差异，上层接口不变。

---

## JWT 设计

**Payload：**
```json
{
  "userId": "uuid",
  "name": "张三",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**存储：** `localStorage.setItem('jwt', token)`

**续期策略：**
- App 每次启动检查 JWT 剩余有效期
- 剩余 < 1 天时自动调用 `/api/auth/refresh` 换取新 7 天 JWT
- `/api/auth/refresh` 只接受**未过期**的 JWT，过期后需重新碰 NFC
- 实际效果：用户每 6 天内打开一次 App 即可永久保持登录
- 用户无感知

---

## 前端路由与页面结构

```
/              主页（现有 Hero + Menu）
/?nfc=TOKEN    NFC 入口，主页启动时副作用处理
/welcome       个性化欢迎页（登录后自动跳转）
/profile       用户个人资料页
```

### App 启动逻辑

```
App 启动
  ├─ URL 含 ?nfc=TOKEN？
  │   ├─ 是 → POST /api/auth/nfc
  │   │        → 存 JWT
  │   │        → 清除 URL 中的 nfc 参数
  │   │        → navigate('/welcome', { replace: true })
  │   └─ 否 → 读 localStorage JWT
  │             ├─ 有效 → 恢复登录状态，检查是否需要续期
  │             └─ 无效/不存在 → 匿名访问
```

### 登录状态 UI

- **已登录**：Menu 栏最右侧显示用户头像（圆形），点击进入 `/profile`
- **未登录**：Menu 栏最右侧显示 NFC 图标，提示碰卡登录
- 全局登录状态通过 React Context（`AuthContext`）管理

### 欢迎页（/welcome）

- 展示：用户姓名、所属城市、欢迎文案（可按城市定制）
- 复用现有 Hero 视觉风格的氛围动画
- "进入活动"按钮：`navigate('/', { replace: true })`（清除历史，防止返回键回到欢迎页）

---

## 项目目录结构变化

```
src/
  ├─ context/
  │   └─ AuthContext.jsx        # 全局登录状态
  ├─ hooks/
  │   └─ useNfcLogin.js         # 检测 ?nfc= 参数并触发登录
  ├─ pages/
  │   ├─ Welcome.jsx            # 个性化欢迎页
  │   └─ Profile.jsx            # 用户资料页
  ├─ components/                # 现有组件
  └─ App.jsx                    # 引入 Router + AuthContext

server/                         # 新建后端目录
  ├─ index.js
  ├─ routes/
  │   ├─ auth.js
  │   ├─ admin.js
  │   └─ upload.js
  ├─ middleware/
  │   └─ authenticate.js        # JWT 验证中间件
  ├─ storage/
  │   ├─ index.js               # adapter 入口
  │   ├─ s3.js
  │   ├─ aliyun.js
  │   └─ tencent.js
  └─ db/
      └─ schema.sql
```

---

## 开放问题（实施前需确认）

1. NFC 芯片型号和写卡工具（推荐 NTAG213，用 NFC Tools App 写入）
2. 云服务器和域名是否已有，HTTPS 证书是否配置（PWA 必须 HTTPS）
3. 存储服务商最终选型（S3 / 阿里云 / 腾讯云）
4. 欢迎页按城市定制文案的具体内容
