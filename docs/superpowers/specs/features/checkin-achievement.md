# 功能文档：打卡与成就墙系统

**优先级：P0（最高）**
**依赖：用户认证系统**

---

## 功能概述

用户在活动场地碰触打卡点 NFC 贴纸，系统记录签到并在个人成就墙解锁对应图纸。活动为单日，每人每点只能打一次卡，共 6 个点位对应 6 张图纸。

---

## NFC 打卡点设计

- 每个打卡点拥有唯一 UUID v4 token，写入固定在场地内的 NFC 贴纸
- NFC 芯片写入：`https://tyzhome.xyz/?spot=<SPOT_UUID>`
- 每个打卡点对应成就墙上一个固定槽位的图纸（`display_order` 字段决定位置）
- 管理员可新增/停用打卡点

### Mock 数据（开发用）

开发阶段使用以下 6 个打卡点，通过 `server/scripts/seed-spots.js` 初始化入库。`spot_token` 固定，方便本地测试时写入 NFC 或直接访问 URL。

```js
// server/scripts/seed-spots.js
const spots = [
  { name: '签到台',     asset_key: 'spot_01', display_order: 1, spot_token: '11111111-0000-0000-0000-000000000001' },
  { name: '主舞台',     asset_key: 'spot_02', display_order: 2, spot_token: '11111111-0000-0000-0000-000000000002' },
  { name: '市集区',     asset_key: 'spot_03', display_order: 3, spot_token: '11111111-0000-0000-0000-000000000003' },
  { name: '拍照打卡墙', asset_key: 'spot_04', display_order: 4, spot_token: '11111111-0000-0000-0000-000000000004' },
  { name: '待定点位5',  asset_key: 'spot_05', display_order: 5, spot_token: '11111111-0000-0000-0000-000000000005' },
  { name: '待定点位6',  asset_key: 'spot_06', display_order: 6, spot_token: '11111111-0000-0000-0000-000000000006' },
];
```

测试打卡 URL 示例：

```
https://tyzhome.xyz/?spot=11111111-0000-0000-0000-000000000001
```

> 上线前由管理员在后台维护真实点位名称，mock token 仅供开发环境使用。

---

## 打卡流程

```
用户碰触打卡点 NFC
  → 浏览器打开 https://tyzhome.xyz/?spot=<TOKEN>
  → 前端检测 ?spot=TOKEN
  → 检查登录状态（JWT 有效 或 密码登录中）
    ├─ 已登录 → POST /api/check-in { spotToken }
    │           → 后端验证 spotToken 有效且 active
    │           → 检查是否已打卡（应用层先查，避免 DB 唯一约束报错）
    │             ├─ 未打卡 → INSERT check_ins → 返回 { success, spot, alreadyCheckedIn: false }
    │             └─ 已打卡 → 返回 { success, spot, alreadyCheckedIn: true }
    │           → navigate('/checkin', { state: result })
    └─ 未登录 → 提示"请先碰身份卡登录"，显示登录入口
```

---

## 数据库

### check_in_spots 表

```sql
CREATE TABLE check_in_spots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(50) NOT NULL,
  spot_token    UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  asset_key     VARCHAR(50) NOT NULL,   -- 对应前端图纸资源标识，如 spot_01
  display_order SMALLINT NOT NULL,      -- 在成就墙上的固定槽位序号（1-6）
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### check_ins 表

```sql
CREATE TABLE check_ins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  spot_id    UUID NOT NULL REFERENCES check_in_spots(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, spot_id)
);
```

`UNIQUE(user_id, spot_id)` 保证每人每点只打一次，活动为单日，无需多日场景。

> `achievements` 表不再需要：成就墙直接由 `check_ins` ✕ `check_in_spots` 连表计算，无独立成就记录表。

---

## 成就墙设计

### 概念

成就墙是用户个人页的核心展示区，固定 6 个槽位，每个槽位对应一个打卡点的图纸。槽位顺序由 `display_order` 字段决定，与打卡顺序无关。

### 槽位状态

| 状态 | 触发条件 | 视觉表现 |
|------|----------|----------|
| 未解锁 | 该点位尚未打卡 | 黑色轮廓图标（placeholder，待设计师提供） |
| 已解锁 | 该点位已打卡 | 完整图纸图片 |

### 前端资源约定

```
src/assets/achievements/
  ├─ spot_01_locked.svg     # 黑色轮廓（所有 locked 状态暂用同一占位图，或各自一套）
  ├─ spot_01_unlocked.png   # 设计师提供的图纸（待交付，先用占位图）
  ├─ spot_02_locked.svg
  ├─ spot_02_unlocked.png
  └─ ...（共 6 套）
