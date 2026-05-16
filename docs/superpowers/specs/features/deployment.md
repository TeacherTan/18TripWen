# 功能文档：部署与运维

**优先级：P1**
**依赖：所有功能完成后部署**

---

## 部署架构

```
用户手机
  │
  ▼ HTTPS
Nginx（反向代理 + 静态资源）
  ├─ /            → Vite 构建产物（静态文件）
  ├─ /api/*       → proxy_pass → Node.js Express (port 3000)
  └─ SSL 终止
       │
       ▼
Express.js 后端 (port 3000)
  ├─ /api/auth/*
  ├─ /api/check-in/*
  ├─ /api/admin/*
  └─ /api/upload/*
       │
       ▼
PostgreSQL (port 5432)
```

**同域部署**：前后端在同一域名下，Nginx 根据路径分流。避免 CORS 问题，JWT cookie 方案也更容易切换。

---

## HTTPS 要求

PWA 强制要求 HTTPS。方案：

- **推荐**：Let's Encrypt + certbot 自动续期
- 域名需提前准备并解析到服务器 IP
- Nginx 配置 HTTP → HTTPS 301 重定向

---

## 环境变量

```env
# 服务
PORT=3000
NODE_ENV=production

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/18trip

# JWT
JWT_SECRET=<random-64-chars>
JWT_EXPIRES_IN=30d

# 存储（local = 本地磁盘，aliyun = 阿里云 OSS）
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads              # 本地存储目录，仅 local 模式使用

# 切换到 OSS 时填充以下字段（当前无需配置）
# STORAGE_PROVIDER=aliyun
# OSS_ACCESS_KEY_ID=<key>
# OSS_ACCESS_KEY_SECRET=<secret>
# OSS_BUCKET=<bucket>
# OSS_REGION=oss-cn-hangzhou
# OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com

# 上传限制
UPLOAD_MAX_SIZE=2097152          # 2MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp
```

---

## 存储方案

**当前实现：本地文件存储**，通过 adapter 接口预留未来切换 OSS 的能力。

```
server/storage/
  ├─ index.js    # adapter 入口，根据 STORAGE_PROVIDER 环境变量导出对应实现
  ├─ local.js    # 本地磁盘存储（当前默认）
  └─ aliyun.js   # 阿里云 OSS（占位，未实现，切换时填充）
```

### adapter 接口契约

两个 provider 均需实现相同接口：

```js
// 上传文件，返回可访问的 URL
async function upload(fileBuffer, filename, mimetype) → { url }

// 删除文件（可选，用于头像替换时清理旧文件）
async function remove(url) → void
```

### 本地存储实现（当前）

- 文件存放于 `server/uploads/avatars/`
- 通过 Express 静态服务暴露：`GET /uploads/avatars/:filename`
- 上传接口：`POST /api/upload/avatar`（multipart/form-data），直接在服务端写盘
- 无需 presign，前端直接 POST 文件

### 切换到阿里云 OSS

设置 `STORAGE_PROVIDER=aliyun` 并填充 `server/storage/aliyun.js` 即可，上层代码无需改动。

### 上传约束（两个 provider 均适用）

- 需 Bearer JWT
- 限制文件类型：`image/jpeg`、`image/png`、`image/webp`
- 限制文件大小：最大 2MB
- 前端上传前预校验大小和类型

---

## 管理员初始化

```bash
# 首次部署后执行
npm run seed:admin -- --username admin --password <password>
```

脚本位置：`server/scripts/seed-admin.js`

---

## 数据库 Migration

使用 SQL 脚本管理，不做复杂 migration 框架（活动项目规模不需要）。

```
server/db/
  ├─ schema.sql      # 完整建表语句（开发/重置用）
  └─ seed-admin.js   # 管理员初始化脚本
```

部署流程：

1. 创建数据库
2. 执行 `schema.sql`
3. 执行 `seed-admin.js`
4. 启动 Express

---

## 服务器最低配置

| 项目 | 配置 |
|------|------|
| CPU | 1 核 |
| 内存 | 1 GB |
| 磁盘 | 20 GB SSD |
| 系统 | Ubuntu 22.04 |
| Node.js | 18 LTS |

500 人单日活动，1C1G 完全足够。

---

## 进程管理

使用 PM2：

```bash
npm install -g pm2
pm2 start server/index.js --name 18trip-api
pm2 save
pm2 startup
```

---

## 开放问题

- 域名是否已准备
- 云服务器选型（阿里云/腾讯云轻量应用服务器）
- OSS bucket 是否已创建
