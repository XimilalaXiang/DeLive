# API Key 获取指引

本页介绍如何获取 DeLive 支持的各个云端 ASR 服务的 API Key。本地方案（OpenAI 兼容和 whisper.cpp）不需要 API Key。

> **提示：** 获取 Key 后，打开 DeLive **设置 → ASR Provider**，选择对应的服务商，将 Key 粘贴到相应字段即可。

## 总览

| 服务商 | 免费额度 | 注册链接 | 需要信用卡 |
|--------|---------|---------|-----------|
| [Soniox](#soniox) | 按量付费（流式约 $0.12/小时） | [soniox.com](https://soniox.com) | 是 |
| [Groq](#groq) | 免费（有速率限制，无需信用卡） | [console.groq.com](https://console.groq.com) | 否 |
| [Cloudflare Workers AI](#cloudflare-workers-ai) | 每天 10,000 Neurons 免费 | [dash.cloudflare.com](https://dash.cloudflare.com) | 否 |
| [硅基流动](#硅基流动-siliconflow) | 新用户赠送 ¥14 / $1 额度 | [cloud.siliconflow.cn](https://cloud.siliconflow.cn) | 否 |
| [Deepgram](#deepgram) | 注册送 $200 额度（一次性） | [console.deepgram.com](https://console.deepgram.com) | 否 |
| [AssemblyAI](#assemblyai) | 注册送 $50 额度（一次性） | [assemblyai.com](https://www.assemblyai.com) | 否 |
| [ElevenLabs](#elevenlabs) | 按量付费（实时 $0.39/小时） | [elevenlabs.io](https://elevenlabs.io) | 否 |
| [Gladia](#gladia) | **每月 10 小时免费**（持续） | [gladia.io](https://www.gladia.io) | 否 |
| [Mistral AI](#mistral-ai) | 免费实验层（有速率限制） | [console.mistral.ai](https://console.mistral.ai) | 是 |
| [火山引擎](#火山引擎-volcengine) | 控制台查看试用额度 | [console.volcengine.com](https://console.volcengine.com) | 否 |

---

## Soniox

**官网：** [soniox.com](https://soniox.com)

**计费：** 基于 Token 计费，流式约 $0.12/小时，异步约 $0.10/小时。新用户无免费额度。

**获取步骤：**

1. 访问 [soniox.com](https://soniox.com)，点击 **Sign Up**
2. 使用邮箱或 Google/GitHub 注册
3. 进入控制台，找到 **API** 板块
4. 复制你的 **API Key**
5. 在 DeLive 中选择 **Soniox V4**，粘贴 Key

**DeLive 字段：** `apiKey`

---

## Groq

**官网：** [console.groq.com](https://console.groq.com)

**计费：** 免费层有速率限制（Whisper 每分钟 20 请求，每天 2,000 请求）。无需信用卡。Whisper Large v3 Turbo $0.04/小时，Whisper Large v3 $0.111/小时。

**获取步骤：**

1. 访问 [console.groq.com](https://console.groq.com)，注册账号
2. 登录后点击左侧 **API Keys**
3. 点击 **Create API Key**，输入名称
4. 复制生成的 Key（仅显示一次）
5. 在 DeLive 中选择 **Groq**，粘贴 Key

**DeLive 字段：** `apiKey`

::: tip 推荐入门首选
Groq 免费层无需信用卡，速率限制对个人使用足够，非常适合初次体验 DeLive。
:::

---

## Cloudflare Workers AI

**官网：** [dash.cloudflare.com](https://dash.cloudflare.com)

**计费：** 每天 10,000 Neurons 免费（约 243 分钟 Whisper 音频）。超出后 $0.0005/音频分钟（需 Workers 付费计划）。

**获取步骤：**

1. 在 [dash.cloudflare.com](https://dash.cloudflare.com) 注册
2. 进入 **AI → Workers AI**
3. 点击 **管理 API Token**（或访问 [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)）
4. 点击 **创建 Token** → 使用 Workers AI 模板或自定义 Token（需 `Workers AI: Read` 权限）
5. 复制生成的 Token
6. 记录你的 **Account ID**（在 Workers AI 概览页右侧可见）
7. 在 DeLive 中选择 **Cloudflare Workers AI**，填入 API Token 和 Account ID

**DeLive 字段：** `apiToken`、`accountId`

::: tip 性价比之选
免费层对日常使用非常友好。适合已有 Cloudflare 账户的用户。
:::

---

## 硅基流动 (SiliconFlow)

**官网：** [cloud.siliconflow.cn](https://cloud.siliconflow.cn)（中国站）/ [siliconflow.com](https://www.siliconflow.com)（国际站）

**计费：** 新用户赠送 ¥14（约 $1）初始额度。按量付费。支持 SenseVoice、TeleSpeech 和通义千问 Omni 模型。

**获取步骤：**

1. 访问 [cloud.siliconflow.cn](https://cloud.siliconflow.cn) 注册
2. 登录后点击左侧 **API Keys**
3. 点击 **新建 API Key**
4. 复制 Key
5. 在 DeLive 中选择 **SiliconFlow**，粘贴 Key

**DeLive 字段：** `apiKey`

---

## Deepgram

**官网：** [console.deepgram.com](https://console.deepgram.com)

**计费：** 注册即送 $200 免费额度（无需信用卡，无过期时间）。之后按量付费。支持 Nova-3 实时流式识别。

**获取步骤：**

1. 访问 [console.deepgram.com](https://console.deepgram.com) 注册
2. 登录后进入 **Settings → API Keys**
3. 点击 **Create a New API Key**
4. 输入名称，选择权限（Member 即可）
5. 复制生成的 Key
6. 在 DeLive 中选择 **Deepgram**，粘贴 Key

**DeLive 字段：** `apiKey`

::: tip 超值免费额度
$200 免费额度可覆盖数千分钟的转录，无需信用卡。
:::

---

## AssemblyAI

**官网：** [assemblyai.com](https://www.assemblyai.com)

**计费：** 注册送 $50 免费额度（无需信用卡）。Universal-3 Pro 预录音 $0.21/小时，流式 $0.45/小时。

**获取步骤：**

1. 访问 [assemblyai.com](https://www.assemblyai.com)，点击 **Get Started Free**
2. 使用邮箱或 GitHub 注册
3. 登录后，API Key 直接显示在控制台首页
4. 复制 Key
5. 在 DeLive 中选择 **AssemblyAI**，粘贴 Key

**DeLive 字段：** `apiKey`

---

## ElevenLabs

**官网：** [elevenlabs.io](https://elevenlabs.io)

**计费：** Scribe v2 Realtime（DeLive 使用）$0.39/小时。标准 Scribe $0.22/小时。按量付费，注册无需信用卡。

**获取步骤：**

1. 访问 [elevenlabs.io](https://elevenlabs.io) 注册
2. 点击右上角头像 → **Profile + API key**
3. 复制你的 **API Key**（或生成新的）
4. 在 DeLive 中选择 **ElevenLabs**，粘贴 Key

**DeLive 字段：** `apiKey`

---

## Gladia

**官网：** [gladia.io](https://www.gladia.io)

**计费：** **每月 10 小时免费**（持续刷新，无需信用卡）。付费：实时 $0.75/小时，异步 $0.61/小时。包含说话人分离、100+ 语言支持。

**获取步骤：**

1. 访问 [app.gladia.io](https://app.gladia.io) 注册
2. 登录后进入 **API Keys** 页面
3. 点击 **Create API Key**
4. 复制生成的 Key
5. 在 DeLive 中选择 **Gladia**，粘贴 Key

**DeLive 字段：** `apiKey`

::: tip 最佳持续免费方案
每月 10 小时免费额度自动刷新，无需信用卡。适合长期日常使用。
:::

---

## Mistral AI

**官网：** [console.mistral.ai](https://console.mistral.ai)

**计费：** 免费实验层（Experiment）可访问所有模型，有速率限制。需要信用卡和手机验证。Voxtral 模型用于实时 ASR。

**获取步骤：**

1. 访问 [console.mistral.ai](https://console.mistral.ai) 注册
2. 验证手机号
3. 点击左侧 **API Keys**
4. 点击 **Create new key**
5. 复制 Key
6. 在 DeLive 中选择 **Mistral AI**，粘贴 Key

**DeLive 字段：** `apiKey`

::: tip 免费实验层
虽有速率限制，但个人使用和测试完全够用。注册需要信用卡。
:::

---

## 火山引擎 (Volcengine)

**官网：** [console.volcengine.com](https://console.volcengine.com)

**计费：** 按分钟计费，请在控制台查看试用额度。主要面向中国市场。

**获取步骤：**

1. 访问 [console.volcengine.com](https://console.volcengine.com) 注册（需要中国手机号）
2. 导航到 **语音技术** → **实时语音识别**
3. 开通服务，记下 **AppKey**
4. 进入 **密钥管理**，获取 **Access Key**
5. 在 DeLive 中选择 **火山引擎**，分别填入 `appKey` 和 `accessKey`

**DeLive 字段：** `appKey`、`accessKey`

::: warning 中国区域限制
火山引擎注册通常需要中国手机号和实名认证。
:::

---

## 常见问题

### Key 无法使用？

- 确保 Key 前后没有多余的空格
- 检查 Key 是否有正确的权限（部分服务商有作用域限制的 Token）
- 在服务商控制台确认 Key 没有过期或被撤销

### 遇到速率限制？

- 免费层有速率限制，遇到时稍等片刻重试
- 如经常触发，考虑升级到付费方案

### 无法连接服务商？

- 检查网络连接
- 部分服务商（火山引擎）可能有地域限制
- 尝试切换到其他服务商以排查问题

---

## 按使用场景推荐

| 使用场景 | 推荐服务商 |
|---------|-----------|
| 免费试用、初次体验 | Groq、Gladia、Deepgram |
| 英语高精度 | Soniox、Deepgram、AssemblyAI |
| 中文内容 | 火山引擎、硅基流动 |
| 多语言 | Soniox、ElevenLabs、Gladia |
| 预算敏感 | Cloudflare Workers AI、Groq |
| 完全离线 | 本地 whisper.cpp（无需 Key） |

---

## 下一步

- [快速开始](./getting-started) — 下载和首次启动
- [ASR Provider](./providers) — 各服务商技术详情
- [录制](./recording) — 如何捕获和转录音频
