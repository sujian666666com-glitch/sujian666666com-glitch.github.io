## 1. OpenSpec

- [x] 1.1 创建中文 proposal、design、spec 和任务清单

## 2. Daily 文档布局

- [x] 2.1 新增最近日期导航 partial，支持列表页和正文页高亮
- [x] 2.2 将 `/daily/` 列表页套入左日期导航 + 中间列表 + 右辅助目录
- [x] 2.3 将 daily 正文页套入左日期导航 + 中间正文 + 右固定 TOC
- [x] 2.4 移除 daily 正文页过重 hero，改为文档式标题区

## 3. Markdown 渲染增强

- [x] 3.1 增强 daily 正文标题、段落、列表、链接和 inline code 样式
- [x] 3.2 将 daily 新闻条目列表渲染成更清晰的信息块
- [x] 3.3 将“简短结论”渲染为结尾总结块
- [x] 3.4 补齐 blockquote、table、code block 的 daily 作用域样式

## 4. 验证

- [x] 4.1 执行 `openspec validate daily-news-doc-reading-layout --strict`
- [x] 4.2 执行 `hugo --minify`
- [x] 4.3 浏览器验收 `/daily/`、`/daily/2026-05-23/`、`/daily/2026-05-21/`
- [x] 4.4 回归确认 `/posts/` 和首页未套入 daily 三栏

## 5. 修复备注

- [x] 5.1 修复夜间模式下普通文章与小虾文档布局沿用浅色变量导致的文字低对比问题；只补充 `.article-doc-layout` 暗色变量，不改 daily 既有暗色表现。
- [x] 5.2 清理误放到普通博客目录的 2026-03-16 每日新闻文章：现象是首页只应展示 `posts` 主栏目文章，却因为该新闻被放在 `content/posts/技术/` 下而出现在首页；正确期望是每日新闻只保留在 `/daily/` 栏目；本次直接删除误归类的普通文章源文件，不改 `/daily/` 正常历史文章。
