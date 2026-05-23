## 设计说明

### 布局

- 新增 `daily-doc-layout` 外层，桌面端使用 CSS Grid：`220px minmax(0, 1fr) 220px`。
- 左侧 `daily-date-nav` 展示最近 18 期 daily，列表页高亮最新一期，正文页高亮当前文章。
- 中间 `daily-doc-main` 放列表内容或正文内容。
- 右侧 `daily-doc-toc` 在正文页复用 PaperMod `toc.html`；列表页展示本页快捷锚点。

### 正文

- daily 正文标题区改为 `daily-doc-header`，保留面包屑、栏目标签、标题和 meta。
- 不再展示正文顶部大封面卡；封面继续保留在 OG/Twitter 元数据和列表缩略图中。
- 正文容器使用 `daily-news-content`，专门增强 Markdown 阅读样式。

### 移动端

- `max-width: 1080px` 以下改为单栏。
- 左侧日期导航变成顶部横向滚动条。
- 右侧 TOC 变成标题下方普通折叠块，不固定。

### 作用域

- 所有新增样式限定在 `.daily-doc-*`、`.daily-date-nav`、`.daily-news-content`、`.daily-magazine` 和 `.daily-single` 下。
- 不覆盖通用 `.post-content` 或 `.toc`，除非有 daily 父级限定。
