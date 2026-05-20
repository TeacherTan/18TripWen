# 18TRIP 待修复 Issue 清单

> 创建时间：2026-05-20
> 分支：`dev-v0.2-glm`
> 上下文：v0.2（成就列表 + 地图二级页 + 伪 3D 场馆图）合并完成后发现的遗留问题

---

## Issue 1：场馆地图交互失效 🔴 **高优先级**

### 现象
访问 `/map/venue` 后：
- 右侧楼层按钮（4F/3F/2F/1F）点击无响应，楼层不切换
- 地图上的 NPC pin 点击无响应
- 桌面端鼠标拖动、移动端手指上下滑动，楼层均不切换
- 底部 40vh NPC 列表渲染正常，但因为 active 楼层无法变化，始终只显示 1F 的居民

### 影响范围
场馆地图整个页面无法交互，用户只能看到默认 1F 静态视图。

### 可疑根因

#### A. 受控组件 active 状态可能未正确传递 / 更新
- `MapVenue.jsx` 用 `useState` 管理 `active`
- `FloorStack` 通过 `onActiveChange={setActive}` 接收回调
- Picker 按钮调用 `onChange?.(f.id)` → 实际是 `setActive` → 触发 MapVenue 重渲染
- **需要验证**：在浏览器 DevTools 中 console.log 这条链路是否真的触发

#### B. `pointer-events: none` 可能从非 active 层泄漏到 picker / pin
- 非 active 楼层 `<div className={styles.floor}>` 设了 `pointerEvents: 'none'`
- 但 picker 与 floorName 是 `.stage` 的子节点，**理论上不受影响**
- 检查点：在浏览器中检查 `.picker button` 的 computed `pointer-events` 是否为 `auto`

#### C. CSS 3D 变换可能改变 hit-test 区域
- `.group { transform-style: preserve-3d }` + 各 floor 的 `translateZ` 让浏览器按变换后的位置做 hit-testing
- 当 floor `translateZ(-160px)` 时，其 visual 投影可能与原 layout box 完全分离
- 但 active floor `translateZ(0)`，应该正好在 group 原位

#### D. `e.target.closest('button')` 短路逻辑可能误判
- `onPointerDown` 当 target 是 button 时 `return`，**完全跳过设置 startY**
- 但 onClick 仍然依赖 React 合成事件冒泡
- **可疑**：是否被 stage 的 React onPointerUp 阻断？

#### E. 构建/缓存问题
- 上一轮改动 agent 跑过 `vite build` 通过，但 dev server 热更新可能未生效
- 验证：清空浏览器缓存 + `npm run dev` 重启

### 相关代码（依赖映射）

| 文件 | 角色 |
|------|------|
| `src/components/FloorStack/FloorStack.jsx` | 主交互逻辑：pointer 事件 + picker 点击回调 |
| `src/components/FloorStack/FloorStack.module.css` | 楼层 3D 变换、`pointer-events: none` 规则、z-index 层级 |
| `src/pages/MapVenue.jsx` | `active` state 持有方，传 `onActiveChange={setActive}` |
| `src/data/mockNpcs.js` | NPC 数据源（mock 永远启用） |
| `src/data/venueFloors.js` | 4 楼层数据 |

### 关键代码片段

**FloorStack.jsx 受控组件签名**（`src/components/FloorStack/FloorStack.jsx:4`）
```jsx
export default function FloorStack({ floors, npcs = [], active, onActiveChange, highlighted, onPickNpc }) {
```

**Pointer 短路逻辑**（`FloorStack.jsx:7-10`）
```jsx
const onPointerDown = (e) => {
  if (e.target.closest('button')) return
  dragRef.current.startY = e.clientY
}
```

**Picker 按钮点击**（`FloorStack.jsx:78-83`）
```jsx
<button
  className={styles.pickerBtn}
  data-active={active === f.id}
  onClick={(e) => { e.stopPropagation(); onChange?.(f.id) }}
>
```

**非 active 层 pointer-events 锁定**（`FloorStack.jsx:45`）
```jsx
pointerEvents: isActive ? 'auto' : 'none',
```

### 修复方向（优先级排序）

