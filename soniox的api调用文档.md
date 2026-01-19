# Get started
URL: /stt/get-started

Learn how to use Soniox Speech-to-Text API.

***

title: Get started
description: Learn how to use Soniox Speech-to-Text API.
keywords: "get started with speech to text, speech to text api, speach recognition api"
---------------------------------------------------------------------------------------

## Learn how to use Soniox API in minutes

Soniox Speech-to-Text is a **universal speech AI** that lets you transcribe and
translate speech in 60+ languages — from recorded files (async) or live audio
streams (real-time). Languages can be freely mixed within the same conversation,
and Soniox will handle them seamlessly with high accuracy and low latency.

In just a few steps, you can run your first transcription or translation. The
examples also cover advanced features such as speaker diarization, real-time
translation, context customization, and automatic language identification — all
through the same simple API.

<Steps>
  <Step>
    ### Get API key

    Create a [Soniox account](https://console.soniox.com/signup) and log in to
    the [Console](https://console.soniox.com) to get your API key.

    <Callout>
      API keys are created per project. In the Console, go to **My First Project** and click **API Keys** to generate one.
    </Callout>

    Export it as an environment variable (replace with your key):

    ```sh title="Terminal"
    export SONIOX_API_KEY=<YOUR_API_KEY>
    ```
  </Step>

  <Step>
    ### Get examples

    Clone the official examples repo:

    ```sh title="Terminal"
    git clone https://github.com/soniox/soniox_examples
    cd soniox_examples/speech_to_text
    ```
  </Step>

  <Step>
    ### Run examples

    Choose your language and run the ready-to-use examples below.

    {/* TABLE START */}

    {/* NOTE(miha): Width is set so that we have maximum of 2 lines in 'Example' column. */}

    {/* NOTE(miha): Font size is set so the table doesn't look "too big". */}

    <div style={{fontSize: '14px'}}>
      | <div style={{width:'170px'}}>Example</div> | What it does                                                                                                            | Output                                                     |
      | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
      | **Real-time <br /> transcription**         | Transcribes speech in any language in <br /> real-time.                                                                 | Transcript streamed to console.                            |
      | **Real-time <br /> one-way translation**   | Transcribes speech in any language and translates it into Spanish in real-time.                                         | Transcript + Spanish translation streamed together.        |
      | **Real-time <br /> two-way translation**   | Transcribes speech in any language and translates English ↔ Spanish in real-time. Spanish → English, English → Spanish. | Transcript + bidirectional translations streamed together. |
      | **Transcribe file from URL**               | Transcribes an audio file directly from a public URL.                                                                   | Transcript printed to console.                             |
      | **Transcribe local file**                  | Uploads and transcribes an audio file from your computer.                                                               | Transcript printed to console.                             |
    </div>

    {/* TABLE END */}

    <Tabs
      items={[
        'Python',
        'Node.js']}
    >
      <Tab>
        {/* NOTE(miha): Empty tag is needed so code block renders correctly */}

        <div />

        ```sh title="Terminal"
        cd python

        # Set up environment
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt

        # Real-time examples
        python soniox_realtime.py --audio_path ../assets/coffee_shop.mp3
        python soniox_realtime.py --audio_path ../assets/coffee_shop.mp3 --translation one_way
        python soniox_realtime.py --audio_path ../assets/two_way_translation.mp3 --translation two_way

        # Async examples
        python soniox_async.py --audio_url "https://soniox.com/media/examples/coffee_shop.mp3"
        python soniox_async.py --audio_path ../assets/coffee_shop.mp3
        ```
      </Tab>

      <Tab>
        {/* NOTE(miha): Empty tag is needed so code block renders correctly */}

        <div />

        ```sh title="Terminal"
        cd nodejs

        # Install dependencies
        npm install

        # Real-time examples
        node soniox_realtime.js --audio_path ../assets/coffee_shop.mp3
        node soniox_realtime.js --audio_path ../assets/coffee_shop.mp3 --translation one_way
        node soniox_realtime.js --audio_path ../assets/two_way_translation.mp3 --translation two_way

        # Async examples
        node soniox_async.js --audio_url "https://soniox.com/media/examples/coffee_shop.mp3"
        node soniox_async.js --audio_path ../assets/coffee_shop.mp3
        ```
      </Tab>
    </Tabs>
  </Step>
</Steps>

## Next steps

* **Dive into the [Real-time API](/stt/rt/real-time-transcription)** → Run live transcription, translations, and endpoint detection.
* **Explore the [Async API](/stt/async/async-transcription)** → Transcribe and translate (recorded) files at scale and integrate with webhooks.

# Real-time transcription
URL: /stt/rt/real-time-transcription

Learn about real-time transcription with low latency and high accuracy for all 60+ languages.

***

title: Real-time transcription
description: Learn about real-time transcription with low latency and high accuracy for all 60+ languages.
keywords: "learn how to transcribe audio in real time, multilingial live transcription, multilingual model"
-----------------------------------------------------------------------------------------------------------

## Overview

Soniox Speech-to-Text AI lets you transcribe audio in real time with **low latency**
and **high accuracy** in over 60 languages. This is ideal for use cases like **live
captions, voice assistants, streaming analytics, and conversational AI.**

Real-time transcription is provided through our [WebSocket API](/stt/api-reference/websocket-api), which streams
results back to you as the audio is processed.

***

## How processing works

As audio is streamed into the API, Soniox returns a continuous stream of **tokens** — small units of text such as subwords, words, or spaces.

Each token carries a status flag (`is_final`) that tells you whether the token is **provisional** or **confirmed:**

* **Non-final token** (`is_final: false`) → Provisional text. Appears instantly but may change, disappear, or be replaced as more audio arrives.
* **Final token** (`is_final: true`) → Confirmed text. Once marked final, it will never change in future responses.

This means you get text right away (non-final for instant feedback), followed by the confirmed version (final for stable output).

<Callout type="warn">
  Non-final tokens may appear multiple times and change slightly until they stabilize into a final token. Final tokens are sent only once and never repeated.
</Callout>

### Example token evolution

Here’s how `"How are you doing?"` might arrive over time:

<Steps>
  <Step>
    **Initial guess (non-final):**

    ```json
    {"tokens": [{"text": "How",    "is_final": false},
                {"text": "'re",    "is_final": false}]}
    ```
  </Step>

  <Step>
    **Refined guess (non-final):**

    ```json
    {"tokens": [{"text": "How",    "is_final": false},
                {"text": " ",      "is_final": false},
                {"text": "are",    "is_final": false}]}
    ```
  </Step>

  <Step>
    **Mixed output (final + non-final):**

    ```json
    {"tokens": [{"text": "How",    "is_final": true},
                {"text": " ",      "is_final": true},
                {"text": "are",    "is_final": false},
                {"text": " ",      "is_final": false},
                {"text": "you",    "is_final": false}]}
    ```
  </Step>

  <Step>
    **Mixed output (final + non-final):**

    ```json
    {"tokens": [{"text": "are",    "is_final": true},
                {"text": " ",      "is_final": true},
                {"text": "you",    "is_final": true},
                {"text": " ",      "is_final": false},
                {"text": "do",     "is_final": false},
                {"text": "ing",    "is_final": false},
                {"text": "?",      "is_final": false}]}
    ```
  </Step>

  <Step>
    **Confirmed tokens (final):**

    ```json
    {"tokens": [{"text": " ",      "is_final": true},
                {"text": "do",     "is_final": true},
                {"text": "ing",    "is_final": true},
                {"text": "?",      "is_final": true}]}
    ```
  </Step>
</Steps>

**Bottom line:** The model may start with a shorthand guess like “How’re”, then
refine it into “How are you”, and finally extend it into “How are you doing?”.
Non-final tokens update instantly, while final tokens never change once
confirmed.

***

## Audio progress tracking

Each response also tells you **how much audio has been processed**:

* `audio_final_proc_ms` — audio processed into **final tokens.**
* `audio_total_proc_ms` — audio processed into **final + non-final tokens.**

Example:

```json
{
  "audio_final_proc_ms": 4800,
  "audio_total_proc_ms": 5250
}
```

**This means:**

* Audio up to **4.8s** has been processed and finalized (final tokens).
* Audio up to **5.25s** has been processed in total (final + non-final tokens).

***

## Getting final tokens sooner

There are two ways to obtain final tokens more quickly:

1. [Endpoint detection](/stt/rt/endpoint-detection) — the model can detect when a speaker has stopped talking and finalize tokens immediately.
2. [Manual finalization](/stt/rt/manual-finalization) — you can send a `"type": "finalize"` message over the WebSocket to force all pending tokens to finalize.

{/* **Example: Transcribe a live audio stream** */}

***

## Audio formats

Soniox supports both **auto-detected formats** (no configuration required) and **raw audio formats** (manual configuration required).

### Auto-detected formats

Soniox can automatically detect common container formats from stream headers.
No configuration needed — just set:

```json
{
  "audio_format": "auto"
}
```

Supported auto formats:

```text
aac, aiff, amr, asf, flac, mp3, ogg, wav, webm
```

### Raw audio formats

For raw audio streams without headers, you must provide:

* `audio_format` → encoding type.
* `sample_rate` →  sample rate in Hz.
* `num_channels` → number of channels (e.g. 1 (mono) or 2 (stereo)).

**Supported encodings:**

* PCM (signed): `pcm_s8`, `pcm_s16`, `pcm_s24`, `pcm_s32` (`le`/`be`).
* PCM (unsigned): `pcm_u8`, `pcm_u16`, `pcm_u24`, `pcm_u32` (`le`/`be`).
* Float PCM: `pcm_f32`, `pcm_f64` (`le`/`be`).
* Companded: `mulaw`, `alaw`.

**Example: raw PCM (16-bit, 16kHz, mono)**

```json
{
  "audio_format": "pcm_s16le",
  "sample_rate": 16000,
  "num_channels": 1
}
```

***

## Code example

**Prerequisite:** Complete the steps in [Get started](/stt/get-started).

<Tabs
  items={[
  'Python',
  'Node.js']}
>
  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_realtime.py](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/python/soniox_realtime.py).

        <FileCodeBlock path="./content/stt/rt/_examples/soniox_realtime.py" lang="python">
          ```
          import json
          import os
          import threading
          import time
          import argparse
          from typing import Optional

          from websockets import ConnectionClosedOK
          from websockets.sync.client import connect

          SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket"


          # Get Soniox STT config.
          def get_config(api_key: str, audio_format: str, translation: str) -> dict:
              config = {
                  # Get your API key at console.soniox.com, then run: export SONIOX_API_KEY=<YOUR_API_KEY>
                  "api_key": api_key,
                  #
                  # Select the model to use.
                  # See: soniox.com/docs/stt/models
                  "model": "stt-rt-v3",
                  #
                  # Set language hints when possible to significantly improve accuracy.
                  # See: soniox.com/docs/stt/concepts/language-hints
                  "language_hints": ["en", "es"],
                  #
                  # Enable language identification. Each token will include a "language" field.
                  # See: soniox.com/docs/stt/concepts/language-identification
                  "enable_language_identification": True,
                  #
                  # Enable speaker diarization. Each token will include a "speaker" field.
                  # See: soniox.com/docs/stt/concepts/speaker-diarization
                  "enable_speaker_diarization": True,
                  #
                  # Set context to help the model understand your domain, recognize important terms,
                  # and apply custom vocabulary and translation preferences.
                  # See: soniox.com/docs/stt/concepts/context
                  "context": {
                      "general": [
                          {"key": "domain", "value": "Healthcare"},
                          {"key": "topic", "value": "Diabetes management consultation"},
                          {"key": "doctor", "value": "Dr. Martha Smith"},
                          {"key": "patient", "value": "Mr. David Miller"},
                          {"key": "organization", "value": "St John's Hospital"},
                      ],
                      "text": "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                      "terms": [
                          "Celebrex",
                          "Zyrtec",
                          "Xanax",
                          "Prilosec",
                          "Amoxicillin Clavulanate Potassium",
                      ],
                      "translation_terms": [
                          {"source": "Mr. Smith", "target": "Sr. Smith"},
                          {"source": "St John's", "target": "St John's"},
                          {"source": "stroke", "target": "ictus"},
                      ],
                  },
                  #
                  # Use endpointing to detect when the speaker stops.
                  # It finalizes all non-final tokens right away, minimizing latency.
                  # See: soniox.com/docs/stt/rt/endpoint-detection
                  "enable_endpoint_detection": True,
              }

              # Audio format.
              # See: soniox.com/docs/stt/rt/real-time-transcription#audio-formats
              if audio_format == "auto":
                  # Set to "auto" to let Soniox detect the audio format automatically.
                  config["audio_format"] = "auto"
              elif audio_format == "pcm_s16le":
                  # Example of a raw audio format; Soniox supports many others as well.
                  config["audio_format"] = "pcm_s16le"
                  config["sample_rate"] = 16000
                  config["num_channels"] = 1
              else:
                  raise ValueError(f"Unsupported audio_format: {audio_format}")

              # Translation options.
              # See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
              if translation == "none":
                  pass
              elif translation == "one_way":
                  # Translates all languages into the target language.
                  config["translation"] = {
                      "type": "one_way",
                      "target_language": "es",
                  }
              elif translation == "two_way":
                  # Translates from language_a to language_b and back from language_b to language_a.
                  config["translation"] = {
                      "type": "two_way",
                      "language_a": "en",
                      "language_b": "es",
                  }
              else:
                  raise ValueError(f"Unsupported translation: {translation}")

              return config


          # Read the audio file and send its bytes to the websocket.
          def stream_audio(audio_path: str, ws) -> None:
              with open(audio_path, "rb") as fh:
                  while True:
                      data = fh.read(3840)
                      if len(data) == 0:
                          break
                      ws.send(data)
                      # Sleep for 120 ms to simulate real-time streaming.
                      time.sleep(0.120)

              # Empty string signals end-of-audio to the server
              ws.send("")


          # Convert tokens into a readable transcript.
          def render_tokens(final_tokens: list[dict], non_final_tokens: list[dict]) -> str:
              text_parts: list[str] = []
              current_speaker: Optional[str] = None
              current_language: Optional[str] = None

              # Process all tokens in order.
              for token in final_tokens + non_final_tokens:
                  text = token["text"]
                  speaker = token.get("speaker")
                  language = token.get("language")
                  is_translation = token.get("translation_status") == "translation"

                  # Speaker changed -> add a speaker tag.
                  if speaker is not None and speaker != current_speaker:
                      if current_speaker is not None:
                          text_parts.append("\n\n")
                      current_speaker = speaker
                      current_language = None  # Reset language on speaker changes.
                      text_parts.append(f"Speaker {current_speaker}:")

                  # Language changed -> add a language or translation tag.
                  if language is not None and language != current_language:
                      current_language = language
                      prefix = "[Translation] " if is_translation else ""
                      text_parts.append(f"\n{prefix}[{current_language}] ")
                      text = text.lstrip()

                  text_parts.append(text)

              text_parts.append("\n===============================")

              return "".join(text_parts)


          def run_session(
              api_key: str,
              audio_path: str,
              audio_format: str,
              translation: str,
          ) -> None:
              config = get_config(api_key, audio_format, translation)

              print("Connecting to Soniox...")
              with connect(SONIOX_WEBSOCKET_URL) as ws:
                  # Send first request with config.
                  ws.send(json.dumps(config))

                  # Start streaming audio in the background.
                  threading.Thread(
                      target=stream_audio,
                      args=(audio_path, ws),
                      daemon=True,
                  ).start()

                  print("Session started.")

                  final_tokens: list[dict] = []

                  try:
                      while True:
                          message = ws.recv()
                          res = json.loads(message)

                          # Error from server.
                          # See: https://soniox.com/docs/stt/api-reference/websocket-api#error-response
                          if res.get("error_code") is not None:
                              print(f"Error: {res['error_code']} - {res['error_message']}")
                              break

                          # Parse tokens from current response.
                          non_final_tokens: list[dict] = []
                          for token in res.get("tokens", []):
                              if token.get("text"):
                                  if token.get("is_final"):
                                      # Final tokens are returned once and should be appended to final_tokens.
                                      final_tokens.append(token)
                                  else:
                                      # Non-final tokens update as more audio arrives; reset them on every response.
                                      non_final_tokens.append(token)

                          # Render tokens.
                          text = render_tokens(final_tokens, non_final_tokens)
                          print(text)

                          # Session finished.
                          if res.get("finished"):
                              print("Session finished.")

                  except ConnectionClosedOK:
                      # Normal, server closed after finished.
                      pass
                  except KeyboardInterrupt:
                      print("\nInterrupted by user.")
                  except Exception as e:
                      print(f"Error: {e}")


          def main():
              parser = argparse.ArgumentParser()
              parser.add_argument("--audio_path", type=str)
              parser.add_argument("--audio_format", default="auto")
              parser.add_argument("--translation", default="none")
              args = parser.parse_args()

              api_key = os.environ.get("SONIOX_API_KEY")
              if api_key is None:
                  raise RuntimeError("Missing SONIOX_API_KEY.")

              run_session(api_key, args.audio_path, args.audio_format, args.translation)


          if __name__ == "__main__":
              main()

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # Transcribe a live audio stream
        python soniox_realtime.py --audio_path ../assets/coffee_shop.mp3

        # Transcribe a raw audio live stream
        python soniox_realtime.py --audio_path ../assets/coffee_shop.pcm_s16le --audio_format pcm_s16le
        ```
      </Accordion>
    </Accordions>
  </Tab>

  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_realtime.js](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/nodejs/soniox_realtime.js).

        <FileCodeBlock path="./content/stt/rt/_examples/soniox_realtime.js" lang="js">
          ```
          import fs from "fs";
          import WebSocket from "ws";
          import { parseArgs } from "node:util";

          const SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

          // Get Soniox STT config
          function getConfig(apiKey, audioFormat, translation) {
            const config = {
              // Get your API key at console.soniox.com, then run: export SONIOX_API_KEY=<YOUR_API_KEY>
              api_key: apiKey,

              // Select the model to use.
              // See: soniox.com/docs/stt/models
              model: "stt-rt-v3",

              // Set language hints when possible to significantly improve accuracy.
              // See: soniox.com/docs/stt/concepts/language-hints
              language_hints: ["en", "es"],

              // Enable language identification. Each token will include a "language" field.
              // See: soniox.com/docs/stt/concepts/language-identification
              enable_language_identification: true,

              // Enable speaker diarization. Each token will include a "speaker" field.
              // See: soniox.com/docs/stt/concepts/speaker-diarization
              enable_speaker_diarization: true,

              // Set context to help the model understand your domain, recognize important terms,
              // and apply custom vocabulary and translation preferences.
              // See: soniox.com/docs/stt/concepts/context
              context: {
                general: [
                  { key: "domain", value: "Healthcare" },
                  { key: "topic", value: "Diabetes management consultation" },
                  { key: "doctor", value: "Dr. Martha Smith" },
                  { key: "patient", value: "Mr. David Miller" },
                  { key: "organization", value: "St John's Hospital" },
                ],
                text: "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                terms: [
                  "Celebrex",
                  "Zyrtec",
                  "Xanax",
                  "Prilosec",
                  "Amoxicillin Clavulanate Potassium",
                ],
                translation_terms: [
                  { source: "Mr. Smith", target: "Sr. Smith" },
                  { source: "St John's", target: "St John's" },
                  { source: "stroke", target: "ictus" },
                ],
              },

              // Use endpointing to detect when the speaker stops.
              // It finalizes all non-final tokens right away, minimizing latency.
              // See: soniox.com/docs/stt/rt/endpoint-detection
              enable_endpoint_detection: true,
            };

            // Audio format.
            // See: soniox.com/docs/stt/rt/real-time-transcription#audio-formats
            if (audioFormat === "auto") {
              // Set to "auto" to let Soniox detect the audio format automatically.
              config.audio_format = "auto";
            } else if (audioFormat === "pcm_s16le") {
              // Example of a raw audio format; Soniox supports many others as well.
              config.audio_format = "pcm_s16le";
              config.sample_rate = 16000;
              config.num_channels = 1;
            } else {
              throw new Error(`Unsupported audio_format: ${audioFormat}`);
            }

            // Translation options.
            // See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
            if (translation === "one_way") {
              // Translates all languages into the target language.
              config.translation = { type: "one_way", target_language: "es" };
            } else if (translation === "two_way") {
              // Translates from language_a to language_b and back from language_b to language_a.
              config.translation = {
                type: "two_way",
                language_a: "en",
                language_b: "es",
              };
            } else if (translation !== "none") {
              throw new Error(`Unsupported translation: ${translation}`);
            }

            return config;
          }

          // Read the audio file and send its bytes to the websocket.
          async function streamAudio(audioPath, ws) {
            const stream = fs.createReadStream(audioPath, { highWaterMark: 3840 });

            for await (const chunk of stream) {
              ws.send(chunk);
              // Sleep for 120 ms to simulate real-time streaming.
              await new Promise((res) => setTimeout(res, 120));
            }

            // Empty string signals end-of-audio to the server
            ws.send("");
          }

          // Convert tokens into readable transcript
          function renderTokens(finalTokens, nonFinalTokens) {
            let textParts = [];
            let currentSpeaker = null;
            let currentLanguage = null;

            const allTokens = [...finalTokens, ...nonFinalTokens];

            // Process all tokens in order.
            for (const token of allTokens) {
              let { text, speaker, language } = token;
              const isTranslation = token.translation_status === "translation";

              // Speaker changed -> add a speaker tag.
              if (speaker && speaker !== currentSpeaker) {
                if (currentSpeaker !== null) textParts.push("\n\n");
                currentSpeaker = speaker;
                currentLanguage = null; // Reset language on speaker changes.
                textParts.push(`Speaker ${currentSpeaker}:`);
              }

              // Language changed -> add a language or translation tag.
              if (language && language !== currentLanguage) {
                currentLanguage = language;
                const prefix = isTranslation ? "[Translation] " : "";
                textParts.push(`\n${prefix}[${currentLanguage}] `);
                text = text.trimStart();
              }

              textParts.push(text);
            }

            textParts.push("\n===============================");
            return textParts.join("");
          }

          function runSession(apiKey, audioPath, audioFormat, translation) {
            const config = getConfig(apiKey, audioFormat, translation);

            console.log("Connecting to Soniox...");
            const ws = new WebSocket(SONIOX_WEBSOCKET_URL);

            let finalTokens = [];

            ws.on("open", () => {
              // Send first request with config.
              ws.send(JSON.stringify(config));

              // Start streaming audio in the background.
              streamAudio(audioPath, ws).catch((err) =>
                console.error("Audio stream error:", err),
              );
              console.log("Session started.");
            });

            ws.on("message", (msg) => {
              const res = JSON.parse(msg.toString());

              // Error from server.
              // See: https://soniox.com/docs/stt/api-reference/websocket-api#error-response
              if (res.error_code) {
                console.error(`Error: ${res.error_code} - ${res.error_message}`);
                ws.close();
                return;
              }

              // Parse tokens from current response.
              let nonFinalTokens = [];
              if (res.tokens) {
                for (const token of res.tokens) {
                  if (token.text) {
                    if (token.is_final) {
                      // Final tokens are returned once and should be appended to final_tokens.
                      finalTokens.push(token);
                    } else {
                      // Non-final tokens update as more audio arrives; reset them on every response.
                      nonFinalTokens.push(token);
                    }
                  }
                }
              }

              // Render tokens.
              const text = renderTokens(finalTokens, nonFinalTokens);
              console.log(text);

              // Session finished.
              if (res.finished) {
                console.log("Session finished.");
                ws.close();
              }
            });

            ws.on("error", (err) => console.error("WebSocket error:", err));
          }

          async function main() {
            const { values: argv } = parseArgs({
              options: {
                audio_path: { type: "string", required: true },
                audio_format: { type: "string", default: "auto" },
                translation: { type: "string", default: "none" },
              },
            });

            const apiKey = process.env.SONIOX_API_KEY;
            if (!apiKey) {
              throw new Error(
                "Missing SONIOX_API_KEY.\n" +
                  "1. Get your API key at https://console.soniox.com\n" +
                  "2. Run: export SONIOX_API_KEY=<YOUR_API_KEY>",
              );
            }

            runSession(apiKey, argv.audio_path, argv.audio_format, argv.translation);
          }

          main().catch((err) => {
            console.error("Error:", err.message);
            process.exit(1);
          });

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # Transcribe a live audio stream
        node soniox_realtime.js --audio_path ../assets/coffee_shop.mp3

        # Transcribe a raw audio live stream
        node soniox_realtime.js --audio_path ../assets/coffee_shop.pcm_s16le --audio_format pcm_s16le
        ```
      </Accordion>
    </Accordions>
  </Tab>
