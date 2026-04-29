# API Key Guide

This page walks you through obtaining API keys for each cloud-based ASR provider supported by DeLive. Local providers (OpenAI-compatible and whisper.cpp) do not require API keys.

> **Tip:** After obtaining your key, open DeLive **Settings → ASR Provider**, select the provider, and paste your key into the corresponding field.

## Quick Overview

| Provider | Free Tier | Signup Link | Credit Card Required |
|----------|-----------|-------------|---------------------|
| [Soniox](#soniox) | Pay-as-you-go (~$0.12/hr streaming) | [soniox.com](https://soniox.com) | Yes |
| [Groq](#groq) | Free (rate-limited, no card needed) | [console.groq.com](https://console.groq.com) | No |
| [Cloudflare Workers AI](#cloudflare-workers-ai) | 10,000 Neurons/day free | [dash.cloudflare.com](https://dash.cloudflare.com) | No |
| [SiliconFlow](#siliconflow) | $1 free credits for new users | [cloud.siliconflow.cn](https://cloud.siliconflow.cn) | No |
| [Deepgram](#deepgram) | $200 free credits (one-time) | [console.deepgram.com](https://console.deepgram.com) | No |
| [AssemblyAI](#assemblyai) | $50 free credits (one-time) | [assemblyai.com](https://www.assemblyai.com) | No |
| [ElevenLabs](#elevenlabs) | Pay-as-you-go ($0.39/hr realtime) | [elevenlabs.io](https://elevenlabs.io) | Yes |
| [Gladia](#gladia) | 10 hours/month (recurring) | [gladia.io](https://www.gladia.io) | No |
| [Mistral AI](#mistral-ai) | Free Experiment tier (rate-limited) | [console.mistral.ai](https://console.mistral.ai) | No |
| [Volcengine](#volcengine) | Check console for trial credits | [console.volcengine.com](https://console.volcengine.com) | No |

---

## Soniox

**Website:** [soniox.com](https://soniox.com)

**Pricing:** ~$0.12/hr streaming, ~$0.10/hr async (token-based). No free credits for new API signups.

**Steps:**

1. Go to [soniox.com](https://soniox.com) and click **Sign Up**
2. Create an account with your email or Google/GitHub login
3. Navigate to the **API** section in your dashboard
4. Copy your **API Key**
5. In DeLive, select **Soniox V4** as provider and paste the key

**DeLive field:** `apiKey`

---

## Groq

**Website:** [console.groq.com](https://console.groq.com)

**Pricing:** Free tier with rate limits (20 RPM, 2,000 RPD for Whisper). No credit card required. Whisper Large v3 Turbo at $0.04/hr, Whisper Large v3 at $0.111/hr.

**Steps:**

1. Go to [console.groq.com](https://console.groq.com) and sign up (email or Google/GitHub)
2. After login, click **API Keys** in the left sidebar
3. Click **Create API Key**, give it a name
4. Copy the generated key (it won't be shown again)
5. In DeLive, select **Groq** as provider and paste the key

**DeLive field:** `apiKey`

::: tip Recommended for Getting Started
Groq offers a generous free tier with no credit card. Great for trying DeLive with Whisper models.
:::

---

## Cloudflare Workers AI

**Website:** [dash.cloudflare.com](https://dash.cloudflare.com)

**Pricing:** 10,000 Neurons/day free (~243 minutes of Whisper audio). Beyond that, $0.0005/audio minute on Workers Paid plan.

**Steps:**

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **AI → Workers AI** in the sidebar
3. Click **Manage API Tokens** (or go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens))
4. Click **Create Token** → use the **Workers AI** template or create a custom token with `Workers AI: Read` permission
5. Copy the generated token
6. Also note your **Account ID** (visible on the Workers AI overview page or right sidebar)
7. In DeLive, select **Cloudflare Workers AI** as provider, paste the API Token and Account ID

**DeLive fields:** `apiToken`, `accountId`

::: tip Budget-Friendly
The free tier is generous for casual use. Ideal for users who already have a Cloudflare account.
:::

---

## SiliconFlow

**Website:** [cloud.siliconflow.cn](https://cloud.siliconflow.cn) (China) / [siliconflow.com](https://www.siliconflow.com) (International)

**Pricing:** New users receive free credits (¥14 / ~$1). Pay-as-you-go after that. Supports SenseVoice, TeleSpeech, and Qwen Omni models.

**Steps:**

1. Go to [cloud.siliconflow.cn](https://cloud.siliconflow.cn) and register
2. After login, click **API Keys** in the left menu
3. Click **Create new API key**
4. Copy the key
5. In DeLive, select **SiliconFlow** as provider and paste the key

**DeLive field:** `apiKey`

---

## Deepgram

**Website:** [console.deepgram.com](https://console.deepgram.com)

**Pricing:** $200 in free credits on signup (no credit card, no expiration). After credits, pay-as-you-go. Nova-3 real-time streaming available.

**Steps:**

1. Go to [console.deepgram.com](https://console.deepgram.com) and sign up
2. After login, go to **Settings → API Keys**
3. Click **Create a New API Key**
4. Give it a name and select permissions (Member is fine)
5. Copy the generated key
6. In DeLive, select **Deepgram** as provider and paste the key

**DeLive field:** `apiKey`

::: tip Great Free Credits
$200 in free credits covers thousands of minutes. No credit card required.
:::

---

## AssemblyAI

**Website:** [assemblyai.com](https://www.assemblyai.com)

**Pricing:** $50 in free credits on signup (no credit card). Universal-3 Pro pre-recorded at $0.21/hr, streaming at $0.45/hr.

**Steps:**

1. Go to [assemblyai.com](https://www.assemblyai.com) and click **Get Started Free**
2. Create an account with email or GitHub
3. Your API key is shown on the dashboard home page
4. Copy the key
5. In DeLive, select **AssemblyAI** as provider and paste the key

**DeLive field:** `apiKey`

---

## ElevenLabs

**Website:** [elevenlabs.io](https://elevenlabs.io)

**Pricing:** Scribe v2 Realtime (used by DeLive) at $0.39/hr. Standard Scribe at $0.22/hr. Pay-as-you-go, no recurring free STT credits.

**Steps:**

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign up
2. Click your profile icon → **Profile + API key**
3. Copy your **API Key** (or generate a new one)
4. In DeLive, select **ElevenLabs** as provider and paste the key

**DeLive field:** `apiKey`

---

## Gladia

**Website:** [gladia.io](https://www.gladia.io)

**Pricing:** **10 free hours per month** (recurring, no credit card). Starter: $0.75/hr realtime, $0.61/hr async. Includes speaker diarization and 100+ languages.

**Steps:**

1. Go to [app.gladia.io](https://app.gladia.io) and sign up
2. After login, go to **API Keys** page
3. Click **Create API Key**
4. Copy the generated key
5. In DeLive, select **Gladia** as provider and paste the key

**DeLive field:** `apiKey`

::: tip Best Recurring Free Tier
10 free hours every month with no credit card. The most sustainable free option for regular use.
:::

---

## Mistral AI

**Website:** [console.mistral.ai](https://console.mistral.ai)

**Pricing:** Free Experiment tier with rate-limited access to all models (no credit card, phone verification only). Voxtral models for real-time ASR.

**Steps:**

1. Go to [console.mistral.ai](https://console.mistral.ai) and sign up
2. Verify your phone number
3. Go to **API Keys** in the sidebar
4. Click **Create new key**
5. Copy the key
6. In DeLive, select **Mistral AI** as provider and paste the key

**DeLive field:** `apiKey`

::: tip Free Experiment Tier
No credit card needed. Rate-limited but sufficient for personal use and testing.
:::

---

## Volcengine

**Website:** [console.volcengine.com](https://console.volcengine.com)

**Pricing:** Check the console for trial credits and pricing. Streaming ASR is billed per minute. Primarily targets the Chinese market.

**Steps:**

1. Go to [console.volcengine.com](https://console.volcengine.com) and register (Chinese phone number required)
2. Navigate to **语音技术 (Speech Technology)** → **实时语音识别 (Streaming ASR)**
3. Activate the service and note your **AppKey**
4. Go to **密钥管理 (Key Management)** to find your **Access Key**
5. In DeLive, select **Volcengine** as provider, enter both `appKey` and `accessKey`

**DeLive fields:** `appKey`, `accessKey`

::: warning China Region
Volcengine registration typically requires a Chinese phone number and identity verification.
:::

---

## Troubleshooting

### Key not working?

- Make sure there are no extra spaces before or after the key
- Check that the key has the correct permissions (some providers have scoped tokens)
- Verify the key hasn't expired or been revoked on the provider's dashboard

### Rate limit errors?

- Free tiers have rate limits. If you hit them, wait a moment and try again
- Consider upgrading to a paid plan for higher limits

### Provider not connecting?

- Check your internet connection
- Some providers (Volcengine) may have regional restrictions
- Try a different provider to isolate the issue

---

## Comparison by Use Case

| Use Case | Recommended Provider |
|----------|---------------------|
| Free trial, getting started | Groq, Gladia, Deepgram |
| Best accuracy (English) | Soniox, Deepgram, AssemblyAI |
| Chinese content | Volcengine, SiliconFlow |
| Multilingual | Soniox, ElevenLabs, Gladia |
| Budget-conscious | Cloudflare Workers AI, Groq |
| Fully offline | Local whisper.cpp (no key needed) |

---

## Next Steps

- [Getting Started](./getting-started) — Download and first launch
- [ASR Providers](./providers) — Technical details on each provider
- [Recording](./recording) — How to capture and transcribe audio