1. **浏览器实地 debug**：在 onClick / onActiveChange / setActive 三个位置打 console.log，确认事件链断在哪一环
2. **简化 pointer 逻辑**：把手势处理从 `.stage` 移到独立的"幕布"层（如 `.group` 本身），避免覆盖 picker 区域
3. **fallback 方案**：picker 区域用绝对定位放到 `.stage` 之外（例如 MapVenue 直接渲染 picker，FloorStack 内部不放）
4. **去掉短路依赖**：onPointerDown 不再检查 button，改为在 onPointerUp 时若 `e.target.closest('button')` 直接 return（避免 startY 被设置但 release 在按钮上）

### 验收
- 桌面点击 4F → 楼层切换，列表显示夜班 L4mps（2 人）
- 桌面点击 NPC pin → 黄色高亮 1.8s
- 移动端手指上下拖动 > 60px → 楼层切换
- 底部列表点击 → 跳转 `/npc/:id`

---

## Issue 2：使用统一背景图 🟡 **中等优先级**

### 现象
当前各页面背景色不统一：
- 首页 Home：`<Hero />` 内部用 `背景.png` 作为最底层
- Welcome / Login / Register / Profile：`auth.css` 暗色背景
- Map hub / Changsha / Venue：白色背景
- Admin：单独 admin shell 风格

### 目标
将 `src/assets/main-page/背景.png` 作为整站统一背景，应用于 body 或顶层容器。**例外**：Admin 后台保留原有风格不变。

### 相关代码

| 文件 | 现状 | 需要改动 |
|------|------|---------|
| `src/styles/global.css:16-17` | `body { background: #000; ... }` | 改为 `body { background: url(...) center/cover no-repeat fixed; }` 或通过 CSS 变量统一管理 |
| `src/components/Hero/Hero.jsx:3` | `import bg from '../../assets/main-page/背景.png'` | 移动到全局 / 或保留 Hero 内嵌但加 fallback |
| `src/styles/auth.css` | 自定义暗色背景 | 改为透明或半透明叠加 |
| `src/styles/map.css` | `.map-page { background: #fff }` | 改为透明 + 视情况加白色面板浮于背景上 |
| `src/styles/admin.css` | Admin shell | **不动** |

### 实施要点

1. 把 `背景.png`（重命名后是 `background.png`）放到 `src/assets/` 顶层或 `public/` 下
2. `global.css` 设 `body { background-image: ...; background-attachment: fixed; background-size: cover; }`
3. 各页面背景色改为透明或加 `rgba(255,255,255,.85)` 半透明面板，让背景透出
4. Admin 路由用 body class 切换（例如 `<body className="admin-root">` 在 admin 页禁用背景图）
5. Hero 内的 bg 层可以保留（首页视觉），但 global bg 作为 fallback

### 改动文件（预估）
- `src/styles/global.css` — 设全局背景
- `src/styles/auth.css` — 背景改透明 + 半透明面板
- `src/styles/map.css` — 同上
- `src/components/Hero/Hero.jsx` — 可选：删掉 bg 层（如果 global 已设）
- `src/pages/admin/AdminLayout.jsx` — 加 root class 区分

### 验收
- 任意非 admin 页都看到 `背景.png` 作为底层
- 文字、卡片、表单依然清晰可读（用半透明面板叠加）
- Admin 仍是原 shell 风格不变

---

## Issue 3：中文文件名 PNG 国际化 🟢 **低优先级**

### 现象
`src/assets/main-page/` 下有 13 个中文文件名 PNG。中文文件路径在跨平台（Windows / 部分 CI）和构建工具（某些 bundler）下可能引发：
- URL 编码不一致（`%E5%9D%90%E6%A0%87` vs 原文）
- 部署到对象存储（OSS / S3）时 key 不规范
- 团队协作时 git checkout 失败（macOS NFD vs Linux NFC 编码差异）

### 目标
将所有中文 PNG 重命名为英文，并同步更新所有 import 引用。

### 文件重命名映射表

| 现文件名 | 重命名为 | 说明 |
|---------|---------|------|
| `背景.png` | `background.png` | 主背景图 |
| `标题.png` | `title.png` | 标题图 |
| `日期.png` | `date.png` | 日期贴 |
| `坐标.png` | `coordinates.png` | 坐标贴 |
| `涂鸦.png` | `graffiti.png` | 涂鸦层 |
| `白板.png` | `whiteboard.png` | 白板背景 |
| `黄板.png` | `yellowboard.png` | 黄板背景 |
| `长沙对话框.png` | `changsha-bubble.png` | 长沙对话气泡 |
| `彩带1.png` | `ribbon1.png` | 装饰彩带 |
| `彩带2.png` | `ribbon2.png` | 装饰彩带 |
| `烧卖.png` | `shumai.png` | 吉祥物烧卖 |
| `椛.png` | `momiji.png` | 女主 浜咲椛 |
| `楓.png` | `kaede.png` | 男主 浜咲楓 |

