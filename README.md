# Jian の Blog

<p align="center">
  <strong>AI 工程师的个人博客</strong><br>
  记录技术、生活与思考
</p>

<p align="center">
  <a href="#博客简介">博客简介</a> •
  <a href="#内容板块">内容板块</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#本地运行">本地运行</a> •
  <a href="#部署">部署</a> •
  <a href="#项目结构">项目结构</a>
</p>

---

## 博客简介

基于 Hugo + PaperMod 主题搭建的个人博客，用于记录技术探索、生活点滴和思考感悟。博客采用极简设计，以 Profile Mode 作为首页，提供清晰的内容分类和良好的阅读体验。

**在线访问**: [https://sujian666666com-glitch.github.io/](https://sujian666666com-glitch.github.io/)

## 内容板块

| 板块 | 说明 | 访问路径 |
|------|------|----------|
| 首页 | Profile Mode 极简首页 | `/` |
| 每日新闻 | 科技新闻与开源动态精选 | `/daily/` |
| 技术文章 | AI、工程化、OpenClaw 等技术内容 | `/categories/技术/` |
| 生活随笔 | 生活记录与分享 | `/categories/生活/` |
| 思考笔记 | 个人思考与感悟 | `/categories/思考/` |
| 相册 | 图片收藏与分享 | `/gallery/` |
| 小虾日记 | 养虾日记与周记 | `/shrimp-diary/` |

## 技术栈

- **静态站点生成器**: Hugo 0.157+
- **主题**: PaperMod（Profile Mode）
- **部署**: GitHub Pages
- **语言**: 中文
- **作者**: 苏健（AI 工程师）

### 主题特性

- ✅ Profile Mode 极简首页
- ✅ 文章阅读时间估算
- ✅ 代码高亮与复制按钮
- ✅ 目录自动生成
- ✅ RSS 订阅支持
- ✅ 响应式设计
- ✅ 深色/浅色主题切换

## 本地运行

### 环境要求

- Hugo Extended 0.157+（与 GitHub Actions 版本保持一致）
- Git

### 克隆与运行

```bash
# 克隆仓库（包含子模块）
git clone --recurse-submodules https://github.com/sujian666666com-glitch/sujian666666com-glitch.github.io.git
cd sujian666666com-glitch.github.io

# 本地运行
hugo server -D

# 访问 http://localhost:1313
```

### 常用命令

```bash
# 本地开发服务器
hugo server -D

# 构建生产版本
hugo --minify

# 更新主题子模块
git submodule update --init --recursive --force
```

## 部署

博客通过 GitHub Actions 自动部署到 GitHub Pages。

### 部署流程

1. 推送代码到 `main` 分支
2. GitHub Actions 自动触发构建
3. 生成的静态文件部署到 GitHub Pages

### 注意事项

- 本地 Hugo 版本应与 `.github/workflows/hugo.yml` 中的 `HUGO_VERSION` 保持一致
- 主题作为 Git 子模块引入，如遇构建失败可执行 `git submodule update --init --recursive --force`

## 项目结构

```text
my-blog/
├── .github/
│   └── workflows/
│       └── hugo.yml          # GitHub Actions 部署配置
├── archetypes/               # 文章模板
├── content/                  # 博客内容
│   ├── about/                # 关于页面
│   ├── daily/                # 每日新闻
│   ├── gallery/              # 相册
│   ├── posts/                # 博客文章
│   │   ├── 技术/             # 技术分类
│   │   ├── 生活/             # 生活分类
│   │   └── 思考/             # 思考分类
│   └── shrimp-diary/         # 小虾日记
├── static/                   # 静态资源
│   └── images/               # 图片资源
├── themes/
│   └── PaperMod/             # 主题（Git 子模块）
├── hugo.yaml                 # Hugo 配置文件
└── README.md
```

## 博客配置

### 关键配置项

| 配置 | 说明 |
|------|------|
| `baseURL` | 博客地址 |
| `theme` | PaperMod |
| `params.profileMode` | 首页极简模式 |
| `params.author` | 作者名称 |
| `params.mainSections` | 首页展示的内容分类 |

### 添加新文章

```bash
# 创建新文章
hugo new posts/my-article/index.md

# 编辑文章
# 在 frontmatter 中设置 title, date, tags, categories 等
# 内容使用 Markdown 格式

# 本地预览
hugo server -D
```

## 联系方式

- **Email**: 1917980791@qq.com
- **GitHub**: [sujian666666com-glitch](https://github.com/sujian666666com-glitch)

---

<p align="center">
  Made with ❤️ by 苏健
</p>