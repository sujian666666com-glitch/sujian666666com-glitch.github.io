# Jian の Blog

<p align="center">
  <strong>AI 工程师的个人博客</strong><br>
  记录技术、生活与思考
</p>

<p align="center">
  <a href="#博客简介">博客简介</a> •
  <a href="#内容板块">内容板块</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#ai-聊天助手">AI 聊天助手</a> •
  <a href="#本地运行">本地运行</a> •
  <a href="#部署">部署</a> •
  <a href="#项目结构">项目结构</a>
</p>

---

## 博客简介

基于 Hugo + PaperMod 主题搭建的个人博客，用于记录技术探索、生活点滴和思考感悟。博客采用极简设计，以 Profile Mode 作为首页，提供清晰的内容分类和良好的阅读体验。内置 AI 聊天助手，支持多模型切换和博客内容 RAG 检索。

**在线访问**: [https://sujian666666com-glitch.github.io/](https://sujian666666com-glitch.github.io/)

## 内容板块

| 板块 | 说明 | 访问路径 |
|------|------|----------|
| 首页 | Profile Mode 极简首页 | `/` |
| 每日新闻 | 科技新闻与开源动态精选（46+ 期） | `/daily/` |
| 技术文章 | AI、工程化、OpenClaw 等技术内容 | `/categories/技术/` |
| 生活随笔 | 生活记录与分享 | `/categories/生活/` |
| 思考笔记 | 个人思考与感悟 | `/categories/思考/` |
| 相册 | 图片收藏与分享 | `/gallery/` |
| 小虾日记 | 养虾日记与周记（49 天 / 7 周） | `/shrimp-diary/` |

## 技术栈

- **静态站点生成器**: Hugo 0.157+
- **主题**: PaperMod（Profile Mode）
- **AI 聊天**: Cloudflare Worker + DashScope API（SSE 流式响应）
- **RAG 检索**: 博客内容向量索引 + 语义检索
- **部署**: GitHub Pages + Cloudflare Workers
- **语言**: 中文

### 主题特性

- Profile Mode 极简首页
- 文章阅读时间估算
- 代码高亮与复制按钮
- 目录自动生成
- RSS 订阅支持
- 响应式设计（桌面浮窗 / 移动全屏）
- 深色/浅色主题切换

## AI 聊天助手

博客内置 AI 聊天组件，读者可在侧边栏与 AI 助手对话，AI 会优先依据博客文章内容（RAG 检索）回答问题。

### 功能特性

- 多模型切换：Qwen 3.6 Plus / Qwen Plus / GLM 5 / Kimi K2.5 / MiniMax M2.5 等 12 个模型
- SSE 流式响应，打字机效果
- 博客内容 RAG 检索：自动从文章中提取相关片段辅助回答
- 思考模式开关（支持深度推理模型）
- 对话历史 localStorage 持久化（上限 100 条）
- 响应式布局：桌面浮窗 / 移动端全屏

### 架构

```
用户 → chat-widget.html (前端) → Cloudflare Worker (chat-worker.js)
                                      ↓
                                   DashScope API (多模型)
                                      ↓
                                   RAG 向量检索 (rag-vectors.json)
```

- **前端**: `layouts/partials/chat-widget.html` + `assets/css/extended/chat-widget.css`
- **Worker**: `static/chat-worker.js` — API 代理，处理 CORS、速率限制、模型白名单校验、RAG 检索
- **RAG 构建**: `scripts/build-rag.mjs` — 从博客内容生成向量索引，CI 中自动执行
- **模型配置**: `data/chat.yaml` — 模型列表与系统提示词

## 本地运行

### 环境要求

- Hugo Extended 0.157+（与 GitHub Actions 版本保持一致）
- Node.js 18+（聊天 Worker 开发）
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

# 重新构建 RAG 向量索引
node scripts/build-rag.mjs

# 部署聊天 Worker（需要 Cloudflare 账号）
npx wrangler secret put DASHSCOPE_API_KEY
npx wrangler deploy
```

## 部署

### GitHub Pages（博客主站）

通过 GitHub Actions 自动部署，推送代码到 `main` 分支即可触发：

1. GitHub Actions 构建 Hugo 站点
2. 执行 `scripts/build-rag.mjs` 生成 RAG 向量索引
3. 生成的静态文件部署到 GitHub Pages

### Cloudflare Workers（聊天代理）

聊天 Worker 独立部署在 Cloudflare Workers 上，配置见 `wrangler.toml`：

| 配置项 | 说明 |
|--------|------|
| `DASHSCOPE_BASE_URL` | DashScope API 地址 |
| `DASHSCOPE_API_KEY` | API 密钥（通过 `wrangler secret` 设置） |
| `RAG_VECTORS_URL` | 博客向量索引地址 |
| `RAG_TOP_K` | 检索返回的 top-k 文档数 |

### 注意事项

- 本地 Hugo 版本应与 `.github/workflows/hugo.yml` 中的 `HUGO_VERSION` 保持一致
- 主题作为 Git 子模块引入，如遇构建失败可执行 `git submodule update --init --recursive --force`
- Worker 密钥通过 `npx wrangler secret put` 管理，不要提交到仓库

## 项目结构

```text
my-blog/
├── .github/
│   ├── workflows/
│   │   └── hugo.yml              # GitHub Actions 部署 + RAG 构建
│   ├── prompts/                  # OpenSpec 提示词模板
│   └── skills/                   # OpenSpec 技能定义
├── archetypes/                   # 文章模板
├── assets/css/extended/
│   ├── custom.css                # 自定义样式（布局宽度等）
│   └── chat-widget.css           # 聊天组件样式
├── content/                      # 博客内容
│   ├── about/                    # 关于页面
│   ├── daily/                    # 每日新闻（46+ 篇）
│   ├── gallery/                  # 相册
│   ├── posts/                    # 博客文章
│   │   ├── 技术/                 # 技术分类
│   │   ├── 生活/                 # 生活分类
│   │   └── 思考/                 # 思考分类
│   └── shrimp-diary/             # 小虾日记
│       ├── daily/                # 每日记录（49 天）
│       └── weekly/               # 周记（7 周）
├── data/
│   └── chat.yaml                 # 聊天模型配置与系统提示词
├── layouts/partials/
│   ├── chat-widget.html          # AI 聊天组件前端
│   ├── extend_footer.html        # 页脚扩展（注入聊天组件）
│   ├── extend_head.html          # 头部扩展
│   ├── header.html               # 自定义导航栏
│   └── index_profile.html        # 首页 Profile 模板
├── scripts/
│   ├── build-rag.mjs             # RAG 向量索引构建脚本
│   └── update-rag.sh             # RAG 更新 Shell 脚本
├── static/
│   ├── chat-worker.js            # Cloudflare Worker（API 代理 + RAG）
│   ├── rag-vectors.json          # 博客内容向量索引
│   └── images/                   # 图片资源
├── themes/
│   └── PaperMod/                 # 主题（Git 子模块）
├── hugo.yaml                     # Hugo 配置文件
├── wrangler.toml                 # Cloudflare Worker 配置
└── package.json                  # Node.js 依赖（wrangler）
```

## 博客配置

### 关键配置项

| 配置 | 说明 |
|------|------|
| `baseURL` | 博客地址 |
| `theme` | PaperMod |
| `params.profileMode` | 首页极简模式 |
| `params.chat.proxyURL` | 聊天 Worker 代理地址 |
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
