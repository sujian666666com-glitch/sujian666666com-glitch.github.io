## 背景与现状

主站是 Hugo + PaperMod，首页使用 profile mode 与自定义 `index_profile.html`，普通博客索引、文章页、daily 列表与 daily 正文都已做过定制布局。当前全站在 `layouts/partials/extend_head.html` 引入 `animate.css` CDN，并在 `layouts/_default/list.html`、`layouts/_default/single.html`、`layouts/daily/list.html`、`layouts/daily/single.html` 中散落 `animate__fadeInDown`、`animate__fadeInUp` 和内联延迟。

根目录 `design.md` 的 Motion Stance 已明确：

- 默认是 motion-cut，页面首先应像一份印刷刊物。
- 只允许克制的 masthead fade 或 proof-card reveal。
- 避免 animate.css 全页入场、弹跳、hover scale、transition-all、视差。
- reduced motion 应使用极短 opacity crossfade 或无动画。

因此，本次设计目标不是“增加更多动画”，而是把现有分散动画收敛为可维护、可降级、可验收的 GSAP 动效层。

## 目标

- 用 GSAP 替代主站对 `animate.css` CDN 的依赖。
- 集中管理首屏入场与列表滚动 reveal，减少模板内散落的动效细节。
- 动效只使用 `autoAlpha` / `opacity` / `y` / 少量 `scale`，避免触发布局计算的属性。
- 使用 `gsap.timeline()` 管理首屏顺序，用 `ScrollTrigger.batch()` 管理列表项进入视口。
- 使用 `gsap.matchMedia()` 处理桌面、移动端和 `prefers-reduced-motion`。
- 使用 `gsap.utils.toArray()` / `clamp()` 等工具处理目标集合和延迟上限。
- 保证无 JS、JS 加载失败、reduced-motion 下内容仍直接可见。

## Scope

本轮主范围：

- Hugo 主站页面：
  - 首页 `/`
  - 普通博客索引 `/posts/` 与 `/posts/<栏目>/`
  - 普通文章详情
  - daily 列表 `/daily/`
  - daily 正文
- GSAP 依赖与主站脚本打包。
- OpenSpec 任务记录与 `design.md` 实现备注。

## Out of Scope

- 不重写视觉设计，不引入新的页面结构。
- 不迁移 home motto SVG 的 CSS path drawing，除非后续单独确认。
- 不改聊天组件、留言墙、where globe、wall admin、server API、RAG 构建。
- 不全量替换 `apps/life-map` 中的 Framer Motion。
- 不改 React Flow 布局、LifeMap 数据、筛选、导出 PNG、鉴权 API。
- 不新增 ScrollSmoother、Draggable、SplitText 等非必要 GSAP 插件。

## 技术方案

### 1. 依赖与入口

- 在根项目安装 `gsap`。
- 新增 `assets/js/site-motion.ts`：
  - `import gsap from "gsap";`
  - `import { ScrollTrigger } from "gsap/ScrollTrigger";`
  - `gsap.registerPlugin(ScrollTrigger);`
- 在 `layouts/partials/extend_head.html` 中仅对首页、`posts`、`daily` 相关页面，通过 Hugo Pipes `resources.Get "js/site-motion.ts" | js.Build | resources.Minify | fingerprint` 输出 `defer` 脚本。
- 移除 animate.css CDN link，避免重复下载和旧类名行为干扰。

### 2. 动效目标

优先复用现有结构，不大范围改模板，但动效脚本只处理显式标记：

- 首屏/顶部块：`data-motion="hero"`
- 列表/正文块：`data-motion="reveal"`

这些标记只补在本次 Scope 内的首页、posts 和 daily 相关模板上，不把全局 `.masthead`、where、留言墙或管理页作为动效目标。

### 3. 动效行为

- 页面加载后执行一次主 timeline：
  - 显式标记的当前页面主标题区从 `y: 12` 到 `y: 0`，持续时间约 `0.45s`，ease 使用 `power2.out`。
- 列表项进入视口：
  - 使用 `ScrollTrigger.batch()`。
  - 从 `autoAlpha: 0, y: 18` 到 `autoAlpha: 1, y: 0`。
  - `stagger` 控制在 `0.04~0.08s`，总延迟用 `gsap.utils.clamp()` 限制，避免长列表拖太久。
- 正文内容：
  - 只做首个正文容器轻微 reveal，不逐段动画。
- 不做视差、pin、scrub、横向滚动或复杂时间轴。

### 4. 降级与可访问性

- CSS 默认不隐藏任何动效目标。
- JS 初始化时才用 `gsap.set()` 设置初始状态，并立即安排动画，避免无 JS 空白。
- `prefers-reduced-motion: reduce`：
  - 不创建 ScrollTrigger。
  - 可选执行一次 `autoAlpha` 终态设置，或直接返回。
  - 不使用位移、缩放、循环动画。
- 对首屏内容不设置过长延迟，避免用户等待内容出现。

### 5. 性能

- 只动画 `transform` 和 `opacity/autoAlpha`。
- 使用 `ScrollTrigger.batch()` 聚合同类列表项，避免为每个元素手写独立逻辑。
- 不在滚动过程中频繁读写 layout。
- 不对大量元素设置永久 `will-change`；如需 CSS 辅助，只作用于少数即将动画的元素。
- 不对全站所有 `.animate__animated` 盲目创建 tween，应按页面结构选取有限目标。

## 关键业务场景

### 场景 1：首页首屏

用户打开首页时，显式标记的 dispatch 区域应以克制方式出现；如果 JS 失败，首页仍完整可读，motto noscript 兜底仍有效。

### 场景 2：博客索引

用户打开 `/posts/` 或 `/posts/技术/` 时，顶部横幅先稳定出现，年度块在滚动到视口时轻量 reveal；文章链接和布局不发生跳动。

### 场景 3：daily

用户打开 `/daily/` 或 daily 正文时，三栏文档布局保持原有可读性，列表项 reveal 不影响侧边导航、TOC 固定或移动端降级。

### 场景 4：reduced motion

系统设置减少动态效果时，页面不应产生位移动画，也不应因为 JS 初始状态导致内容消失。

## 备选方案

- 保留 animate.css 但只删部分类名：改动更少，但 CDN 依赖和分散控制问题仍存在。
- 全量给模板增加 `data-motion-*`：选择器更清晰，但会扩大模板改动面。本轮只给 Scope 内模板添加少量 `data-motion` 标记。
- 同时迁移 LifeMap Framer Motion：不建议。React Flow 节点已有 transform、scale、selection 状态，混用风险高，应另开小任务验证。
