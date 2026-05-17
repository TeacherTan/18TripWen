# 打卡与成就墙系统 — 已实现参考摘要

**状态：Phase 2 已完成**（commit `56cf3dd`）

---

## 打卡流程（当前行为）

```
用户碰打卡点 NFC (?spot=TOKEN)
  ├─ 已登录（已注册）→ POST /api/check-in → navigate('/profile', state: { checkInResult })
  │                    → Profile 页加载成就墙 + 弹窗显示本次打卡 spot 结果
  └─ 未登录 → 跳 /login?next=/?spot=TOKEN，登录后重新触发
```

> **注**：之前打卡结果在独立的 `/checkin` 页面展示；已改为直接进入成就页面（`/profile`），spot 结果以弹窗呈现。`CheckIn.jsx` 页面保留但不再通过 `useSpotCheckIn` 跳转到它。

## 实现路径

1. 打卡路由（`server/routes/checkin.js`）：
   - `POST /api/check-in` — 验证 spotToken + 幂等检查（已打卡返回 `alreadyCheckedIn: true`）→ INSERT `check_ins`
   - `GET /api/check-in/status` — 返回全部 spot 及当前用户解锁状态（成就墙数据源）
   - `GET /api/check-in/spots` — 公开接口，返回全部打卡点列表
2. Hook：`useSpotCheckIn`（`src/hooks/useSpotCheckIn.js`）— 检测 `?spot=TOKEN`，调接口，导航到 `/profile`
3. 页面：`Profile.jsx`（`src/pages/Profile.jsx`）
   - 加载 `/api/check-in/status` 渲染 6 格成就墙
   - 读取 `location.state.checkInResult` → 显示打卡结果弹窗（`checkin-modal-overlay`）
4. 组件：`AchievementSlot`（`src/components/AchievementSlot/`）
   - props：`assetKey / name / unlocked / highlighted`
   - `highlighted` 触发 `unlock-pulse` 动画

## 关键约定

- 成就状态无独立表，直接由 `check_ins × check_in_spots` 连表推导
- `UNIQUE(user_id, spot_id)` 防重复打卡（单日活动，无需多日）
- `asset_key`（如 `spot_01`）拼接前端图纸路径，设计师替换文件即可，无需改代码
- 成就图片路径约定：`src/assets/achievements/spot_0N_locked.svg` / `spot_0N_unlocked.png`（设计稿待交付）

## Mock 打卡点（seed 固定 token）

| 点位 | spot_token |
|------|-----------|
| 签到台 | `11111111-0000-0000-0000-000000000001` |
| 主舞台 | `11111111-0000-0000-0000-000000000002` |
| 市集区 | `11111111-0000-0000-0000-000000000003` |
| 拍照打卡墙 | `11111111-0000-0000-0000-000000000004` |
| 待定点位5 | `11111111-0000-0000-0000-000000000005` |
| 待定点位6 | `11111111-0000-0000-0000-000000000006` |

测试 URL：`http://localhost:5173/?spot=11111111-0000-0000-0000-000000000001`
