## ADDED Requirements

### Requirement: 普通博客年度索引页

系统 SHALL 将普通博客列表页渲染为顶部主题横幅和按年份分组的文章索引。

#### Scenario: 打开博客总览页

- **WHEN** 访客打开 `/posts/`
- **THEN** 页面顶部展示博客主题横幅、标题、描述和文章数量
- **AND** 页面正文按年份分组展示普通博客文章
- **AND** 每篇文章展示标题、日期和基础 meta
- **AND** 不展示封面大卡片和长摘要

### Requirement: 普通博客分类页复用年度索引

系统 SHALL 在包含普通博客文章的分类页复用年度索引布局，并且只展示普通博客文章。

#### Scenario: 打开普通博客分类页

- **WHEN** 访客打开包含 `posts` 栏目文章的 `/categories/<term>/`
- **THEN** 页面使用博客年度索引风格
- **AND** 列表只包含 `Section == "posts"` 的文章
- **AND** 标题和文章统计基于当前分类页

#### Scenario: 打开非博客分类页

- **WHEN** 访客打开只包含 daily 或 shrimp-diary 文章的分类页
- **THEN** 页面继续使用原有列表布局
- **AND** 不出现 `blog-archive-*` 年度索引结构

### Requirement: 博客年度索引响应式可读

系统 SHALL 在不同视口宽度下保持博客年度索引可读且无横向溢出。

#### Scenario: 桌面端浏览博客索引

- **WHEN** 访客使用桌面宽屏打开 `/posts/`
- **THEN** 年份块以三列网格展示
- **AND** 横幅和正文留白与页面宽度协调

#### Scenario: 移动端浏览博客索引

- **WHEN** 访客使用窄屏打开 `/posts/`
- **THEN** 年份块降级为单列
- **AND** 标题、链接和 meta 不重叠
- **AND** 页面不产生横向滚动

### Requirement: 样式作用域隔离

系统 SHALL 将博客年度索引样式限制在普通博客列表和博客分类页。

#### Scenario: 打开其它栏目

- **WHEN** 访客打开首页、单篇文章、`/daily/`、`/gallery/` 或 `/shrimp-diary/`
- **THEN** 页面不出现博客年度索引横幅和年份网格
- **AND** 既有布局和功能保持不变