</Tabs>

# Real-time translation
URL: /stt/rt/real-time-translation

Learn how real-time translation works.

***

title: Real-time translation
description: Learn how real-time translation works.
---------------------------------------------------

import { CodeBlock, Pre } from "@/components/codeblock";
import { DynamicCodeBlock } from "@/components/dynamic-codeblock";
import { LuTriangleAlert } from "react-icons/lu";

## Overview

Soniox Speech-to-Text AI introduces a new kind of translation designed
for low latency applications. Unlike traditional systems that wait until
the end of a sentence before producing a translation, Soniox translates
**mid-sentence**—as words are spoken. This innovation enables a completely new
experience: you can follow conversations across languages in real-time, without
delays.

***

## How it works

* **Always transcribes speech:** every spoken word is transcribed, regardless of translation settings.
* **Translation:** choose between:
  * **One-way translation** → translate all speech into a single target language.
  * **Two-way translation** → translate back and forth between two languages.
* **Low latency:** translations are streamed in chunks, balancing speed and accuracy.
* **Unified token stream:** transcriptions and translations arrive together, labeled for easy handling.

### Example

Speaker says:

```json
"Hello everyone, thank you for joining us today."
```

The token stream unfolds like this:

```json
[Transcription] Hello everyone,
[Translation]   Bonjour à tous,

[Transcription] thank you
[Translation]   merci

[Transcription] for joining us
[Translation]   de nous avoir rejoints

[Transcription] today.
[Translation]   aujourd'hui.
```

Notice how:

* **Transcription tokens arrive first,** as soon as words are recognized.
* **Translation tokens follow,** chunk by chunk, without waiting for the full sentence.
* Developers can display tokens immediately for **low latency transcription and translation.**

***

## Translation modes

Soniox provides two translation modes: translate all speech into a single target language, or enable seamless two-way conversations between languages.

### One-way translation

Translate **all spoken languages** into a single target language.

**Example: translate everything into French**

```json
{
  "translation": {
    "type": "one_way",
    "target_language": "fr"
  }
}
```

* All speech is **transcribed.**
* All speech is **translated into French.**

### Two-way translation

Translate **back and forth** between two specified languages.

**Example: Japanese ⟷ Korean**

```json
{
  "translation": {
    "type": "two_way",
    "language_a": "ja",
    "language_b": "ko"
  }
}
```

* All speech is **transcribed.**
* Japanese speech is **translated into Korean.**
* Korean speech is **translated into Japanese.**

***

## Token format

Each result (transcription or translation) is returned as a **token** with clear metadata.

| Field                | Description                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `text`               | Token text                                                                                           |
| `translation_status` | `"none"` (not translated) <br /> `"original"` (spoken text) <br /> `"translation"` (translated text) |
| `language`           | Language of the token                                                                                |
| `source_language`    | Original language (only for translated tokens)                                                       |

### Example: two-way translation

Two way translation between English (`en`) and German (`de`).

**Config**

```json
{
  "translation": {
    "type": "two_way",
    "language_a": "en",
    "language_b": "de"
  }
}
```

**Text**

```json
[en] Good morning
[de] Guten Morgen

[de] Wie geht’s?
[en] How are you?

[fr] Bonjour à tous
(fr is only transcribed, not translated)

[en] I’m fine, thanks.
[de] Mir geht’s gut, danke.
```

**Tokens**

{/* NOTE(miha): ``` tags put this code into scrollable view, that we didn't want */}

<DynamicCodeBlock
  lang="json"
  code={`// ===== (1) =====
// Transcription tokens to be translated
{
  "text": "Good",
  "translation_status": "original",
  "language": "en"
}
{
  "text": " morn",
  "translation_status": "original",
  "language": "en"
}
{
  "text": "ing",
  "translation_status": "original",
  "language": "en"
}
// Translation tokens of previous transcription tokens
{
  "text": "Gu",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}
{
  "text": "ten",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}
{
  "text": " Morgen",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}

// ===== (2) =====
// Transcription tokens to be translated
{
  "text": "Wie",
  "translation_status": "original",
  "language": "de"
}
{
  "text": " geht’s?",
  "translation_status": "original",
  "language": "de"
}
// Translation tokens of previous transcription tokens
{
  "text": "How",
  "translation_status": "translation",
  "language": "en",
  "source_language": "de"
}
{
  "text": " are",
  "translation_status": "translation",
  "language": "en",
  "source_language": "de"
}
{
  "text": " you",
  "translation_status": "translation",
  "language": "en",
  "source_language": "de"
}
{
  "text": "?",
  "translation_status": "translation",
  "language": "en",
  "source_language": "de"
}

// ===== (3) =====
// Transcription tokens NOT to be translated
{
  "text": "Bon",
  "translation_status": "none",
  "language": "fr"
}
{
  "text": "jour",
  "translation_status": "none",
  "language": "fr"
}
{
  "text": " à",
  "translation_status": "none",
  "language": "fr"
}
{
  "text": " tous",
  "translation_status": "none",
  "language": "fr"
}

// ===== (4) =====
// Transcription tokens to be translated
{
  "text": "I’m",
  "translation_status": "original",
  "language": "en"
}
{
  "text": " fine,",
  "translation_status": "original",
  "language": "en"
}
{
  "text": " thanks.",
  "translation_status": "original",
  "language": "en"
}
// Translation tokens of previous transcription tokens
{
  "text": "Mir",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}
{
  "text": " geht’s",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}
{
  "text": " gut",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}
{
  "text": " dan",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}
{
  "text": "ke.",
  "translation_status": "translation",
  "language": "de",
  "source_language": "en"
}`}
/>

<Callout type="warn">
  Transcription and translation chunks follow each
  other, but tokens are not 1-to-1 mapped and may not align.
</Callout>

***

## Supported languages

**All pairs supported** — translate between any two [supported languages](/stt/concepts/supported-languages).

***

## Timestamps

* **Spoken tokens** (`translation_status: "none"` or `"original"`) include timestamps (`start_ms`, `end_ms`) that align to the exact position in the audio.
* **Translated tokens do not** include timestamps, since they are generated
  immediately after the spoken tokens and directly follow their timing.

This way, you can always align transcripts to the original audio, while translations stream naturally in sequence.

***

## Code example

**Prerequisite:** Complete the steps in [Get started](/stt/get-started).

<Tabs
  items={[
  'Python',
  'Node.js']}
>
  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_realtime.py](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/python/soniox_realtime.py).

        <FileCodeBlock path="./content/stt/rt/_examples/soniox_realtime.py" lang="python">
          ```
          import json
          import os
          import threading
          import time
          import argparse
          from typing import Optional

          from websockets import ConnectionClosedOK
          from websockets.sync.client import connect

          SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket"


          # Get Soniox STT config.
          def get_config(api_key: str, audio_format: str, translation: str) -> dict:
              config = {
                  # Get your API key at console.soniox.com, then run: export SONIOX_API_KEY=<YOUR_API_KEY>
                  "api_key": api_key,
                  #
                  # Select the model to use.
                  # See: soniox.com/docs/stt/models
                  "model": "stt-rt-v3",
                  #
                  # Set language hints when possible to significantly improve accuracy.
                  # See: soniox.com/docs/stt/concepts/language-hints
                  "language_hints": ["en", "es"],
                  #
                  # Enable language identification. Each token will include a "language" field.
                  # See: soniox.com/docs/stt/concepts/language-identification
                  "enable_language_identification": True,
                  #
                  # Enable speaker diarization. Each token will include a "speaker" field.
                  # See: soniox.com/docs/stt/concepts/speaker-diarization
                  "enable_speaker_diarization": True,
                  #
                  # Set context to help the model understand your domain, recognize important terms,
                  # and apply custom vocabulary and translation preferences.
                  # See: soniox.com/docs/stt/concepts/context
                  "context": {
                      "general": [
                          {"key": "domain", "value": "Healthcare"},
                          {"key": "topic", "value": "Diabetes management consultation"},
                          {"key": "doctor", "value": "Dr. Martha Smith"},
                          {"key": "patient", "value": "Mr. David Miller"},
                          {"key": "organization", "value": "St John's Hospital"},
                      ],
                      "text": "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                      "terms": [
                          "Celebrex",
                          "Zyrtec",
                          "Xanax",
                          "Prilosec",
                          "Amoxicillin Clavulanate Potassium",
                      ],
                      "translation_terms": [
                          {"source": "Mr. Smith", "target": "Sr. Smith"},
                          {"source": "St John's", "target": "St John's"},
                          {"source": "stroke", "target": "ictus"},
                      ],
                  },
                  #
                  # Use endpointing to detect when the speaker stops.
                  # It finalizes all non-final tokens right away, minimizing latency.
                  # See: soniox.com/docs/stt/rt/endpoint-detection
                  "enable_endpoint_detection": True,
              }

              # Audio format.
              # See: soniox.com/docs/stt/rt/real-time-transcription#audio-formats
              if audio_format == "auto":
                  # Set to "auto" to let Soniox detect the audio format automatically.
                  config["audio_format"] = "auto"
              elif audio_format == "pcm_s16le":
                  # Example of a raw audio format; Soniox supports many others as well.
                  config["audio_format"] = "pcm_s16le"
                  config["sample_rate"] = 16000
                  config["num_channels"] = 1
              else:
                  raise ValueError(f"Unsupported audio_format: {audio_format}")

              # Translation options.
              # See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
              if translation == "none":
                  pass
              elif translation == "one_way":
                  # Translates all languages into the target language.
                  config["translation"] = {
                      "type": "one_way",
                      "target_language": "es",
                  }
              elif translation == "two_way":
                  # Translates from language_a to language_b and back from language_b to language_a.
                  config["translation"] = {
                      "type": "two_way",
                      "language_a": "en",
                      "language_b": "es",
                  }
              else:
                  raise ValueError(f"Unsupported translation: {translation}")

              return config


          # Read the audio file and send its bytes to the websocket.
          def stream_audio(audio_path: str, ws) -> None:
              with open(audio_path, "rb") as fh:
                  while True:
                      data = fh.read(3840)
                      if len(data) == 0:
                          break
                      ws.send(data)
                      # Sleep for 120 ms to simulate real-time streaming.
                      time.sleep(0.120)

              # Empty string signals end-of-audio to the server
              ws.send("")


          # Convert tokens into a readable transcript.
          def render_tokens(final_tokens: list[dict], non_final_tokens: list[dict]) -> str:
              text_parts: list[str] = []
              current_speaker: Optional[str] = None
              current_language: Optional[str] = None

              # Process all tokens in order.
              for token in final_tokens + non_final_tokens:
                  text = token["text"]
                  speaker = token.get("speaker")
                  language = token.get("language")
                  is_translation = token.get("translation_status") == "translation"

                  # Speaker changed -> add a speaker tag.
                  if speaker is not None and speaker != current_speaker:
                      if current_speaker is not None:
                          text_parts.append("\n\n")
                      current_speaker = speaker
                      current_language = None  # Reset language on speaker changes.
                      text_parts.append(f"Speaker {current_speaker}:")

                  # Language changed -> add a language or translation tag.
                  if language is not None and language != current_language:
                      current_language = language
                      prefix = "[Translation] " if is_translation else ""
                      text_parts.append(f"\n{prefix}[{current_language}] ")
                      text = text.lstrip()

                  text_parts.append(text)

              text_parts.append("\n===============================")

              return "".join(text_parts)


          def run_session(
              api_key: str,
              audio_path: str,
              audio_format: str,
              translation: str,
          ) -> None:
              config = get_config(api_key, audio_format, translation)

              print("Connecting to Soniox...")
              with connect(SONIOX_WEBSOCKET_URL) as ws:
                  # Send first request with config.
                  ws.send(json.dumps(config))

                  # Start streaming audio in the background.
                  threading.Thread(
                      target=stream_audio,
                      args=(audio_path, ws),
                      daemon=True,
                  ).start()

                  print("Session started.")

                  final_tokens: list[dict] = []

                  try:
                      while True:
                          message = ws.recv()
                          res = json.loads(message)

                          # Error from server.
                          # See: https://soniox.com/docs/stt/api-reference/websocket-api#error-response
                          if res.get("error_code") is not None:
                              print(f"Error: {res['error_code']} - {res['error_message']}")
                              break

                          # Parse tokens from current response.
                          non_final_tokens: list[dict] = []
                          for token in res.get("tokens", []):
                              if token.get("text"):
                                  if token.get("is_final"):
                                      # Final tokens are returned once and should be appended to final_tokens.
                                      final_tokens.append(token)
                                  else:
                                      # Non-final tokens update as more audio arrives; reset them on every response.
                                      non_final_tokens.append(token)

                          # Render tokens.
                          text = render_tokens(final_tokens, non_final_tokens)
                          print(text)

                          # Session finished.
                          if res.get("finished"):
                              print("Session finished.")

                  except ConnectionClosedOK:
                      # Normal, server closed after finished.
                      pass
                  except KeyboardInterrupt:
                      print("\nInterrupted by user.")
                  except Exception as e:
                      print(f"Error: {e}")


          def main():
              parser = argparse.ArgumentParser()
              parser.add_argument("--audio_path", type=str)
              parser.add_argument("--audio_format", default="auto")
              parser.add_argument("--translation", default="none")
              args = parser.parse_args()

              api_key = os.environ.get("SONIOX_API_KEY")
              if api_key is None:
                  raise RuntimeError("Missing SONIOX_API_KEY.")

              run_session(api_key, args.audio_path, args.audio_format, args.translation)


          if __name__ == "__main__":
              main()

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # One-way translation of a live audio stream
        python soniox_realtime.py --audio_path ../assets/coffee_shop.mp3 --translation one_way

        # Two-way translation of a live audio stream
        python soniox_realtime.py --audio_path ../assets/two_way_translation.mp3 --translation two_way
        ```
      </Accordion>
    </Accordions>
  </Tab>

  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_realtime.js](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/nodejs/soniox_realtime.js).

        <FileCodeBlock path="./content/stt/rt/_examples/soniox_realtime.js" lang="js">
          ```
          import fs from "fs";
          import WebSocket from "ws";
          import { parseArgs } from "node:util";

          const SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

          // Get Soniox STT config
          function getConfig(apiKey, audioFormat, translation) {
            const config = {
              // Get your API key at console.soniox.com, then run: export SONIOX_API_KEY=<YOUR_API_KEY>
              api_key: apiKey,

              // Select the model to use.
              // See: soniox.com/docs/stt/models
              model: "stt-rt-v3",

              // Set language hints when possible to significantly improve accuracy.
              // See: soniox.com/docs/stt/concepts/language-hints
              language_hints: ["en", "es"],

              // Enable language identification. Each token will include a "language" field.
              // See: soniox.com/docs/stt/concepts/language-identification
              enable_language_identification: true,

              // Enable speaker diarization. Each token will include a "speaker" field.
              // See: soniox.com/docs/stt/concepts/speaker-diarization
              enable_speaker_diarization: true,

              // Set context to help the model understand your domain, recognize important terms,
              // and apply custom vocabulary and translation preferences.
              // See: soniox.com/docs/stt/concepts/context
              context: {
                general: [
                  { key: "domain", value: "Healthcare" },
                  { key: "topic", value: "Diabetes management consultation" },
                  { key: "doctor", value: "Dr. Martha Smith" },
                  { key: "patient", value: "Mr. David Miller" },
                  { key: "organization", value: "St John's Hospital" },
                ],
                text: "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                terms: [
                  "Celebrex",
                  "Zyrtec",
                  "Xanax",
                  "Prilosec",
                  "Amoxicillin Clavulanate Potassium",
                ],
                translation_terms: [
                  { source: "Mr. Smith", target: "Sr. Smith" },
                  { source: "St John's", target: "St John's" },
                  { source: "stroke", target: "ictus" },
                ],
              },

              // Use endpointing to detect when the speaker stops.
              // It finalizes all non-final tokens right away, minimizing latency.
              // See: soniox.com/docs/stt/rt/endpoint-detection
              enable_endpoint_detection: true,
            };

            // Audio format.
            // See: soniox.com/docs/stt/rt/real-time-transcription#audio-formats
            if (audioFormat === "auto") {
              // Set to "auto" to let Soniox detect the audio format automatically.
              config.audio_format = "auto";
            } else if (audioFormat === "pcm_s16le") {
              // Example of a raw audio format; Soniox supports many others as well.
              config.audio_format = "pcm_s16le";
              config.sample_rate = 16000;
              config.num_channels = 1;
            } else {
              throw new Error(`Unsupported audio_format: ${audioFormat}`);
            }

            // Translation options.
            // See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
            if (translation === "one_way") {
              // Translates all languages into the target language.
              config.translation = { type: "one_way", target_language: "es" };
            } else if (translation === "two_way") {
              // Translates from language_a to language_b and back from language_b to language_a.
              config.translation = {
                type: "two_way",
                language_a: "en",
                language_b: "es",
              };
            } else if (translation !== "none") {
              throw new Error(`Unsupported translation: ${translation}`);
            }

            return config;
          }

          // Read the audio file and send its bytes to the websocket.
          async function streamAudio(audioPath, ws) {
            const stream = fs.createReadStream(audioPath, { highWaterMark: 3840 });

            for await (const chunk of stream) {
              ws.send(chunk);
              // Sleep for 120 ms to simulate real-time streaming.
              await new Promise((res) => setTimeout(res, 120));
            }

            // Empty string signals end-of-audio to the server
            ws.send("");
          }

          // Convert tokens into readable transcript
          function renderTokens(finalTokens, nonFinalTokens) {
            let textParts = [];
            let currentSpeaker = null;
            let currentLanguage = null;

            const allTokens = [...finalTokens, ...nonFinalTokens];

            // Process all tokens in order.
            for (const token of allTokens) {
              let { text, speaker, language } = token;
              const isTranslation = token.translation_status === "translation";

              // Speaker changed -> add a speaker tag.
              if (speaker && speaker !== currentSpeaker) {
                if (currentSpeaker !== null) textParts.push("\n\n");
                currentSpeaker = speaker;
                currentLanguage = null; // Reset language on speaker changes.
                textParts.push(`Speaker ${currentSpeaker}:`);
              }

              // Language changed -> add a language or translation tag.
              if (language && language !== currentLanguage) {
                currentLanguage = language;
                const prefix = isTranslation ? "[Translation] " : "";
                textParts.push(`\n${prefix}[${currentLanguage}] `);
                text = text.trimStart();
              }

              textParts.push(text);
            }

            textParts.push("\n===============================");
            return textParts.join("");
          }

          function runSession(apiKey, audioPath, audioFormat, translation) {
            const config = getConfig(apiKey, audioFormat, translation);

            console.log("Connecting to Soniox...");
            const ws = new WebSocket(SONIOX_WEBSOCKET_URL);

            let finalTokens = [];

            ws.on("open", () => {
              // Send first request with config.
              ws.send(JSON.stringify(config));

              // Start streaming audio in the background.
              streamAudio(audioPath, ws).catch((err) =>
                console.error("Audio stream error:", err),
              );
              console.log("Session started.");
            });

            ws.on("message", (msg) => {
              const res = JSON.parse(msg.toString());

              // Error from server.
              // See: https://soniox.com/docs/stt/api-reference/websocket-api#error-response
              if (res.error_code) {
                console.error(`Error: ${res.error_code} - ${res.error_message}`);
                ws.close();
                return;
              }

              // Parse tokens from current response.
              let nonFinalTokens = [];
              if (res.tokens) {
                for (const token of res.tokens) {
                  if (token.text) {
                    if (token.is_final) {
                      // Final tokens are returned once and should be appended to final_tokens.
                      finalTokens.push(token);
                    } else {
                      // Non-final tokens update as more audio arrives; reset them on every response.
                      nonFinalTokens.push(token);
                    }
                  }
                }
              }

              // Render tokens.
              const text = renderTokens(finalTokens, nonFinalTokens);
              console.log(text);

              // Session finished.
              if (res.finished) {
                console.log("Session finished.");
                ws.close();
              }
            });

            ws.on("error", (err) => console.error("WebSocket error:", err));
          }

          async function main() {
            const { values: argv } = parseArgs({
              options: {
                audio_path: { type: "string", required: true },
                audio_format: { type: "string", default: "auto" },
                translation: { type: "string", default: "none" },
              },
            });

            const apiKey = process.env.SONIOX_API_KEY;
            if (!apiKey) {
              throw new Error(
                "Missing SONIOX_API_KEY.\n" +
                  "1. Get your API key at https://console.soniox.com\n" +
                  "2. Run: export SONIOX_API_KEY=<YOUR_API_KEY>",
              );
            }

            runSession(apiKey, argv.audio_path, argv.audio_format, argv.translation);
          }

          main().catch((err) => {
            console.error("Error:", err.message);
            process.exit(1);
          });

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # One-way translation of a live audio stream
        node soniox_realtime.js --audio_path ../assets/coffee_shop.mp3 --translation one_way

        # Two-way translation of a live audio stream
        node soniox_realtime.js --audio_path ../assets/two_way_translation.mp3 --translation two_way
        ```
      </Accordion>
    </Accordions>
  </Tab>
</Tabs>

# Endpoint detection
URL: /stt/rt/endpoint-detection

Learn how speech endpoint detection works.

***

title: Endpoint detection
description: Learn how speech endpoint detection works.
-------------------------------------------------------

## Overview

{/*
  Endpoint detection lets you know when a speaker has finished speaking.
  This is critical for real-time voice AI assistants, command-and-response
  systems, and conversational apps where you want to respond **immediately** without
  waiting for long silences.

  When enabled, Soniox automatically detects natural pauses and emits a special `<end>` token at the end of an utterance.

  */}

Endpoint detection lets you know when a speaker has finished speaking. This is
critical for real-time voice AI assistants, command-and-response systems, and
conversational apps where you want to respond immediately without waiting for
long silences.

