# NFC 身份认证与用户系统 — 功能开发总文档

**日期：** 2026-05-07
**项目：** 18TRIP OnLy 长沙 活动站
**范围：** NFC 碰触登录、用户系统、PWA 深链接、个性化欢迎页、打卡与成就系统

---

## 功能文档索引

| 功能 | 文档 | 优先级 |
|------|------|--------|
| 用户认证系统 | [features/auth-system.md](features/auth-system.md) | P0 |
| 打卡与成就系统 | [features/checkin-achievement.md](features/checkin-achievement.md) | P0 |
| 后台管理系统 | [features/admin-management.md](features/admin-management.md) | P1 |
| 部署与运维 | [features/deployment.md](features/deployment.md) | P1 |

---

## 背景与目标

将现有 React + Vite PWA 活动站扩展为支持 NFC 身份认证的完整系统。用户通过碰触 NFC 贴纸访问网站，系统识别身份后展示个性化欢迎页，并在整个 PWA 会话中保持登录状态。

**约束：**

- 用户上限 500 人，支持动态新增
- 兼容 iOS 和 Android（浏览器体验优先，iOS PWA 深链接后续真机验证）
- 登录状态保持 30 天，确保活动当天不失效
- 安全性要求为活动级别（非金融/医疗数据）
- 活动为单日，打卡为每人每点一次

---

## 技术选型

| 层级 | 选型 |
| ---- | ---- |
| 前端 | React + Vite（现有）+ React Router |
| PWA | vite-plugin-pwa（现有） |
| 后端 | Node.js + Express.js |
| 数据库 | PostgreSQL |
| 认证 | JWT 存 localStorage，30 天有效期 |
| 存储 | 阿里云 OSS（单 provider） |

---

## 整体架构

```
NFC 身份卡（URL: https://yoursite.com/?nfc=USER_TOKEN）
NFC 打卡点（URL: https://yoursite.com/?spot=SPOT_TOKEN）
  │
  ▼
手机浏览器（iOS/Android）
  │
  ▼
Nginx 反向代理
  ├─ /        → Vite 静态资源
  └─ /api/*   → Express.js 后端
                  │
                  ▼
               PostgreSQL + 阿里云 OSS
```

---

## 认证流程总览

```
NFC 碰触 → ?nfc=TOKEN → POST /api/auth/nfc
  ├─ 已注册 → 存 JWT → /welcome
  └─ 未注册 → 存 JWT → /register → 绑定用户名密码 → /welcome

密码登录 → /login → POST /api/auth/login → 存 JWT → /welcome

会话恢复 → localStorage JWT → 恢复状态 / 自动续期
```

---

## 数据库完整结构

```sql
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       VARCHAR(50) UNIQUE,
  password_hash  TEXT,
  city           VARCHAR(50),
  avatar_url     TEXT,
  nfc_token      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  role           VARCHAR(20) NOT NULL DEFAULT 'user',
  is_registered  BOOLEAN NOT NULL DEFAULT false,
  deactivated_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE check_in_spots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,
  spot_token  UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE check_ins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  spot_id    UUID NOT NULL REFERENCES check_in_spots(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, spot_id)
);

CREATE TABLE achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  achievement VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement)
);
```

---

## 项目目录结构

```
src/
  ├─ context/
  │   └─ AuthContext.jsx
  ├─ hooks/
  │   ├─ useNfcLogin.js
  │   └─ useSpotCheckIn.js
  ├─ pages/
  │   ├─ Welcome.jsx
  │   ├─ Register.jsx
  │   ├─ Login.jsx
  │   ├─ Profile.jsx
  │   └─ CheckIn.jsx
  ├─ components/
  └─ App.jsx

server/
  ├─ index.js
  ├─ routes/
  │   ├─ auth.js
  │   ├─ checkin.js
  │   ├─ admin.js
  │   └─ upload.js
  ├─ middleware/
  │   ├─ authenticate.js
  │   └─ requireAdmin.js
  ├─ services/
  │   └─ achievement.js
  ├─ storage/
  │   ├─ index.js
  │   └─ aliyun.js
  ├─ scripts/
  │   └─ seed-admin.js
  └─ db/
      └─ schema.sql
```

---

## 开发阶段与步骤

### Phase 1：基础认证（P0）

**目标：** 用户能通过 NFC 碰触完成登录/注册

1. 搭建 Express.js 后端骨架 + PostgreSQL 连接
2. 实现 `schema.sql` 建表
3. 实现 `POST /api/auth/nfc` — NFC token 查找用户，签发 JWT
4. 实现 `POST /api/auth/register` — 绑定用户名密码
5. 实现 `POST /api/auth/login` — 用户名密码登录
6. 实现 `POST /api/auth/refresh` — JWT 续期
7. 实现 `GET /api/auth/me` — 获取当前用户
8. 前端：`AuthContext` + `useNfcLogin` hook
9. 前端：Register.jsx + Login.jsx 页面
10. 前端：Welcome.jsx 个性化欢迎页
11. 联调测试

### Phase 2：打卡与成就（P0）

**目标：** 用户能在各打卡点签到并解锁成就

1. 实现 `POST /api/check-in` — 打卡逻辑（含幂等检查）
2. 实现 `GET /api/check-in/status` — 打卡状态
3. 实现 `GET /api/check-in/spots` — 打卡点列表
4. 实现 achievement service — 成就检查与解锁
5. 前端：`useSpotCheckIn` hook
6. 前端：CheckIn.jsx 打卡结果页
7. 前端：Profile.jsx 个人资料页（打卡进度 + 成就）
8. 联调测试

### Phase 3：后台管理（P1）

**目标：** 管理员能管理用户、打卡点，支持补卡挂失

1. 实现 `requireAdmin` 中间件
2. 实现用户管理 API（CRUD + 软删除）
3. 实现打卡点管理 API（CRUD + 软删除）
4. 实现用户信息转移 API
5. 实现补卡 API
6. 实现挂失 API（regen-token + 可选用户自助挂失）
7. 实现 seed-admin.js 脚本
8. 前端：管理后台页面
9. 联调测试

### Phase 4：部署与收尾（P1）

**目标：** 部署上线 + iOS 真机验证

1. 配置 Nginx + HTTPS (Let's Encrypt)
2. 阿里云 OSS 配置 + presign upload
3. PM2 进程管理
4. 执行 seed-admin 初始化管理员
5. NFC 卡片写入测试
6. iOS 真机 PWA 深链接验证
7. 全流程端到端测试

---

## 开放问题

1. NFC 芯片型号和写卡工具（推荐 NTAG213，用 NFC Tools App 写入）
2. 身份卡和打卡点分别使用什么形态的 NFC 载体（卡片 / 贴纸 / 挂牌）
3. 域名是否已有
4. 阿里云 OSS bucket 是否已创建
5. 欢迎页按城市定制文案的具体内容
6. 打卡点数量和位置规划（决定成就规则的设计）
7. 成就规则的具体定义（如：限时打卡等）
8. iOS 真机 PWA 深链接行为验证
