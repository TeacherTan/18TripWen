# Hero & Menu 首页组件 — 已实现参考摘要

**状态：已完成**（commits `698067c` / `260a30c` / `a782563` 等早期提交）

---

## 实现路径

1. `Hero` 组件（`src/components/Hero/Hero.jsx`）
   - 13 层素材叠加，全部 `position: absolute`，坐标用百分比适配不同屏宽
   - 纯 CSS keyframes 动画：浮动（`float`）+ 摇摆（`sway`），`transform` 驱动 GPU 合成层
   - 容器：`100dvh`，`max-width: 430px`，`overflow: hidden`
2. `Menu` 组件（`src/components/Menu/Menu.jsx`）
   - 5 条导航项，奇数行图标在左、偶数行图标在右（`flex-direction: row-reverse`）
   - 字体：Intel One Mono（Google Fonts）
3. PWA：`vite-plugin-pwa`，`registerType: autoUpdate`，预缓存所有静态资源

## 素材位置

`src/assets/main-page/` — 13 张 Hero 层叠图片 + 5 张 Menu 图标

## 约定

- `App.jsx` 首页路由渲染顺序：`<Hero /> → <Menu />`
- 动画属性全部用 `transform`，不触发 layout/paint
- 菜单项点击目标页面尚未接入（点击跳转为后续迭代）
