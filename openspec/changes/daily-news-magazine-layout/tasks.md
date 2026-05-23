## 1. OpenSpec

- [x] 1.1 创建中文 proposal、design、spec 和任务清单

## 2. Daily 列表页

- [x] 2.1 新增 `/daily/` 专用列表模板
- [x] 2.2 实现杂志式栏目头部、累计期数、最近更新日期、RSS 和归档入口
- [x] 2.3 实现弱化封面图的档案列表，并支持无封面日期占位
- [x] 2.4 保持分页与历史 daily permalink 正常

## 3. Daily 正文页

- [x] 3.1 新增 daily 专用正文模板
- [x] 3.2 增加栏目头部、日期、meta、封面缩略图和正文容器
- [x] 3.3 保留目录、正文、上下篇和分享能力

## 4. 样式与验证

- [x] 4.1 新增 daily 作用域 CSS，覆盖桌面和移动端
- [x] 4.2 执行 `openspec validate daily-news-magazine-layout --strict`
- [x] 4.3 执行 `hugo --minify`
- [x] 4.4 核对 `/daily/`、两篇 daily 正文、`/posts/` 和首页构建输出
