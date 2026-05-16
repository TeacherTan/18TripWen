# 18TRIP OnLy 长沙

NFC 打卡 PWA — 单日活动身份验证与成就墙系统

**域名**: tyzhome.xyz | **状态**: Phase 1–3 完成，待部署

---

## 功能概览

- **NFC 登录**: 碰身份卡 → `?nfc=TOKEN` → 自动登录或引导注册
- **打卡**: 碰打卡点 NFC → `?spot=TOKEN` → 记录打卡 + 解锁图纸
- **成就墙**: 个人页展示 6 格图纸进度（黑色轮廓占位，设计稿待交付）
- **管理后台**: 用户管理、打卡点管理、补卡、数据迁移

---

## 快速开始

**前置依赖**: Docker、Node 18+

```bash
npm install
cp .env.example .env
npm run db:reset    # 启动 Postgres + 建表 + 灌 seed，打印 admin nfc_token
npm run dev         # 前端 :5173 + 后端 :3000
```

- 前端: http://localhost:5173
- 后端 API: http://localhost:3000/api
- 管理后台: http://localhost:5173/admin（用户名 `admin` / 密码 `admin123`）

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + Vite + React Router 7 |
| 后端 | Express 5 + Node.js |
| 数据库 | PostgreSQL 16（Docker） |
| 认证 | JWT（localStorage，30 天有效期） |
| NFC 交互 | URL 参数（`?nfc=` / `?spot=`） |
| 文件存储 | 本地磁盘（适配器保留 OSS 切换能力） |
| PWA | vite-plugin-pwa（manifest + service worker） |

---

## 项目文档

| 文档 | 说明 |
|------|------|
| [`docs/testing.md`](docs/testing.md) | 测试手册：32 个用例、环境配置、测试账号、API 调试 |
| [`CLAUDE.md`](CLAUDE.md) | 项目架构说明、目录结构、设计决策、待办清单 |
| [`server/api.http`](server/api.http) | VS Code REST Client 联调脚本（23 个请求） |
| [`docs/superpowers/specs/`](docs/superpowers/specs/) | NFC 方案设计、打卡成就 PRD、部署方案 |

---

## NFC 写卡说明

推荐工具: **NFC Tools**（iOS / Android），芯片 **NTAG213**

| 卡类型 | 写入内容 |
|--------|----------|
| 身份卡 | `https://tyzhome.xyz/?nfc=<NFC_TOKEN>` |
| 打卡点 | `https://tyzhome.xyz/?spot=<SPOT_TOKEN>` |

本地测试时将域名替换为电脑局域网 IP。

---

## 开发分支

- `main` — 稳定版本
- `dev-claude` — Phase 1–3 完整实现（NFC 认证 + 打卡成就墙 + 管理后台）
