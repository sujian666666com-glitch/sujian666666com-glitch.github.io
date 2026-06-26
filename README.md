# Jian の Blog

<p align="center">
  <strong>AI 工程师的个人博客</strong><br>
  记录技术、生活与思考
</p>

<p align="center">
  <a href="#博客简介">博客简介</a> •
  <a href="#内容板块">内容板块</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#动态能力">动态能力</a> •
  <a href="#本地运行">本地运行</a> •
  <a href="#服务器部署">服务器部署</a> •
  <a href="#项目结构">项目结构</a>
</p>

---

## 博客简介

基于 Hugo + PaperMod 主题搭建的个人博客，用于记录技术探索、生活点滴和思考感悟。当前主站部署在自有服务器域名 `sujian.online`，静态页面由 Hugo 构建后交给 Nginx 提供，聊天助手与留言墙等动态能力由 VPS 本地 Node.js 服务承载。

**在线访问**: [https://sujian.online/](https://sujian.online/)

## 内容板块

| 板块 | 说明 | 访问路径 |
|------|------|----------|
| 首页 | Profile Mode 极简首页 | `/` |
| 每日新闻 | 科技新闻与开源动态精选（78+ 期） | `/daily/` |
| 技术文章 | AI、工程化、OpenClaw 等技术内容 | `/posts/技术/` |
| 生活随笔 | 生活记录与分享 | `/posts/生活/` |
| 思考笔记 | 个人思考与感悟 | `/posts/思考/` |
| 相册 | 图片收藏与分享 | `/gallery/` |
| 我在哪里 | 3D 地球记录到过的地方 | `/where/` |
| 人生地图 | Next.js 子应用，人生轨迹地图（密码访问） | `/about/life-map` |
| 小虾日记 | 养虾日记与周记（36 天 / 12 周） | `/shrimp-diary/` |

## 技术栈

- **静态站点生成器**: Hugo 0.157+
- **主题**: PaperMod（Profile Mode）
- **AI 聊天**: VPS Node.js API + 智谱 Coding Plan / Claude API 兼容口（SSE 流式响应）
- **RAG 检索**: 博客内容向量索引 + SiliconFlow Qwen3 embedding 语义检索
- **音乐点歌**: VPS Node.js API 反代网易云 API，聊天侧边栏搜歌/播放
- **人生地图**: 独立 Next.js 子应用，挂载到 `/about/life-map`
- **留言墙**: VPS Node.js API + SQLite
- **部署**: 自有服务器 + Nginx + systemd
- **语言**: 中文

### 主题特性

- Profile Mode 极简首页
- 文章阅读时间估算
- 代码高亮与复制按钮
- 目录自动生成
- RSS 订阅支持
- 响应式设计（桌面浮窗 / 移动全屏）
- 深色/浅色主题切换

## 动态能力

博客静态内容由 Hugo 生成，动态接口统一走服务器本地服务，再由 Nginx 反向代理到前端路径。

### AI 聊天助手

博客内置 AI 聊天组件，读者可在侧边栏与“小 k”对话。AI 会优先依据博客文章内容（RAG 检索）回答问题，前端只请求站内 `/api/chat`，不会暴露模型 API Key。

### 功能特性

- 站内 `/api/chat` 代理，线上由 `server/chat-api.mjs` 提供
- GLM 模型调用，兼容 Claude `/v1/messages` 风格接口
- SSE 流式响应，打字机效果
- 博客内容 RAG 检索：自动从文章中提取相关片段辅助回答
- 思考模式开关（支持深度推理模型）
- 对话历史 localStorage 持久化（上限 100 条）
- 响应式布局：桌面浮窗 / 移动端全屏

### 架构

```
用户 → chat-widget.html / chat-ui.js → Nginx /api/chat
                                      ↓
                              server/chat-api.mjs (systemd)
                                      ↓
                         智谱 Coding Plan / Claude API 兼容口
                                      ↓
                              RAG 向量索引 (rag-vectors.json)
```

- **前端**: `layouts/partials/chat-widget.html` + `assets/css/extended/chat-widget.css`
- **聊天 API**: `server/chat-api.mjs` — 服务器本地代理，处理模型调用、流式响应和 RAG 检索
- **RAG 构建**: `scripts/build-rag.mjs` — 从博客内容生成向量索引
- **模型配置**: `data/chat.yaml` — 模型列表与系统提示词

### 音乐点歌

聊天侧边栏内置音乐面板，读者可搜索歌曲并试听。前端只请求站内 `/api/music/*`，由服务器本地 Node 服务反代到网易云 API，不暴露上游地址，也不会把第三方凭据带到前端。

- 站内 `/api/music/search|url|song`，线上由 `server/music-api.mjs` 提供
- 反代上游网易云 API（默认 `http://127.0.0.1:3000`）
- 搜索结果缓存 60s、播放地址缓存 10min
- 仅放行 `GET/OPTIONS`，按 `MUSIC_ALLOWED_ORIGINS` 做跨域白名单
- 前端逻辑：`static/chat-ui.js`

### 人生地图

独立的 Next.js 子应用（源码在 `apps/life-map/`），构建后由 systemd 常驻运行，挂载到 `/about/life-map`，记录人生轨迹地图。访问 `/api/life-map/verify` 做密码验证，建议在 Nginx 侧对该路径按 IP 限速。

> 注：「我在哪里」（`/where/`）是 Hugo 静态 3D 地球页（`static/where-globe.js`），与 Next.js 人生地图是两个独立页面。

### 匿名留言墙

相册页带有匿名留言墙，前端请求站内 `/api/wall/`，线上由 `server/wall-api.mjs` 提供本地 API，并使用 SQLite 保存留言数据。后台管理页使用 `WALL_ADMIN_TOKEN` 做轻量管理鉴权。

## 本地运行

### 环境要求

- Hugo Extended 0.157+（与线上构建版本保持一致）
- Node.js 22+（本地聊天 API、留言墙 API；留言墙使用 `node:sqlite`）
- Git

### 启动预览

```bash
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
npm run build:rag

# 生成每日新闻封面提示词（按日期稳定随机）
python3 scripts/daily-cover-prompt.py --date 2026-05-19

# 本地启动留言墙 API
npm run wall:dev

# 本地启动聊天 API（聊天需要 BIGMODEL_API_KEY；RAG 需要 SILICONFLOW_API_KEY）
BIGMODEL_API_KEY=your_zhipu_api_key SILICONFLOW_API_KEY=your_siliconflow_api_key npm run chat:dev

# 本地启动音乐 API（需先在 MUSIC_API_UPSTREAM 起一个网易云 API 服务）
MUSIC_API_UPSTREAM=http://127.0.0.1:3000 node server/music-api.mjs

# 本地启动人生地图 Next 子应用（在 apps/life-map 下）
cd apps/life-map && npm run dev
```

### 每日新闻正文格式

每日新闻正文不要写成单纯的链接列表。每条新闻必须包含「标题 + 摘要 + 链接」三类信息，建议保持如下结构：

```markdown
## 1. 新闻标题

- 标题：新闻标题原文或准确中文标题
- 摘要：用 1-3 句话说明事件本身、影响点和为什么值得关注，只写可核验信息。
- 链接：[原始报道](https://example.com/) / [讨论页](https://news.ycombinator.com/item?id=xxxx)，热度：可选
```

摘要要基于公开来源和真实性评估结果，不要把无法确认的推测写成事实。

## 服务器部署

当前部署口径以 `sujian.online` 自有服务器为准：

- Hugo 构建产物由 Nginx 作为静态站点提供。
- `/api/chat` 反向代理到服务器本地 `server/chat-api.mjs`。
- `/api/wall/` 反向代理到服务器本地 `server/wall-api.mjs`。
- 两个 Node.js API 通过 systemd 常驻运行。

### 静态站点

```bash
# 构建静态站点
hugo --minify

# 构建或刷新 RAG 向量索引
SILICONFLOW_API_KEY=your_siliconflow_api_key npm run build:rag
```

### 聊天 API

| 配置项 | 说明 |
|--------|------|
| `BIGMODEL_API_KEY` | 智谱 API Key，放在 `/etc/my-blog-chat.env` |
| `BIGMODEL_ANTHROPIC_BASE_URL` | Claude API 兼容口，默认 `https://open.bigmodel.cn/api/anthropic` |
| `SILICONFLOW_API_KEY` | SiliconFlow API Key，用于 RAG embedding，放在 `/etc/my-blog-chat.env` |
| `RAG_EMBEDDING_PROVIDER` | Embedding provider，默认 `siliconflow` |
| `RAG_EMBEDDING_BASE_URL` | Embedding API 地址，默认 `https://api.siliconflow.cn/v1` |
| `RAG_EMBEDDING_MODEL` | Embedding 模型，默认 `Qwen/Qwen3-Embedding-0.6B` |
| `RAG_EMBEDDING_DIMENSIONS` | Embedding 维度，默认 `1024` |
| `RAG_EMBEDDING_BATCH_SIZE` | RAG 构建批量大小，默认 `1`，可按 API 稳定性调大 |
| `RAG_VECTORS_URL` | 线上博客向量索引地址 |
| `RAG_TOP_K` | 检索返回的 top-k 文档数 |

线上文件位置：

- 服务代码：`/opt/my-blog-chat/chat-api.mjs`
- systemd：`/etc/systemd/system/my-blog-chat.service`
- 环境文件：`/etc/my-blog-chat.env`
- Nginx：`server/nginx-chat-location.conf`

### 音乐 API

| 配置项 | 说明 |
|--------|------|
| `MUSIC_API_HOST` | 默认 `127.0.0.1` |
| `MUSIC_API_PORT` | 默认 `8789` |
| `MUSIC_API_UPSTREAM` | 网易云 API 上游，默认 `http://127.0.0.1:3000` |
| `MUSIC_ALLOWED_ORIGINS` | 跨域白名单，逗号分隔，缺省回退到聊天/留言墙白名单 |

线上文件位置：

- 服务代码：`/opt/my-blog-music/music-api.mjs`
- systemd：`/etc/systemd/system/my-blog-music.service`
- 环境文件：`/etc/my-blog-music.env`
- Nginx：`server/nginx-music-location.conf`

### 人生地图 API（Next.js 子应用）

| 配置项 | 说明 |
|--------|------|
| `PORT` | 默认 `8790`，仅监听 `127.0.0.1` |
| `NODE_ENV` | `production` |

线上文件位置：

- 应用目录：`/opt/my-blog-life-map/`（`npm run start`）
- systemd：`/etc/systemd/system/my-blog-life-map.service`
- 环境文件：`/etc/my-blog-life-map.env`
- Nginx：`server/nginx-life-map-location.conf`（挂载 `/about/life-map`、`/_next/`、`/api/life-map/`）

### 留言墙 API

| 配置项 | 说明 |
|--------|------|
| `WALL_API_HOST` | 默认 `127.0.0.1` |
| `WALL_API_PORT` | 默认 `8787` |
| `WALL_DB_PATH` | 默认 `/var/lib/my-blog-wall/wall.db` |
| `WALL_ADMIN_TOKEN` | 后台管理口令，放在 `/etc/my-blog-wall.env` |

线上文件位置：

- 服务代码：`/opt/my-blog-wall/wall-api.mjs`
- 数据库：`/var/lib/my-blog-wall/wall.db`
- systemd：`/etc/systemd/system/my-blog-wall.service`
- Nginx：`server/nginx-wall-location.conf`

### 注意事项

- 主题作为 Git 子模块引入，如遇构建失败可执行 `git submodule update --init --recursive --force`
- API Key 与后台口令只放服务器环境文件，不要提交到仓库
- `wrangler.toml` 和 `static/chat-worker.js` 是旧 Cloudflare Worker 路径，当前线上主链路以 VPS Node API 为准

## 项目结构

```text
my-blog/
├── archetypes/                   # 文章模板
├── apps/
│   └── life-map/                 # 人生地图 Next.js 子应用（挂载到 /about/life-map）
├── assets/css/extended/
│   ├── custom.css                # 自定义样式（布局宽度等）
│   └── chat-widget.css           # 聊天组件样式
├── content/                      # 博客内容
│   ├── about/                    # 关于页面
│   ├── daily/                    # 每日新闻（78+ 篇）
│   ├── gallery/                  # 相册
│   ├── posts/                    # 博客文章
│   │   ├── 技术/                 # 技术分类
│   │   ├── 生活/                 # 生活分类
│   │   └── 思考/                 # 思考分类
│   ├── where/                    # 我在哪里（3D 地球页）
│   └── shrimp-diary/             # 小虾日记
│       ├── daily/                # 每日记录
│       └── weekly/               # 周记
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
│   ├── daily-cover-prompt.py     # 每日新闻封面提示词随机拼装脚本
│   └── update-rag.sh             # RAG 更新 Shell 脚本
├── server/
│   ├── chat-api.mjs              # VPS 本地聊天 API
│   ├── music-api.mjs             # VPS 本地音乐 API（反代网易云）
│   ├── wall-api.mjs              # VPS 本地留言墙 API
│   ├── my-blog-chat.service      # 聊天 API systemd 示例
│   ├── my-blog-music.service     # 音乐 API systemd 示例
│   ├── my-blog-life-map.service  # 人生地图 systemd 示例
│   ├── my-blog-wall.service      # 留言墙 API systemd 示例
│   ├── nginx-chat-location.conf  # /api/chat 反代配置
│   ├── nginx-music-location.conf # /api/music/ 反代配置
│   ├── nginx-life-map-location.conf # /about/life-map 反代配置
│   └── nginx-wall-location.conf  # /api/wall/ 反代配置
├── static/
│   ├── chat-ui.js                # 聊天组件交互逻辑（含音乐面板）
│   ├── message-wall.js           # 留言墙交互逻辑
│   ├── where-globe.js            # 我在哪里 3D 地球逻辑
│   ├── rag-vectors.json          # 博客内容向量索引
│   └── images/                   # 图片资源
├── themes/
│   └── PaperMod/                 # 主题（Git 子模块）
├── hugo.yaml                     # Hugo 配置文件
├── server/README.md              # 服务器 API 部署说明
└── package.json                  # Node.js 脚本与依赖
```

## 博客配置

### 关键配置项

| 配置 | 说明 |
|------|------|
| `baseURL` | 博客地址 |
| `theme` | PaperMod |
| `params.profileMode` | 首页极简模式 |
| `params.chat.proxyURL` | 聊天 API 地址，当前为 `https://sujian.online/api/chat` |
| `params.messageWall.apiURL` | 留言墙 API 站点地址，当前为 `https://sujian.online` |
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

### 每日新闻封面提示词

每日新闻封面由 `scripts/daily-cover-prompt.py` 生成。脚本按日期做稳定随机，从「风格类型 × 气质人设 × 场景主题」中各抽一个组合，输出给 ChatGPT 生成封面图。

```bash
# 输出纯提示词
python3 scripts/daily-cover-prompt.py --date 2026-05-19

# 输出 JSON，便于自动化流程记录抽中的组合
python3 scripts/daily-cover-prompt.py --date 2026-05-19 --json
```

脚本内置通用安全边界：成年女性、服装完整覆盖私密部位、不透明、不湿身、不破损、不低俗、不强调胸部/臀部或身体特写，画面需适合作为博客封面、头像或日更插画素材。

## 联系方式

- **Email**: 1917980791@qq.com
- **GitHub**: [sujian666666com-glitch](https://github.com/sujian666666com-glitch)

---

<p align="center">
  Made with ❤️ by 苏健
</p>
