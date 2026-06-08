## ADDED Requirements

### Requirement: 主站 GSAP 动效层

系统 SHALL 为 Hugo 主站提供集中式 GSAP 动效层，用于替代分散的 animate.css 入场动画。

#### Scenario: 加载主站页面

- **WHEN** 访客打开首页、博客索引、普通文章、daily 列表或 daily 正文
- **THEN** 页面通过本地打包的主站动效脚本初始化 GSAP
- **AND** 不再依赖 animate.css CDN 提供页面入场效果
- **AND** 页面内容在 JS 执行前保持可见

### Requirement: 克制的页面入场

系统 SHALL 只为页面关键标题区和列表项提供克制的 `transform / opacity` 动效。

#### Scenario: 首屏标题区出现

- **WHEN** 页面首次加载
- **THEN** 显式标记为 `data-motion="hero"` 的 masthead 或当前页面主标题区可以轻微淡入或上移归位
- **AND** 动画不得使用弹跳、剧烈缩放、视差、pin 或 scrub
- **AND** 单个首屏入场动画持续时间应保持短促，不阻塞阅读

#### Scenario: 列表项进入视口

- **WHEN** 年度归档块、文章列表项或 daily 条目进入视口
- **THEN** 它们可以通过 ScrollTrigger 批量淡入并轻微上移归位
- **AND** 同组列表项使用 stagger 控制节奏
- **AND** 长列表的延迟应有上限，避免越靠后的条目等待过久

### Requirement: Reduced Motion 与无 JS 降级

系统 SHALL 在 reduced-motion、JS 禁用或脚本加载失败时保持内容可见且可读。

#### Scenario: 用户启用 reduced motion

- **WHEN** 浏览器匹配 `prefers-reduced-motion: reduce`
- **THEN** 系统不创建滚动触发位移动画
- **AND** 页面元素保持可见
- **AND** 不出现循环动画或明显位移

#### Scenario: JavaScript 未执行

- **WHEN** 主站动效脚本未加载、被拦截或执行失败
- **THEN** 所有页面内容仍按静态布局展示
- **AND** 不应存在因 CSS 默认隐藏而导致的空白标题区或空白列表

### Requirement: 动效作用域隔离

系统 SHALL 将主站 GSAP 动效限制在博客阅读和索引页面，不影响独立交互功能。

#### Scenario: 打开聊天、小纸条或 where 页面

- **WHEN** 访客使用聊天组件、留言墙、小纸条或 where globe
- **THEN** 这些功能的既有 JS 逻辑和 CSS 动画保持原样
- **AND** 主站 GSAP 动效不得重写其业务状态、请求逻辑或交互事件
- **AND** 留言墙、where、wall admin 等独立页面不得加载主站 GSAP 动效脚本或匹配到主站动效目标

#### Scenario: 打开 LifeMap 子应用

- **WHEN** 访客打开 `apps/life-map` 提供的 Next/React 子应用
- **THEN** 本次主站动效治理不改变 LifeMap 的 Framer Motion、React Flow 布局、节点状态或导出逻辑

### Requirement: 动效性能约束

系统 SHALL 遵循 GSAP 性能实践，避免引入滚动卡顿和布局抖动。

#### Scenario: 滚动浏览长列表

- **WHEN** 访客滚动浏览 `/posts/` 或 `/daily/` 的长列表
- **THEN** 系统使用批量滚动 reveal，而不是为每个元素创建大量独立重复逻辑
- **AND** 动画只修改 `transform` 和 `opacity / autoAlpha`
- **AND** 不动画 `width`、`height`、`top`、`left`、`margin`、`padding` 等布局属性

#### Scenario: 页面布局刷新

- **WHEN** 字体、图片或响应式布局发生变化
- **THEN** 系统不得频繁手动调用 `ScrollTrigger.refresh()`
- **AND** 不应在滚动回调中交替执行布局读取和写入
