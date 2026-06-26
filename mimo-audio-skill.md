---
name: mimo-audio
description: 使用小米 MiMo / Mimo API 处理模型语音任务，包括语音转文字 ASR、文本合成语音 TTS、音色设计、音色复刻、音频理解、音频内容总结、会议/歌词/方言转写，以及 OpenAI 兼容格式的 MiMo 音频 API 调用。
provider: Xiaomi MiMo
language: zh-CN
version: 0.1.0
---

# MiMo 模型语音 Skill

## 触发场景

当用户提出以下需求时，使用本 skill：

- 将音频、录音、会议、歌词、方言、采访、播客转成文字。
- 把文本合成为语音，生成旁白、配音、角色语音、播报音频。
- 根据文字描述设计音色。
- 基于用户授权的音频样本复刻音色。
- 对音频内容做理解、总结、分类、问答、情绪/场景分析。
- 编写或调试 MiMo 音频 API 的 curl / Python / OpenAI SDK 调用。

## 默认配置

用户已订阅 MiMo Token Plan。本 skill 暂按用户要求写死 API Key，后续正式化时应改回环境变量。

```python
MIMO_API_KEY = "tp-c5tuw9hrjv6thxkzchnc718d1gxf769ggzhydo35wai7ov65"
MIMO_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1"
MIMO_CHAT_COMPLETIONS_URL = f"{MIMO_BASE_URL}/chat/completions"
```

调用时使用 HTTP Header：

```http
api-key: tp-c5tuw9hrjv6thxkzchnc718d1gxf769ggzhydo35wai7ov65
Content-Type: application/json
```

如果用户之后提供专属 Base URL，优先替换 `MIMO_BASE_URL`。

## 当前优先模型

优先使用 V2.5 系列，避免新代码继续依赖 `mimo-v2-tts`。

| 任务 | 模型 |
| --- | --- |
| 语音识别 / Speech to Text | `mimo-v2.5-asr` |
| 预置音色语音合成 | `mimo-v2.5-tts` |
| 文本描述设计音色 | `mimo-v2.5-tts-voicedesign` |
| 音频样本复刻音色 | `mimo-v2.5-tts-voiceclone` |
| 音频理解 / 问答 / 总结 | `mimo-v2.5` |

注意：MiMo 文档在 2026-06-25 可见公告中提示，V2 模型会在 2026-06-27 / 2026-06-30 前后转发或下线，因此默认写 V2.5。

## 通用调用规则

- 使用 OpenAI 兼容的 `/chat/completions`。
- API Key 放在 `api-key` header，不是 `Authorization: Bearer`。
- 音频输入通常用 `input_audio.data`。
- 本地音频传入前编码为 Data URL：`data:{MIME_TYPE};base64,{BASE64_AUDIO}`。
- ASR 和音色复刻样本目前按文档只支持 `wav`、`mp3`。
- ASR 和音色复刻样本的 Base64 字符串上限按文档为 10 MB。
- MIME 类型：
  - wav: `audio/wav`
  - mp3: `audio/mpeg` 或 `audio/mp3`
- 处理用户声音复刻请求时，必须确认用户拥有声音样本授权或明确同意。

## 语音转文字 ASR

适用：会议转写、录音整理、歌词识别、方言转写、嘈杂环境录音识别。

关键点：

- 模型：`mimo-v2.5-asr`
- `asr_options.language` 可选：`auto`、`zh`、`en`
- 已知语言时优先指定，通常比自动识别更稳。

请求体模板：

```json
{
  "model": "mimo-v2.5-asr",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_audio",
          "input_audio": {
            "data": "data:audio/wav;base64,{BASE64_AUDIO}"
          }
        }
      ]
    }
  ],
  "asr_options": {
    "language": "zh"
  }
}
```

Python 示例：

