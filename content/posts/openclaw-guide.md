---
date: '2026-03-02T16:20:00+08:00'
draft: false
title: '🦞 OpenClaw 从入门到精通'
description: '一份完整的 OpenClaw 使用指南，带你从零开始搭建个人 AI 助手'
tags: ["AI", "OpenClaw", "教程", "开源"]
categories: ["技术教程"]
author: "苏健"
---

> **OpenClaw** 是一个自托管的 AI 网关，让你通过 WhatsApp、Telegram、Discord、iMessage 等常用聊天应用与 AI 助手对话。运行在你的设备上，数据由你掌控。

*"EXFOLIATE! EXFOLIATE!" — A space lobster, probably*

---

## 📖 目录

- [什么是 OpenClaw？](#什么是-openclaw)
- [快速入门](#快速入门)
- [核心概念](#核心概念)
- [通道配置](#通道配置)
- [Skills 技能系统](#skills-技能系统)
- [多 Agent 路由](#多-agent-路由)
- [浏览器控制](#浏览器控制)
- [节点管理](#节点管理)
- [安全配置](#安全配置)
- [实战案例](#实战案例)
- [常见问题](#常见问题)

---

## 什么是 OpenClaw？

### 核心定位

OpenClaw 是一个**自托管的 AI 网关**，它连接你最喜欢的聊天应用到 AI 编码助手。你只需在本地运行一个 Gateway 进程，它就成为了消息应用和随时可用的 AI 助手之间的桥梁。

**谁适合使用？** 开发者和高级用户，想要一个可以从任何地方发送消息的个人 AI 助手，而不放弃数据控制权或依赖托管服务。

### 为什么选择 OpenClaw？

| 特性 | 说明 |
|------|------|
| 🏠 **自托管** | 运行在你的硬件上，你的规则 |
| 📡 **多通道** | 一个 Gateway 同时服务 WhatsApp、Telegram、Discord 等 |
| 🤖 **Agent 原生** | 专为编码 Agent 构建，支持工具调用、会话、记忆和多 Agent 路由 |
| 🔓 **开源** | MIT 许可，社区驱动 |
| 🎨 **Canvas 支持** | Agent 驱动的可视化工作空间 |
| 📱 **移动节点** | 配对 iOS 和 Android 节点，支持相机、屏幕录制等功能 |

### 支持的通道

OpenClaw 支持 **20+ 消息通道**：

| 通道 | 状态 | 说明 |
|------|------|------|
| WhatsApp | ✅ 生产就绪 | 基于 Baileys |
| Telegram | ✅ 生产就绪 | 基于 grammY |
| Discord | ✅ 生产就绪 | 基于 discord.js |
| Slack | ✅ 生产就绪 | 基于 Bolt |
| Signal | ✅ 可用 | 基于 signal-cli |
| iMessage | ✅ 可用 | BlueBubbles 推荐 |
| Google Chat | ✅ 可用 | Chat API |
| Feishu | ✅ 可用 | 飞书机器人 |
| Matrix | ✅ 可用 | - |
| LINE | ✅ 可用 | - |

---

## 快速入门

### 系统要求

- **Node.js**: 22 或更新版本
- **操作系统**: macOS / Linux / Windows (WSL2)
- **API Key**: Anthropic 推荐（或 OpenAI）

> ⚠️ 检查你的 Node 版本：`node --version`

### 安装方式

**macOS/Linux:**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

**Windows (PowerShell):**

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

**npm:**

```bash
npm install -g openclaw@latest
# 或使用 pnpm
pnpm add -g openclaw@latest
```

### 配置向导

**步骤 1: 运行配置向导**

```bash
openclaw onboard --install-daemon
```

向导会引导你完成：
- 模型/Auth 配置（Anthropic API Key 推荐）
- 工作空间设置
- Gateway 配置
- 通道设置
- 后台服务安装

**步骤 2: 检查 Gateway 状态**

```bash
openclaw gateway status
```

**步骤 3: 打开控制面板**

```bash
openclaw dashboard
```

浏览器会自动打开 `http://127.0.0.1:18789/`

> ✅ 如果控制面板加载成功，你的 Gateway 已经可以使用了！

### 发送测试消息

```bash
openclaw message send --target +1234567890 --message "Hello from OpenClaw"
```

---

## 核心概念

### 架构概览

OpenClaw 的核心架构如下：

```
┌─────────────────────────────────────────────────────────┐
│                   消息通道层                             │
│  WhatsApp | Telegram | Discord | Slack | Signal | ...  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Gateway (控制平面)                          │
│            ws://127.0.0.1:18789                         │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐     ┌──────────┐    ┌─────────────┐
   │Pi Agent │     │   CLI    │    │ iOS/Android │
   │  (RPC)  │     │(openclaw)│    │    Nodes    │
   └─────────┘     └──────────┘    └─────────────┘
```

**Gateway** 是 OpenClaw 的核心，它是：
- 会话、路由、通道连接的单一真相来源
- 一个 WebSocket 服务器（默认端口 18789）
- 控制 UI、CLI、节点的入口点

配置文件位置：`~/.openclaw/openclaw.json`

### Agent Runtime

OpenClaw 运行一个嵌入式的 Agent 运行时，每个 Agent 拥有：

- **工作空间**：文件、AGENTS.md、SOUL.md、USER.md 等
- **状态目录**：`~/.openclaw/agents/<agentId>/agent`
- **会话存储**：`~/.openclaw/agents/<agentId>/sessions`

### 启动文件（Bootstrap Files）

在工作空间目录中，OpenClaw 期望以下用户可编辑的文件：

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | 操作指令 + "记忆" |
| `SOUL.md` | 人格、边界、语气 |
| `TOOLS.md` | 用户维护的工具笔记 |
| `USER.md` | 用户档案 + 偏好地址 |
| `IDENTITY.md` | Agent 名称/风格/emoji |
| `BOOTSTRAP.md` | 一次性首次运行仪式（完成后删除） |

---

## 通道配置

### WhatsApp 配置

**步骤 1: 配置访问策略**

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",      // DM 策略：pairing | allowlist | open | disabled
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

**步骤 2: 链接 WhatsApp（扫码）**

```bash
openclaw channels login --channel whatsapp
```

**步骤 3: 启动 Gateway**

```bash
openclaw gateway
```

**步骤 4: 批准配对请求**

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

> 💡 **推荐**：为 OpenClaw 使用单独的 WhatsApp 号码，这样操作更清晰，DM 允许列表和路由边界更明确。

### Telegram 配置

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          botToken: "123456:ABC...",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

### Discord 配置

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN",
          guilds: {
            "123456789012345678": {
              channels: {
                "222222222222222222": { allow: true, requireMention: false },
              },
            },
          },
        },
      },
    },
  },
}
```

---

## Skills 技能系统

### 什么是 Skills？

**Skills** 是 AgentSkills 兼容的技能文件夹，用于教 Agent 如何使用工具。每个 Skill 是一个包含 `SKILL.md` 的目录。

### Skill 加载位置

技能从三个位置加载（优先级从高到低）：

1. **工作空间技能**：`<workspace>/skills` - 最高优先级
2. **托管/本地技能**：`~/.openclaw/skills`
3. **捆绑技能**：随安装包提供

### Skill 格式

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
metadata:
  {
    "openclaw":
      {
        "emoji": "🎨",
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"] },
      },
  }
---

# 使用说明...
```

### ClawHub - 技能市场

浏览和安装社区技能：[https://clawhub.com](https://clawhub.com)

```bash
# 安装技能
clawhub install <skill-slug>

# 更新所有技能
clawhub update --all

# 同步（扫描 + 发布更新）
clawhub sync --all
```

---

## 多 Agent 路由

### 什么是多 Agent？

**多 Agent** = 多个**隔离**的 Agent（独立工作空间 + agentDir + 会话），加上多个通道账号，通过绑定（bindings）路由入站消息。

### 快速设置

**步骤 1: 创建 Agent**

```bash
openclaw agents add coding
openclaw agents add social
```

**步骤 2: 创建通道账号**

```bash
# 为每个 Agent 链接不同的 WhatsApp 账号
openclaw channels login --channel whatsapp --account work
```

**步骤 3: 配置绑定**

```json5
{
  agents: {
    list: [
      { id: "home", workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

**步骤 4: 重启并验证**

```bash
openclaw gateway restart
openclaw agents list --bindings
```

### 路由规则

绑定是**确定性**的，**最具体优先**：

1. `peer` 匹配（精确 DM/群组/通道 ID）
2. `parentPeer` 匹配（线程继承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord）
5. `teamId`（Slack）
6. `accountId` 匹配
7. 通道级匹配（`accountId: "*"``）
8. 回退到默认 Agent

---

## 浏览器控制

### 概述

OpenClaw 可以运行一个**专用的 Chrome/Brave/Edge/Chromium 配置**，由 Agent 控制。它与你的个人浏览器隔离，通过本地控制服务管理。

### 快速开始

```bash
# 检查状态
openclaw browser --browser-profile openclaw status

# 启动浏览器
openclaw browser --browser-profile openclaw start

# 打开页面
openclaw browser --browser-profile openclaw open https://example.com

# 获取快照
openclaw browser --browser-profile openclaw snapshot
```

### 配置

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "openclaw",  // 或 "chrome" 使用扩展中继
    headless: false,
    color: "#FF4500",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
    },
  },
}
```

### Profile 类型

| Profile | 说明 |
|---------|------|
| `openclaw` | 管理的隔离浏览器（无需扩展） |
| `chrome` | 扩展中继到你现有的 Chrome 标签页 |

---

## 节点管理

### 什么是节点？

**节点**是连接到 Gateway WebSocket 的伴侣设备（macOS/iOS/Android/无头），暴露命令表面如：
- `canvas.*` - Canvas 控制
- `camera.*` - 相机拍照/录像
- `device.*` - 设备信息
- `notifications.*` - 通知
- `system.*` - 系统命令

### 配对 + 状态

```bash
# 列出设备
openclaw devices list

# 批准配对
openclaw devices approve <requestId>

# 查看节点状态
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

### 相机操作

```bash
# 列出相机
openclaw nodes camera list --node <id>

# 拍照
openclaw nodes camera snap --node <id> --facing front

# 录制视频
openclaw nodes camera clip --node <id> --duration 10s
```

### Canvas 控制

```bash
# 显示 Canvas
openclaw nodes canvas present --node <id> --target https://example.com

# 隐藏 Canvas
openclaw nodes canvas hide --node <id>

# 执行 JS
openclaw nodes canvas eval --node <id> --js "document.title"
```

### 屏幕录制

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 10
```

### 位置获取

```bash
openclaw nodes location get --node <id> --accuracy precise
```

---

## 安全配置

### DM 安全

> ⚠️ OpenClaw 连接到真实的消息平台。将入站 DM 视为**不可信输入**。

默认行为：
- **DM 配对**（`dmPolicy="pairing"`）：未知发送者收到配对码，bot 不处理其消息
- **批准**：`openclaw pairing approve`
- **公开 DM**：需要显式启用 `dmPolicy="open"` 和 `allowFrom: ["*"]`

### 安全检查

```bash
# 运行诊断
openclaw doctor

# 查看风险配置
openclaw config get --json
```

### 配置示例

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  messages: {
    groupChat: {
      mentionPatterns: ["@openclaw", "@assistant"],
    },
  },
}
```

---

## 实战案例

### 案例 1：个人 AI 助手

**场景**：在手机上通过 WhatsApp 与 AI 助手对话

**配置**：
```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123"],  // 你的手机号
    },
  },
}
```

**使用**：
- 发送消息给链接的 WhatsApp 号码
- AI 助手自动回复
- 支持图片、语音、文档

### 案例 2：团队协作机器人

**场景**：在 Discord 服务器中为团队提供 AI 助手

**配置**：
```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN",
          guilds: {
            "YOUR_GUILD_ID": {
              channels: {
                "CHANNEL_ID": { allow: true, requireMention: true },
              },
            },
          },
        },
      },
    },
  },
}
```

### 案例 3：多角色 Agent

**场景**：工作用 Agent 和个人用 Agent 分离

**配置**：
```json5
{
  agents: {
    list: [
      { id: "work", workspace: "~/.openclaw/workspace-work" },
      { id: "personal", workspace: "~/.openclaw/workspace-personal" },
    ],
  },
  bindings: [
    { agentId: "work", match: { channel: "telegram", accountId: "work" } },
    { agentId: "personal", match: { channel: "telegram", accountId: "personal" } },
  ],
}
```

---

## 常见问题

### Gateway 无法启动

```bash
# 检查日志
openclaw logs --follow

# 运行诊断
openclaw doctor
```

### WhatsApp 未链接

```bash
# 重新链接
openclaw channels login --channel whatsapp
openclaw channels status
```

### 群组消息被忽略

检查以下配置：
1. `groupPolicy` 设置
2. `groupAllowFrom` / `allowFrom` 列表
3. `groups` 允许列表
4. `requireMention` 设置
5. 提及模式配置

### 配置文件位置

| 类型 | 路径 |
|------|------|
| 配置 | `~/.openclaw/openclaw.json` |
| 状态 | `~/.openclaw/` |
| 工作空间 | `~/.openclaw/workspace` |
| Agent 目录 | `~/.openclaw/agents/<agentId>/agent` |
| 会话 | `~/.openclaw/agents/<agentId>/sessions` |

---

## 📚 资源链接

| 资源 | 链接 | 说明 |
|------|------|------|
| 📖 官方文档 | [docs.openclaw.ai](https://docs.openclaw.ai) | 完整的 OpenClaw 使用文档 |
| 💻 GitHub 仓库 | [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw) | 源码和问题反馈 |
| 💬 Discord 社区 | [discord.gg/clawd](https://discord.gg/clawd) | 加入社区讨论 |
| 🛒 ClawHub | [clawhub.com](https://clawhub.com) | 技能市场 |
| 📦 Nix 包 | [github.com/openclaw/nix-openclaw](https://github.com/openclaw/nix-openclaw) | Nix 安装方式 |
| 🐳 Docker | [docs.openclaw.ai/install/docker](https://docs.openclaw.ai/install/docker) | Docker 部署 |

---

## 🦞 总结

OpenClaw 是一个强大而灵活的 AI 网关，让你：

1. **自托管**：数据在你自己手中
2. **多通道**：一个 Gateway 服务所有聊天应用
3. **可扩展**：通过 Skills 添加新能力
4. **多 Agent**：支持工作和生活分离
5. **移动优先**：iOS 和 Android 节点支持

开始你的 OpenClaw 之旅：

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw dashboard
```

> 🦞 **EXFOLIATE!** 欢迎加入 OpenClaw 社区！

---

*最后更新：2026-03-02*  
*作者：苏健*  
*参考文档：[https://docs.openclaw.ai](https://docs.openclaw.ai)*
