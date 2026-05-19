# 18TRIP 活动站 — 项目上下文 / PRD 整合

> **目标读者**：AI Agent 与新加入的开发者
> **最后更新**：2026-05-19
> **同目录配套文档**：`01-world-setting.md` · `02-characters.md` · `03-visual-identity.md`

---

## 1. 项目定位

**18TRIP 同人活动站** — 面向最多 500 名 18TRIP 玩家的**单日线下活动**配套 PWA，参与者通过碰 NFC 卡完成身份认证与各点位打卡，集齐"图纸"解锁成就。

---

## 2. IP 背景（指针）

本站是日本手游 **18TRIP**（Liber Entertainment，2024.5 上线）的国内同人活动配套。完整 IP 信息请直接参阅同目录文档：

- **世界观/术语**：`docs/game-reference/01-world-setting.md`
- **角色档案（含主题色）**：`docs/game-reference/02-characters.md`
- **配色与视觉系统**：`docs/game-reference/03-visual-identity.md`

> **不要**在新代码或文档里复述 IP 背景；要用时直接 link 过去。

---

## 3. 活动业务定位与 IP 呼应

### 3.1 活动形态

- **形态**：单日线下活动（≤500 人），主办方在场地布置若干 NFC 标签
- **设备**：用户用手机浏览器（PWA），无需下载 App
- **域名**：tyzhome.xyz

### 3.2 用户旅程

```
碰身份卡 (?nfc=)
  → 首次：填用户名/密码/城市 → 注册并登录
  → 已注册：自动登录
→ Welcome 落地页（"你好，{city}"）
→ 自由参与活动
→ 碰打卡点 (?spot=)
  → 后端打卡 → 跳成就页弹窗 → 高亮新解锁槽位
→ 收集 6 格图纸 → 兑奖（线下流程，未实现兑换闭环）
```

### 3.3 与 IP 的呼应方式（设计意图，需在文案/视觉落实时贯彻）

| 站内概念 | IP 对应 | 设计语言 |
|---------|--------|---------|
| 6 个打卡点 | 游戏内"区/Ward"+"修学旅行目的地"双重隐喻 | 每个点位用车票/邮戳样式呈现 |
| 成就墙 6 格图纸 | 游戏内卡牌/打卡相册的同人化 | 锁定态黑色轮廓 → 解锁态用对应"班级色"染色 |
| 用户的 `city` 字段 | 呼应游戏"旅行/区域"主题（每个用户来自不同城市） | Welcome 页 "你好，{city}" 强化旅行氛围 |
| 管理员 admin | 类比 HAMA TOURS 的 Chief 总指挥 | 后台 UI 可加 "Chief Console" 之类副标题 |
| NFC 卡 | 类比游戏内"Mayor 身份" | 每张卡可绑定一位 Mayor 头像作个性化 |
| 打卡成功 pulse 动画 | 呼应游戏 Kizuna（绊）升级特效 | 用对应"班级色"做光晕扩散 |

**关键术语对照（命名时优先用左列）**：

| 站内（已用） | 可选 IP 化别名 | 备注 |
|------------|------------|------|
| 打卡点 spot | "WARD" / "区" | DB 字段保留 spot；UI 文案可用"区" |
| 成就 / 图纸 | "Kizuna 图鉴" / "旅行图鉴" | UI 命名可借用 |
| 用户 user | "Tripper（旅人）" | 文案用 |
| 管理员 admin | "Chief" | UI 文案用 |

---

## 4. 功能模块清单

> 状态符号：✅ 已上线 · 🚧 开发中 · ⬜ 待办

| 模块 | 状态 | 关键文件 |
|------|------|---------|
| NFC URL 登录（`?nfc=`） | ✅ | `src/hooks/useNfcLogin.js`、`server/routes/auth.js` |
| 用户注册（用户名/密码/城市） | ✅ | `src/pages/Register.jsx` |
| 密码登录（含 `?next=` 跳转） | ✅ | `src/pages/Login.jsx` |
| JWT 鉴权 + 自动刷新 | ✅ | `server/middleware/authenticate.js`、`server/utils/jwt.js` |
| 全局会话（Context） | ✅ | `src/context/AuthContext.jsx` |
| Welcome 落地页 | ✅ | `src/pages/Welcome.jsx` |
| 打卡触发（`?spot=`） | ✅ | `src/hooks/useSpotCheckIn.js`、`server/routes/checkin.js` |
| 打卡结果页（脉冲动效） | ✅ | `src/pages/CheckIn.jsx` ⚠️ 部分死代码，详见 §9 |
| 成就墙（6 格进度） | ✅ | `src/pages/Profile.jsx`、`src/components/AchievementSlot` |
| 后台 - 用户管理 | ✅ | `src/pages/admin/Users.jsx` |
| 后台 - 打卡点管理 | ✅ | `src/pages/admin/Spots.jsx` |
| 后台 - 打卡记录 / 补卡 | ✅ | `src/pages/admin/CheckIns.jsx` |
| 存储适配器（local / 阿里云） | ✅ | `server/storage/` |
| 6 个 spot 的语义命名 | 🚧 | `server/scripts/seed-spots.js`（spot_05/06 仍是"待定"） |
| 6 张图纸正式素材 | ⬜ | 设计稿待交付，目前用 SVG 占位 |
| 头像上传 UI + `/api/upload/avatar` | ⬜ | 存储适配器已就绪，UI/接口未实现 |
| 兑奖闭环 | ⬜ | 现在仅前端展示集齐状态，无后端兑换流程 |
| 部署：云服务器 + Nginx + Let's Encrypt + PM2 | ⬜ | 域名已确认 tyzhome.xyz，未起 |
| 班级/角色主题切换 | ⬜ | IP 化 UI 增强（详见 §10 工作指南） |

