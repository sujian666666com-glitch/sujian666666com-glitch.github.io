## 设计说明

### 模板分支

- 在 `layouts/_default/list.html` 中新增 `$useBlogArchive` 分支。
- 当页面是普通博客 section，或分类 term 中存在 `Section == "posts"` 的文章时，启用年度索引布局。
- 分类页列表数据过滤为普通博客文章，避免 `/categories/科技/` 等 daily 分类被误改。

### 页面结构

- 外层使用 `blog-archive-page`。
- 顶部使用 `blog-archive-hero`，展示面包屑、页面标题、描述、文章数量和 RSS 入口。
- 文章区域使用 `blog-archive-years`，按 `.Date.Format "2006"` 分组。
- 每个年份块使用 `blog-archive-year`，内部为简洁文章链接列表。

### 视觉方向

- 横幅使用原创 CSS 几何纹理：多层线性渐变组合成橙红折面图案，参考截图气质但不照抄。
- 正文保持大留白和三列年度网格，减少卡片感，突出“历史索引”。
- 暗色模式改用更深暖色横幅和深色页面变量，保证文字对比度。

### 响应式

- 桌面端年度块使用 `repeat(3, minmax(0, 1fr))`。
- 中等宽度改为两列。
- 移动端改为单列，并缩小横幅高度、标题字号和网格间距。