```python
import base64
import requests

MIMO_API_KEY = "tp-c5tuw9hrjv6thxkzchnc718d1gxf769ggzhydo35wai7ov65"
MIMO_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1"

audio_path = "audio.wav"
with open(audio_path, "rb") as f:
    audio_b64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "model": "mimo-v2.5-asr",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "input_audio",
                    "input_audio": {
                        "data": f"data:audio/wav;base64,{audio_b64}"
                    },
                }
            ],
        }
    ],
    "asr_options": {"language": "zh"},
}

resp = requests.post(
    f"{MIMO_BASE_URL}/chat/completions",
    headers={"api-key": MIMO_API_KEY, "Content-Type": "application/json"},
    json=payload,
    timeout=180,
)
resp.raise_for_status()
print(resp.json())
```

## 文本合成语音 TTS

适用：旁白、播客、角色配音、营销视频语音、中文/英文朗读、带情绪的语音表演。

关键点：

- 模型：`mimo-v2.5-tts`
- 要合成的文本必须放在 `role: assistant` 消息里。
- 风格、语气、导演指令可放在 `role: user` 消息里。
- 非流式输出通常用 `audio.format: "wav"`。
- 流式输出用 `audio.format: "pcm16"`，返回 24kHz PCM16LE mono 音频片段，需要自行拼接/封装 wav。

常用预置音色：

- `mimo_default`
- `冰糖`
- `茉莉`
- `苏打`
- `白桦`
- `Mia`
- `Chloe`
- `Milo`
- `Dean`

请求体模板：

```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    {
      "role": "user",
      "content": "用温柔、自然、略带微笑的语气朗读，语速中等。"
    },
    {
      "role": "assistant",
      "content": "你好，欢迎使用 MiMo 模型语音能力。"
    }
  ],
  "audio": {
    "format": "wav",
    "voice": "冰糖"
  }
}
```

Python 示例：

```python
import base64
import requests

MIMO_API_KEY = "tp-c5tuw9hrjv6thxkzchnc718d1gxf769ggzhydo35wai7ov65"
MIMO_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1"

payload = {
    "model": "mimo-v2.5-tts",
    "messages": [
        {
            "role": "user",
            "content": "用轻快上扬的语调，语速稍快，像刚刚收到好消息。",
        },
        {
            "role": "assistant",
            "content": "太好了，我们的语音合成已经跑通了。",
        },
    ],
    "audio": {"format": "wav", "voice": "冰糖"},
}

resp = requests.post(
    f"{MIMO_BASE_URL}/chat/completions",
    headers={"api-key": MIMO_API_KEY, "Content-Type": "application/json"},
    json=payload,
    timeout=180,
)
resp.raise_for_status()
data = resp.json()
audio_b64 = data["choices"][0]["message"]["audio"]["data"]

with open("mimo-tts.wav", "wb") as f:
    f.write(base64.b64decode(audio_b64))
```

## 风格与标签控制

V2.5 TTS 支持自然语言控制和音频标签控制。

自然语言控制放在 `user.content`：

```text
用明亮活泼的青少年嗓音，带一点恶作剧得逞后的得意，语速偏快，句尾微微上扬。
```

标签控制放在 `assistant.content`：

```text
(开心)今天终于把这个功能跑通了，真的太好了。
(东北话)哎呀妈呀，这语音效果还挺自然。
(唱歌)原谅我这一生不羁放纵爱自由。
```

细粒度音频标签也写入待合成文本：

```text
（紧张，深呼吸）呼……冷静，冷静。不就是一个演示吗……（小声）应该没问题的。
```

## 文本描述设计音色

适用：用户没有声音样本，但想要某类声音，例如“温柔治愈系女声”“低沉磁性的男旁白”。

关键点：

- 模型：`mimo-v2.5-tts-voicedesign`
- 音色描述放在 `user.content`
- 合成文本放在 `assistant.content`
- 不要传预置 `voice`
- 可选 `audio.optimize_text_preview: true`

请求体模板：

