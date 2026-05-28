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

## 前端设计参考

### 成就列表图标（AchievementListItem）

**容器尺寸**：`iconWrap` 固定 56×56px，`object-fit: contain`。

**venue 队标图片规则**（经实测确认）：

- `width: 80%`，不限制 height（让图片按原始比例自然撑高）  
  → 队标为非正方形图片，若同时约束宽高或使用 `width/height: 75%`，图片会被强制裁切；只约束宽度可保留完整比例。
- **无需垂直偏移**（`transform: translateY` 不需要）；`display: grid; place-items: center` 已自然居中。

**锁定态**：`.iconLocked { filter: grayscale(100%) opacity(0.4) }`  
→ 队标在未解锁状态也可见，灰度半透明提示"待解锁"。

**图标文件映射**（`AchievementListItem` 与 `AchievementSlot` 共用 `ICON_MAP`，按 `asset_key` 查表）：

venue 队标（`src/assets/`）：

| asset_key | 文件 | 场地 |
|-----------|------|------|
| venue_01 | R1ze.png | 朝班 |
| venue_02 | Day2.png | 昼班 |
| venue_03 | Ev3ns.png | 夕班 |
| venue_04 | L4mps.png | 夜班 |

extra 成就图标（256×256 透明底正方形，已统一裁掉留白）：

| asset_key | 文件 | 成就 |
|-----------|------|------|
| extra_plan | kfk/Airplane.png | 计划通 |
| extra_buyall | kfk/Sign.png | 我全都要 |
| extra_photo | kfk/Camera.png | 谁的一瞬间 |
| extra_fortune | 夜班/糖衣.png | 命运所指向 |
| extra_painter | 昼班/衣川季肋.png | 那位神秘的画家 |

> 路径均相对 `src/assets/Chibi_character_splitting/`。`Pin.png` 暂未分配。

---

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
