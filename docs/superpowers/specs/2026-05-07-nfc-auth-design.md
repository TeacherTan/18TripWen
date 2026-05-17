# NFC 系统总览 — 参考索引

**项目：** 18TRIP OnLy 长沙  
**最后更新：** 2026-05-17

---

## 功能文档索引

| 功能 | 文档 | 状态 |
|------|------|------|
| Hero & Menu 首页 | [2026-05-06-hero-menu-redesign.md](2026-05-06-hero-menu-redesign.md) | ✅ 已完成 |
| 用户认证系统 | [features/auth-system.md](features/auth-system.md) | ✅ Phase 1 完成 |
| 打卡与成就墙 | [features/checkin-achievement.md](features/checkin-achievement.md) | ✅ Phase 2 完成 |
| 后台管理系统 | [features/admin-management.md](features/admin-management.md) | ✅ Phase 3 完成 |
| 部署与运维 | [features/deployment.md](features/deployment.md) | ⏳ Phase 4 待执行 |

---

## 整体架构

```
NFC 身份卡 (?nfc=USER_TOKEN)  →  登录/注册  →  /welcome
NFC 打卡点 (?spot=SPOT_TOKEN) →  打卡       →  /profile（弹窗展示结果）
密码登录                       →             →  /welcome
```

## 快速启动

```bash
npm run db:reset   # 建表 + seed（打印 admin nfc_token）
npm run dev        # Vite:5173 + Express:3000
```

## 待办（不阻塞测试）

- [ ] 设计师交付：6 张解锁图纸（`spot_01`~`spot_06`）+ 6 个黑色轮廓 SVG
- [ ] 头像上传 UI + `/api/upload/avatar` 接口
- [ ] Phase 4：部署（见 `features/deployment.md`）
