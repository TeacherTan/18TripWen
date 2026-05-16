# 18TRIP OnLy 长沙 — 项目概览

## 项目定位

单日活动 NFC 打卡 PWA，最多 500 名用户。用户通过碰 NFC 卡触发身份验证与打卡，无需下载 App。

- **域名**: tyzhome.xyz
- **技术栈**: React 19 + Vite / Express 5 / PostgreSQL 16 / Docker
- **当前状态**: Phase 1–3 开发完毕，待部署

---

## 快速启动

```bash
npm install
cp .env.example .env          # 按需修改 JWT_SECRET
npm run db:reset              # 启动 Postgres + 建表 + 灌 seed（打印 admin nfc_token）
npm run dev                   # 并行启动 Vite:5173 + Express:3000
```

前端: http://localhost:5173 | 后端: http://localhost:3000

---

## 项目结构

```
.
├── server/
│   ├── index.js              # Express 入口，挂载所有路由
│   ├── db/
│   │   ├── schema.sql        # 三张表：users / check_in_spots / check_ins
│   │   └── index.js          # pg Pool + query() helper
│   ├── routes/
│   │   ├── auth.js           # /api/auth/* — NFC登录/注册/密码登录/刷新/me
│   │   ├── checkin.js        # /api/check-in/* — 打卡/成就墙状态/spots列表
│   │   └── admin.js          # /api/admin/* — 用户/打卡点/打卡记录管理
│   ├── middleware/
│   │   ├── authenticate.js   # Bearer JWT 验证，设 req.auth
│   │   └── requireAdmin.js   # 角色守卫（role === 'admin'）
│   ├── utils/jwt.js          # signToken / verifyToken
│   ├── storage/              # 存储适配器（local.js / aliyun.js）
│   ├── scripts/
│   │   ├── seed-spots.js     # 6 个固定 spot_token 的打卡点
│   │   └── seed-admin.js     # 创建 admin 用户，打印 nfc_token
│   └── api.http              # VS Code REST Client 联调脚本（23 个请求）
├── src/
│   ├── api/client.js         # apiFetch()，自动注入 Bearer token
│   ├── context/AuthContext.jsx  # 全局会话状态
│   ├── hooks/
│   │   ├── useNfcLogin.js    # 检测 ?nfc=TOKEN，触发 NFC 登录流程
│   │   └── useSpotCheckIn.js # 检测 ?spot=TOKEN，触发打卡流程
│   ├── pages/
│   │   ├── Welcome.jsx       # 登录成功落地页（显示 你好，{city}）
│   │   ├── Register.jsx      # 新用户注册（username/password/city）
│   │   ├── Login.jsx         # 密码登录（支持 ?next= 跳回）
│   │   ├── CheckIn.jsx       # 打卡结果页（脉冲动画 + 槽位高亮）
│   │   ├── Profile.jsx       # 成就墙（6 格图纸进度）
│   │   └── admin/            # 后台管理（Layout/Users/Spots/CheckIns）
│   ├── components/
│   │   ├── AchievementSlot/  # 单个成就槽（locked/unlocked/highlighted）
│   │   ├── Hero/             # 首页主视觉
│   │   └── Menu/             # 首页菜单
│   └── styles/
│       ├── auth.css          # 认证页暗色主题
│       ├── achievement.css   # 成就墙 + unlock-pulse 动画
│       └── admin.css         # 后台 shell + 表格 + modal
├── docs/
│   ├── testing.md            # 测试手册（32 个测试用例 + 环境配置）
│   └── superpowers/specs/    # 设计文档（NFC 方案、打卡成就、部署）
├── docker-compose.yml        # Postgres 16，端口 5432
├── .env.example              # 所有环境变量模板
└── vite.config.js            # /api 代理 → localhost:3000
```

---

## 数据模型

```sql
users            — id(UUID) / username / password_hash / city / nfc_token(UUID) / role / is_registered / deactivated_at
check_in_spots   — id(UUID) / name / spot_token(UUID) / asset_key / display_order / active
check_ins        — id(UUID) / user_id → users / spot_id → check_in_spots / checked_at
                   UNIQUE(user_id, spot_id)  -- 防重复打卡
```

---

## 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| NFC 交互方式 | URL 参数 `?nfc=` / `?spot=` | 避免 Web NFC API 兼容性问题，iOS Safari 也支持 |
| JWT 存储 | localStorage | 单日活动，无跨设备需求 |
| 成就系统 | 从 check_ins × check_in_spots 推导 | 无需单独 achievements 表 |
| iOS PWA NFC | 接受限制，走浏览器路径 | 系统级限制，设计已接受 |
| 文件存储 | 本地磁盘（STORAGE_PROVIDER=local） | 适配器模式保留切换阿里云 OSS 的能力 |

---

## 环境变量

```
PORT=3000
DATABASE_URL=postgresql://18trip:18trip@localhost:5432/18trip
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=30d
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

---

## NPM 脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 并行启动 Vite + Express |
| `npm run db:up` | 启动 Postgres 容器 |
| `npm run db:reset` | 重建表 + 灌 seed（admin token 会变） |
| `npm run db:seed` | 仅执行 seed（表已存在时） |
| `npm run db:down` | 停容器（数据保留） |
| `npm run build` | 构建前端到 dist/ |

---

## 测试账号（db:reset 后）

- admin 用户名: `admin` / 密码: `admin123`
- admin nfc_token: 每次 db:reset 后从终端输出复制
- 6 个打卡点 spot_token: 见 `docs/testing.md` 第二节

详细测试用例见 [`docs/testing.md`](docs/testing.md)。

---

## 待办（不阻塞当前测试）

- [ ] 设计师交付：6 张图纸图片（`spot_01`~`spot_06` 解锁态）+ 6 个黑色轮廓占位 SVG
- [ ] 头像上传 UI + `/api/upload/avatar` 接口（存储适配器已就绪）
- [ ] 部署：云服务器 + Nginx + Let's Encrypt + PM2（域名 tyzhome.xyz 已确认）