---

## 5. 用户角色

| 角色 | 描述 | 来源 |
|------|------|------|
| 普通参与者（Tripper） | 持身份卡的活动参与者，可登录、打卡、看成就墙 | `users.role = 'user'` |
| 管理员（Chief） | 主办方，可管 NFC 卡、补卡、看数据 | `users.role = 'admin'` |
| （未来）志愿者 / 站长 | 可能用于"协助补卡 + 看自己负责的 spot" 但**不能动用户** | 未来扩展，目前未在 schema 内 |

---

## 6. 关键非功能约束

| 约束 | 说明 | 当前应对 |
|------|------|---------|
| **单日 + 500 人峰值** | 流量小但集中（开场半小时内大量登录） | Postgres 单实例够用；预热 db 连接池 |
| **iOS PWA NFC 受限** | 系统级限制，无 Web NFC API | 用 URL 参数 `?nfc=` / `?spot=` 走浏览器路径 |
| **localStorage 存 JWT** | 单日活动无跨设备需求 | 接受 XSS 风险等级，CSP 不严 |
| **中文 UI** | 全站简中 | 所有文案直写中文，未做 i18n 框架 |
| **移动端优先** | 99% 流量来自手机 | Vite + 响应式 CSS；未做桌面端深度优化 |
| **PWA / 可加桌面** | manifest.json 需就位 | ⬜ 待补 |

---

## 7. 数据模型速览

```sql
users (
  id            UUID PK,
  username      TEXT UNIQUE,
  password_hash TEXT,             -- 算法：bcrypt（默认）
  city          TEXT,             -- "城市"，Welcome 页用 + 旅行主题语义
  nfc_token     UUID UNIQUE,      -- 每张卡一个，扫卡 ?nfc=TOKEN 即登录
  role          TEXT,             -- 'user' | 'admin'
  is_registered BOOLEAN,          -- 首次注册区分（卡新发但未填资料）
  deactivated_at TIMESTAMP        -- 软删除
)

check_in_spots (
  id            UUID PK,
  name          TEXT,             -- "签到台" / "主舞台" 等
  spot_token    UUID UNIQUE,      -- 每个打卡点 NFC 一个
  asset_key     TEXT,             -- spot_01..spot_06，对应图纸图片
  display_order INT,              -- 成就墙排序
  active        BOOLEAN
)

check_ins (
  id          UUID PK,
  user_id     UUID FK → users,
  spot_id     UUID FK → check_in_spots,
  checked_at  TIMESTAMP,
  UNIQUE (user_id, spot_id)       -- 防重复打卡
)
```

**派生关系**：
- 成就 = 用 `check_ins ∩ check_in_spots`（按 `display_order`）计算"哪几格已解锁"
- 不另设 `achievements` 表，避免冗余

---

## 8. 技术栈与目录速查

| 模块 | 路径 | 关键入口 |
|------|------|---------|
| 后端入口 | `server/index.js` | Express，挂载 `/api/*` |
| 认证路由 | `server/routes/auth.js` | `/api/auth/nfc-login` / `/register` / `/login` / `/refresh` / `/me` |
| 打卡路由 | `server/routes/checkin.js` | `/api/check-in/*`、`/api/check-in/status` |
| 后台路由 | `server/routes/admin.js` | `/api/admin/*` |
| 中间件 | `server/middleware/{authenticate,requireAdmin}.js` | Bearer JWT 校验 / 角色守卫 |
| DB | `server/db/{schema.sql,index.js}` | pg Pool + query() |
| 存储 | `server/storage/{local,aliyun}.js` | 文件存储适配器 |
| Seed | `server/scripts/{seed-spots,seed-admin}.js` | 6 spot + admin 账号 |
| 联调脚本 | `server/api.http` | VS Code REST Client，23 个请求 |
| 前端 API 客户端 | `src/api/client.js` | `apiFetch()`，自动注入 Bearer |
| 全局会话 | `src/context/AuthContext.jsx` | |
| Hooks | `src/hooks/{useNfcLogin,useSpotCheckIn}.js` | URL 参数触发 |
| 主要页面 | `src/pages/` | Welcome / Register / Login / CheckIn / Profile / admin/ |
| 设计文档 | `docs/superpowers/specs/` | NFC 认证、Hero 改版等 |
| 测试手册 | `docs/testing.md` | 32 个测试用例 |

