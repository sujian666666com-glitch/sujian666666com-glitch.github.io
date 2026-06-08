## 1. OpenSpec 规划

- [x] 1.1 使用多 agent 并行调查 Hugo 主站动效入口、LifeMap 风险和 OpenSpec 落点
- [x] 1.2 创建 `optimize-blog-motion-gsap` 变更骨架
- [x] 1.3 编写中文 proposal、design、spec 与任务清单
- [x] 1.4 按已通过校验的 OpenSpec 范围进入 Coding

## 2. 主站 GSAP 动效层

- [x] 2.1 在根项目新增 `gsap` 依赖
- [x] 2.2 新增 `assets/js/site-motion.ts`，注册 ScrollTrigger 并实现主站动效初始化
- [x] 2.3 使用 `gsap.timeline()` 管理 masthead / 页面标题区轻量入场
- [x] 2.4 使用 `ScrollTrigger.batch()` 管理归档块、文章列表、daily 条目滚动 reveal
- [x] 2.5 使用 `gsap.matchMedia()` 支持 reduced-motion 与响应式条件
- [x] 2.6 使用 `gsap.utils` 控制目标集合、stagger 和延迟上限

## 3. Hugo 集成

- [x] 3.1 在 `layouts/partials/extend_head.html` 引入 Hugo Pipes 打包后的 `site-motion` 脚本
- [x] 3.2 移除 animate.css CDN 引用
- [x] 3.3 按需补充少量 `data-motion-*` 标记，避免大范围改模板
- [x] 3.4 确认无 JS 时页面内容默认可见

## 4. 文档与任务同步

- [x] 4.1 在 `design.md` 追加 GSAP 动效治理实现备注
- [x] 4.2 根据最终实现更新本任务清单状态和必要备注

## 5. 验证

- [x] 5.1 执行 `openspec validate optimize-blog-motion-gsap --strict`
- [x] 5.2 执行 `hugo --gc --minify`
- [x] 5.3 浏览器验收 `/`、`/posts/`、`/posts/技术/`、`/daily/`、daily 正文、普通文章详情
- [x] 5.4 验证 reduced-motion 下无明显位移动画且内容可见
- [x] 5.5 验证 JS 禁用或脚本失败时内容不空白

## 6. 可选后续：LifeMap GSAP React 试点

- [ ] 6.1 如用户确认，单独评估 `apps/life-map/components/LifeMap/nodes/BossFlagNode.tsx`
- [ ] 6.2 如实施，新增 `gsap` / `@gsap/react` 到 `apps/life-map`，只替换 Boss 节点内部脉冲动画
- [ ] 6.3 执行 `npm run lint`、`npm run typecheck`、`npm run build`，并验收 React Flow 节点状态不被覆盖

## 规划备注

- 现象 / 缺陷：主站通过 animate.css CDN 和散落模板类名实现全页入场，和 `design.md` 的 motion-cut 原则不一致，也不便统一 reduced-motion 与性能策略。
- 正确期望行为：主站动效应集中、克制、可降级，只动画 `transform / opacity`，在无 JS 和 reduced-motion 下保持内容可读。
- 本次修复方式：新增 `blog-motion` OpenSpec 能力，计划以本地打包 GSAP 脚本替代 animate.css CDN；先治理 Hugo 主站，暂不全量迁移 LifeMap 或其它独立交互模块。

## 实现备注

- 2026-06-08：已新增根项目 `gsap`，用 `assets/js/site-motion.ts` 注册 ScrollTrigger，并将旧 animate.css 入场类替换为 `data-motion="hero"` / `data-motion="reveal"`。脚本仅在首页、posts、daily 相关页面加载，且只处理显式标记节点；默认 CSS 不隐藏内容，JS 只在 `prefers-reduced-motion: no-preference` 时初始化 GSAP 动效。
- 2026-06-08 验收：`openspec validate optimize-blog-motion-gsap --strict` 与 `hugo --gc --minify` 均通过；内置浏览器验证首页、博客索引、技术索引、daily 列表和 daily 正文无控制台错误，桌面滚动 reveal 生效，375px 移动端无横向溢出；静态 CSS 搜索确认没有 `data-motion` 隐藏规则，reduced-motion 分支不会执行 `gsap.set(revealTargets)`。
- 2026-06-08 评审修正：根据并行 code-reviewer 反馈，移除 `.masthead` 全局选择器和 `gsap.defaults()` 全局副作用，避免 where、留言墙、wall admin 等非范围页面产生额外视觉行为或继承默认 tween 配置。
