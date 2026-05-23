## 设计说明

### 模板策略

- 使用 Hugo section layout：新增 `layouts/daily/list.html` 和 `layouts/daily/single.html`。
- daily 列表页只读取 `.RegularPages`，按日期倒序分页，保持现有 permalink 和分页能力。
- daily 正文页复用 PaperMod 的基础能力：面包屑、meta、目录、正文渲染、上下篇、分享按钮。

### 列表页

- 顶部 `daily-magazine-hero` 展示栏目、期数、最近更新日期和入口链接。
- 列表 `daily-archive-list` 每项使用细线分隔，主视觉为日期编号、标题、摘要和小缩略图。
- 封面图通过 `.Params.cover.image` 读取；缺图时显示日期占位。

### 正文页

- 头部 `daily-single-hero` 展示栏目标签、标题、日期和封面缩略图。
- 正文保留现有 Markdown 输出，不改变内容结构。
- CSS 对 daily 正文中的新闻二级标题、列表和“简短结论”做轻量增强，让标题、摘要、链接更易扫读。

### 兼容边界

- 所有 CSS 选择器以 `.daily-magazine-*`、`.daily-archive-*`、`.daily-single-*` 或 `.daily-news-content` 开头。
- 不覆盖通用 `.post-card`、`.blog-hero`、`.chat-*`、`.wall-*` 样式。
