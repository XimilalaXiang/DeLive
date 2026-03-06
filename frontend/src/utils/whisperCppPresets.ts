export interface WhisperCppModelPreset {
  id: string
  label: string
  url: string
  description: string
}

export const WHISPER_CPP_RELEASES_URL = 'https://github.com/ggml-org/whisper.cpp/releases'
export const WHISPER_CPP_SERVER_DOCS_URL = 'https://github.com/ggml-org/whisper.cpp/tree/master/examples/server'

export const whisperCppModelPresets: WhisperCppModelPreset[] = [
  {
    id: 'base',
    label: 'Base',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    description: '142 MiB，适合先验证流程。',
  },
  {
    id: 'small',
    label: 'Small',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    description: '466 MiB，精度和速度更均衡。',
  },
  {
    id: 'large-v3-turbo',
    label: 'Large-v3 Turbo',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    description: '更强模型，资源占用更高。',
  },
]