```json
{
  "model": "mimo-v2.5-tts-voicedesign",
  "messages": [
    {
      "role": "user",
      "content": "一位三十岁左右的中文女性，声音温柔、干净、略带气声，语速较慢，像睡前电台主持人。"
    },
    {
      "role": "assistant",
      "content": "夜深了，把今天的疲惫慢慢放下。"
    }
  ],
  "audio": {
    "format": "wav",
    "optimize_text_preview": false
  }
}
```

好的音色描述通常包含：

- 性别、年龄、语言或口音。
- 音色质感，例如磁性、清亮、沙哑、醇厚。
- 情绪和语气，例如温柔、疲惫、自信、克制。
- 语速、停顿、节奏。
- 角色和场景，例如电台主持人、纪录片旁白、游戏 NPC。

避免：

- 互相冲突的要求，例如“儿童音色 + 成熟 CEO 气场”。
- 过于空泛的词，例如“正常的”“普通的”“好听的”。
- 后期制作词，例如混响、EQ、压缩。

## 音色复刻

适用：用户明确有授权的声音样本，并希望用这个样本的音色合成新文本。

关键点：

- 模型：`mimo-v2.5-tts-voiceclone`
- `audio.voice` 传入声音样本 Data URL。
- 样本支持 `wav`、`mp3`。
- Base64 样本大小按文档上限 10 MB。
- 不使用预置音色，也不使用文本音色设计。
- 必须提醒授权与隐私风险，不要长期保存样本。

请求体模板：

```json
{
  "model": "mimo-v2.5-tts-voiceclone",
  "messages": [
    {
      "role": "user",
      "content": ""
    },
    {
      "role": "assistant",
      "content": "这是一段授权声音复刻测试。"
    }
  ],
  "audio": {
    "format": "wav",
    "voice": "data:audio/mpeg;base64,{BASE64_VOICE_SAMPLE}"
  }
}
```

## 音频理解

适用：用户不是只要逐字稿，而是要理解音频，例如总结内容、判断情绪、提取事件、分析声景、回答关于音频的问题。

关键点：

- 模型：`mimo-v2.5`
- 输入可为音频 URL 或 Base64 Data URL。
- 与文本问题一起放入 `user.content` 数组。

请求体模板：

```json
{
  "model": "mimo-v2.5",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_audio",
          "input_audio": {
            "data": "data:audio/wav;base64,{BASE64_AUDIO}"
          }
        },
        {
          "type": "text",
          "text": "请总结这段音频的主要内容，并列出关键信息。"
        }
      ]
    }
  ],
  "max_completion_tokens": 1024
}
```

## OpenAI SDK 写法

如果使用 OpenAI Python SDK：

```python
from openai import OpenAI

client = OpenAI(
    api_key="tp-c5tuw9hrjv6thxkzchnc718d1gxf769ggzhydo35wai7ov65",
    base_url="https://token-plan-cn.xiaomimimo.com/v1",
)
```

普通字段可直接传；MiMo 扩展字段如果 SDK 不接受，则放入 `extra_body`：

```python
completion = client.chat.completions.create(
    model="mimo-v2.5-asr",
    messages=[...],
    extra_body={
        "asr_options": {"language": "zh"}
    },
)
```

## 排错清单

- `401` / 认证失败：检查 key 是否有效、Base URL 是否为 Token Plan 地址、header 是否为 `api-key`。
- `404` / 模型不存在：确认使用 V2.5 模型名。
- TTS 没有音频：确认目标文本在 `assistant.content`，不是 `user.content`。
- ASR 精度差：已知中文/英文时指定 `asr_options.language`。
- 音频过大：转成低码率 mp3 或分段，确保 Base64 后不超过限制。
- 流式音频噪声：确认按 24kHz PCM16LE mono 拼接，并正确封装成 wav。
- 音色复刻失败：确认样本格式、大小、授权，以及 `audio.voice` 是完整 Data URL。

## 官方参考

- 语音合成 V2.5：https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5
- 语音识别：https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/Speech-Recognition
- 音频理解：https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/audio-understanding
- 首次调用 / Token Plan：https://mimo.mi.com/docs/zh-CN/quick-start/summary/first-api-call