Unlike traditional endpoint detection based on voice activity detection (VAD),
Soniox uses its speech model itself to listen to intonations, pauses, and
conversational context to determine when an utterance has ended. This makes it
far more advanced — delivering **lower latency, fewer false triggers,** and a
noticeably **smoother product experience.**

***

## How it works

When `enable_endpoint_detection` is **enabled**:

* Soniox monitors pauses in speech to determine the end of an utterance.
* As soon as speech ends:
  * **All preceding tokens** are marked as final.
  * A special `<end>` **token** is returned.
* The `<end>` token:
  * Always appears **once** at the end of the segment.
  * Is **always final**.
  * Can be treated as a reliable signal to trigger downstream logic (e.g., calling an LLM or executing a command).

***

## Enabling endpoint detection

Add the flag in your real-time request:

```json
{
  "enable_endpoint_detection": true
}
```

***

## Example

<h3>User says</h3>

```text
What's the weather in San Francisco?
```

<h3>Soniox stream</h3>

<Steps>
  <Step>
    **Non-final tokens (still being processed)**

    First response arrives:

    ```json
    {"text": "What's",    "is_final": false}
    {"text": "the",       "is_final": false}
    {"text": "weather",   "is_final": false}
    ```

    Second response arrives:

    ```json
    {"text": "What's",    "is_final": false}
    {"text": "the",       "is_final": false}
    {"text": "weather",   "is_final": false}
    {"text": "in",        "is_final": false}
    {"text": "San",       "is_final": false}
    {"text": "Francisco", "is_final": false}
    {"text": "?",         "is_final": false}
    ```
  </Step>

  <Step>
    **Final tokens (endpoint detected, tokens are finalized)**

    ```json
    {"text": "What's",    "is_final": true}
    {"text": "the",       "is_final": true}
    {"text": "weather",   "is_final": true}
    {"text": "in",        "is_final": true}
    {"text": "San",       "is_final": true}
    {"text": "Francisco", "is_final": true}
    {"text": "?",         "is_final": true}
    {"text": "<end>",     "is_final": true}
    ```
  </Step>
</Steps>

<h3>Explanation</h3>

1. **Streaming phase:** tokens are delivered in real-time as the user
   speaks. They are marked `is_final: false`, meaning the transcript is still being
   processed and may change.
2. **Endpoint detection:** once the speaker stops, the model recognizes the end of the utterance.
3. **Finalization phase:** previously non-final tokens are re-emitted with `is_final: true`, followed by the `<end>` token (also final).
4. **Usage tip:** display non-final tokens immediately for live captions, but switch to final tokens once `<end>` arrives before triggering any downstream actions.

# Manual finalization
URL: /stt/rt/manual-finalization

Learn how manual finalization works.

***

title: Manual finalization
description: Learn how manual finalization works.
-------------------------------------------------

import { LuTriangleAlert } from "react-icons/lu";

## Overview

Soniox supports **manual finalization** in addition to automatic mechanisms like
[endpoint detection](/stt/rt/endpoint-detection). Manual finalization
gives you precise control over when audio should be finalized — useful for:

* Push-to-talk systems.
* Client-side voice activity detection (VAD).
* Segment-based transcription pipelines.
* Applications where automatic endpoint detection is not ideal.

***

## How to finalize

Send a control message over the WebSocket connection:

```json
{"type": "finalize"}
```

When received:

* Soniox finalizes all audio up to that point.
* All tokens from that audio are returned with `"is_final": true`.
* The model emits a special marker token:

```json
{"text": "<fin>", "is_final": true}
```

The `<fin>` token signals that finalization is complete.

***

## Key points

* You can call `finalize` multiple times per session.
* You may continue streaming audio after each `finalize` call.
* The `<fin>` token is always returned as final and can be used to trigger downstream processing.
* Do not send `finalize` too frequently (every few seconds is fine; too often may cause disconnections).
* <LuTriangleAlert className="inline text-fd-card align-text-bottom size-6 fill-orange-400" /> You are charged for the **full stream duration,** not just the audio processed.

***

## Trailing silence

If you already added silence before sending finalize, you can reduce extra padding and improve latency by specifying:

```json
{
  "type": "finalize",
  "trailing_silence_ms": 300
}
```

This tells Soniox how much silence you already included.

***

## Connection keepalive

Combine with [connection keepalive](/stt/rt/connection-keepalive): use keepalive messages to prevent timeouts when no audio is being sent (e.g., during long pauses).

# Connection keepalive
URL: /stt/rt/connection-keepalive

Learn how connection keepalive works.

***

title: Connection keepalive
description: Learn how connection keepalive works.
--------------------------------------------------

import { LuTriangleAlert } from "react-icons/lu";

## Overview

In real-time transcription, you may have periods of silence — for example when
using client-side VAD (voice activity detection), during pauses in speech, or
when you intentionally stop streaming audio.

To keep the session alive and preserve context, you must send a **keepalive control message:**

```json
{"type": "keepalive"}
```

This prevents the WebSocket connection from timing out when no audio is being sent.

***

## When to use

Send a keepalive message whenever:

* You only stream audio during speech (client-side VAD).
* You temporarily pause audio streaming but want to keep the session active.

This ensures that:

* The connection stays open.
* Session context (e.g., speaker labels, language tracking, prompt) is preserved.

***

## Key points

* **Send at least once every 20 seconds** when not sending audio.

* You may send more frequently (every 5–10s is common).

* If no keepalive or audio is received for >20s, the connection may be closed.

* <LuTriangleAlert className="inline text-fd-card align-text-bottom size-6 fill-orange-400" /> You are charged for the **full stream duration,** not just the audio processed.

# Limits & quotas
URL: /stt/rt/limits-and-quotas

Learn about real-time API limits and quotas.

***

title: Limits & quotas
description: Learn about real-time API limits and quotas.
---------------------------------------------------------

## WebSocket API limits

Soniox applies limits to real-time WebSocket sessions to ensure stability and fair use.
Make sure your application respects these constraints and implements graceful recovery when a limit is reached.

| Limit               | Value       | Notes                                                                                                                                     |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Requests per minute | 100         | Exceeding this may result in rate limiting                                                                                                |
| Concurrent requests | 10          | Maximum number of simultaneous active WebSocket connections                                                                               |
| Stream duration     | 300 minutes | Each real-time session is capped at 300 minutes. To continue beyond this, open a new session. This limit is fixed and cannot be increased |

You can request higher limits (except for stream duration) in the [Soniox Console](https://console.soniox.com/).

# Error handling
URL: /stt/rt/error-handling

Learn about real-time API error handling.

***

title: Error handling
description: Learn about real-time API error handling.
------------------------------------------------------

In the Soniox Real-time API, all errors are returned as JSON error responses before the
connection is closed. Your application should always log and inspect these
errors to determine the cause.

## Error responses

If an error occurs, Soniox will:

1. Send an error response containing an **error code** and **error message.**
2. Immediately close the WebSocket connection.

Example:

```json
{
  "error_code": 400,
  "error_message": "Invalid model specified."
}
```

Always print out or log the error response to capture both the code and message.

The complete list of error codes and their meanings can be found under [Error codes](/stt/api-reference/websocket-api#error-response).

***

## Request termination

Real-time sessions run on a **best-effort basis.**
While most sessions last until the maximum supported audio duration (see [Limits & quotas](/stt/rt/limits-and-quotas)), early termination may occur.

If a session is closed early, you’ll receive a 503 error:

```text
Cannot continue request (code N). Please restart the request.
```

Your application should:

* Detect this error.
* Immediately start a **new request** to continue streaming.

***

## Real-time cadence

You should send audio data to Soniox **in real-time or near real-time speed.** Small
deviations are tolerated — such as brief buffering or network jitter — but
prolonged bursts or lags may result in disconnection.

# Async transcription
URL: /stt/async/async-transcription

Learn about async transcription for audio files.

***

title: Async transcription
description: Learn about async transcription for audio files.
keywords: "async file transcription, how to transcribe audio file, learn to transcribe audio file"
--------------------------------------------------------------------------------------------------

## Overview

Soniox supports **asynchronous transcription** for audio files. This allows you to
transcribe recordings without maintaining a live connection or streaming
pipeline.

You can submit audio from:

* A **public URL** (`audio_url`).
* A **local file** uploaded via the **Soniox Files API** (`file_id`).

Once submitted, jobs are processed in the background. You can poll for
status/results, or use **webhooks** to get notified when transcription is complete.

***

## Audio input options

### Transcribe from public URL

If your audio is publicly accessible via HTTP, use the `audio_url` parameter:

```json
{"audio_url": "https://example.com/audio.mp3"}
```

### Transcribe from local file

For local files, upload to Soniox using the **Files API**. Then reference the
returned `file_id` when creating the transcription request:

```json
{"file_id": "your_file_id"}
```

***

## Audio formats

Soniox automatically detects audio formats for file transcription — no configuration required.

Supported formats:

```text
aac, aiff, amr, asf, flac, mp3, ogg, wav, webm, m4a, mp4
```

***

## Tracking requests

Optionally, add a client-defined identifier to track requests:

```json
{"client_reference_id": "MyReferenceId"}
```

***

## Code examples

**Prerequisite:** Complete the steps in [Get started](/stt/get-started).

<Tabs
  items={[
  'Python',
  'Node.js']}
>
  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_async.py](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/python/soniox_async.py).

        <FileCodeBlock path="./content/stt/async/_examples/soniox_async.py" lang="python">
          ```
          import os
          import time
          import argparse
          from typing import Optional
          import requests
          from requests import Session

          SONIOX_API_BASE_URL = "https://api.soniox.com"


          # Get Soniox STT config.
          def get_config(
              audio_url: Optional[str], file_id: Optional[str], translation: Optional[str]
          ) -> dict:
              config = {
                  # Select the model to use.
                  # See: soniox.com/docs/stt/models
                  "model": "stt-async-v3",
                  #
                  # Set language hints when possible to significantly improve accuracy.
                  # See: soniox.com/docs/stt/concepts/language-hints
                  "language_hints": ["en", "es"],
                  #
                  # Enable language identification. Each token will include a "language" field.
                  # See: soniox.com/docs/stt/concepts/language-identification
                  "enable_language_identification": True,
                  #
                  # Enable speaker diarization. Each token will include a "speaker" field.
                  # See: soniox.com/docs/stt/concepts/speaker-diarization
                  "enable_speaker_diarization": True,
                  #
                  # Set context to help the model understand your domain, recognize important terms,
                  # and apply custom vocabulary and translation preferences.
                  # See: soniox.com/docs/stt/concepts/context
                  "context": {
                      "general": [
                          {"key": "domain", "value": "Healthcare"},
                          {"key": "topic", "value": "Diabetes management consultation"},
                          {"key": "doctor", "value": "Dr. Martha Smith"},
                          {"key": "patient", "value": "Mr. David Miller"},
                          {"key": "organization", "value": "St John's Hospital"},
                      ],
                      "text": "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                      "terms": [
                          "Celebrex",
                          "Zyrtec",
                          "Xanax",
                          "Prilosec",
                          "Amoxicillin Clavulanate Potassium",
                      ],
                      "translation_terms": [
                          {"source": "Mr. Smith", "target": "Sr. Smith"},
                          {"source": "St John's", "target": "St John's"},
                          {"source": "stroke", "target": "ictus"},
                      ],
                  },
                  #
                  # Optional identifier to track this request (client-defined).
                  # See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
                  "client_reference_id": "MyReferenceId",
                  #
                  # Audio source (only one can specified):
                  # - Public URL of the audio file.
                  # - File ID of a previously uploaded file
                  # See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
                  "audio_url": audio_url,
                  "file_id": file_id,
              }

              # Webhook.
              # You can set a webhook to get notified when the transcription finishes or fails.
              # See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request

              # Translation options.
              # See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
              if translation == "none":
                  pass
              elif translation == "one_way":
                  # Translates all languages into the target language.
                  config["translation"] = {
                      "type": "one_way",
                      "target_language": "es",
                  }
              elif translation == "two_way":
                  # Translates from language_a to language_b and back from language_b to language_a.
                  config["translation"] = {
                      "type": "two_way",
                      "language_a": "en",
                      "language_b": "es",
                  }
              else:
                  raise ValueError(f"Unsupported translation: {translation}")

              return config


          def upload_audio(session: Session, audio_path: str) -> str:
              print("Starting file upload...")
              res = session.post(
                  f"{SONIOX_API_BASE_URL}/v1/files",
                  files={"file": open(audio_path, "rb")},
              )
              file_id = res.json()["id"]
              print(f"File ID: {file_id}")
              return file_id


          def create_transcription(session: Session, config: dict) -> str:
              print("Creating transcription...")
              try:
                  res = session.post(
                      f"{SONIOX_API_BASE_URL}/v1/transcriptions",
                      json=config,
                  )
                  res.raise_for_status()
                  transcription_id = res.json()["id"]
                  print(f"Transcription ID: {transcription_id}")
                  return transcription_id
              except Exception as e:
                  print("error here:", e)


          def wait_until_completed(session: Session, transcription_id: str) -> None:
              print("Waiting for transcription...")
              while True:
                  res = session.get(f"{SONIOX_API_BASE_URL}/v1/transcriptions/{transcription_id}")
                  res.raise_for_status()
                  data = res.json()
                  if data["status"] == "completed":
                      return
                  elif data["status"] == "error":
                      raise Exception(f"Error: {data.get('error_message', 'Unknown error')}")
                  time.sleep(1)


          def get_transcription(session: Session, transcription_id: str) -> dict:
              res = session.get(
                  f"{SONIOX_API_BASE_URL}/v1/transcriptions/{transcription_id}/transcript"
              )
              res.raise_for_status()
              return res.json()


          def delete_transcription(session: Session, transcription_id: str) -> dict:
              res = session.delete(f"{SONIOX_API_BASE_URL}/v1/transcriptions/{transcription_id}")
              res.raise_for_status()


          def delete_file(session: Session, file_id: str) -> dict:
              res = session.delete(f"{SONIOX_API_BASE_URL}/v1/files/{file_id}")
              res.raise_for_status()


          def delete_all_files(session: Session) -> None:
              files: list[dict] = []
              cursor: str = ""

              while True:
                  print("Getting files...")
                  res = session.get(f"{SONIOX_API_BASE_URL}/v1/files?cursor={cursor}")
                  res.raise_for_status()
                  res_json = res.json()
                  files.extend(res_json["files"])
                  cursor = res_json["next_page_cursor"]
                  if cursor is None:
                      break

              total = len(files)
              if total == 0:
                  print("No files to delete.")
                  return

              print(f"Deleting {total} files...")
              for idx, file in enumerate(files):
                  file_id = file["id"]
                  print(f"Deleting file: {file_id} ({idx + 1}/{total})")
                  delete_file(session, file_id)


          def delete_all_transcriptions(session: Session) -> None:
              transcriptions: list[dict] = []
              cursor: str = ""

              while True:
                  print("Getting transcriptions...")
                  res = session.get(f"{SONIOX_API_BASE_URL}/v1/transcriptions?cursor={cursor}")
                  res.raise_for_status()
                  res_json = res.json()
                  for transcription in res_json["transcriptions"]:
                      status = transcription["status"]
                      # Delete only transcriptions with completed or error status.
                      if status in ("completed", "error"):
                          transcriptions.append(transcription)
                  cursor = res_json["next_page_cursor"]
                  if cursor is None:
                      break

              total = len(transcriptions)
              if total == 0:
                  print("No transcriptions to delete.")
                  return

              print(f"Deleting {total} transcriptions...")
              for idx, transcription in enumerate(transcriptions):
                  transcription_id = transcription["id"]
                  print(f"Deleting transcription: {transcription_id} ({idx + 1}/{total})")
                  delete_transcription(session, transcription_id)


          # Convert tokens into a readable transcript.
          def render_tokens(final_tokens: list[dict]) -> str:
              text_parts: list[str] = []
              current_speaker: Optional[str] = None
              current_language: Optional[str] = None

              # Process all tokens in order.
              for token in final_tokens:
                  text = token["text"]
                  speaker = token.get("speaker")
                  language = token.get("language")
                  is_translation = token.get("translation_status") == "translation"

                  # Speaker changed -> add a speaker tag.
                  if speaker is not None and speaker != current_speaker:
                      if current_speaker is not None:
                          text_parts.append("\n\n")
                      current_speaker = speaker
                      current_language = None  # Reset language on speaker changes.
                      text_parts.append(f"Speaker {current_speaker}:")

                  # Language changed -> add a language or translation tag.
                  if language is not None and language != current_language:
                      current_language = language
                      prefix = "[Translation] " if is_translation else ""
                      text_parts.append(f"\n{prefix}[{current_language}] ")
                      text = text.lstrip()

                  text_parts.append(text)

              return "".join(text_parts)


          def transcribe_file(
              session: Session,
              audio_url: Optional[str],
              audio_path: Optional[str],
              translation: Optional[str],
          ) -> None:
              if audio_url is not None:
                  # Public URL of the audio file to transcribe.
                  assert audio_path is None
                  file_id = None
              elif audio_path is not None:
                  # Local file to be uploaded to obtain file id.
                  assert audio_url is None
                  file_id = upload_audio(session, audio_path)
              else:
                  raise ValueError("Missing audio: audio_url or audio_path must be specified.")

              config = get_config(audio_url, file_id, translation)

              transcription_id = create_transcription(session, config)

              wait_until_completed(session, transcription_id)

              result = get_transcription(session, transcription_id)

              text = render_tokens(result["tokens"])
              print(text)

              delete_transcription(session, transcription_id)

              if file_id is not None:
                  delete_file(session, file_id)


          def main():
              parser = argparse.ArgumentParser()
              parser.add_argument(
                  "--audio_url", help="Public URL of the audio file to transcribe."
              )
              parser.add_argument(
                  "--audio_path", help="Path to a local audio file to transcribe."
              )
              parser.add_argument("--delete_all_files", action="store_true")
              parser.add_argument("--delete_all_transcriptions", action="store_true")
              parser.add_argument("--translation", default="none")
              args = parser.parse_args()

              api_key = os.environ.get("SONIOX_API_KEY")
              if not api_key:
                  raise RuntimeError(
                      "Missing SONIOX_API_KEY.\n"
                      "1. Get your API key at https://console.soniox.com\n"
                      "2. Run: export SONIOX_API_KEY=<YOUR_API_KEY>"
                  )

              # Create an authenticated session.
              session = requests.Session()
              session.headers["Authorization"] = f"Bearer {api_key}"

              # Delete all uploaded files.
              if args.delete_all_files:
                  delete_all_files(session)
                  return

              # Delete all transcriptions.
              if args.delete_all_transcriptions:
                  delete_all_transcriptions(session)
                  return

              # If not deleting, require one audio source.
              if not (args.audio_url or args.audio_path):
                  parser.error("Provide --audio_url or --audio_path (or use a delete flag).")

              transcribe_file(session, args.audio_url, args.audio_path, args.translation)


          if __name__ == "__main__":
              main()

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # Transcribe file from URL
        python soniox_async.py --audio_url "https://soniox.com/media/examples/coffee_shop.mp3"

        # Transcribe from local file
        python soniox_async.py --audio_path ../assets/coffee_shop.mp3

        # Delete all uploaded files
        python soniox_async.py --delete_all_files

        # Delete all transcriptions
        python soniox_async.py --delete_all_transcriptions
        ```
      </Accordion>
    </Accordions>
  </Tab>

  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_async.js](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/nodejs/soniox_async.js).

        <FileCodeBlock path="./content/stt/async/_examples/soniox_async.js" lang="js">
          ```
          import fs from "fs";
          import { parseArgs } from "node:util";
          import process from "process";

          const SONIOX_API_BASE_URL = "https://api.soniox.com";

          // Get Soniox STT config.
          function getConfig(audioUrl, fileId, translation) {
            const config = {
              // Select the model to use.
              // See: soniox.com/docs/stt/models
              model: "stt-async-v3",

              // Set language hints when possible to significantly improve accuracy.
              // See: soniox.com/docs/stt/concepts/language-hints
              language_hints: ["en", "es"],

              // Enable language identification. Each token will include a "language" field.
              // See: soniox.com/docs/stt/concepts/language-identification
              enable_language_identification: true,

              // Enable speaker diarization. Each token will include a "speaker" field.
              // See: soniox.com/docs/stt/concepts/speaker-diarization
              enable_speaker_diarization: true,

              // Set context to help the model understand your domain, recognize important terms,
              // and apply custom vocabulary and translation preferences.
              // See: soniox.com/docs/stt/concepts/context
              context: {
                general: [
                  { key: "domain", value: "Healthcare" },
                  { key: "topic", value: "Diabetes management consultation" },
                  { key: "doctor", value: "Dr. Martha Smith" },
                  { key: "patient", value: "Mr. David Miller" },
                  { key: "organization", value: "St John's Hospital" },
                ],
                text: "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                terms: [
                  "Celebrex",
                  "Zyrtec",
                  "Xanax",
                  "Prilosec",
                  "Amoxicillin Clavulanate Potassium",
                ],
                translation_terms: [
                  { source: "Mr. Smith", target: "Sr. Smith" },
                  { source: "St John's", target: "St John's" },
                  { source: "stroke", target: "ictus" },
                ],
              },

              // Optional identifier to track this request (client-defined).
              // See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
              client_reference_id: "MyReferenceId",

              // Audio source (only one can specified):
              // - Public URL of the audio file.
              // - File ID of a previously uploaded file
              // See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
              audio_url: audioUrl,
              file_id: fileId,
            };

            // Webhook.
            // You can set a webhook to get notified when the transcription finishes or fails.
            // See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request

            // Translation options.
            // See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
            if (translation === "one_way") {
              // Translates all languages into the target language.
              config.translation = { type: "one_way", target_language: "es" };
            } else if (translation === "two_way") {
              // Translates from language_a to language_b and back from language_b to language_a.
              config.translation = {
                type: "two_way",
                language_a: "en",
                language_b: "es",
              };
            } else if (translation !== "none") {
              throw new Error(`Unsupported translation: ${translation}`);
            }

            return config;
          }

          // Adds Soniox API_KEY to each request.
          async function apiFetch(endpoint, { method = "GET", body, headers = {} } = {}) {
            const apiKey = process.env.SONIOX_API_KEY;
            if (!apiKey) {
              throw new Error(
                "Missing SONIOX_API_KEY.\n" +
                  "1. Get your API key at https://console.soniox.com\n" +
                  "2. Run: export SONIOX_API_KEY=<YOUR_API_KEY>",
              );
            }

            const res = await fetch(`${SONIOX_API_BASE_URL}${endpoint}`, {
              method,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                ...headers,
              },
              body,
            });

            if (!res.ok) {
              const msg = await res.text();
              console.log(msg);
              throw new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
            }

            return method !== "DELETE" ? res.json() : null;
          }

          async function uploadAudio(audioPath) {
            console.log("Starting file upload...");

            const form = new FormData();
            form.append("file", new Blob([fs.readFileSync(audioPath)]), audioPath);

            const res = await apiFetch("/v1/files", {
              method: "POST",
              body: form,
            });

            console.log(`File ID: ${res.id}`);
            return res.id;
          }

          async function createTranscription(config) {
            console.log("Creating transcription...");
            const res = await apiFetch("/v1/transcriptions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(config),
            });
            console.log(`Transcription ID: ${res.id}`);
            return res.id;
          }

          async function waitUntilCompleted(transcriptionId) {
            console.log("Waiting for transcription...");
            while (true) {
              const res = await apiFetch(`/v1/transcriptions/${transcriptionId}`);
              if (res.status === "completed") return;
              if (res.status === "error") throw new Error(`Error: ${res.error_message}`);
              await new Promise((r) => setTimeout(r, 1000));
            }
          }

          async function getTranscription(transcriptionId) {
            return apiFetch(`/v1/transcriptions/${transcriptionId}/transcript`);
          }

          async function deleteTranscription(transcriptionId) {
            await apiFetch(`/v1/transcriptions/${transcriptionId}`, { method: "DELETE" });
          }

          async function deleteFile(fileId) {
            await apiFetch(`/v1/files/${fileId}`, { method: "DELETE" });
          }

          async function deleteAllFiles() {
            let files = [];
            let cursor = "";

            while (true) {
              const res = await apiFetch(`/v1/files?cursor=${cursor}`);
              files = files.concat(res.files);
              cursor = res.next_page_cursor;
              if (!cursor) break;
            }

            if (files.length === 0) {
              console.log("No files to delete.");
              return;
            }

            console.log(`Deleting ${files.length} files...`);
            for (let i = 0; i < files.length; i++) {
              console.log(`Deleting file: ${files[i].id} (${i + 1}/${files.length})`);
              await deleteFile(files[i].id);
            }
          }

          async function deleteAllTranscriptions() {
            let transcriptions = [];
            let cursor = "";

            while (true) {
              const res = await apiFetch(`/v1/transcriptions?cursor=${cursor}`);
              // Delete only transcriptions with completed or error status.
              transcriptions = transcriptions.concat(
                res.transcriptions.filter(
                  (t) => t.status === "completed" || t.status === "error",
                ),
              );
              cursor = res.next_page_cursor;
              if (!cursor) break;
            }

            if (transcriptions.length === 0) {
              console.log("No transcriptions to delete.");
              return;
            }

            console.log(`Deleting ${transcriptions.length} transcriptions...`);
            for (let i = 0; i < transcriptions.length; i++) {
              console.log(
                `Deleting transcription: ${transcriptions[i].id} (${i + 1}/${transcriptions.length})`,
              );
              await deleteTranscription(transcriptions[i].id);
            }
          }

          // Convert tokens into a readable transcript.
          function renderTokens(finalTokens) {
            const textParts = [];
            let currentSpeaker = null;
            let currentLanguage = null;

            // Process all tokens in order.
            for (const token of finalTokens) {
              let { text, speaker, language } = token;
              const isTranslation = token.translation_status === "translation";

              // Speaker changed -> add a speaker tag.
              if (speaker !== undefined && speaker !== currentSpeaker) {
                if (currentSpeaker !== null) textParts.push("\n\n");
                currentSpeaker = speaker;
                currentLanguage = null; // Reset language on speaker changes.
                textParts.push(`Speaker ${currentSpeaker}:`);
              }

              // Language changed -> add a language or translation tag.
              if (language !== undefined && language !== currentLanguage) {
                currentLanguage = language;
                const prefix = isTranslation ? "[Translation] " : "";
                textParts.push(`\n${prefix}[${currentLanguage}] `);
                text = text.trimStart();
              }

              textParts.push(text);
            }
            return textParts.join("");
          }

          async function transcribeFile(audioUrl, audioPath, translation) {
            let fileId = null;

            if (!audioUrl && !audioPath) {
              throw new Error(
                "Missing audio: audio_url or audio_path must be specified.",
              );
            }
            if (audioPath) {
              fileId = await uploadAudio(audioPath);
            }

            const config = getConfig(audioUrl, fileId, translation);
            const transcriptionId = await createTranscription(config);
            await waitUntilCompleted(transcriptionId);

            const result = await getTranscription(transcriptionId);
            const text = renderTokens(result.tokens);
            console.log(text);

            await deleteTranscription(transcriptionId);
            if (fileId) await deleteFile(fileId);
          }

          async function main() {
            const { values: argv } = parseArgs({
              options: {
                audio_url: {
                  type: "string",
                  description: "Public URL of the audio file to transcribe",
                },
                audio_path: {
                  type: "string",
                  description: "Path to a local audio file to transcribe",
                },
                delete_all_files: {
                  type: "boolean",
                  description: "Delete all uploaded files",
                },
                delete_all_transcriptions: {
                  type: "boolean",
                  description: "Delete all transcriptions",
                },
                translation: { type: "string", default: "none" },
              },
            });

            if (argv.delete_all_files) {
              await deleteAllFiles();
              return;
            }

            if (argv.delete_all_transcriptions) {
              await deleteAllTranscriptions();
              return;
            }

            await transcribeFile(argv.audio_url, argv.audio_path, argv.translation);
          }

          main().catch((err) => {
            console.error("Error:", err.message);
            process.exit(1);
          });

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # Transcribe file from URL
        node soniox_async.js --audio_url "https://soniox.com/media/examples/coffee_shop.mp3"

        # Transcribe from local file
        node soniox_async.js --audio_path ../assets/coffee_shop.mp3

        # Delete all uploaded files
        node soniox_async.js --delete_all_files

        # Delete all transcriptions
        node soniox_async.js --delete_all_transcriptions
        ```
      </Accordion>
    </Accordions>
  </Tab>
