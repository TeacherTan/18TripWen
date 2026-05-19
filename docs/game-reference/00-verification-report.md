# 18TRIP 资料官方交叉验证报告

> **验证日期**：2026-05-19
> **一手来源**：[18trip.jp](https://18trip.jp/) 官方网站（HAMAツアーズ 公式）
> **被验证对象**：本目录 `01-world-setting.md` / `02-characters.md` / `03-visual-identity.md`（原始数据来自 [wiki.18t.rip](https://wiki.18t.rip)）
> **结论速读**：✅ 角色/分组信息全部通过 · 🆕 补充了 6 项官方原文表述 · 🔧 修正了 3 处用词

---

## 1. 验证方法

1. 抓取官网首页 `https://18trip.jp/`（含主视觉、INTRODUCTION 段、NEWS、CHARACTER 索引）
2. 抓取 4 个偶像组合 + Conductors 的完整角色 URL 列表
3. 抽样 4 个角色详情页（Renga / Kafka / Akuta / Nagi）做拼写与归属确认
4. 对照本目录已有 wiki 数据，标记一致 / 不一致 / 新增项

> **官网角色详情页是 SPA 异步渲染**，无法用单次 HTTP 拉到 infobox 数据（年龄/身高/HEX 等仍以 wiki infobox 为准）。但**URL slug 即官方拼写**，已可用于校验姓名与分组归属。

---

## 2. ✅ 已验证一致的内容

### 2.1 全部 20 区长 + 4 Conductor 的姓名与分组

官网 URL `https://18trip.jp/character/{team}/{slug}/` 直接对应本目录角色档案，**完全一致**：

| Team | 官网 slug | 本目录角色（02-characters.md） |
|------|----------|----------------------------|
| r1ze | renga-nishizono / kafka-oguro / ten-murakumo / yukikaze-kamina / lu-liguang | 西园练牙 / 大黑可不可 / 丛云添 / 神名雪风 / 鹿礼光 |
| day2 | akuta-isotake / kiroku-kinugawa / muneuji-kaguya / nanaki-nanamegi / ushio-kurama | 五十竹 / 衣川季肋 / 辉矢宗氏 / 斜木七基 / 久乐间潮 |
| ev3ns | raito-kitakata / kinari-azekawa / chihiro-natsuyaki / tao-kinouchi / kuguri-domeki | 来人 / 几成 / 千弥 / 太绪 / 潜 |
| l4mps | nagi-hachinoya / toi-shiramitsu / ryui-shiramitsu / yodaka-natsume / netaro-yowa | 凪 / 糖衣 / 琉衣 / 夜鹰 / 夜半 |
| conductors | yachiyo-fuefuki / sakujiro-karigane / nayuki-kitakata / hiroshi-daniel-iwabuchi | 笛吹也千代 / 雁金朔次郎 / 北片生行 / 岩渕ヒロシダニエル |

### 2.2 其它通过项

- ✅ 4 个组合的英文名 R1ze / Day2 / Ev3ns / L4mps（首页主视觉直接出现）
- ✅ HAMA 18 区设定 + 独立观光特区背景（首页 INTRODUCTION 段一致）
- ✅ 主角与 Kafka Oguro 青梅竹马的关系（首页"幼なじみに巻き込まれるまま"）
- ✅ 主角 = 浜咲椛 / 浜咲楓 二选一
- ✅ Shumai 烧卖是 Kafka 的狗 & 吉祥物
- ✅ 各角色所属辖区编号（HAMA n）

---

## 3. 🆕 新增的官方原文（已并入 01-world-setting.md）

| 项 | 官方原文 | 价值 |
|---|---|---|
| **游戏简称** | エイトリ（Eitori） | 官方 og:title、meta keywords 使用 |
| **品类正式定位** | 近未来おもてなしアドベンチャー | 比"Adventure Gacha"更精准的官方分类 |
| **公司日文写法** | HAMAツアーズ | 优先于 "HAMA Tours" |
| **故事起始时刻** | 2024.04.16 (SAT) 13:00 / 17.4°C ☀ | 官网首页固定的"现在时"，与上线日 5/23 不同 |
| **官方 Hashtag** | `#HAMA NICE TRIP` / `#EIGHTEEN TRIP` | 同人活动文案/社媒可直接复用 |
| **核心隐喻：卡带 A/B 面** | "The memories of a trip are like a single cassette tape..." | 全作叙事的根隐喻，直接对应游戏内 `18TRIP Cassette ♯01–13`；本项目的"6 格图纸"成就墙、"打卡留念"等都可以借鉴此设计语言 |

### 关键标语（设计/文案可直接引用）

- **おもてなしに賭ける情熱**（燃烧在款待之上的热情）
- **少し不思議なハプニング**（微妙不可思议的意外）
- **誰にも言えない荷物を抱えた観光区長たち**（背负不能言说包袱的观光区长们）
- **たくさんのできごとがカセットに吹き込まれ、忘れられない旅の思い出に代わる**（许许多多的事被吹入卡带，化作不可忘却的旅程记忆）

---

## 4. 🔧 修正的用词（已就地修订）

| 旧（wiki 派生） | 新（官方） | 出处 |
|---|---|---|
| Independent Special Tourism Zone | **独立観光特区**（Independent Tourism Special Zone） | 官网 INTRODUCTION |
| HAMA Tours / ハマツアーズ | **HAMAツアーズ** | 官网正文统一写法 |
| "冒险 + 抽卡（Adventure Gacha）" | **近未来おもてなしアドベンチャー** | 官网 meta keywords |
| 仅写"特别观光区资格" | **独立観光特区** 的取消危机 | 官网 INTRODUCTION 完整描述 |

---

## 5. ⚠️ 仍未通过官方一手资料验证的字段

以下数据仍以 wiki.18t.rip 为唯一来源。如需在重要文案（如线下物料、对外宣传）中使用，建议进一步通过游戏内截图 / 官方推特 / 官方资料集二次核实。

- 各角色 **Image Color HEX**（官网详情页 JS 异步加载，单次 HTTP 抓不到）
- 各角色的**年龄 / 身高 / 生日 / 声优**（官网为 SPA 渲染，未在静态 HTML 中暴露）
- 烧卖（Shumai）的**声优**（中島ヨシキ）
- 各组合的**首次修学旅行目的地**（KOBE / 小豆岛 / 别府 / 函馆）
- KOBE Mayors 3 人的具体身份
- Sub Characters 5 人的具体身份

> 这些字段的 wiki 来源在编辑社区里被反复维护、与游戏内文本一致的可能性很高，可视为"高可信但非一手"。

---

## 6. 影响范围

| 文档 | 是否更新 | 更新内容 |
|------|---------|---------|
| `01-world-setting.md` | ✅ 已更新 | §1 游戏概要表 + §2 核心驱动事件 + §2 新增"卡带 A/B 面隐喻"小节 + §3 术语表官方写法 |
| `02-characters.md` | ✅ 已更新（仅元信息） | 文档头部增加官方交叉验证说明；数据本体未变 |
| `03-visual-identity.md` | — 不变 | 配色信息未在官网首页暴露，依旧以 wiki HEX 为准 |
| `04-project-context.md` | — 不变 | 项目侧文档，不直接引用 IP 一手资料 |

---

## 7. 信息来源清单

| URL | 用途 |
|-----|------|
| https://18trip.jp/ | 主页（INTRODUCTION、NEWS、CHARACTER 索引、META 标签） |
| https://18trip.jp/character/{team}/{slug}/ | 25 个角色详情页（用于 URL slug 校验） |
| https://wiki.18t.rip/wiki/18TRIP_Wiki | 社区 wiki，被验证侧 |
