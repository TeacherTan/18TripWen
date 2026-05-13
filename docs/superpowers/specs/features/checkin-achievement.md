# 功能文档：打卡与成就系统

**优先级：P0（最高）**
**依赖：用户认证系统**

---

## 功能概述

用户在活动场地碰触打卡点 NFC 贴纸，系统记录签到并检查成就解锁。活动为单日，每人每点只能打一次卡。

---

## NFC 打卡点设计

- 每个打卡点拥有唯一 UUID v4 token，写入固定在场地内的 NFC 贴纸
- NFC 芯片写入：`https://yoursite.com/?spot=<SPOT_UUID>`
- 管理员可新增/停用打卡点

---

## 打卡流程

```
用户碰触打卡点 NFC
  → 浏览器打开 https://yoursite.com/?spot=<TOKEN>
  → 前端检测 ?spot=TOKEN
  → 检查登录状态
    ├─ 已登录 → POST /api/check-in { spotToken }
    │           → 后端验证 spotToken 有效
    │           → 检查是否已打卡（应用层先查，避免 DB 唯一约束报错）
    │             ├─ 未打卡 → 记录签到，检查成就，返回 { success, newAchievements }
    │             └─ 已打卡 → 返回 { alreadyCheckedIn: true, spotName }
    │           → navigate('/checkin', { state: result })
    └─ 未登录 → 提示"请先碰身份卡登录"
```

---

## 数据库

### check_in_spots 表

```sql
CREATE TABLE check_in_spots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,
  spot_token  UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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

UNIQUE 约束保证每人每点只打一次，活动为单日，无需考虑多日场景。

### achievements 表

```sql
CREATE TABLE achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  achievement VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement)
);
```

---

## 成就规则

| 成就标识 | 解锁条件 | 显示名称（建议） |
|----------|----------|-----------------|
| `first_checkin` | 首次打卡 | 初次到访 |
| `all_spots` | 打卡全部点位 | 全场通行 |

更多成就规则待活动打卡点数量确认后定义。

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/check-in` | `Bearer JWT` + `{ spotToken }` → 打卡结果 + 新成就 |
| GET | `/api/check-in/status` | `Bearer JWT` → 当前用户打卡点和成就状态 |
| GET | `/api/check-in/spots` | 所有可打卡点列表（公开，无需登录） |

### POST /api/check-in 详细

```
1. 验证 JWT
2. 查找 spot_token 对应的 spot，不存在或 inactive → 404
3. 查 check_ins 是否已有 (userId, spotId) 记录
   ├─ 有 → 返回 { alreadyCheckedIn: true, spotName, checkedAt }
   └─ 无 → INSERT check_ins
4. 检查成就
5. 返回 { success: true, spotName, newAchievements: [...] }
```

---

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/checkin` | CheckIn.jsx | 打卡结果页，展示打卡点位名、已打卡进度、新解锁成就 |
| `/profile` | Profile.jsx | 个人资料页，含打卡进度与成就列表 |

### 打卡结果页

- 显示打卡点位名称
- 显示打卡进度（如 "3/5 已打卡"）
- 如有新成就解锁，展示成就动画/提示
- "继续探索"按钮：`navigate('/', { replace: true })`

### 个人资料页

- 用户信息（头像、用户名、城市）
- 打卡进度：各点位打卡状态
- 成就列表：已解锁成就及解锁时间