```

`asset_key`（如 `spot_01`）由后端随打卡点数据一起返回，前端据此拼接资源路径，设计师交付图纸后直接替换文件，无需改代码。

### 数据加载

成就墙所需数据通过 `GET /api/check-in/status` 一次性返回，结构如下：

```json
{
  "spots": [
    { "id": "uuid", "name": "签到台", "asset_key": "spot_01", "display_order": 1, "unlocked": true,  "checked_at": "2026-05-17T10:00:00Z" },
    { "id": "uuid", "name": "主舞台", "asset_key": "spot_02", "display_order": 2, "unlocked": false, "checked_at": null },
    ...
  ],
  "total": 6,
  "unlocked_count": 1
}
```

前端按 `display_order` 排序渲染 6 个槽位，`unlocked: true` 加载图纸图片，`false` 加载黑色轮廓占位图。

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/check-in` | `Bearer JWT` + `{ spotToken }` → 打卡结果 |
| GET  | `/api/check-in/status` | `Bearer JWT` → 成就墙完整状态（含所有点位解锁情况） |
| GET  | `/api/check-in/spots` | 所有可打卡点列表（公开，无需登录） |

### POST /api/check-in 详细

```
1. 验证 JWT
2. 查找 spot_token 对应的 spot，不存在或 inactive → 404
3. 查 check_ins 是否已有 (userId, spotId) 记录
   ├─ 有 → 返回 { success: true, alreadyCheckedIn: true, spot: { name, asset_key, display_order } }
   └─ 无 → INSERT check_ins
4. 返回 { success: true, alreadyCheckedIn: false, spot: { name, asset_key, display_order } }
```

（成就检查逻辑移除，解锁状态直接由 check_ins 记录推导）

---

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/checkin` | CheckIn.jsx | 打卡结果页 |
| `/profile` | Profile.jsx | 个人资料页，含成就墙 |

### 打卡结果页（CheckIn.jsx）

- 显示打卡点名称
- 已打卡：提示"你已在此打过卡"，展示该槽位图纸
- 首次打卡：展示解锁动画 + 图纸揭示效果（黑色轮廓 → 彩色图纸）
- 显示当前进度（如"已解锁 3/6 张图纸"）
- "继续探索"按钮：`navigate('/', { replace: true })`

### 个人资料页（Profile.jsx）

- 用户信息：头像、用户名、城市
- 成就墙：6 个固定槽位，按 `display_order` 排列
  - 已解锁：图纸图片
  - 未解锁：黑色轮廓占位图
- 进度文字：「已集齐 N/6 张图纸」

---

## UI 交付物清单（待设计师提供）

| 资产 | 数量 | 说明 |
|------|------|------|
| 成就墙整体布局稿 | 1 张 | 含 6 个槽位的排列方式、整体风格 |
| 各点位图纸（已解锁） | 6 张 | 对应 spot_01 ～ spot_06，PNG/WebP |
| 黑色轮廓占位图（未解锁） | 6 张（或 1 张通用） | SVG 优先，便于缩放 |
| 解锁动画参考 | 1 份 | 描述轮廓 → 图纸的过渡效果方向即可 |

> 设计师未交付前，开发阶段使用统一黑色方块作为 locked 占位，灰色方块作为 unlocked 占位。
