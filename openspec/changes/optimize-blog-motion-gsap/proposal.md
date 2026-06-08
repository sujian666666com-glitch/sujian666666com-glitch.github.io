## Why

当前主站大量依赖 `animate.css` CDN 和模板内分散的 `animate__*` 类来做入场动画，与根目录 `design.md` 中“motion-cut、避免全页 animate.css 入场”的动效原则不一致，也让动效延迟、降级和性能策略难以集中维护。

本次希望用 GSAP 官方能力把博客主站动效收敛成一个克制、可降级、可测试的前端动效层：保留印刷刊物式阅读节奏，只在首屏和列表进入视口时做轻量 `transform / opacity` 动画。

## What Changes

- 新增主站动效能力 `blog-motion`，集中管理 Hugo 主站的页面入场和滚动 reveal。
- 使用 GSAP Core、Timeline、ScrollTrigger、utils 和 performance 实践，替换主站对 `animate.css` CDN 的依赖。
- 新增 `assets/js/site-motion.ts` 作为 Hugo asset pipeline 打包入口，避免把动效逻辑散落在多个模板内。
- 保持无 JS 降级：页面元素默认可见，JS 加载失败时内容不被隐藏。
- 支持 `prefers-reduced-motion: reduce`：减少或取消位移动画，不创建不必要的 ScrollTrigger。
- 保留现有 CSS hover、菜单、聊天、小纸条、where globe、home motto SVG CSS 动画等独立能力，不做无需求迁移。
- 本轮不做 LifeMap Framer Motion 全量替换；如需要 GSAP React 试点，单独限定在低风险节点组件并另行确认。

## Capabilities

### New Capabilities

- `blog-motion`: 约束博客主站的 GSAP 动效层、降级策略、页面适用范围和验收场景。

### Modified Capabilities

- 无。当前 `openspec/specs/` 为空，本次新增轻量能力，不修改既有归档、daily、message wall 或 LifeMap 规格。

## Impact

- 影响文件预计包括：
  - `package.json`、`package-lock.json`：新增 `gsap` 依赖。
  - `layouts/partials/extend_head.html`：移除 animate.css CDN，引入 Hugo Pipes 打包后的 `site-motion` 脚本。
  - `assets/js/site-motion.ts`：新增主站 GSAP 动效入口。
  - 少量 Hugo 模板：按需补充 `data-motion-*` 标记，或复用现有类名作为动效目标。
  - `design.md`：追加本次动效治理的实现备注。
  - `openspec/changes/optimize-blog-motion-gsap/tasks.md`：记录任务状态和验收结果。
- 不影响后端 API、文章 Markdown 内容、RAG、聊天组件、留言墙数据库、LifeMap 数据模型。
- 主要风险：
  - 过度动画破坏 `design.md` 的刊物感。
  - GSAP inline transform 与既有 hover/状态样式冲突。
  - 若默认隐藏元素，会造成无 JS 或 reduced-motion 用户看不到内容。
  - 移除 animate.css 后未覆盖的旧模板入场类失效；应以“内容稳定可见”为默认结果。