---

## 9. 现存疑问 / 待决策事项

| # | 项 | 严重度 | 备注 |
|---|----|-------|------|
| 1 | **spot_05 / spot_06 仍叫"待定点位"** | 高 | IP 团队需指派语义；建议结合"角色辖区"或"修学旅行目的地"命名 |
| 2 | **6 张图纸正式素材未交付** | 高 | 阻塞成就墙正式上线，目前是黑色轮廓占位 |
| 3 | **kfk 文件夹的 `f.png` / `h.png` 用途** | 中 | 推测为头像/徽章，需问设计师 |
| 4 | **`烧卖（更新版）`命名** | 低 | "更新版"含义是版本迭代；落到代码 asset_key 时建议改为 `shumai_v2` 之类英文键 |
| 5 | **`CheckIn.jsx` 是否仍被使用** | 中 | `useSpotCheckIn` 已直接跳成就页，旧打卡结果页可能为死代码（详见周报） |
| 6 | **奖品兑换全链路** | 高 | 当前只展示"集齐"，没有兑换码生成/核销 |
| 7 | **班级主题色是否要做用户/spot 绑定** | 中 | 见 §3.3——是否让每张 NFC 绑定一位 Mayor，整站换肤 |
| 8 | **PWA manifest + Service Worker** | 中 | 加桌面、离线降级需求 |
| 9 | **部署链路** | 高 | 云服务器 + Nginx + LE + PM2 流程未跑通 |
| 10 | **iOS PWA NFC 替代体验** | 低 | 已接受用 URL 参数；但首次扫卡的引导文案需补 |

---

## 10. 给 AI Agent 的工作指南

### 接到任务前的"读哪里"

| 任务类别 | 优先读 |
|---------|--------|
| 改业务流程 / 加功能 | `CLAUDE.md`、本文件、`docs/superpowers/specs/` |
| 改 UI / 配色 | `03-visual-identity.md`、`src/styles/`、相关 `*.jsx` |
| 改文案 / 命名 | `01-world-setting.md`、`02-characters.md`、本文件 §3 |
| 改数据模型 | `server/db/schema.sql`、CLAUDE.md "数据模型" |
| 排查 NFC 登录 / 打卡问题 | `docs/superpowers/specs/2026-05-07-nfc-auth-design.md`、`useNfcLogin.js` / `useSpotCheckIn.js` |
| 部署相关 | （待补 spec）目前以 CLAUDE.md 待办为准 |

### 不能违反的约定（摘自 CLAUDE.md 关键决策）

1. **NFC 交互一律走 URL 参数**（`?nfc=` / `?spot=`），不要试图引入 Web NFC API
2. **JWT 一律存 localStorage**，不要换 cookie 方案（单日活动场景已论证）
3. **成就不另建表**，必须从 `check_ins × check_in_spots` 推导
4. **文件存储一律走 `server/storage/` 适配器**，不要在路由里直写文件系统
5. **不要给 `users.username` 加邮箱字段或第三方登录**（单日活动场景刻意简化）

### 何时该 brainstorm，何时直接动手

- **直接动手**：明确的 UI 微调、加字段、加 endpoint、修 bug（且 root cause 清楚）
- **先 brainstorm**：
  - 任何涉及 §9 待决策事项的工作
  - IP 化 UI 改版（涉及命名、视觉、文案三方协同）
  - 兑奖、PWA、部署这类"涉及新链路"的事

### 给文案/UI 改动的"IP 化清单"

写新文案或重命名按钮时，对照 §3.3 表，优先采用 IP 化用语。如：
- ~~"打卡成功"~~ → "**Kizuna +1 · 已抵达 {区名}**"
- ~~"我的成就"~~ → "**旅行图鉴**"
- ~~"管理员后台"~~ → "**Chief Console**"

---

## 11. 文档元信息

- **创建**：2026-05-19，由 Agent 整合本仓库已有文档 + wiki.18t.rip 资料生成
- **整合来源**：`CLAUDE.md`、`README.md`、`docs/testing.md`、`docs/superpowers/specs/*`、`server/scripts/seed-spots.js`、`server/db/schema.sql`、`src/pages` 与 `server/routes` 目录结构
- **同 batch 产出**：`01-world-setting.md` / `02-characters.md` / `03-visual-identity.md`
