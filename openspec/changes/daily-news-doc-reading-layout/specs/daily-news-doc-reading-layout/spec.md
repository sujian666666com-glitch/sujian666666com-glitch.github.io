## ADDED Requirements

### Requirement: Daily 文档化三栏布局

系统 SHALL 在桌面端将 daily 页面渲染为左侧日期导航、中间内容区、右侧目录区的文档化布局。

#### Scenario: 打开 daily 列表页

- **WHEN** 访客打开 `/daily/`
- **THEN** 页面左侧展示最近每日新闻日期导航
- **AND** 中间展示每日新闻档案列表
- **AND** 右侧展示当前列表页快捷目录

#### Scenario: 打开 daily 正文页

- **WHEN** 访客打开任意 `/daily/<slug>/`
- **THEN** 页面左侧展示最近每日新闻日期导航并高亮当前日期
- **AND** 中间展示文档式标题区和正文
- **AND** 右侧展示当前文章的页内 TOC

### Requirement: Daily 移动端可读降级

系统 SHALL 在窄屏上取消固定三栏，保证正文不被侧栏挤压。

#### Scenario: 移动端打开 daily 正文

- **WHEN** 视口宽度较窄
- **THEN** 日期导航位于正文上方且可横向滚动或自然换行
- **AND** TOC 不固定占用右侧宽度
- **AND** 正文内容不横向溢出

### Requirement: Daily Markdown 渲染增强

系统 SHALL 为 daily 正文提供更接近文档站的 Markdown 样式，但不得改变 Markdown 源文件结构。

#### Scenario: 阅读新闻条目

- **WHEN** daily 正文包含 `##` 新闻标题及其下方的 `标题 / 摘要 / 链接` 列表
- **THEN** 新闻列表渲染为清晰的信息块
- **AND** 链接、inline code、段落和列表间距易于扫读

#### Scenario: 阅读简短结论

- **WHEN** daily 正文包含“简短结论”章节
- **THEN** 该章节内容以总结块形式展示

### Requirement: 样式作用域隔离

系统 SHALL 将 daily 文档化布局和 Markdown 增强限制在 daily 页面。

#### Scenario: 打开非 daily 页面

- **WHEN** 访客打开首页或 `/posts/`
- **THEN** 页面不出现 daily 三栏布局
- **AND** 普通博客 Markdown 样式不受 daily 专属增强影响