**保留不变**：`1.png`~`5.png`（菜单图标）、`sumai-icon.png`

### 相关代码（需要同步更新的 import）

**`src/components/Hero/Hero.jsx:3-14`** — 12 个 import 全部需要改：

```jsx
// 现状
import bg from '../../assets/main-page/背景.png'
import tuya from '../../assets/main-page/涂鸦.png'
import huangban from '../../assets/main-page/黄板.png'
import baiban from '../../assets/main-page/白板.png'
import zuobiao from '../../assets/main-page/坐标.png'
import riqi from '../../assets/main-page/日期.png'
import biaoti from '../../assets/main-page/标题.png'
import changsha from '../../assets/main-page/长沙对话框.png'
import caidai2 from '../../assets/main-page/彩带2.png'
import shaomai from '../../assets/main-page/烧卖.png'
import hua from '../../assets/main-page/椛.png'
import feng from '../../assets/main-page/楓.png'

// 改为
import bg from '../../assets/main-page/background.png'
import tuya from '../../assets/main-page/graffiti.png'
import huangban from '../../assets/main-page/yellowboard.png'
import baiban from '../../assets/main-page/whiteboard.png'
import zuobiao from '../../assets/main-page/coordinates.png'
import riqi from '../../assets/main-page/date.png'
import biaoti from '../../assets/main-page/title.png'
import changsha from '../../assets/main-page/changsha-bubble.png'
import caidai2 from '../../assets/main-page/ribbon2.png'
import shaomai from '../../assets/main-page/shumai.png'
import hua from '../../assets/main-page/momiji.png'
import feng from '../../assets/main-page/kaede.png'
```

**其它依赖**（grep 结果显示无其他文件引用 `main-page/中文名`，但需要全仓二次确认）：
```bash
grep -rn "main-page/[^a-zA-Z0-9_./-]" src/
```

### 实施步骤

1. **重命名文件**（用 `git mv` 保留历史）：
   ```bash
   cd src/assets/main-page/
   git mv 背景.png background.png
   git mv 标题.png title.png
   git mv 日期.png date.png
   git mv 坐标.png coordinates.png
   git mv 涂鸦.png graffiti.png
   git mv 白板.png whiteboard.png
   git mv 黄板.png yellowboard.png
   git mv 长沙对话框.png changsha-bubble.png
   git mv 彩带1.png ribbon1.png
   git mv 彩带2.png ribbon2.png
   git mv 烧卖.png shumai.png
   git mv 椛.png momiji.png
   git mv 楓.png kaede.png
   ```

2. **更新 Hero.jsx 的 12 个 import**

3. **验证**：
   ```bash
   npm run build  # 必须通过
   npm run dev    # 首页 Hero 视觉无变化
   grep -rn "main-page/[^a-zA-Z0-9_./-]" src/  # 应该无输出
   ```

### 注意事项
- `git mv` 在 macOS 上对中文文件名有时会失败（NFD/NFC 编码），fallback 用：
  ```bash
  mv "背景.png" background.png
  git add -A
  ```
- 如果 Issue 2 同时进行，`background.png` 的位置可能从 `src/assets/main-page/` 移到 `src/assets/` 顶层或 `public/`，重命名时需协调
- 同样的 `Chibi_character_splitting/` 目录有大量中文名，**本 Issue 不涉及**（那些文件未被代码 import，是设计稿原始素材）

### 验收
- `src/assets/main-page/` 下无中文文件名 PNG（保留 `1.png`-`5.png` 与 `sumai-icon.png`）
- `npm run build` 通过
- 首页 Hero 视觉无变化
- git log 看到 `git mv` 历史链路完整

---

## 处理顺序建议

1. **先修 Issue 1**（高优先级，影响核心功能）
2. **再做 Issue 3**（独立、低风险、可并行准备）
3. **最后做 Issue 2**（依赖 Issue 3 完成的 `background.png` 路径，且涉及多页面样式联动）

每个 Issue 单独一个 PR / 一组 commit，避免互相干扰。
