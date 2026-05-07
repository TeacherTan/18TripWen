# 18TripWen Hero & Menu 重构设计文档

## 概述

基于 Figma 设计稿（文件 `KuDxPsLHtn09WR8d8xfDLu`）对首页 Hero 区域和导航菜单区域进行重构。原设计文档中 Hero 为 Swiper 轮播 + 渐变占位图，本次改为多层素材叠加 + CSS 动画；Hero 之后新增 Menu 导航菜单组件。

## 技术栈（不变）

- React 18+ / Vite / CSS Modules / JavaScript (JSX)
- 动画方案：**纯 CSS keyframes**，零依赖

---

## 一、Hero 组件重构

### 布局

- 容器：`position: relative`，`height: 100dvh`，`max-width: 430px`，水平居中，overflow hidden
- 桌面端两侧以页面背景色（`#000`）填充
- 移动端全宽，以 iPhone 16（390px 宽）为核心适配目标

### 素材来源

所有素材位于 `src/assets/main-page/`（从项目根目录 `MainPageElements/` 迁移）。

### 图层结构（z-index 从低到高）

| z-index | 文件 | 动画类型 | 参数 |
|---------|------|----------|------|
| 1 | `背景.png` | 静止 | — |
| 2 | `涂鸦.png` | 上下浮动 | ±3px, 8s |
| 3 | `黄板.png` | 轻微旋转摇摆 | rotate ±1°, 6s |
| 4 | `白板.png` | 轻微旋转摇摆 | rotate ±1.5°, 7s |
| 5 | `坐标.png` | 上下浮动 | ±5px, 4s |
| 6 | `日期.png` | 上下浮动 | ±4px, 5s, delay 0.5s |
| 7 | `标题.png` | 上下浮动 | ±6px, 3.5s |
| 8 | `长沙对话框.png` | 上下浮动 | ±8px, 3s, delay 1s |
| 9 | `彩带1.png` | 上下浮动 | ±10px, 4s, delay 1s |
| 10 | `彩带2.png` | 上下浮动 | ±8px, 5s, delay 2s |
| 11 | `烧卖.png` | 上下浮动 | ±10px, 2.5s, delay 0.8s |
| 12 | `椛.png` | 上下浮动 | ±8px, 4s, delay 0.3s |
| 13 | `楓.png` | 上下浮动 | ±8px, 4.5s, delay 1.5s |

### CSS 动画规则

所有上下浮动元素共用一个 keyframe，通过 `duration` 和 `delay` 错开节奏：

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-Xpx); }  /* X 由各元素自定义 */
}

/* 通用属性 */
animation-timing-function: ease-in-out;
animation-iteration-count: infinite;
animation-fill-mode: both;
```

旋转摇摆元素（黄板/白板）使用独立 keyframe：

```css
@keyframes sway {
  0%, 100% { transform: rotate(0deg); }
  50%       { transform: rotate(Xdeg); }
}
```

所有动画属性使用 `transform` 驱动，触发 GPU 合成层加速，不引起 layout/paint。

### 元素定位

每个素材使用 `position: absolute`，坐标以百分比（`%`）为单位，基于 Figma 设计稿换算，确保在不同手机宽度下自适应比例。

---

## 二、Menu 导航菜单组件（新增）

### 位置

紧接 Hero 组件之后，页面向下滚动可见。

### 菜单项

| # | 图标文件 | 中文 | 英文副标题 | 图标位置 |
|---|----------|------|------------|----------|
| 1 | `1.png` | 地图 | MAP | 左 |
| 2 | `2.png` | 区长情报 | CHARACTER | 右 |
| 3 | `3.png` | 仓库 | HUB | 左 |
| 4 | `4.png` | 研修旅行 | TRAVEL PLAY | 右 |
| 5 | `5.png` | 联系我们 | CONTACT US | 左 |

> 注：「联系我们」英文暂定 CONTACT US，后续可更新。

### 布局规则

- 奇数行（1/3/5）：`[图标]` 在左，`[文字]` 在右
- 偶数行（2/4）：`[文字]` 在左，`[图标]` 在右（`flex-direction: row-reverse`）
- 每行为 flexbox，`align-items: center`，适当内边距
- 图标尺寸：约 60~80px，与文字行高对齐

### 文字样式

- 中文主标题：`font-family: 'Intel One Mono', monospace`，约 `36px`（与 Figma 一致）
- 英文副标题：同字体，较小字号（约 `14px`），字母间距宽松（`letter-spacing: 0.1em`），颜色略淡（`#888`）
- 颜色：黑色文字，白色背景区域（与 Figma 菜单页一致）
- 字体引入：Intel One Mono 为 Google Fonts 字体，在 `global.css` 中通过 `@import` 引入，或在 `index.html` 中添加 `<link>` 标签

### 图标来源

`src/assets/main-page/1.png` ～ `5.png`（从 `MainPageElements/` 迁移）

---

## 三、资源目录结构

```text
src/
└── assets/
    └── main-page/
        ├── 背景.png
        ├── 涂鸦.png
        ├── 黄板.png
        ├── 白板.png
        ├── 坐标.png
        ├── 日期.png
        ├── 标题.png
        ├── 长沙对话框.png
        ├── 彩带1.png
        ├── 彩带2.png
        ├── 烧卖.png
        ├── 椛.png
        ├── 楓.png
        ├── 1.png
        ├── 2.png
        ├── 3.png
        ├── 4.png
        └── 5.png
```

---

## 四、组件文件结构（新增/修改）

```text
src/components/
├── Hero/
│   ├── Hero.jsx          # 重构：多层绝对定位 + CSS 动画
│   └── Hero.module.css   # 重构：keyframes + 各层定位
└── Menu/                 # 新增
    ├── Menu.jsx
    └── Menu.module.css
```

`App.jsx` 渲染顺序：`Header → Hero → Menu → News → Introduction → Character → SocialLinks → Footer`

---

## 五、PWA 支持

### 依赖

- `vite-plugin-pwa`（Vite PWA 插件，自动生成 Service Worker + Manifest）

### 配置

在 `vite.config.js` 中注册插件：

```js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '18TRIP OnLy 长沙',
        short_name: '18TRIP',
        description: '18TRIP OnLy 长沙站活动页',
        theme_color: '#4caf50',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,woff2}']
      }
    })
  ]
})
```

### 图标

需要在 `public/` 下放置：

- `icon-192.png`（192x192）
- `icon-512.png`（512x512）

可从 `MainPageElements/` 中裁切角色或标题图作为应用图标。

### 效果

- iOS Safari：「添加到主屏幕」后以独立窗口打开，无浏览器 UI
- Android Chrome：安装提示，全屏应用体验
- 离线支持：Service Worker 预缓存所有静态资源（13个素材 PNG + 5个图标 PNG），弱网/离线可用

---

## 六、不在本次范围内

- 各菜单项点击跳转的子页面实现
- 菜单项 hover 交互效果（可后续迭代）
- Hero 加载动画（loader）的保留或移除（待定）