</Tabs>

# Async translation
URL: /stt/async/async-translation

Learn about async translation for audio files.

***

title: Async translation
description: Learn about async translation for audio files.
keywords: "async file translation, how to translate audio file, learn to translate audio file"
----------------------------------------------------------------------------------------------

## Overview

Soniox also supports **asynchronous transcription with translation,** allowing you to process recorded audio files in a single API call, no live connection or streaming required.

To get started:

1. Review the [Async transcription](/stt/async/async-transcription): guide to understand how asynchronous processing works.
2. Then, see [Real-time translation](/stt/rt/real-time-translation): for a detailed explanation of translation concepts that also apply to async mode.

***

## Code examples

**Prerequisite:** Complete the steps in [Get started](/stt/get-started).

<Tabs
  items={[
  'Python',
  'Node.js']}
>
  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_async.py](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/python/soniox_async.py).

        <FileCodeBlock path="./content/stt/async/_examples/soniox_async.py" lang="python">
          ```
          import os
          import time
          import argparse
          from typing import Optional
          import requests
          from requests import Session

          SONIOX_API_BASE_URL = "https://api.soniox.com"


          # Get Soniox STT config.
          def get_config(
              audio_url: Optional[str], file_id: Optional[str], translation: Optional[str]
          ) -> dict:
              config = {
                  # Select the model to use.
                  # See: soniox.com/docs/stt/models
                  "model": "stt-async-v3",
                  #
                  # Set language hints when possible to significantly improve accuracy.
                  # See: soniox.com/docs/stt/concepts/language-hints
                  "language_hints": ["en", "es"],
                  #
                  # Enable language identification. Each token will include a "language" field.
                  # See: soniox.com/docs/stt/concepts/language-identification
                  "enable_language_identification": True,
                  #
                  # Enable speaker diarization. Each token will include a "speaker" field.
                  # See: soniox.com/docs/stt/concepts/speaker-diarization
                  "enable_speaker_diarization": True,
                  #
                  # Set context to help the model understand your domain, recognize important terms,
                  # and apply custom vocabulary and translation preferences.
                  # See: soniox.com/docs/stt/concepts/context
                  "context": {
                      "general": [
                          {"key": "domain", "value": "Healthcare"},
                          {"key": "topic", "value": "Diabetes management consultation"},
                          {"key": "doctor", "value": "Dr. Martha Smith"},
                          {"key": "patient", "value": "Mr. David Miller"},
                          {"key": "organization", "value": "St John's Hospital"},
                      ],
                      "text": "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                      "terms": [
                          "Celebrex",
                          "Zyrtec",
                          "Xanax",
                          "Prilosec",
                          "Amoxicillin Clavulanate Potassium",
                      ],
                      "translation_terms": [
                          {"source": "Mr. Smith", "target": "Sr. Smith"},
                          {"source": "St John's", "target": "St John's"},
                          {"source": "stroke", "target": "ictus"},
                      ],
                  },
                  #
                  # Optional identifier to track this request (client-defined).
                  # See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
                  "client_reference_id": "MyReferenceId",
                  #
                  # Audio source (only one can specified):
                  # - Public URL of the audio file.
                  # - File ID of a previously uploaded file
                  # See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
                  "audio_url": audio_url,
                  "file_id": file_id,
              }

              # Webhook.
              # You can set a webhook to get notified when the transcription finishes or fails.
              # See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request

              # Translation options.
              # See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
              if translation == "none":
                  pass
              elif translation == "one_way":
                  # Translates all languages into the target language.
                  config["translation"] = {
                      "type": "one_way",
                      "target_language": "es",
                  }
              elif translation == "two_way":
                  # Translates from language_a to language_b and back from language_b to language_a.
                  config["translation"] = {
                      "type": "two_way",
                      "language_a": "en",
                      "language_b": "es",
                  }
              else:
                  raise ValueError(f"Unsupported translation: {translation}")

              return config


          def upload_audio(session: Session, audio_path: str) -> str:
              print("Starting file upload...")
              res = session.post(
                  f"{SONIOX_API_BASE_URL}/v1/files",
                  files={"file": open(audio_path, "rb")},
              )
              file_id = res.json()["id"]
              print(f"File ID: {file_id}")
              return file_id


          def create_transcription(session: Session, config: dict) -> str:
              print("Creating transcription...")
              try:
                  res = session.post(
                      f"{SONIOX_API_BASE_URL}/v1/transcriptions",
                      json=config,
                  )
                  res.raise_for_status()
                  transcription_id = res.json()["id"]
                  print(f"Transcription ID: {transcription_id}")
                  return transcription_id
              except Exception as e:
                  print("error here:", e)


          def wait_until_completed(session: Session, transcription_id: str) -> None:
              print("Waiting for transcription...")
              while True:
                  res = session.get(f"{SONIOX_API_BASE_URL}/v1/transcriptions/{transcription_id}")
                  res.raise_for_status()
                  data = res.json()
                  if data["status"] == "completed":
                      return
                  elif data["status"] == "error":
                      raise Exception(f"Error: {data.get('error_message', 'Unknown error')}")
                  time.sleep(1)


          def get_transcription(session: Session, transcription_id: str) -> dict:
              res = session.get(
                  f"{SONIOX_API_BASE_URL}/v1/transcriptions/{transcription_id}/transcript"
              )
              res.raise_for_status()
              return res.json()


          def delete_transcription(session: Session, transcription_id: str) -> dict:
              res = session.delete(f"{SONIOX_API_BASE_URL}/v1/transcriptions/{transcription_id}")
              res.raise_for_status()


          def delete_file(session: Session, file_id: str) -> dict:
              res = session.delete(f"{SONIOX_API_BASE_URL}/v1/files/{file_id}")
              res.raise_for_status()


          def delete_all_files(session: Session) -> None:
              files: list[dict] = []
              cursor: str = ""

              while True:
                  print("Getting files...")
                  res = session.get(f"{SONIOX_API_BASE_URL}/v1/files?cursor={cursor}")
                  res.raise_for_status()
                  res_json = res.json()
                  files.extend(res_json["files"])
                  cursor = res_json["next_page_cursor"]
                  if cursor is None:
                      break

              total = len(files)
              if total == 0:
                  print("No files to delete.")
                  return

              print(f"Deleting {total} files...")
              for idx, file in enumerate(files):
                  file_id = file["id"]
                  print(f"Deleting file: {file_id} ({idx + 1}/{total})")
                  delete_file(session, file_id)


          def delete_all_transcriptions(session: Session) -> None:
              transcriptions: list[dict] = []
              cursor: str = ""

              while True:
                  print("Getting transcriptions...")
                  res = session.get(f"{SONIOX_API_BASE_URL}/v1/transcriptions?cursor={cursor}")
                  res.raise_for_status()
                  res_json = res.json()
                  for transcription in res_json["transcriptions"]:
                      status = transcription["status"]
                      # Delete only transcriptions with completed or error status.
                      if status in ("completed", "error"):
                          transcriptions.append(transcription)
                  cursor = res_json["next_page_cursor"]
                  if cursor is None:
                      break

              total = len(transcriptions)
              if total == 0:
                  print("No transcriptions to delete.")
                  return

              print(f"Deleting {total} transcriptions...")
              for idx, transcription in enumerate(transcriptions):
                  transcription_id = transcription["id"]
                  print(f"Deleting transcription: {transcription_id} ({idx + 1}/{total})")
                  delete_transcription(session, transcription_id)


          # Convert tokens into a readable transcript.
          def render_tokens(final_tokens: list[dict]) -> str:
              text_parts: list[str] = []
              current_speaker: Optional[str] = None
              current_language: Optional[str] = None

              # Process all tokens in order.
              for token in final_tokens:
                  text = token["text"]
                  speaker = token.get("speaker")
                  language = token.get("language")
                  is_translation = token.get("translation_status") == "translation"

                  # Speaker changed -> add a speaker tag.
                  if speaker is not None and speaker != current_speaker:
                      if current_speaker is not None:
                          text_parts.append("\n\n")
                      current_speaker = speaker
                      current_language = None  # Reset language on speaker changes.
                      text_parts.append(f"Speaker {current_speaker}:")

                  # Language changed -> add a language or translation tag.
                  if language is not None and language != current_language:
                      current_language = language
                      prefix = "[Translation] " if is_translation else ""
                      text_parts.append(f"\n{prefix}[{current_language}] ")
                      text = text.lstrip()

                  text_parts.append(text)

              return "".join(text_parts)


          def transcribe_file(
              session: Session,
              audio_url: Optional[str],
              audio_path: Optional[str],
              translation: Optional[str],
          ) -> None:
              if audio_url is not None:
                  # Public URL of the audio file to transcribe.
                  assert audio_path is None
                  file_id = None
              elif audio_path is not None:
                  # Local file to be uploaded to obtain file id.
                  assert audio_url is None
                  file_id = upload_audio(session, audio_path)
              else:
                  raise ValueError("Missing audio: audio_url or audio_path must be specified.")

              config = get_config(audio_url, file_id, translation)

              transcription_id = create_transcription(session, config)

              wait_until_completed(session, transcription_id)

              result = get_transcription(session, transcription_id)

              text = render_tokens(result["tokens"])
              print(text)

              delete_transcription(session, transcription_id)

              if file_id is not None:
                  delete_file(session, file_id)


          def main():
              parser = argparse.ArgumentParser()
              parser.add_argument(
                  "--audio_url", help="Public URL of the audio file to transcribe."
              )
              parser.add_argument(
                  "--audio_path", help="Path to a local audio file to transcribe."
              )
              parser.add_argument("--delete_all_files", action="store_true")
              parser.add_argument("--delete_all_transcriptions", action="store_true")
              parser.add_argument("--translation", default="none")
              args = parser.parse_args()

              api_key = os.environ.get("SONIOX_API_KEY")
              if not api_key:
                  raise RuntimeError(
                      "Missing SONIOX_API_KEY.\n"
                      "1. Get your API key at https://console.soniox.com\n"
                      "2. Run: export SONIOX_API_KEY=<YOUR_API_KEY>"
                  )

              # Create an authenticated session.
              session = requests.Session()
              session.headers["Authorization"] = f"Bearer {api_key}"

              # Delete all uploaded files.
              if args.delete_all_files:
                  delete_all_files(session)
                  return

              # Delete all transcriptions.
              if args.delete_all_transcriptions:
                  delete_all_transcriptions(session)
                  return

              # If not deleting, require one audio source.
              if not (args.audio_url or args.audio_path):
                  parser.error("Provide --audio_url or --audio_path (or use a delete flag).")

              transcribe_file(session, args.audio_url, args.audio_path, args.translation)


          if __name__ == "__main__":
              main()

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # One-way translation of a local file
        python soniox_async.py --audio_path ../assets/coffee_shop.mp3 --translation one_way

        # Two-way translation of a local file
        python soniox_async.py --audio_path ../assets/two_way_translation.mp3 --translation two_way
        ```
      </Accordion>
    </Accordions>
  </Tab>

  <Tab>
    <Accordions>
      <Accordion title="Code" id="code">
        See on GitHub: [soniox\_async.js](https://github.com/soniox/soniox_examples/blob/master/speech_to_text/nodejs/soniox_async.js).

        <FileCodeBlock path="./content/stt/async/_examples/soniox_async.js" lang="js">
          ```
          import fs from "fs";
          import { parseArgs } from "node:util";
          import process from "process";

          const SONIOX_API_BASE_URL = "https://api.soniox.com";

          // Get Soniox STT config.
          function getConfig(audioUrl, fileId, translation) {
            const config = {
              // Select the model to use.
              // See: soniox.com/docs/stt/models
              model: "stt-async-v3",

              // Set language hints when possible to significantly improve accuracy.
              // See: soniox.com/docs/stt/concepts/language-hints
              language_hints: ["en", "es"],

              // Enable language identification. Each token will include a "language" field.
              // See: soniox.com/docs/stt/concepts/language-identification
              enable_language_identification: true,

              // Enable speaker diarization. Each token will include a "speaker" field.
              // See: soniox.com/docs/stt/concepts/speaker-diarization
              enable_speaker_diarization: true,

              // Set context to help the model understand your domain, recognize important terms,
              // and apply custom vocabulary and translation preferences.
              // See: soniox.com/docs/stt/concepts/context
              context: {
                general: [
                  { key: "domain", value: "Healthcare" },
                  { key: "topic", value: "Diabetes management consultation" },
                  { key: "doctor", value: "Dr. Martha Smith" },
                  { key: "patient", value: "Mr. David Miller" },
                  { key: "organization", value: "St John's Hospital" },
                ],
                text: "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
                terms: [
                  "Celebrex",
                  "Zyrtec",
                  "Xanax",
                  "Prilosec",
                  "Amoxicillin Clavulanate Potassium",
                ],
                translation_terms: [
                  { source: "Mr. Smith", target: "Sr. Smith" },
                  { source: "St John's", target: "St John's" },
                  { source: "stroke", target: "ictus" },
                ],
              },

              // Optional identifier to track this request (client-defined).
              // See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
              client_reference_id: "MyReferenceId",

              // Audio source (only one can specified):
              // - Public URL of the audio file.
              // - File ID of a previously uploaded file
              // See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request
              audio_url: audioUrl,
              file_id: fileId,
            };

            // Webhook.
            // You can set a webhook to get notified when the transcription finishes or fails.
            // See: https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription#request

            // Translation options.
            // See: soniox.com/docs/stt/rt/real-time-translation#translation-modes
            if (translation === "one_way") {
              // Translates all languages into the target language.
              config.translation = { type: "one_way", target_language: "es" };
            } else if (translation === "two_way") {
              // Translates from language_a to language_b and back from language_b to language_a.
              config.translation = {
                type: "two_way",
                language_a: "en",
                language_b: "es",
              };
            } else if (translation !== "none") {
              throw new Error(`Unsupported translation: ${translation}`);
            }

            return config;
          }

          // Adds Soniox API_KEY to each request.
          async function apiFetch(endpoint, { method = "GET", body, headers = {} } = {}) {
            const apiKey = process.env.SONIOX_API_KEY;
            if (!apiKey) {
              throw new Error(
                "Missing SONIOX_API_KEY.\n" +
                  "1. Get your API key at https://console.soniox.com\n" +
                  "2. Run: export SONIOX_API_KEY=<YOUR_API_KEY>",
              );
            }

            const res = await fetch(`${SONIOX_API_BASE_URL}${endpoint}`, {
              method,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                ...headers,
              },
              body,
            });

            if (!res.ok) {
              const msg = await res.text();
              console.log(msg);
              throw new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
            }

            return method !== "DELETE" ? res.json() : null;
          }

          async function uploadAudio(audioPath) {
            console.log("Starting file upload...");

            const form = new FormData();
            form.append("file", new Blob([fs.readFileSync(audioPath)]), audioPath);

            const res = await apiFetch("/v1/files", {
              method: "POST",
              body: form,
            });

            console.log(`File ID: ${res.id}`);
            return res.id;
          }

          async function createTranscription(config) {
            console.log("Creating transcription...");
            const res = await apiFetch("/v1/transcriptions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(config),
            });
            console.log(`Transcription ID: ${res.id}`);
            return res.id;
          }

          async function waitUntilCompleted(transcriptionId) {
            console.log("Waiting for transcription...");
            while (true) {
              const res = await apiFetch(`/v1/transcriptions/${transcriptionId}`);
              if (res.status === "completed") return;
              if (res.status === "error") throw new Error(`Error: ${res.error_message}`);
              await new Promise((r) => setTimeout(r, 1000));
            }
          }

          async function getTranscription(transcriptionId) {
            return apiFetch(`/v1/transcriptions/${transcriptionId}/transcript`);
          }

          async function deleteTranscription(transcriptionId) {
            await apiFetch(`/v1/transcriptions/${transcriptionId}`, { method: "DELETE" });
          }

          async function deleteFile(fileId) {
            await apiFetch(`/v1/files/${fileId}`, { method: "DELETE" });
          }

          async function deleteAllFiles() {
            let files = [];
            let cursor = "";

            while (true) {
              const res = await apiFetch(`/v1/files?cursor=${cursor}`);
              files = files.concat(res.files);
              cursor = res.next_page_cursor;
              if (!cursor) break;
            }

            if (files.length === 0) {
              console.log("No files to delete.");
              return;
            }

            console.log(`Deleting ${files.length} files...`);
            for (let i = 0; i < files.length; i++) {
              console.log(`Deleting file: ${files[i].id} (${i + 1}/${files.length})`);
              await deleteFile(files[i].id);
            }
          }

          async function deleteAllTranscriptions() {
            let transcriptions = [];
            let cursor = "";

            while (true) {
              const res = await apiFetch(`/v1/transcriptions?cursor=${cursor}`);
              // Delete only transcriptions with completed or error status.
              transcriptions = transcriptions.concat(
                res.transcriptions.filter(
                  (t) => t.status === "completed" || t.status === "error",
                ),
              );
              cursor = res.next_page_cursor;
              if (!cursor) break;
            }

            if (transcriptions.length === 0) {
              console.log("No transcriptions to delete.");
              return;
            }

            console.log(`Deleting ${transcriptions.length} transcriptions...`);
            for (let i = 0; i < transcriptions.length; i++) {
              console.log(
                `Deleting transcription: ${transcriptions[i].id} (${i + 1}/${transcriptions.length})`,
              );
              await deleteTranscription(transcriptions[i].id);
            }
          }

          // Convert tokens into a readable transcript.
          function renderTokens(finalTokens) {
            const textParts = [];
            let currentSpeaker = null;
            let currentLanguage = null;

            // Process all tokens in order.
            for (const token of finalTokens) {
              let { text, speaker, language } = token;
              const isTranslation = token.translation_status === "translation";

              // Speaker changed -> add a speaker tag.
              if (speaker !== undefined && speaker !== currentSpeaker) {
                if (currentSpeaker !== null) textParts.push("\n\n");
                currentSpeaker = speaker;
                currentLanguage = null; // Reset language on speaker changes.
                textParts.push(`Speaker ${currentSpeaker}:`);
              }

              // Language changed -> add a language or translation tag.
              if (language !== undefined && language !== currentLanguage) {
                currentLanguage = language;
                const prefix = isTranslation ? "[Translation] " : "";
                textParts.push(`\n${prefix}[${currentLanguage}] `);
                text = text.trimStart();
              }

              textParts.push(text);
            }
            return textParts.join("");
          }

          async function transcribeFile(audioUrl, audioPath, translation) {
            let fileId = null;

            if (!audioUrl && !audioPath) {
              throw new Error(
                "Missing audio: audio_url or audio_path must be specified.",
              );
            }
            if (audioPath) {
              fileId = await uploadAudio(audioPath);
            }

            const config = getConfig(audioUrl, fileId, translation);
            const transcriptionId = await createTranscription(config);
            await waitUntilCompleted(transcriptionId);

            const result = await getTranscription(transcriptionId);
            const text = renderTokens(result.tokens);
            console.log(text);

            await deleteTranscription(transcriptionId);
            if (fileId) await deleteFile(fileId);
          }

          async function main() {
            const { values: argv } = parseArgs({
              options: {
                audio_url: {
                  type: "string",
                  description: "Public URL of the audio file to transcribe",
                },
                audio_path: {
                  type: "string",
                  description: "Path to a local audio file to transcribe",
                },
                delete_all_files: {
                  type: "boolean",
                  description: "Delete all uploaded files",
                },
                delete_all_transcriptions: {
                  type: "boolean",
                  description: "Delete all transcriptions",
                },
                translation: { type: "string", default: "none" },
              },
            });

            if (argv.delete_all_files) {
              await deleteAllFiles();
              return;
            }

            if (argv.delete_all_transcriptions) {
              await deleteAllTranscriptions();
              return;
            }

            await transcribeFile(argv.audio_url, argv.audio_path, argv.translation);
          }

          main().catch((err) => {
            console.error("Error:", err.message);
            process.exit(1);
          });

          ```
        </FileCodeBlock>
      </Accordion>

      <Accordion title="Run" id="run">
        ```sh title="Terminal"
        # One-way translation of a local file
        node soniox_async.js --audio_path ../assets/coffee_shop.mp3 --translation one_way

        # Two-way translation of a local file
        node soniox_async.js --audio_path ../assets/two_way_translation.mp3 --translation two_way
        ```
      </Accordion>
    </Accordions>
  </Tab>
</Tabs>

# Webhooks
URL: /stt/async/webhooks

Learn how to setup webhooks for Soniox Speech-to-Text API.

***

title: Webhooks
description: Learn how to setup webhooks for Soniox Speech-to-Text API.
keywords: "speech to text webhooks"
-----------------------------------

## Overview

Soniox supports webhooks to notify your service when a transcription job is complete or
if an error occurs. This enables fully asynchronous processing — no need to poll the API.

When you provide a webhook URL in your transcription request, Soniox will send a POST request
to that URL once the transcription finishes or fails.

***

## How it works

1. You start an asynchronous transcription job with a webhook URL.
2. Soniox processes the audio in the background.
3. When the job completes (or if an error occurs), Soniox sends a POST request to your webhook endpoint with the result.

***

## Set up a webhook for a transcription

To use a webhook, simply pass the `webhook_url` parameter when creating a transcription job.
The URL must be publicly accessible from Soniox servers.

```json
{
  "webhook_url": "https://example.com/webhook"
}
```

<Callout>
  During development, you can test webhooks on your local machine using tools like [Cloudflare
  tunnel](https://developers.cloudflare.com/pages/how-to/preview-with-cloudflare-tunnel/),
  [ngrok](https://ngrok.com/) or [VS Code port
  forwarding](https://code.visualstudio.com/docs/editor/port-forwarding).
</Callout>

***

## Handle webhook requests

When a transcription is complete (or if an error occurs), Soniox sends a POST
request to your webhook URL with the following parameters:

<ApiParams>
  <ApiParam name="id" type="string">
    The transcription ID that was assigned when the job was created.
  </ApiParam>

  <ApiParam name="status" type="string" noBorder>
    Status of the transcription. Possible values: <code>completed</code> or <code>error</code>.
  </ApiParam>
</ApiParams>

### Example

```json
{
  "id": "548d023b-2b3d-4dc2-a3ef-cca26d05fd9a",
  "status": "completed"
}
```

***

## Add authentication to webhooks

You can secure your webhook endpoint by requiring an authentication header. Soniox allows you to include
a custom HTTP header in every webhook request by setting the following parameters when creating a transcription:

<ApiParams>
  <ApiParam name="webhook_auth_header_name" type="string">
    The name of the HTTP header to include in the webhook request. For example, use <code>Authorization</code> for standard auth headers.
  </ApiParam>

  <ApiParam name="webhook_auth_header_value" type="string" noBorder>
    The value of the header to include. This could be an API key, bearer token, or any secret that your server expects.
  </ApiParam>
</ApiParams>

When Soniox sends the webhook request, it will include the specified header,
allowing your server to verify that the request came from Soniox.

### Example

```json
{
  "webhook_url": "https://example.com/webhook",
  "webhook_auth_header_name": "Authorization",
  "webhook_auth_header_value": "Bearer <my-secret-token>"
}
```

***

## Add metadata to webhook deliveries

You can attach custom metadata (e.g. customer ID, request ID) to the webhook by
encoding it in the URL as query parameters:

```text
https://example.com/webhook?customer_id=1234&order_id=5678
```

These parameters will be included in the webhook request URL, helping you
associate the callback with the original request.

***

## Failed webhook delivery and retries

Webhook delivery may fail if your server is unavailable or does not respond in time.

If delivery fails, Soniox will automatically retry multiple times over a short period.
If all attempts fail, the delivery is considered permanently failed.

You can still retrieve the transcription result manually using the transcription
ID returned when the job was created.

<Callout>
  We recommend logging transcription IDs on your side in case webhook delivery fails
  and you need to fetch results manually.
</Callout>

# Limits & quotas
URL: /stt/async/limits-and-quotas

Learn about async API limits and quotas.

***

title: Limits & quotas
description: Learn about async API limits and quotas.
-----------------------------------------------------

## File limits

| Limit              | Default         | Notes                                  |
| ------------------ | --------------- | -------------------------------------- |
| Total file storage | **10 GB**       | Across all uploaded files              |
| Uploaded files     | **1,000**       | Maximum number of files stored at once |
| File duration      | **300 minutes** | Cannot be increased                    |

You must **manually delete files** after obtaining transcription results. Files are
**not deleted automatically**.

Limit increases (except file duration) can be requested in the [Soniox Console](https://console.soniox.com).

***

## Transcription limits

| Limit                  | Default         | Notes                                   |
| ---------------------- | --------------- | --------------------------------------- |
| Pending transcriptions | **100**         | Requests created but not yet processing |
| Total transcriptions   | **2,000**       | Includes pending + completed + failed   |
| File duration          | **300 minutes** | Cannot be increased                     |

To keep creating new transcriptions:

* Stay below **100 pending** at a time
* Remove completed/failed transcriptions so total stays **under 2,000**

Limit increases (except file duration) can be requested in the [Soniox Console](https://console.soniox.com).

# Error handling
URL: /stt/async/error-handling

Learn about async API error handling.

***

title: Error handling
description: Learn about async API error handling.
--------------------------------------------------

When using the Async API, errors can occur at different stages of the workflow — from uploading files, to creating transcription requests, to webhook delivery.
This guide explains how to detect, handle, and recover from errors in a robust way.

***

## File upload errors

When uploading files:

* Ensure the file **duration is ≤ 300 minutes** (cannot be increased).
* Stay within your **storage and file count quotas.**
* If you exceed a limit, you’ll get an error.

**How to recover:**

* Delete old files to free up space.
* Request higher limits in the [Soniox Console](https://console.soniox.com/).

***

## Transcription request errors

When creating transcriptions:

* Stay below **100 pending transcriptions** at once.
* Keep your total (pending + completed + failed) **under 2,000.**
* If you exceed a limit, you’ll get an error.

**How to recover:**

* Wait for some pending jobs to complete.
* Delete completed/failed jobs to stay under the quota.
* Request higher limits in the [Soniox Console](https://console.soniox.com/).

***

## Webhook delivery failures

Webhook delivery may fail if:

* Your server is unavailable.
* Your endpoint does not respond in time.
* An invalid response is returned.

### Retry behavior

* Soniox automatically retries multiple times over a short period.
* If all attempts fail, the webhook is marked as permanently failed.

### Recovery options

* Retrieve the transcription result manually using the transcription ID from the create transcription request.

Example:

```sh
curl https://api.soniox.com/v1/async/transcriptions/<transcription_id> \
  -H "Authorization: Bearer $SONIOX_API_KEY"
```

# Supported languages
URL: /stt/concepts/supported-languages

List of supported languages by Soniox Speech-to-Text AI.

***

title: Supported languages
description: List of supported languages by Soniox Speech-to-Text AI.
keywords: "soniox supported languages"
--------------------------------------

## Overview

Soniox Speech-to-Text AI supports **transcription and translation in 60+ languages** with world-leading accuracy — all powered by a **single, unified AI model.**

* **Transcription** → Available in every supported language.
* **Translation** → Works between any pair of supported languages.

All languages are available in both:

* **Real-time API** → Stream live audio with transcription + translation.
* **Async API** → Transcribe recorded files at scale.

To programmatically retrieve the full list of supported languages, use the [Get models](/stt/api-reference/models/get_models) endpoint.

For detailed accuracy comparisons, see our [Benchmark Report](https://soniox.com/media/SonioxSTTBenchmarks2025.pdf).

***

## Supported languages

| Language    | ISO Code |
| ----------- | -------- |
| Afrikaans   | af       |
| Albanian    | sq       |
| Arabic      | ar       |
| Azerbaijani | az       |
| Basque      | eu       |
| Belarusian  | be       |
| Bengali     | bn       |
| Bosnian     | bs       |
| Bulgarian   | bg       |
| Catalan     | ca       |
| Chinese     | zh       |
| Croatian    | hr       |
| Czech       | cs       |
| Danish      | da       |
| Dutch       | nl       |
| English     | en       |
| Estonian    | et       |
| Finnish     | fi       |
| French      | fr       |
| Galician    | gl       |
| German      | de       |
| Greek       | el       |
| Gujarati    | gu       |
| Hebrew      | he       |
| Hindi       | hi       |
| Hungarian   | hu       |
| Indonesian  | id       |
| Italian     | it       |
| Japanese    | ja       |
| Kannada     | kn       |
| Kazakh      | kk       |
| Korean      | ko       |
| Latvian     | lv       |
| Lithuanian  | lt       |
| Macedonian  | mk       |
| Malay       | ms       |
| Malayalam   | ml       |
| Marathi     | mr       |
| Norwegian   | no       |
| Persian     | fa       |
| Polish      | pl       |
| Portuguese  | pt       |
| Punjabi     | pa       |
| Romanian    | ro       |
| Russian     | ru       |
| Serbian     | sr       |
| Slovak      | sk       |
| Slovenian   | sl       |
| Spanish     | es       |
| Swahili     | sw       |
| Swedish     | sv       |
| Tagalog     | tl       |
| Tamil       | ta       |
| Telugu      | te       |
| Thai        | th       |
| Turkish     | tr       |
| Ukrainian   | uk       |
| Urdu        | ur       |
| Vietnamese  | vi       |
| Welsh       | cy       |

# Language hints
URL: /stt/concepts/language-hints

Learn about supported languages and how to specify language hints.

***

title: Language hints
description: Learn about supported languages and how to specify language hints.
keywords: "soniox language hints"
---------------------------------

## Overview

Soniox Speech-to-Text AI is a powerful, multilingual model that transcribes
speech in **60+ languages** with world-leading accuracy.

By default, you don’t need to pre-select a language — the model automatically
detects and transcribes any supported language. It also handles **multilingual
speech seamlessly,** even when multiple languages are mixed within a single
sentence or conversation.

When you already know which languages are most likely to appear in your audio,
you **should provide language hints** to guide the model. This **improves accuracy** by
biasing recognition toward the specified languages, while still allowing other
languages to be detected if present.

***

## How language hints work

* Use the `language_hints` parameter to provide a list of expected **ISO language codes** (e.g., `en` for English, `es` for Spanish).
* Language hints **do not restrict** recognition to those languages — they only **bias** the model toward them.

**Example: Hinting English and Spanish**

```json
{
  "language_hints": ["en", "es"]
}
```

This biases transcription toward **English** and **Spanish,** while still allowing other languages to be detected if spoken.

***

## When to use language hints

Provide `language_hints` when:

* You know or expect certain languages in the audio.
* You want to improve accuracy for specific languages.
* Audio includes **uncommon** or **similar-sounding** languages.
* You’re transcribing content for a **specific audience or market.**

***

## Supported languages

See the list of [supported languages](/stt/concepts/supported-languages) and their ISO codes.

# Language identification
URL: /stt/concepts/language-identification

Learn how to identify one or more spoken languages within an audio.

***

title: Language identification
description: Learn how to identify one or more spoken languages within an audio.
--------------------------------------------------------------------------------

## Overview

Soniox Speech-to-Text AI can **automatically identify spoken languages** within an
audio stream — whether the speech is entirely in one language or mixes multiple
languages. This lets you handle **real-world multilingual conversations** naturally
and accurately, without requiring users to specify languages in advance.

***

## How it works

Language identification in Soniox is performed **at the token level.** Each token
in the transcript is tagged with a language code. However, the model is trained
to maintain **sentence-level coherence,** not just word-level decisions.

***

### Examples

**Example 1: embedded foreign word**

```json
[en] Hello, my dear amigo, how are you doing?
```

All tokens are labeled as English (`en`), even though “amigo” is Spanish.

**Example 2: distinct sentences in multiple languages**

```json
[en] How are you?
[de] Guten Morgen!
[es] Cómo está everyone?
[en] Great! Let’s begin with the agenda.
```

Here, language tags align with sentence boundaries, making the transcript easier to read and interpret in multilingual conversations.

***

## Enabling language identification

Enable automatic language identification by setting the flag in your request:

```json
{
  "enable_language_identification": true
}
```

***

## Output format

When enabled, each token includes a language field alongside the text:

```json
{"text": "How",     "language": "en"}
{"text": " are",    "language": "en"}
{"text": " you",    "language": "en"}
{"text": "?",       "language": "en"}
{"text": "Gu",      "language": "de"}
{"text": "ten",     "language": "de"}
{"text": " Morgen", "language": "de"}
{"text": "!",       "language": "de"}
{"text": "Cómo",    "language": "es"}
{"text": " está",   "language": "es"}
{"text": " every",  "language": "es"}
{"text": "one",     "language": "es"}
{"text": "?",       "language": "es"}
```

***

## Language hints

Use [Language hints](/stt/concepts/language-hints) whenever possible to improve the accuracy of language identification.

***

## Real-time considerations

Language identification in **real-time** is more challenging due to
low-latency constraints. The model has less context available, which may cause:

* Temporary misclassification of language.
* Language tags being **revised** as more speech context arrives.

Despite this, Soniox provides highly reliable detection of language switches in real-time.

***

## Supported languages

Language identification is available for all [supported languages](/stt/concepts/supported-languages).

# Speaker diarization
URL: /stt/concepts/speaker-diarization

Learn how to separate speakers in both real-time and asynchronous processing.

***

title: Speaker diarization
description: Learn how to separate speakers in both real-time and asynchronous processing.
keywords: "speaker recognition, speaker diarization, speaker identification, separate speakers, identify speakers, speaker separation"
--------------------------------------------------------------------------------------------------------------------------------------

## Overview

Soniox Speech-to-Text AI supports **speaker diarization** — the ability to
automatically detect and separate speakers in an audio stream. This allows you
to generate **speaker-labeled transcripts** for conversations, meetings, interviews,
podcasts, and other multi-speaker scenarios — without any manual labeling or
extra metadata.

***

## What is speaker diarization?

Speaker diarization answers the question: **Who spoke when?**

When enabled, Soniox automatically detects speaker changes and assigns each
spoken segment to a speaker label (e.g., `Speaker 1`, `Speaker 2`). This lets you
structure transcripts into clear, speaker-attributed sections.

### Example

Input audio:

```text
How are you? I am fantastic. What about you? Feeling great today. Hey everyone!
```

Output with diarization enabled:

```text
Speaker 1: How are you?
Speaker 2: I am fantastic. What about you?
Speaker 1: Feeling great today.
Speaker 3: Hey everyone!
```

***

## How to enable speaker diarization

Enable diarization by setting this parameter in your API request:

```json
{
  "enable_speaker_diarization": true
}
```

***

## Output format

When speaker diarization is enabled, each token includes a `speaker` field:

```json
{"text": "How",    "speaker": "1"}
{"text": " are",   "speaker": "1"}
{"text": " you",   "speaker": "1"}
{"text": "?",      "speaker": "1"}
{"text": "I",      "speaker": "2"}
{"text": " am",    "speaker": "2"}
{"text": " fan",   "speaker": "2"}
{"text": "tastic", "speaker": "2"}
{"text": ".",      "speaker": "2"}
```

You can group tokens by speaker in your application to create readable segments, or display speaker labels directly in your UI.

***

## Real-time considerations

Real-time speaker diarization is more challenging due to low-latency constraints. You may observe:

* Higher speaker attribution errors compared to async mode.
* Temporary speaker switches that stabilize as more context is available.

Even with these limitations, real-time diarization is valuable for
**live meetings, conferences, customer support calls, and conversational AI
interfaces.**

***

## Number of supported speakers

* Up to **15 different speakers** are supported per transcription session.
* Accuracy may decrease when many speakers have **similar voice characteristics.**

***

## Best practice

For the most accurate and reliable speaker separation, use **asynchronous
transcription** — it provides significantly higher diarization accuracy because
the model has access to the full audio context. Real-time diarization is best
when you need immediate speaker attribution, but expect lower accuracy due to
low-latency constraints.

***

## Supported languages

Speaker diarization is available for all [supported languages](/stt/concepts/supported-languages).

# Context
URL: /stt/concepts/context

Learn how to use custom context to enhance trancription accuracy.

***

title: Context
description: Learn how to use custom context to enhance trancription accuracy.
keywords: "speech to text customization, stt custom words, transcribe with custom vocabulary"
---------------------------------------------------------------------------------------------

## Overview

Soniox Speech-to-Text AI lets you improve both **transcription** and
**translation** accuracy by providing **context** with each session.

Context helps the model **understand your domain**, **recognize important terms**,
and apply **custom vocabulary** and **translation preferences**.

Think of it as giving the model **your world** —
what the conversation is about, which words are important, and how certain terms should be translated.

***

## Context sections

You provide context through the `context` object that can include up to **four sections**,
each improving accuracy in different ways:

| Section             | Type                  | Description                                                    |
| ------------------- | --------------------- | -------------------------------------------------------------- |
| `general`           | array of JSON objects | Structured key-value information (domain, topic, intent, etc.) |
| `text`              | string                | Longer free-form background text or related documents          |
| `terms`             | array of strings      | Domain-specific or uncommon words                              |
| `translation_terms` | array of JSON objects | Custom translations for ambiguous terms                        |

All sections are optional — include only what's relevant for your use case.

### General

General information provides **baseline context** which guides the AI model.
It helps the model adapt its vocabulary to the correct domain, improving **transcription** and
**translation** quality and clarifying ambiguous words.

It consists of structured **key-value pairs** describing the conversation **domain**, **topic**, **intent**, and other
relevant metadata such as participant's names, organization, setting, location, etc.

#### Example

```json
{
  "context": {
    "general": [
      { "key": "domain",       "value": "Healthcare" },
      { "key": "topic",        "value": "Diabetes management consultation" },
      { "key": "doctor",       "value": "Dr. Martha Smith" },
      { "key": "patient",      "value": "Mr. David Miller" },
      { "key": "organization", "value": "St John's Hospital" }
    ]
  }
}
```

### Text

Provide longer unstructured text that expands on general information — examples include:

* History of prior interactions with a customer.
* Reference documents.
* Background summaries.
* Meeting notes.

#### Example

```json
{
  "context": {
    "text": "The customer, Maria Lopez, contacted BrightWay Insurance to update
    her auto policy after purchasing a new vehicle. Agent Daniel Kim reviewed the
    changes, explained the premium adjustment, and offered a bundling discount.
    Maria agreed to update the policy and scheduled a follow-up to consider
    additional options."
  }
}
```

### Transcription terms

Improve transcription accuracy of important or uncommon words and phrases
that you expect in the audio — such as:

* Domain or industry-specific terminology.
* Brand or product names.
* Rare, uncommon, or invented words.

#### Example

```json
{
  "context": {
    "terms": [
      "Celebrex", 
      "Zyrtec", 
      "Xanax",
      "Prilosec", 
      "Amoxicillin Clavulanate Potassium"
    ]
  }
}
```

### Translation terms

Control how specific words or phrases are translated — useful for:

* Technical terminology.
* Entity names.
* Words with ambiguous domain-specific translations.
* Idioms and figurative speech with non-literal meaning.

#### Example for English → Spanish translation

```json
{
  "context": {
    "translation_terms": [
      { "source": "Mr. Smith", "target": "Sr. Smith" },
      { "source": "MRI",       "target": "RM" },
      { "source": "St John's", "target": "St John's" },
      { "source": "stroke",    "target": "ictus" }
    ]
  }
}
```

***

## Tips

* Provide domain and topic in the `general` section for best accuracy.
* Keep `general` short — ideally no more than **10** key-value pairs.
* Use `terms` to ensure consistent spelling and casing of difficult entity names.
* Use `translations` to preserve terms like names or brands unchanged, e.g., `"St John's"` → `"St John's"`.

***

## Context size limit

* Maximum **8,000 tokens** (\~10,000 characters).
* Supports large blocks of text: glossaries, scripts, domain summaries.
* If you exceed the limit, the API will return an error → trim or summarize first.

# Timestamps
URL: /stt/concepts/timestamps

Learn how to use timestamps and understand their granularity.

***

title: Timestamps
description: Learn how to use timestamps and understand their granularity.
keywords: "speech to text timestamps, speech to text time, speech to text word times, stt token timestamps"
-----------------------------------------------------------------------------------------------------------

## Overview

Soniox Speech-to-Text AI provides **precise timestamps** for every recognized token (word or sub-word).
Timestamps let you align transcriptions with audio, so you know exactly when each word was spoken.

**Timestamps are always included** by default — no extra configuration needed.

***

## Output format

Each token in the response includes:

* `text` → The recognized token.
* `start_ms` → Token start time (in milliseconds).
* `end_ms` → Token end time (in milliseconds).

***

## Example response

In this example, the word **“Beautiful”** is split into three tokens, each with its own timestamp range:

```json
{
  "tokens": [
    {"text": "Beau", "start_ms": 300, "end_ms": 420},
    {"text": "ti",   "start_ms": 420, "end_ms": 540},
    {"text": "ful",  "start_ms": 540, "end_ms": 780}
  ]
}
```

# Confidence scores
URL: /stt/concepts/confidence-scores

Learn how to use confidence score of recognized tokens.

***

title: Confidence scores
description: Learn how to use confidence score of recognized tokens.
keywords: "transcription confidence score, transcription accuracy, audio model confidence"
------------------------------------------------------------------------------------------

## Overview

Soniox Speech-to-Text AI provides a **confidence score** for every recognized token (word or sub-word) in the transcript.
The confidence score represents the model’s estimate of how likely the token was recognized correctly.

Confidence values are floating-point numbers between **0.0** and **1.0**:

* **1.0** → very high confidence.
* **0.0** → very low confidence.

Low confidence values typically occur when recognition is uncertain due to factors like background noise, heavy accents, unclear speech, or uncommon vocabulary.

You can use confidence scores to:

* Assess overall transcription quality.
* Flag or highlight uncertain words in a transcript.
* Trigger post-processing, e.g., request user confirmation or re-check with additional context.

**Confidence scores are always included** by default — no extra configuration needed.

***

## Output format

Each token in the API response includes:

* `text` → the recognized token.
* `confidence` → the confidence score for that token.

***

## Example response

In this example, the word **“Beautiful”** is split into three tokens, each with its own confidence score:

```json
{
  "tokens": [
    {"text": "Beau", "confidence": 0.82},
    {"text": "ti",   "confidence": 0.87},
    {"text": "ful",  "confidence": 0.98}
  ]
}
```

# Confidence scores
URL: /stt/concepts/confidence-scores

Learn how to use confidence score of recognized tokens.

***

title: Confidence scores
description: Learn how to use confidence score of recognized tokens.
keywords: "transcription confidence score, transcription accuracy, audio model confidence"
------------------------------------------------------------------------------------------

## Overview

Soniox Speech-to-Text AI provides a **confidence score** for every recognized token (word or sub-word) in the transcript.
The confidence score represents the model’s estimate of how likely the token was recognized correctly.

Confidence values are floating-point numbers between **0.0** and **1.0**:

* **1.0** → very high confidence.
* **0.0** → very low confidence.

Low confidence values typically occur when recognition is uncertain due to factors like background noise, heavy accents, unclear speech, or uncommon vocabulary.

You can use confidence scores to:

* Assess overall transcription quality.
* Flag or highlight uncertain words in a transcript.
* Trigger post-processing, e.g., request user confirmation or re-check with additional context.

**Confidence scores are always included** by default — no extra configuration needed.

***

## Output format

Each token in the API response includes:

* `text` → the recognized token.
* `confidence` → the confidence score for that token.

***

## Example response

In this example, the word **“Beautiful”** is split into three tokens, each with its own confidence score:

```json
{
  "tokens": [
    {"text": "Beau", "confidence": 0.82},
    {"text": "ti",   "confidence": 0.87},
    {"text": "ful",  "confidence": 0.98}
  ]
}
```

# API reference
URL: /stt/api-reference

Soniox Speech-to-Text API delivers highly accurate, scalable audio transcription.

***

title: API reference
description: Soniox Speech-to-Text API delivers highly accurate, scalable audio transcription.
keywords: "speech to text api, multilingual speech recognition api, real-time speech recognition api, speech api"
-----------------------------------------------------------------------------------------------------------------

## REST API

REST API is available at [https://api.soniox.com/v1](https://api.soniox.com/v1/docs) and is divided into:

* **[Auth API](/stt/api-reference/auth/create_temporary_api_key)**: Create temporary API keys.
* **[Files API](/stt/api-reference/files/get_files)**: Manage audio files by uploading, listing, retrieving, and deleting them.
* **[Models API](/stt/api-reference/models/get_models)**: List available models.
* **[Transcriptions API](/stt/api-reference/transcriptions/get_transcriptions)**: Create and manage transcriptions for audio files uploaded via the Files API.

***

## WebSocket API

[WebSocket API](/stt/api-reference/websocket-api) transcribes and translates live audio streams — such as
conference calls, broadcasts, or direct microphone input — over a WebSocket
connection.

***

See the [Get started](/stt/get-started) page for an introduction on how to integrate with Soniox API.

# Create temporary API key
URL: /stt/api-reference/auth/create_temporary_api_key

Creates a short-lived API key for specific temporary use cases. The key will automatically expire after the specified duration.

***

title: Create temporary API key
description: >-
Creates a short-lived API key for specific temporary use cases. The key will
automatically expire after the specified duration.
full: true
\_openapi:
method: POST
route: /v1/auth/temporary-api-key
toc: \[]
structuredData:
headings: \[]
contents:

* content: >-
  Creates a short-lived API key for specific temporary use cases. The
  key will automatically expire after the specified duration.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/auth/temporary-api-key","method":"post"}]} webhooks={[]} hasHead={false} />

# Delete file
URL: /stt/api-reference/files/delete_file

Permanently deletes specified file.

***

title: Delete file
description: Permanently deletes specified file.
full: true
\_openapi:
method: DELETE
route: /v1/files/{file_id}
toc: \[]
structuredData:
headings: \[]
contents:

* content: Permanently deletes specified file.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/files/{file_id}","method":"delete"}]} webhooks={[]} hasHead={false} />

# Get file URL
URL: /stt/api-reference/files/get_file_url

Get a temporary file URL. URL is valid for 1 hour.

***

title: Get file URL
description: Get a temporary file URL. URL is valid for 1 hour.
full: true
\_openapi:
method: GET
route: /v1/files/{file_id}/url
toc: \[]
structuredData:
headings: \[]
contents:

* content: Get a temporary file URL. URL is valid for 1 hour.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/files/{file_id}/url","method":"get"}]} webhooks={[]} hasHead={false} />

# Get file
URL: /stt/api-reference/files/get_file

Retrieve metadata for an uploaded file.

***

title: Get file
description: Retrieve metadata for an uploaded file.
full: true
\_openapi:
method: GET
route: /v1/files/{file_id}
toc: \[]
structuredData:
headings: \[]
contents:

* content: Retrieve metadata for an uploaded file.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/files/{file_id}","method":"get"}]} webhooks={[]} hasHead={false} />

# Get files
URL: /stt/api-reference/files/get_files

Retrieves list of uploaded files.

***

title: Get files
description: Retrieves list of uploaded files.
full: true
\_openapi:
method: GET
route: /v1/files
toc: \[]
structuredData:
headings: \[]
contents:

* content: Retrieves list of uploaded files.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/files","method":"get"}]} webhooks={[]} hasHead={false} />

# Upload file
URL: /stt/api-reference/files/upload_file

Uploads a new file.

***

title: Upload file
description: Uploads a new file.
full: true
\_openapi:
method: POST
route: /v1/files
toc: \[]
structuredData:
headings: \[]
contents:

* content: Uploads a new file.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/files","method":"post"}]} webhooks={[]} hasHead={false} />

# Get models
URL: /stt/api-reference/models/get_models

Retrieves list of available models and their attributes.

***

title: Get models
description: Retrieves list of available models and their attributes.
full: true
\_openapi:
method: GET
route: /v1/models
toc: \[]
structuredData:
headings: \[]
contents:

* content: Retrieves list of available models and their attributes.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/models","method":"get"}]} webhooks={[]} hasHead={false} />

# Create transcription
URL: /stt/api-reference/transcriptions/create_transcription

Creates a new transcription.

***

title: Create transcription
description: Creates a new transcription.
full: true
\_openapi:
method: POST
route: /v1/transcriptions
toc: \[]
structuredData:
headings: \[]
contents:

* content: Creates a new transcription.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/transcriptions","method":"post"}]} webhooks={[]} hasHead={false} />

# Delete transcription
URL: /stt/api-reference/transcriptions/delete_transcription

Permanently deletes a transcription and its associated files. Cannot delete transcriptions that are currently processing.

***

title: Delete transcription
description: >-
Permanently deletes a transcription and its associated files. Cannot delete
transcriptions that are currently processing.
full: true
\_openapi:
method: DELETE
route: /v1/transcriptions/{transcription_id}
toc: \[]
structuredData:
headings: \[]
contents:

* content: >-
  Permanently deletes a transcription and its associated files. Cannot
  delete transcriptions that are currently processing.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/transcriptions/{transcription_id}","method":"delete"}]} webhooks={[]} hasHead={false} />

# Get transcription transcript
URL: /stt/api-reference/transcriptions/get_transcription_transcript

Retrieves the full transcript text and detailed tokens for a completed transcription. Only available for successfully completed transcriptions.

***

title: Get transcription transcript
description: >-
Retrieves the full transcript text and detailed tokens for a completed
transcription. Only available for successfully completed transcriptions.
full: true
\_openapi:
method: GET
route: /v1/transcriptions/{transcription_id}/transcript
toc: \[]
structuredData:
headings: \[]
contents:

* content: >-
  Retrieves the full transcript text and detailed tokens for a completed
  transcription. Only available for successfully completed
  transcriptions.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/transcriptions/{transcription_id}/transcript","method":"get"}]} webhooks={[]} hasHead={false} />

# Get transcription
URL: /stt/api-reference/transcriptions/get_transcription

Retrieves detailed information about a specific transcription.

***

title: Get transcription
description: Retrieves detailed information about a specific transcription.
full: true
\_openapi:
method: GET
route: /v1/transcriptions/{transcription_id}
toc: \[]
structuredData:
headings: \[]
contents:

* content: Retrieves detailed information about a specific transcription.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/transcriptions/{transcription_id}","method":"get"}]} webhooks={[]} hasHead={false} />

# Get transcriptions
URL: /stt/api-reference/transcriptions/get_transcriptions

Retrieves list of transcriptions.

***

title: Get transcriptions
description: Retrieves list of transcriptions.
full: true
\_openapi:
method: GET
route: /v1/transcriptions
toc: \[]
structuredData:
headings: \[]
contents:

* content: Retrieves list of transcriptions.

***

<APIPage document={"./openapi/public-api.json"} operations={[{"path":"/v1/transcriptions","method":"get"}]} webhooks={[]} hasHead={false} />

# WebSocket API
URL: /stt/api-reference/websocket-api

Learn how to use and integrate Soniox Speech-to-Text WebSocket API.

***

title: WebSocket API
description: Learn how to use and integrate Soniox Speech-to-Text WebSocket API.
keywords: "transcribe over websockets, speech to text websocket api, multilingual speech-to-text websocket api"
---------------------------------------------------------------------------------------------------------------

import { Badge } from "@openapi/ui/components/method-label";

## Overview

The **Soniox WebSocket API** provides real-time **transcription and translation** of
live audio with ultra-low latency. It supports advanced features like **speaker
diarization, context customization,** and **manual finalization** — all over a
persistent WebSocket connection. Ideal for live scenarios such as meetings,
broadcasts, multilingual communication, and voice interfaces.

***

## WebSocket endpoint

Connect to the API using:

```text
wss://stt-rt.soniox.com/transcribe-websocket
```

***

## Configuration

Before streaming audio, configure the transcription session by sending a JSON message such as:

```json
{
  "api_key": "<SONIOX_API_KEY|SONIOX_TEMPORARY_API_KEY>",
  "model": "stt-rt-preview",
  "audio_format": "auto",
  "language_hints": ["en", "es"],
  "context": {
    "general": [
      { "key": "domain", "value": "Healthcare" },
      { "key": "topic", "value": "Diabetes management consultation" },
      { "key": "doctor", "value": "Dr. Martha Smith" },
      { "key": "patient", "value": "Mr. David Miller" },
      { "key": "organization", "value": "St John's Hospital" }
    ],
    "text": "Mr. David Miller visited his healthcare provider last month for a routine follow-up related to diabetes care. The clinician reviewed his recent test results, noted improved glucose levels, and adjusted his medication schedule accordingly. They also discussed meal planning strategies and scheduled the next check-up for early spring.",
    "terms": [
      "Celebrex",
      "Zyrtec",
      "Xanax",
      "Prilosec",
      "Amoxicillin Clavulanate Potassium"
    ],
    "translation_terms": [
      { "source": "Mr. Smith", "target": "Sr. Smith" },
      { "source": "St John's", "target": "St John's" },
      { "source": "stroke", "target": "ictus" }
    ]
  },
  "enable_speaker_diarization": true,
  "enable_language_identification": true,
  "translation": {
    "type": "two_way",
    "language_a": "en",
    "language_b": "es"
  }
}
```

***

### Parameters

<ApiParams>
  <ApiParam name="api_key" type="string" required>
    Your Soniox API key. Create API keys in the [Soniox Console](https://console.soniox.com/). For client apps,
    generate a [temporary API](/stt/api-reference/auth/create_temporary_api_key)
    key from your server to keep secrets secure.
  </ApiParam>

  <ApiParam name="model" type="string" required>
    Real-time model to use. See [models](/stt/models).

    <div className="flex flex-col gap-2">
      <span>Example: `"stt-rt-preview"`</span>
    </div>
  </ApiParam>

  <ApiParam name="audio_format" type="string" required>
    Audio format of the stream. See [audio
    formats](/stt/rt/real-time-transcription#audio-formats).
  </ApiParam>

  <ApiParam name="num_channels" type="number">
    Required for raw audio formats. See [audio
    formats](/stt/rt/real-time-transcription#audio-formats).
  </ApiParam>

  <ApiParam name="sample_rate" type="number">
    Required for raw audio formats. See [audio
    formats](/stt/rt/real-time-transcription#audio-formats).
  </ApiParam>

  <ApiParam name="language_hints" type="array<string>">
    See [language hints](/stt/concepts/language-hints).
  </ApiParam>

  <ApiParam name="context" type="object">
    See [context](/stt/concepts/context).
  </ApiParam>

  <ApiParam name="enable_speaker_diarization" type="boolean">
    See [speaker diarization](/stt/concepts/speaker-diarization).
  </ApiParam>

  <ApiParam name="enable_language_identification" type="boolean">
    See [language identification](/stt/concepts/language-identification).
  </ApiParam>

  <ApiParam name="enable_endpoint_detection" type="boolean">
    See [endpoint detection](/stt/rt/endpoint-detection).
  </ApiParam>

  <ApiParam name="client_reference_id" type="string">
    Optional identifier to track this request (client-defined).
  </ApiParam>

  <ApiParam name="translation" type="object">
    See [real-time translation](/stt/core-concepts/real-time-translation).

    <ApiParams>
      <p style={{marginBottom: 0}}>**One-way translation**</p>

      <ApiParam name="type" type="string" required>
        Must be set to `one_way`.
      </ApiParam>

      <ApiParam name="target_language" type="string" required>
        Language to translate the transcript into.
      </ApiParam>
    </ApiParams>

    <ApiParams>
      <p style={{marginTop: "1em", marginBottom: 0}}>**Two-way translation**</p>

      <ApiParam name="type" type="string" required>
        Must be set to `two_way`.
      </ApiParam>

      <ApiParam name="language_a" type="string" required>
        First language for two-way translation.
      </ApiParam>

      <ApiParam name="language_b" type="string" required>
        Second language for two-way translation.
      </ApiParam>
    </ApiParams>
  </ApiParam>
</ApiParams>

***

## Audio streaming

After configuration, start streaming audio:

* Send audio as binary WebSocket frames.
* Each stream supports up to 300 minutes of audio.

***

## Ending the stream

To gracefully close a streaming session:

* Send an **empty WebSocket frame** (binary or text).
* The server will return one or more responses, including [finished response](#finished-response), and then close the connection.

***

## Response

Soniox returns **responses** in JSON format. A typical successful response looks like:

```json
{
  "tokens": [
    {
      "text": "Hello",
      "start_ms": 600,
      "end_ms": 760,
      "confidence": 0.97,
      "is_final": true,
      "speaker": "1"
    }
  ],
  "final_audio_proc_ms": 760,
  "total_audio_proc_ms": 880
}
```

### Field descriptions

<ApiParams>
  <ApiParam name="tokens" type="array<object>">
    List of processed tokens (words or subwords).

    Each token may include:

    <ApiParams>
      <ApiParam name="text" type="string">
        Token text.
      </ApiParam>

      <ApiParam name="start_ms" type="number" optional>
        Start timestamp of the token (in milliseconds). Not included if `translation_status` is `translation`.
      </ApiParam>

      <ApiParam name="end_ms" type="number" optional>
        End timestamp of the token (in milliseconds). Not included if `translation_status` is `translation`.
      </ApiParam>

      <ApiParam name="confidence" type="number">
        Confidence score (`0.0`–`1.0`).
      </ApiParam>

      <ApiParam name="is_final" type="boolean">
        Whether the token is finalized.
      </ApiParam>

      <ApiParam name="speaker" type="string" optional>
        Speaker label (if diarization enabled).
      </ApiParam>

      <ApiParam name="translation_status" type="string" optional>
        See [real-time translation](/stt/rt/real-time-translation).
      </ApiParam>

      <ApiParam name="language" type="string" optional>
        Language of the `token.text`.
      </ApiParam>

      <ApiParam name="source_language" type="string" optional>
        See [real-time translation](/stt/rt/real-time-translation).
      </ApiParam>
    </ApiParams>
  </ApiParam>

  <ApiParam name="final_audio_proc_ms" type="number">
    Audio processed into final tokens.
  </ApiParam>

  <ApiParam name="total_audio_proc_ms" type="number">
    Audio processed into final + non-final tokens.
  </ApiParam>
</ApiParams>

***

## Finished response

At the end of a stream, Soniox sends a **final message** to indicate the session is complete:

```json
{
  "tokens": [],
  "final_audio_proc_ms": 1560,
  "total_audio_proc_ms": 1680,
  "finished": true
}
```

After this, the server closes the WebSocket connection.

***

## Error response

If an error occurs, the server returns an **error message** and immediately closes the connection:

```json
{
  "tokens": [],
  "error_code": 503,
  "error_message": "Cannot continue request (code N). Please restart the request. ..."
}
```

<ApiParams>
  <ApiParam name="error_code" type="number">
    Standard HTTP status code.
  </ApiParam>

  <ApiParam name="error_message" type="string">
    A description of the error encountered.
  </ApiParam>
</ApiParams>

Full list of possible error codes and messages:

<Accordions className="text-sm">
  <Accordion
    id="400"
    title={
<>
  <Badge color="red">400</Badge>
  Bad request
</>
}
  >
    The request is malformed or contains invalid parameters.

    * `Audio data channels must be specified for PCM formats`
    * `Audio data sample rate must be specified for PCM formats`
    * `Audio decode error`
    * `Audio is too long.`
    * `Client reference ID is too long (max length 256)`
    * `Context is too long (max length 20000).`
    * `Control request invalid type.`
    * `Control request is malformed.`
    * `Invalid audio data format: avi`
    * `Invalid base64.`
    * `Invalid language hint.`
    * `Invalid model specified.`
    * `Invalid translation target language.`
    * `Language hints must be unique.`
    * `Missing audio format. Specify a valid audio format (e.g. s16le, f32le, wav, ogg, flac...) or "auto" for auto format detection.`
    * `Model does not support translations.`
    * `No audio received.`
    * `Prompt too long for model`
    * `Received too much audio data in total.`
    * `Start request is malformed.`
    * `Start request must be a text message.`
  </Accordion>

  <Accordion
    id="401"
    title={
<>
  <Badge color="red">401</Badge>
  Unauthorized
</>
}
  >
    Authentication is missing or incorrect. Ensure a valid API key is provided before retrying.

    * `Invalid API key.`
    * `Invalid/expired temporary API key.`
    * `Missing API key.`
  </Accordion>

  <Accordion
    id="402"
    title={
<>
  <Badge color="red">402</Badge>
  Payment required
</>
}
  >
    The organization's balance or monthly usage limit has been reached.
    Additional credits are required before making further requests.

    * `Organization balance exhausted. Please either add funds manually or enable autopay.`
    * `Organization monthly budget exhausted. Please increase it.`
    * `Project monthly budget exhausted. Please increase it.`
  </Accordion>

  <Accordion
    id="408"
    title={
<>
  <Badge color="red">408</Badge>
  Request timeout
</>
}
  >
    The client did not send a start message or sufficient audio data within the required timeframe.
    The connection was closed due to inactivity.

    * `Audio data decode timeout`
    * `Input too slow`
    * `Request timeout.`
    * `Start request timeout`
    * `Timed out while waiting for the first audio chunk`
  </Accordion>

  <Accordion
    id="429"
    title={
<>
  <Badge color="red">429</Badge>
  Too many requests
</>
}
  >
    A usage or rate limit has been exceeded. You may retry after a delay or request
    an increase in limits via the Soniox Console.

    * `Rate limit for your organization has been exceeded.`
    * `Rate limit for your project has been exceeded.`
    * `Your organization has exceeded max number of concurrent requests.`
    * `Your project has exceeded max number of concurrent requests.`
  </Accordion>

  <Accordion
    id="500"
    title={
<>
  <Badge color="red">500</Badge>
  Internal server error
</>
}
  >
    An unexpected server-side error occurred. The request may be retried.

    * `The server had an error processing your request. Sorry about that! You can retry your request, or contact us through our support email support@soniox.com if you keep seeing this error.`
  </Accordion>

  <Accordion
    id="503"
    title={
<>
  <Badge color="red">503</Badge>
  Service unavailable
</>
}
  >
    Cannot continue request or accept new requests.

    * `Cannot continue request (code N). Please restart the request. Refer to: https://soniox.com/url/cannot-continue-request`
  </Accordion>
</Accordions>

# Soniox Live
URL: /stt/demo-apps/soniox-live

Demo apps showing how to add Soniox to your product

***

title: Soniox Live
description: Demo apps showing how to add Soniox to your product
----------------------------------------------------------------

import Image from "next/image";

## Overview

Soniox Live is a **demo app** that shows how to stream audio from your microphone
directly to the Soniox [Real-time API](/stt/api-reference/websocket-api) for instant transcription and translation.

This is not the [Soniox App](https://soniox.com/soniox-app) (our end-user product). Instead, it is a
**reference implementation** for developers who want to learn how to embed
Soniox into their own web or mobile applications.

<Image src="/docs/demo-apps/soniox-live.png" alt="Web and mobile demo apps screenshot" width={900} height={600} className="rounded-lg" priority />

## Features

* Stream audio from your mic to Soniox in real time
* Low-latency, high-accuracy transcription in 60+ languages
* Low-latency speech translation to 60+ languages
* Runs in the browser (React) and mobile (React Native)
* Lightweight server issues temporary client keys for secure access

## Usage flow

1. Tap **Start** to begin streaming from your mic
2. **Live captions** appear word by word, then finalize
3. Toggle **Translation** and choose a target language for live translated captions
4. Tap **Stop** to end the session

## Architecture

* **Server (Python):** Stores your secret Soniox API key and issues **temporary API keys** to clients
* **Frontend (React & React Native):** Requests a temporary API key from your server,
  then streams microphone audio directly to Soniox servers for real-time transcription and translation

We provide all the implementations with links to GitHub:

* [Python server](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/apps/soniox-live-demo/server)
* [React frontend](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/apps/soniox-live-demo/react) (web)
* [React Native frontend](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/apps/soniox-live-demo/react-native) (mobile)

# Direct stream
URL: /stt/guides/direct-stream

Stream directly from microphone to Soniox Speech-to-Text WebSocket API to minimize latency.

***

title: Direct stream
description: Stream directly from microphone to Soniox Speech-to-Text WebSocket API to minimize latency.
keywords: "speech to text stream, soniox direct stream, minimize transcription latency"
---------------------------------------------------------------------------------------

import Image from "next/image";

## Overview

This guide walks you through capturing and transcribing microphone audio in real
time using the Soniox [WebSocket API](/stt/api-reference/websocket-api) — optimized for the lowest possible latency.

The direct stream approach enables the browser to send audio directly to the Soniox WebSocket API
over a WebSocket connection, eliminating the need for any intermediary server.
This results in faster transcription and a simpler architecture.

Soniox's [Web Library](/stt/SDKs/web-library) handles everything client-side — capturing microphone input,
managing the WebSocket connection, and authenticating using temporary API keys.

Use this setup when you want real-time speech-to-text performance directly in the browser **with minimal delay**.

<Image src="/docs/soniox_stt_direct.svg" alt="Soniox Speech-to-Text direct stream flowchart" width={764} height={283} className="mb-6" priority />

***

## Temporary API keys

[Temporary API keys](/stt/api-reference/auth/create_temporary_api_key)
(obtained from [REST API](/stt/api-reference/auth/create_temporary_api_key))
are required solely to establish the WebSocket connection. Once the connection is established,
it will be kept alive as long it remains active. The `expires_in_seconds` configuration parameter
should be set to a short duration.

Following parameters are required to create a temporary API key:

```json
{
  "usage_type": "transcribe_websocket",
  "expires_in_seconds": 60
}
```

<Callout type="warn">
  API request limits apply when creating temporary API keys. See **Limits** section
  in the [Soniox Console](https://console.soniox.com).
</Callout>

***

## Example

This is an example of a browser-based transcription, but same principle applies to any other type of
client - you minimize latency by connecting the client directly to the WebSocket API using a temporary API key.

First we create a simple HTTP server that on request:

1. Renders the `index.html` template.
2. Exposes an endpoint to serve the temporary API key (`/temporary-api-key`).

<Tabs items={["Python", "Node.js"]}>
  <Tab>
    Python server using [FastAPI](https://fastapi.tiangolo.com/):

    <FileCodeBlock path="./content/stt/guides/_examples/direct-stream/server.py" lang="python">
      ```
      import os

      import requests
      import uvicorn
      from dotenv import load_dotenv
      from fastapi import FastAPI, Request
      from fastapi.responses import HTMLResponse, JSONResponse
      from fastapi.templating import Jinja2Templates

      load_dotenv()

      templates = Jinja2Templates(directory="templates")

      app = FastAPI()


      @app.get("/", response_class=HTMLResponse)
      async def get_index(request: Request):
          return templates.TemplateResponse(
              request=request,
              name="index.html",
          )


      @app.get("/temporary-api-key", response_class=JSONResponse)
      async def get_temporary_api_key():
          try:
              response = requests.post(
                  "https://api.soniox.com/v1/auth/temporary-api-key",
                  headers={
                      "Authorization": f"Bearer {os.getenv('SONIOX_API_KEY')}",
                      "Content-Type": "application/json",
                  },
                  json={
                      "usage_type": "transcribe_websocket",
                      "expires_in_seconds": 60,
                  },
              )

              if not response.ok:
                  raise Exception(f"Error: {response.json()}")

              temporaryApiKeyData = response.json()
              return temporaryApiKeyData
          except Exception as error:
              print(error)
              return JSONResponse(
                  status_code=500,
                  content={"error": f"Server failed to obtain temporary api key: {error}"},
              )


      if __name__ == "__main__":
          port = int(os.getenv("PORT", 3001))
          uvicorn.run(app, host="0.0.0.0", port=port)

      ```
    </FileCodeBlock>

    <small className="sample-link">[View example on GitHub](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/python/real_time/browser_direct_stream)</small>
  </Tab>

  <Tab>
    Node.js server using [Express](https://expressjs.com/):

    <FileCodeBlock path="./content/stt/guides/_examples/direct-stream/server.js" lang="javascript">
      ```
      require("dotenv").config();

      const http = require("http");
      const express = require("express");
      const fetch = require("node-fetch");
      const path = require("path");
      const fs = require("fs").promises;

      const app = express();

      app.use("/templates", express.static(path.join(__dirname, "templates")));

      app.get("/", async (req, res) => {
        const index = await fs.readFile(
          path.join(__dirname, "templates/index.html"),
          "utf8"
        );
        res.send(index);
      });

      app.get("/temporary-api-key", async (req, res) => {
        try {
          const response = await fetch(
            "https://api.soniox.com/v1/auth/temporary-api-key",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                usage_type: "transcribe_websocket",
                expires_in_seconds: 60,
              }),
            }
          );

          if (!response.ok) {
            throw await response.json();
          }

          const temporaryApiKeyData = await response.json();

          res.json(temporaryApiKeyData);
        } catch (error) {
          console.error(error);

          res.status(500).json({
            error: `Server failed to obtain temporary api key: ${JSON.stringify(error)}`,
          });
        }
      });

      // Create HTTP server with Express
      const server = http.createServer(app);

      server.listen(process.env.PORT, () => {
        console.log(
          `HTTP server listening on http://0.0.0.0:${process.env.PORT}`
        );
      });

      ```
    </FileCodeBlock>

    <small className="sample-link">[View example on GitHub](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/nodejs/real_time/browser_direct_stream/server.js)</small>
  </Tab>
</Tabs>

Our HTML client template contains a single "Start" button, that when clicked:

1. Requests microphone permissions.
2. Calls the `/temporary-api-key` endpoint to obtain a temporary API key.
3. Creates a new [`RecordTranscribe`](/stt/SDKs/web-library) class instance passing temporary api key as `apiKey` parameter.
4. Connects to the [WebSocket API](/stt/api-reference/websocket-api).
5. Starts transcribing from microphone input and renders transcribed text into a `div` in real-time.

<Tabs items={["HTML"]}>
  <Tab>
    <FileCodeBlock path="./content/stt/guides/_examples/direct-stream/index.html" lang="html">
      ```
      <!DOCTYPE html>
      <html>

      <body>
        <h1>Browser direct stream example</h1>
        <button id="trigger">Start</button>
        <hr />
        <div>
          <span id="final"></span>
          <span id="nonfinal" style="color: gray"></span>
        </div>
        <div id="error"></div>
        <script type="module">
          // import Soniox STT Web Library
          import { RecordTranscribe } from "https://unpkg.com/@soniox/speech-to-text-web?module";

          const finalEl = document.getElementById("final");
          const nonFinalEl = document.getElementById("nonfinal");
          const errorEl = document.getElementById("error");
          const trigger = document.getElementById("trigger");

          let recordTranscribe;
          let recordTranscribeState = "stopped"; // "stopped" | "starting" | "running" | "stopping"

          async function getTemporaryApiKey() {
            const response = await fetch('/temporary-api-key');
            return await response.json();
          }

          trigger.onclick = async () => {
            if (recordTranscribeState === "stopped") {
              finalEl.textContent = "";
              nonFinalEl.textContent = "";
              errorEl.textContent = "";
              trigger.textContent = "Starting...";
              recordTranscribeState = "starting";

              // obtain a temporary api key from our server
              const response = await getTemporaryApiKey();
              const temporaryApiKey = response.api_key;

              if (!temporaryApiKey) {
                errorEl.textContent += response.error || "Error fetching temp api key.";
                resetTrigger();
                return;
              }

              // create new instance of RecordTranscribe class and authenticate with temp API key
              recordTranscribe = new RecordTranscribe({
                apiKey: temporaryApiKey
              });

              let finalText = "";

              // start transcribing and bind callbacks
              recordTranscribe.start({
                model: "stt-rt-preview-v2",
                languageHints: ["en"],
                onStarted: () => {
                  // library connected to Soniox STT WebSocket API and is transcribing
                  recordTranscribeState = "running";
                  trigger.textContent = "Stop";
                },
                onPartialResult: (result) => {
                  // render the transcript
                  let nonFinalText = "";

                  for (let token of result.tokens) {
                    if (token.is_final) {
                      finalText += token.text;
                    } else {
                      nonFinalText += token.text;
                    }
                  }

                  finalEl.textContent = finalText;
                  nonFinalEl.textContent = nonFinalText;
                },
                onFinished: () => {
                  // transcription finished, we go back to initial state
                  resetTrigger();
                },
                onError: (status, message) => {
                  console.log("Error occurred", status, message);
                  errorEl.textContent = message;
                  resetTrigger();
                },
              });
            } else if (recordTranscribeState === "running") {
              // stop transcribing and wait for final result and connections to close
              trigger.textContent = "Stopping...";
              recordTranscribeState = "stopping";
              recordTranscribe.stop();
            }
          };

          function resetTrigger() {
            trigger.textContent = "Start";
            recordTranscribeState = "stopped";
          }
        </script>
      </body>

      </html>
      ```
    </FileCodeBlock>

    <small className="sample-link">[View example on GitHub](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/python/real_time/browser_direct_stream)</small>
  </Tab>
</Tabs>

# Proxy stream
URL: /stt/guides/proxy-stream

How to stream audio from a client app to Soniox Speech-to-Text WebSocket API through a proxy server.

***

title: Proxy stream
description: How to stream audio from a client app to Soniox Speech-to-Text WebSocket API through a proxy server.
keywords: "stream voice audio through proxy server, soniox proxy stream"
------------------------------------------------------------------------

import Image from "next/image";

## Overview

This guide explains how to stream microphone audio from a client to the Soniox
[WebSocket API](/stt/api-reference/websocket-api) through a proxy server.

In this architecture, the client captures audio and sends it over WebSocket to a proxy server. The proxy
server establishes a connection to the Soniox WebSocket API, authenticates the session, streams the
audio for transcription, and relays the transcribed results back to the client in real time.

This setup is useful when you want to **inspect, transform, or store audio and transcription
data on the server side** before passing it to the client. If your goal is simply to transcribe
audio and return results with the lowest possible latency, consider using the
[direct stream](/stt/guides/direct-stream) approach instead.

<Image src="/docs/soniox_stt_with_proxy.svg" alt="Soniox STT stream with proxy flowchart" width={764} height={283} className="mb-6" priority />

## Example

In the following example, we create a proxy HTTP server that:

1. Listens for incoming WebSocket connections from the client.
2. Forwards audio data from the client to the [WebSocket API](/stt/api-reference/websocket-api).
3. Relays transcription results back to the client.

Authentication with the [WebSocket API](/stt/api-reference/websocket-api) is handled by the proxy server using the `SONIOX_API_KEY`.

<Tabs items={["Python", "Node.js"]}>
  <Tab>
    Python server that will act as a proxy between our client and [WebSocket API](/stt/api-reference/websocket-api).

    <FileCodeBlock path="./content/stt/guides/_examples/proxy-stream/server.py" lang="python">
      ```
      import os
      import json
      import asyncio

      from dotenv import load_dotenv
      import websockets

      load_dotenv()


      async def handle_client(websocket):
          print("Browser client connected")

          # create a message queue to store client messages received before
          # Soniox WebSocket API connection is ready, so we don't loose any
          message_queue = []
          soniox_ws = None
          soniox_ws_ready = False

          async def init_soniox_connection():
              nonlocal soniox_ws, soniox_ws_ready

              try:
                  soniox_ws = await websockets.connect(
                      "wss://stt-rt.soniox.com/transcribe-websocket"
                  )
                  print("Connected to Soniox STT WebSocket API")

                  # Send initial configuration message
                  start_message = json.dumps(
                      {
                          "api_key": os.getenv("SONIOX_API_KEY"),
                          "audio_format": "auto",
                          "model": "stt-rt-preview-v2",
                          "language_hints": ["en"],
                      }
                  )
                  await soniox_ws.send(start_message)
                  print("Sent start message to Soniox")

                  # mark connection as ready
                  soniox_ws_ready = True

                  # process any queued messages
                  while len(message_queue) > 0 and soniox_ws_ready:
                      data = message_queue.pop(0)
                      await forward_data(data)

                  # receive messages from Soniox STT WebSocket API
                  async for message in soniox_ws:
                      try:
                          await websocket.send(message)
                      except Exception as e:
                          print(f"Error forwarding Soniox response: {e}")
                          break

              except Exception as e:
                  print(f"Soniox WebSocket error: {e}")
                  soniox_ws_ready = False
              finally:
                  if soniox_ws:
                      await soniox_ws.close()
                  soniox_ws_ready = False
                  print("Soniox WebSocket closed")

          async def forward_data(data):
              try:
                  if soniox_ws:
                      await soniox_ws.send(data)
              except Exception as e:
                  print(f"Error forwarding data to Soniox: {e}")

          # initialize Soniox connection
          soniox_task = asyncio.create_task(init_soniox_connection())

          try:
              # receive messages from browser client
              async for data in websocket:
                  if soniox_ws_ready:
                      # forward messages instantly
                      await forward_data(data)
                  else:
                      # queue the message to be processed
                      # as soon as connection to Soniox STT WebSocket API is ready
                      message_queue.append(data)
          except Exception as e:
              print(f"Error with browser client: {e}")
          finally:
              print("Browser client disconnected")
              soniox_task.cancel()
              try:
                  await soniox_task
              except asyncio.CancelledError:
                  pass


      async def main():
          port = int(os.getenv("PORT", 3001))
          server = await websockets.serve(handle_client, "0.0.0.0", port)
          print(f"WebSocket proxy server listening on http://0.0.0.0:{port}")

          await server.wait_closed()


      if __name__ == "__main__":
          asyncio.run(main())

      ```
    </FileCodeBlock>

    <small className="sample-link">[View example on GitHub](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/python/real_time/browser_proxy_stream)</small>
  </Tab>

  <Tab>
    Node.js server that will act as a proxy between our client and [WebSocket API](/stt/api-reference/websocket-api).

    <FileCodeBlock path="./content/stt/guides/_examples/proxy-stream/server.js" lang="javascript">
      ```
      require("dotenv").config();

      const WebSocket = require("ws");
      const http = require("http");

      const server = http.createServer();
      const wss = new WebSocket.Server({ server });

      wss.on("connection", (ws) => {
        console.log("Browser client connected");

        // create a message queue to store client messages received before
        // Soniox WebSocket API connection is ready, so we don't loose any
        const messageQueue = [];

        let sonioxWs = null;
        let sonioxWsReady = false;

        function initSonioxConnection() {
          sonioxWs = new WebSocket("wss://stt-rt.soniox.com/transcribe-websocket");

          sonioxWs.on("open", () => {
            console.log("Connected to Soniox STT WebSocket API");

            // send initial configuration message
            const startMessage = JSON.stringify({
              api_key: process.env.SONIOX_API_KEY,
              audio_format: "auto",
              model: "stt-rt-preview-v2",
              language_hints: ["en"],
            });
            sonioxWs.send(startMessage);
            console.log("Sent start message to Soniox");

            // mark connection as ready
            sonioxWsReady = true;

            // process any queued messages
            while (messageQueue.length > 0 && sonioxWsReady) {
              const data = messageQueue.shift();
              forwardData(data);
            }
          });

          // receive messages from Soniox STT WebSocket API
          sonioxWs.on("message", (data) => {
            // note:
            // at this point we could manipulate and enhance the transcribed data
            try {
              ws.send(data.toString());
            } catch (err) {
              console.error("Error forwarding Soniox response:", err);
            }
          });

          sonioxWs.on("error", (error) => {
            console.log("Soniox WebSocket error:", error);
            sonioxWsReady = false;
          });

          sonioxWs.on("close", (code, reason) => {
            console.log("Soniox WebSocket closed:", code, reason);
            sonioxWsReady = false;
            ws.close();
          });
        }

        // forward message data to Soniox STT WebSocket API
        function forwardData(data) {
          try {
            sonioxWs.send(data);
          } catch (err) {
            console.error("Error forwarding data to Soniox:", err);
          }
        }

        // initialize Soniox connection
        initSonioxConnection();

        // receive messages from browser client
        ws.on("message", (data) => {
          if (sonioxWsReady) {
            // forward messages instantly
            forwardData(data);
          } else {
            // queue the message to be processed
            // as soon as connection to Soniox STT WebSocket API is ready
            messageQueue.push(data);
          }
        });

        ws.on("close", () => {
          console.log("Browser client disconnected");
          if (sonioxWs) {
            try {
              sonioxWs.close();
            } catch (err) {
              console.error("Error closing Soniox connection:", err);
            }
          }
        });
      });

      server.listen(process.env.PORT, () => {
        console.log(
          `WebSocket proxy server listening on http://0.0.0.0:${process.env.PORT}`
        );
      });

      ```
    </FileCodeBlock>

    <small className="sample-link">[View example on GitHub](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/nodejs/real_time/browser_proxy_stream)</small>
  </Tab>
</Tabs>

Next, we create a basic HTML page as the client (same concept works for any other app framework).

The HTML client:

1. Connects to the proxy server via WebSocket.
2. Captures audio stream from the microphone through the [`MediaRecorder`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder).
3. Streams audio data to the proxy server.
4. Receives messages from the proxy server and renders transcribed text into a `div`.

<Tabs items={["HTML"]}>
  <Tab>
    <FileCodeBlock path="./content/stt/guides/_examples/proxy-stream/index.html" lang="html">
      ```
      <!DOCTYPE html>
      <html>

      <body>
        <h1>Browser proxy stream example</h1>
        <button id="trigger">Start</button>
        <hr />
        <div>
          <span id="final"></span>
          <span id="nonfinal" style="color: gray"></span>
        </div>
        <div id="error"></div>
        <script>
          const finalEl = document.getElementById("final");
          const nonFinalEl = document.getElementById("nonfinal");
          const errorEl = document.getElementById("error");
          const trigger = document.getElementById("trigger");

          let ws;
          let recorder;
          let recorderState = "stopped"; // "stopped" | "starting" | "running" | "stopping"

          trigger.onclick = async () => {
            if (recorderState === "stopped") {
              finalEl.textContent = "";
              nonFinalEl.textContent = "";
              errorEl.textContent = "";
              trigger.textContent = "Starting...";
              recorderState = "starting";

              // get audio stream from user microphone
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

              // connect to the proxy server
              ws = new WebSocket("ws://localhost:3001/");

              ws.onopen = () => {
                recorder = new MediaRecorder(stream);

                recorder.ondataavailable = async (event) => {
                  if (event.data.size > 0) {
                    // convert the recorded audio chunk (Blob) to raw binary (ArrayBuffer)
                    // and send via websocket message
                    ws.send(await event.data.arrayBuffer());
                  }
                };

                recorder.onstop = () => {
                  // send empty string message to tell the Soniox WebSocket API to stop
                  ws.send("");
                };

                // start recording, creating data chunks every 120ms
                recorder.start(120);

                recorderState = "running";
                trigger.textContent = "Stop";
              };

              let finalText = "";

              ws.onmessage = (event) => {
                // parse messages received from Node.js server
                const result = JSON.parse(event.data);

                if (result.error_message) {
                  errorEl.textContent = `${result.error_message}`;
                  return;
                }

                // render the transcript
                let nonFinalText = "";

                for (let token of result.tokens) {
                  if (token.is_final) {
                    finalText += token.text;
                  } else {
                    nonFinalText += token.text;
                  }
                }

                finalEl.textContent = finalText;
                nonFinalEl.textContent = nonFinalText;
              };

              ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                errorEl.textContent = `${message}`;
                stopRecording();
              };

              ws.onclose = (event) => {
                console.log("WebSocket connection closed", event.code);
                stopRecording();
              };
            } else if (recorderState === "running") {
              stopRecording();
            }
          };

          function stopRecording() {
            if (recorder) {
              // stop microphone recording properly
              recorder.stop();
              recorder.stream.getTracks().forEach((t) => t.stop());
            }
            trigger.textContent = "Start";
            recorderState = "stopped";
          }
        </script>
      </body>

      </html>
      ```
    </FileCodeBlock>

    <small className="sample-link">[View example on GitHub](https://github.com/soniox/soniox_examples/tree/master/speech_to_text/python/real_time/browser_proxy_stream)</small>
  </Tab>
</Tabs>

# Web SDK
URL: /stt/SDKs/web-sdk

Soniox speech-to-text-web is the official JavaScript/TypeScript SDK for using the Soniox Real-Time API directly in the browser.

***

title: Web SDK
description: Soniox speech-to-text-web is the official JavaScript/TypeScript SDK for using the Soniox Real-Time API directly in the browser.
keywords: "soniox web library, speech to text web lib, speech to text javascript, soniox sdk"
---------------------------------------------------------------------------------------------

import { LinkCards } from "@/components/link-card";

## Overview

Soniox [speech-to-text-web](https://github.com/soniox/speech-to-text-web) is the official JavaScript/TypeScript SDK for using the Soniox [Real-time API](/stt/api-reference/websocket-api) directly in the browser.
It lets you:

* Capture audio from the user's microphone
* Stream audio to Soniox in real time
* Receive transcription and translation results instantly

Enable advanced features such as [language identification](/stt/concepts/language-identification), [speaker diarization](/stt/concepts/speaker-diarization), [context](/stt/concepts/context), [endpoint detection](/stt/rt/endpoint-detection), and more.

👉 Use cases: live captions, multilingual meetings, dictation tools, accessibility overlays, customer support dashboards, education apps.

***

## Installation

Install via your preferred package manager:

<Tabs items={['npm', 'yarn', 'pnpm']}>
  <Tab>
    ```bash tab
    npm install @soniox/speech-to-text-web
    ```
  </Tab>

  <Tab>
    ```bash tab
    yarn add @soniox/speech-to-text-web
    ```
  </Tab>

  <Tab>
    ```bash tab
    pnpm add @soniox/speech-to-text-web
    ```
  </Tab>
</Tabs>

Or use the module directly from a CDN:

```html
<script type="module">
  import { SonioxClient } from 'https://unpkg.com/@soniox/speech-to-text-web?module';

  var sonioxClient = new SonioxClient({ ... })
  
  ...
</script>
```

***

## Quickstart

Use `SonioxClient` to start session:

```ts
const sonioxClient = new SonioxClient({
  // Your Soniox API key or temporary API key.
  apiKey: '<SONIOX_API_KEY>',
});

sonioxClient.start({
  // Select the model to use.
  model: 'stt-rt-preview',

  // Set language hints when possible to significantly improve accuracy.
  languageHints: ['en', 'es'],

  // Context is a string that can include words, phrases, or sentences to improve the
  // recognition of rare or specific terms.
  context: 'Celebrex, Zyrtec, Xanax, Prilosec, Amoxicillin',

  // Enable speaker diarization. Each token will include a "speaker" field.
  enableSpeakerDiarization: true,

  // Enable language identification. Each token will include a "language" field.
  enableLanguageIdentification: true,

  // Use endpoint detection to detect when a speaker has finished talking.
  // It finalizes all non-final tokens right away, minimizing latency.
  enableEndpointDetection: true,

  // Callbacks when the transcription starts, finishes, or encounters an error.
  onError: (status, message) => {
    console.error(status, message);
  },
  // Callback when the transcription returns partial results (tokens).
  onPartialResult(result) {
    console.log('partial result', result.tokens);
  },
});
```

The `SonioxClient` object processes audio from the user's microphone or a custom audio stream. It returns results by invoking the `onPartialResult` callback with transcription and translation data, depending on the configuration.

Stop or cancel transcription:

```ts
sonioxClient.stop();
// or
sonioxClient.cancel();
```

### Translation

To enable [real-time translation](/stt/rt/real-time-translation), you can add a `TranslationConfig` object to the parameters of the `start` method.

```ts
// One-way translation: translate all spoken languages into a single target language.
translation: {
  type: 'one_way',
  target_language: 'en',
}

// Two-way translation: translate back and forth between two specified languages.
translation: {
  type: 'two_way',
  language_a: 'en',
  language_b: 'es',
}
```

### `stop()` vs `cancel()`

The key difference is that `stop()` gracefully waits for the server to process all buffered audio and send back final results. In contrast, `cancel()` terminates the session immediately without waiting.

For example, when a user clicks a "Stop Recording" button, you should call `stop()`. If you need to discard the session immediately (e.g., when a component unmounts in a web framework), call `cancel()`.

### Buffering and temporary API keys

If you want to avoid exposing your API key to the client, you can use temporary API keys. To generate a temporary API key, you can use [temporary API key endpoint](/stt/api-reference/auth/create_temporary_api_key) in the Soniox API.

If you want to fetch a temporary API key only when recording starts, you can pass a function to the `apiKey` option. The function will be called when the recording starts and should return the API key.

```ts
const sonioxClient = new SonioxClient({
  apiKey: async () => {
    // Call your backend to generate a temporary API key there.
    const response = await fetch('/api/get-temporary-api-key', {
      method: 'POST',
    });
    const { apiKey } = await response.json();
    return apiKey;
  },
});
```

Until this function resolves and returns an API key, audio data is buffered in memory. When the temporary API key is fetched, the buffered audio data will be sent to the server and the processing will start.

For a full example with temporary API key generation, check the [NextJS Example](https://github.com/soniox/speech-to-text-web/tree/master/examples/nextjs).

### Custom audio streams

To transcribe audio from a custom source, you can pass a custom `MediaStream` to the `stream` option.

If you provide a custom `MediaStream` to the `stream` option, you are responsible for managing its lifecycle, including starting and stopping the stream. For instance, when using an HTML5 `<audio>` element (as shown below), you may want to pause playback when transcription is complete or an error occurs.

```ts
// Create a new audio element
const audioElement = new Audio();
audioElement.volume = 1;
audioElement.crossOrigin = 'anonymous';
audioElement.src = 'https://soniox.com/media/examples/coffee_shop.mp3';

// Create a media stream from the audio element
const audioContext = new AudioContext();
const source = audioContext.createMediaElementSource(audioElement);
const destination = audioContext.createMediaStreamDestination();
source.connect(destination); // Connect to media stream
source.connect(audioContext.destination); // Connect to playback

// Start transcription
sonioxClient.start({
  model: 'stt-rt-preview',
  stream: destination.stream,

  onFinished: () => {
    audioElement.pause();
  },
  onError: (status, message) => {
    audioElement.pause();
  },
});

// Play the audio element to activate the stream
audioElement.play();
```

***

## Examples

<LinkCards
  cols={3}
  links={[
  {
    title: "Minimal JavaScript example",
    href: "https://github.com/soniox/speech-to-text-web/tree/master/examples/javascript",
    description: "Simple transcription example in vanilla JavaScript.",
  },
  {
    title: "Next.js example",
    href: "https://github.com/soniox/speech-to-text-web/tree/master/examples/nextjs",
    description: "Transcription and translation example with temporary API key generation.",
  },
  {
    title: "Complete React example",
    href: "https://github.com/soniox/soniox_examples/tree/master/speech_to_text/apps/react",
    description: "A complete example rendering speaker tags, detected languages, and translations.",
  },
]}
/>

***

## API Reference

### `SonioxClient`

#### `constructor(options)`

Creates a new `SonioxClient` instance.

```ts
new SonioxClient({
  // Your Soniox API key or temporary API key.
  apiKey: SONIOX_API_KEY,

  // Maximum number of audio chunks to buffer in memory before the
  // WebSocket connection is established.
  bufferQueueSize: 1000,

  // Callbacks on state changes, partial results and errors.
  onStarted: () => {
    console.log('transcription started');
  },
  onFinished: () => {
    console.log('transcription finished');
  },
  onPartialResult: (result) => {
    console.log('partial result', result.tokens);
  },
  onStateChange: ({ newState, oldState }) => {
    console.log('state changed from', oldState, 'to', newState);
  },
  onError: (status, message) => {
    console.error(status, message);
  },
});
```

Parameters:

<ApiParams>
  <ApiParam name="apiKey" type="string | function" required>
    Soniox API key or an async function that returns the API key (see [Buffering and temporary API keys](#buffering-and-temporary-api-keys)).
  </ApiParam>

  <ApiParam name="bufferQueueSize" type="number">
    Maximum number of audio chunks to buffer in memory before the WebSocket connection is established. If this limit is exceeded, an error will be thrown.
  </ApiParam>

  <ApiParam name="onStarted" type="function">
    Called when the transcription starts. This happens after the API key is fetched and WebSocket connection is established.
  </ApiParam>

  <ApiParam name="onFinished" type="function">
    Called when the transcription finishes successfully. After calling `stop()`, you should wait for this callback to ensure all final results have been received.
  </ApiParam>

  <ApiParam name="onPartialResult" type="function">
    Called when the transcription returns partial results. The result contains a list recognized `tokens`. To learn more about the `tokens` structure, see [Speech-to-Text Websocket API reference](/stt/api-reference/websocket-api#response).
  </ApiParam>

  <ApiParam name="onStateChange" type="function">
    Called when the state of the transcription changes. Useful for rerendering the UI based on the state.
  </ApiParam>

  <ApiParam name="onError" type="function">
    Called when the transcription encounters an error. Possible error statuses are:

    * `get_user_media_failed`: If the user denies the permission to use the microphone or the browser does not support audio recording.
    * `api_key_fetch_failed`: In case you passed a function to `apiKey` option and the function throws an error.
    * `queue_limit_exceeded`: While waiting for the temporary API key to be fetched, the local queue is full. You can increase the queue size by setting `bufferQueueSize` option.
    * `media_recorder_error`: An error occurred while recording the audio.
    * `api_error`: Error returned by the Soniox API. In this case, the `errorCode` property contains the HTTP status code equivalent to the error. For a list of possible error codes, see [Speech-to-Text Websocket API reference](/stt/api-reference/websocket-api#response).
    * `websocket_error`: WebSocket error.
  </ApiParam>
</ApiParams>

#### `start(audioOptions)`

Starts transcription or translation.

```ts
sonioxClient.start({
  // Soniox Real-Time API parameters

  // Real-time model to use. See models: https://soniox.com/docs/stt/models
  model: 'stt-rt-preview',

  // Audio format to use and related fields.
  // See audio formats: https://soniox.com/docs/stt/rt/real-time-transcription#audio-formats
  audioFormat: 's16le',
  numChannels: 1,
  sampleRate: 16000,


  languageHints: ['en', 'es'],
  context: 'Celebrex, Zyrtec, Xanax, Prilosec, Amoxicillin',
  enableSpeakerDiarization: true,
  enableLanguageIdentification: true,
  enableEndpointDetection: true,
  clientReferenceId: '123',
  translation: {
    type: 'one_way',
    target_language: 'en',
  },

  // All callbacks from the SonioxClient constructor can also be provided here.
  onPartialResult: (result) => {
    console.log('partial result', result.tokens);
  },
  ...

  // Audio stream configuration
  stream: customAudioStream,
  audioConstraints: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
    sampleRate: 44100,
  },
  mediaRecorderOptions: {},
});
```

All callbacks which can be passed to `SonioxClient` constructor are also available in `start` method. In addition, the following parameters are available:

<ApiParams>
  <ApiParam name="model" type="string" required>
    Real-time model to use. See [models](/stt/models).
  </ApiParam>

  <ApiParam name="audioFormat" type="string">
    Audio format to use. Using `auto` should be sufficient for microphone streams in all modern browsers.
    If using custom audio streams, see [audio formats](/stt/rt/real-time-transcription#audio-formats).
  </ApiParam>

  <ApiParam name="numChannels" type="number">
    Required for raw audio formats. See [audio formats](/stt/rt/real-time-transcription#audio-formats).
  </ApiParam>

  <ApiParam name="sampleRate" type="number">
    Required for raw audio formats. See [audio formats](/stt/rt/real-time-transcription#audio-formats).
  </ApiParam>

  <ApiParam name="languageHints" type="array<string>">
    See [language hints](/stt/concepts/language-hints).
  </ApiParam>

  <ApiParam name="context" type="string">
    See [context](/stt/concepts/context).
  </ApiParam>

  <ApiParam name="enableSpeakerDiarization" type="boolean">
    See [speaker diarization](/stt/concepts/speaker-diarization).
  </ApiParam>

  <ApiParam name="enableLanguageIdentification" type="boolean">
    See [language identification](/stt/concepts/language-identification).
  </ApiParam>

  <ApiParam name="enableEndpointDetection" type="boolean">
    See [endpoint detection](/stt/rt/endpoint-detection).
  </ApiParam>

  <ApiParam name="clientReferenceId" type="string">
    Optional identifier to track this request (client-defined).
  </ApiParam>

  <ApiParam name="translation" type="object">
    Translation configuration. See [real-time translation](/stt/rt/real-time-translation)

    <ApiParams>
      <p style={{marginBottom: 0}}>**One-way translation**</p>

      <ApiParam name="type" type="string" required>
        Must be set to `one_way`.
      </ApiParam>

      <ApiParam name="target_language" type="string" required>
        Language to translate the transcript into.
      </ApiParam>
    </ApiParams>

    <ApiParams>
      <p style={{marginTop: "1em", marginBottom: 0}}>**Two-way translation**</p>

      <ApiParam name="type" type="string" required>
        Must be set to `two_way`.
      </ApiParam>

      <ApiParam name="language_a" type="string" required>
        First language for two-way translation.
      </ApiParam>

      <ApiParam name="language_b" type="string" required>
        Second language for two-way translation.
      </ApiParam>
    </ApiParams>
  </ApiParam>

  <ApiParam name="stream" type="MediaStream">
    If you don't want to transcribe audio from microphone, you can pass a `MediaStream` to the stream option. This can be useful if you want to transcribe audio from a file or a custom source.
  </ApiParam>

  <ApiParam name="audioConstraints" type="object">
    Can be used to set the properties, such as `echoCancellation` and `noiseSuppression` properties of the `MediaTrackConstraints` object. See [MDN docs for MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
  </ApiParam>

  <ApiParam name="mediaRecorderOptions" type="object">
    MediaRecorder options. See [MDN docs for MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder).
  </ApiParam>
</ApiParams>

#### `stop()`

Gracefully stops transcription, waiting for the server to process all audio and return final results. For a detailed comparison, see the [stop() vs cancel()](#stop-vs-cancel) section.

#### `cancel()`

Immediately terminates the transcription and closes all resources without waiting for final results. For a detailed comparison, see the [stop() vs cancel()](#stop-vs-cancel) section.

#### `finalize()`

Trigger manual finalization. See [manual finalization](/stt/rt/manual-finalization).

# LiveKit
URL: /stt/integrations/livekit

How to use Soniox Speech-to-Text AI with LiveKit

***

title: LiveKit
description: How to use Soniox Speech-to-Text AI with LiveKit
-------------------------------------------------------------

import Image from "next/image";
import { LinkCards } from "@/components/link-card";

<div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-[#DCE7F8] to-[#F2F6FC] py-16">
  <Image src="/docs/integrations/livekit.svg" alt="Soniox x LiveKit" width={520} height={100} className="mb-6" priority />
</div>

## Overview

Soniox Speech-to-Text AI turns audio into highly accurate text in real time. Paired with LiveKit, you can create powerful, responsive voice agents.

Use Soniox in your LiveKit agents to:

* Transcribe live audio from voice or video sessions in real time
* Build custom voice agents powered by Soniox
* Deploy voice-driven experiences at enterprise scale

All at lightning speed.

***

## Getting started

To use Soniox with LiveKit, you'll need LiveKit [user account](https://cloud.livekit.io/).

***

## Installation

Soniox provides Speech-to-Text through a [WebSocket API](/stt/api-reference/websocket-api), which is integrated into the official [LiveKit Python plugin](https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-soniox).

Install LiveKit Agents library from PyPI:

```bash
pip install livekit-plugins-soniox
```

### Get Soniox API key

The Soniox plugin requires an API key to authenticate. You can find your API key in the [Soniox Console](https://console.soniox.com/).
Set Soniox API key in your `.env` file:

```bash
SONIOX_API_KEY=<your_soniox_api_key>
```

***

## Usage

Use Soniox STT in an `AgentSession` or as a standalone transcription service:

```python
from livekit.plugins import soniox

session = AgentSession(
    stt = soniox.STT(),
    # ... llm, tts, etc.
)
```

Congratulations! You are now ready to use Soniox STT in your LiveKit agents.

***

## Advanced usage

### Language hints

There's no need to specify a language in advance — the model automatically detects and transcribes any supported language. It also handles multilingual audio effortlessly, even when multiple languages appear within the same sentence or conversation.

If you already know which languages are likely to be spoken, you can provide language hints to help the model prioritize those languages and improve accuracy:

```python
from livekit.plugins import soniox

options = soniox.STTOptions(
    language_hints=["en", "es"],
)

session = AgentSession(
    stt = soniox.STT(params=options),
)
```

See [list of supported languages](/stt/concepts/supported-languages) for a list of supported languages.

You can learn more about language hints [here](/stt/concepts/language-hints).

### Customization with context

By providing context, you help the AI model better understand and anticipate the language in your audio - even if some terms do not appear clearly or completely.

```python
from livekit.plugins import soniox

options = soniox.STTOptions(
    context="Celebrex, Zyrtec, Xanax, Prilosec, Amoxicillin Clavulanate Potassium",
)

session = AgentSession(
    stt = soniox.STT(params=options),
    ...
)
```

Learn more about customizing with context [here](/stt/concepts/context).

{/* TODO: link to LiveKit docs */}

{/* TODO: link to LiveKit reference of soniox.STT */}

# Pipecat
URL: /stt/integrations/pipecat

Integrate Soniox Speech-to-Text into Pipecat pipeline.

***

title: Pipecat
description: Integrate Soniox Speech-to-Text into Pipecat pipeline.
-------------------------------------------------------------------

import { Step, Steps } from "fumadocs-ui/components/steps";
import Image from "next/image";
import { LinkCards } from "@/components/link-card";

<div className="flex items-center justify-center bg-gradient-to-br from-[#DCE7F8] to-[#F2F6FC] py-16 rounded-lg">
  <Image src="/docs/integrations/pipecat.svg" alt="Soniox x Zapier" width={520} height={100} className="mb-6" priority />
</div>

## Overview

Pipecat is a framework for building voice-enabled, real-time, multimodal AI applications. Pipecat's pipeline for real-time voice applications looks like this:

1. **Send Audio** - Transmit and capture streamed audio from the user
2. **Transcribe Speech** - Convert speech to text as the user is talking
3. **Process with LLM** - Generate responses using a large language model
4. **Convert to Speech** - Transform text responses into natural speech
5. **Play Audio** - Stream the audio response back to the user

At each step, there are multiple options for services to use. Soniox provides `SonioxSTTService`, which handles the **Transcribe Speech** step. For more details on how Pipecat works, check the [Pipecat documentation](https://docs.pipecat.ai/getting-started/introduction).

## Installation

To use `SonioxSTTService` in Pipecat projects, you need to install the Soniox dependencies:

```bash
pip install "pipecat-ai[soniox]"
```

You'll also need to set up your Soniox API key as an environment variable: `SONIOX_API_KEY`. You can obtain a Soniox API key by signing up at [Soniox Console](https://console.soniox.com/).

## Usage example

To integrate `SonioxSTTService` into a Pipecat pipeline for real-time speech-to-text transcription,
you can simply create an instance of the service and add it to your pipeline:

```python
from pipecat.pipeline.pipeline import Pipeline
from pipecat.services.soniox.stt import SonioxSTTService

# Configure the service
stt = SonioxSTTService(
    api_key=os.getenv("SONIOX_API_KEY"),
)

# Use in pipeline
pipeline = Pipeline([
    transport.input(),
    stt,
    llm,
    ...
])
```

## Complete examples

The following examples demonstrate how to use `SonioxSTTService` in Pipecat projects:

<LinkCards
  cols={3}
  links={[
  {
    title: "Minimal interruptible conversation bot",
    href: "https://github.com/pipecat-ai/pipecat/blob/main/examples/foundational/07aa-interruptible-soniox.py",
    description: "Server-side bot that listens to user voice and responds with a spoken response.",
  },
  {
    title: "Transcribe audio stream",
    href: "https://github.com/pipecat-ai/pipecat/blob/main/examples/foundational/13i-soniox-transcription.py",
    description: "Transcribe audio stream in Pipecat architecture.",
  },
  {
    title: "Complete chatbot example",
    href: "https://github.com/soniox/soniox-pipecat-voicebot",
    description: "Chatbot agent using Soniox STT for Pipecat Cloud.",
  },
]}
/>

## Advanced usage

### Language hints

There is no need to pre-select a language — the model automatically detects and transcribes any supported language. It also handles multilingual audio seamlessly, even when multiple languages are mixed within a single sentence or conversation.

However, when you have prior knowledge of the languages likely to be spoken in your audio, you can use language hints to guide the model toward those languages for even greater recognition accuracy.

```python
from pipecat.services.soniox.stt import SonioxInputParams
from pipecat.transcriptions.language import Language

SonioxInputParams(
  language_hints=[Language.EN, Language.ES, Language.JA, Language.ZH],
)
```

Language variants are ignored, for example `Language.EN_GB` will be treated same as `Language.EN`. See [list of supported languages](/stt/concepts/supported-languages) for a list of supported languages.

You can learn more about language hints [here](/stt/concepts/language-hints).

### Customization with context

By providing context, you help the AI model better understand and anticipate the language in your audio - even if some terms do not appear clearly or completely.

```python
from pipecat.services.soniox.config import SonioxInputParams

SonioxInputParams(
  context="Celebrex, Zyrtec, Xanax, Prilosec, Amoxicillin Clavulanate Potassium",
),
```

### Endpoint Detection and VAD

The `SonioxSTTService` processes your speech and has two ways of knowing when to finalize the text.

#### Automatic Pause Detection

By default, the service listens for natural pauses in your speech. When it detects that you've likely finished a sentence, it finalizes the transcription.
You can learn more about Endpoint Detection [here](/stt/rt/endpoint-detection).

#### Using Voice Activity Detection (VAD)

For more explicit control, you can use a dedicated Voice Activity Detection (VAD) component within your Pipecat pipeline. The VAD's job is to detect when a user has completely stopped talking.

To enable this behavior, set `vad_force_turn_endpoint` to `True`. This will disable the automatic endpoint detection and force the service to return transcription results as soon as the user stops talking.

# Twilio
URL: /stt/integrations/twilio

Stream Twilio call audio to Soniox Speech-to-Text API and get real-time transcriptions.

***

title: Twilio
description: Stream Twilio call audio to Soniox Speech-to-Text API and get real-time transcriptions.
----------------------------------------------------------------------------------------------------

import Image from "next/image";
import { LinkCards } from "@/components/link-card";

<div className="flex items-center justify-center bg-gradient-to-br from-[#DCE7F8] to-[#F2F6FC] py-10 rounded-lg">
  <Image src="/docs/integrations/twilio.svg" alt="Twilio Soniox Demo" width={520} height={180} className="mb-6" priority />
</div>

## Overview

This guide demonstrates how to stream live Twilio call audio to the Soniox Speech-to-Text API and receive real-time transcription via WebSockets.
If you want to see a complete example, check out this GitHub repository:

<LinkCards
  cols={1}
  links={[
  {
    title: "Twilio streaming example",
    href: "https://github.com/soniox/soniox-twilio-realtime-transcription",
    description: "Complete example of streaming live audio to Soniox Speech-to-Text API and receiving real-time transcriptions.",
  },
]}
/>

## Preparation

### Create a Twilio account

To get started, you'll need a Twilio account. If you don't have one, you can [sign up](https://www.twilio.com/try-twilio).

You will also need two phone numbers to test the integration:

* One from a phone number you own, which needs to be verified by Twilio.
* The other one is a Twilio-owned phone number that you can use for testing.

### Get your Soniox API key

To use Soniox Speech-to-Text API in your application, you'll need to obtain an API key. You can get one by signing up at [Soniox Console](https://console.soniox.com/).

## Running the example

### Clone the repository

Clone the repository and install the dependencies:

```bash
git clone https://github.com/soniox/soniox-twilio-realtime-transcription.git
cd soniox-twilio-realtime-transcription
pip install -r requirements.txt
```

### Configure server environment

Copy the `.env.example` file to `.env` and update the values with your Twilio account credentials and Soniox API key:

```bash
cp .env.example .env
```

### Run the server and expose it to Twilio

Run the server:

```bash
python server.py
```

This will start the server and listen for incoming Twilio calls. You will specify where phone call recording is streamed later. To expose the server to Twilio, you can use [ngrok](https://ngrok.com/).

```bash
ngrok http 5000
```

Note the forwarding URL that ngrok provides. It should look like `https://<your-ngrok-subdomain>.ngrok.io` or `https://<your-ngrok-subdomain>.ngrok-free.app`.

### Run the client

Edit `client.html` and set `WEBSOCKET_URL` to your ngrok URL with `/client` at the end, e.g. `wss://xxxxx.ngrok.io/client`.

Open `client.html` in your browser to view live call transcriptions.

### Start a Twilio call

You can configure Twilio calls with `TwiML Bin` files. More information about streaming can be found in the [Twilio documentation](https://www.twilio.com/docs/voice/twiml/stream).

Here is an example `TwiML Bin` file calls you phone number and streams the audio to your websocket server:

```xml
<Response>
    <Start>
        <Stream url="WEBSOCKET_URL" track="both_tracks" />
    </Start>
    <Dial>USER_PHONE_NUMBER</Dial>
    <Say voice="woman" language="en">"Hello, this is a test call. How are you?"</Say>
    <Pause length="5"/>
    <Say voice="woman" language="en">"Thank you, bye!"</Say>
</Response>
```

To start, we recommend using the provided `call_me.py` script to start a Twilio call. Simply set the following environment variables:

* `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` (from Twilio)
* `TWILIO_PHONE_NUMBER` (your Twilio number, rented on Twilio)
* `WEBSOCKET_URL` with your ngrok URL with `/twilio` at the end, e.g. `wss://xxxxx.ngrok.io/twilio`.
* `USER_PHONE_NUMBER` with your Twilio-verified phone number.

```bash
python call_me.py
```

You should hear a voice message saying "Hello, this is a test call. How are you?" and then a message saying "Thank you, bye!". Simultaneously, you should see the transcription in the browser.

# Community integrations
URL: /stt/integrations/community-integrations

Discover useful Soniox integrations built by the community

***

title: Community integrations
description: Discover useful Soniox integrations built by the community
-----------------------------------------------------------------------

import Image from "next/image";

<Image src="/docs/integrations/community-integrations.png" alt="Web and mobile demo apps screenshot" width={900} height={600} className="rounded-lg" priority />

## Overview

This page lists code repositories, SDKs and other useful tools built by our user community. We appreciate the investment in time and willingness to give back to the community from these developers.

Note that the projects linked here are community-built integrations and are not officially supported by Soniox. For any questions or support requests, please contact the respective developers or project maintainers.

## Python SDK

A Python SDK that calls the Soniox async API, enabling processing of audio files.

Link to the GitHub repository: [Python SDK](https://github.com/mahdikiani/soniox-sdk).

