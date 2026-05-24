## 1. OpenSpec

- [x] 1.1 创建中文 proposal、design、spec 和任务清单

## 2. 博客年度索引布局

- [x] 2.1 在列表模板中增加普通博客年度索引分支
- [x] 2.2 为 `/posts/` 和博客分类页按年份分组文章
- [x] 2.3 增加横幅、统计、RSS 和空状态展示
- [x] 2.4 保持非博客栏目使用原有列表布局

## 3. 样式

- [x] 3.1 增加 `blog-archive-*` 作用域样式
- [x] 3.2 完成桌面三列、平板两列、移动单列响应式
- [x] 3.3 补齐暗色模式变量和对比度

## 4. 验证

- [x] 4.1 执行 `openspec validate blog-yearly-archive-layout --strict`
- [x] 4.2 执行 `hugo --minify`
- [x] 4.3 浏览器验收 `/posts/`、博客分类页和文章详情页
- [x] 4.4 回归确认 `/daily/`、`/gallery/`、`/shrimp-diary/` 未被套入新布局
