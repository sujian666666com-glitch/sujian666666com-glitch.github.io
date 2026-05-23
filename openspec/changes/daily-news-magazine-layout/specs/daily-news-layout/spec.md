## ADDED Requirements

### Requirement: 每日新闻杂志化列表

系统 SHALL 将 `/daily/` 渲染为每日新闻专用的杂志档案列表，而不是通用博客大卡片列表。

#### Scenario: 打开每日新闻列表

- **WHEN** 访客打开 `/daily/`
- **THEN** 页面顶部展示每日新闻栏目名、累计期数和最近更新日期
- **AND** 下方新闻以细线分隔的档案条目展示
- **AND** 每条展示日期、标题、摘要和阅读入口

### Requirement: 弱化封面展示

系统 SHALL 在每日新闻列表中保留封面识别度，但 MUST 降低封面图占比，使文本信息成为主视觉。

#### Scenario: 新闻有封面

- **WHEN** daily 文章 frontmatter 存在 `cover.image`
- **THEN** 列表项展示小尺寸封面缩略图
- **AND** 标题和摘要仍占据主要阅读区域

#### Scenario: 新闻没有封面

- **WHEN** daily 文章没有可用封面
- **THEN** 列表项展示日期占位块
- **AND** 页面不得出现破图或空白大卡片

### Requirement: Daily 正文专用阅读头部

系统 SHALL 为每日新闻正文页提供专用头部，突出栏目、日期和封面缩略图，但 MUST 保留原 Markdown 正文内容结构。

#### Scenario: 打开 daily 正文

- **WHEN** 访客打开任意 `/daily/<slug>/`
- **THEN** 页面展示每日新闻专用头部、标题、日期和 meta 信息
- **AND** 正文仍按原 Markdown 渲染新闻标题、摘要、链接和简短结论
- **AND** 目录、上下篇和分享能力继续可用

### Requirement: 作用域隔离

系统 SHALL 将本次样式限制在 daily 页面，不影响首页、普通博客列表和动态组件。

#### Scenario: 打开非 daily 页面

- **WHEN** 访客打开首页、`/posts/`、相册、小虾日记或聊天组件所在页面
- **THEN** 这些页面不应用 daily 专用布局和样式
