import { zhErrors } from './errors.zh'

/** User-facing error strings (English). */
export const enErrors = {
  unknownError: 'An unknown error occurred',
  correctionFailed: 'Correction failed',

  apiNoModelsReturned: 'The API did not return any available models',
  aiNoStructuredResult: 'AI did not return usable structured output',
  aiNoValidAnswer: 'AI did not return a valid answer',
  aiNoMindMapMarkdown: 'AI did not return mind map Markdown',
  aiNoContent: 'AI did not return any content',
  aiInvalidJson: 'AI response is not valid JSON',
  aiJsonParseFailed: 'AI response could not be parsed as JSON',
  aiInvalidJsonArray: 'AI response is not a valid JSON array',
  aiResponseNotArray: 'AI response is not an array',
  aiPostProcessDisabled: 'Enable AI post-processing in Settings first',
  aiModelNotConfigured: 'Configure an AI model first',
  aiCorrectionModelNotConfigured: 'Configure an AI correction model first',
  noTranscriptForAnalysis: 'This session has no transcript available for AI analysis',
  noTranscriptForQa: 'This session has no transcript available for Q&A',
  noTranscriptForMindMap: 'This session has no transcript available for mind map generation',
  noTranscriptForCorrection: 'This session has no transcript available for correction',
  enterQuestion: 'Enter a question',
  noAcceptedIssues: 'No accepted changes to apply',
  aiRequestFailed: (status: number) => `AI request failed: HTTP ${status}`,
  responseBodyNotReadable: 'Response body is not readable',

  sessionNotFoundForMindMap: 'Session for mind map generation was not found',
  sessionNotFoundForAsk: 'Session for Q&A was not found',
  sessionNotFoundForAnalysis: 'Session for analysis was not found',
  sessionNotFoundForCorrection: 'Session for correction was not found',

  systemAudioShareHint:
    'Could not capture system audio. When sharing your screen, enable the "Share audio" option.',

  siliconflowApiKeyMissing: 'SiliconFlow API Key is missing',
  cloudflareCredentialsMissing: 'Cloudflare API Token or Account ID is missing',
  groqApiKeyMissing: 'Groq API Key is missing',
  whisperCppRuntimeInvalidUrl: 'Local whisper.cpp runtime URL is invalid',

  mindMapSvgNotFound: 'Mind map SVG content was not found',
  mindMapEmptyDimensions: 'Mind map has empty dimensions and cannot be exported',
  canvasContextUnavailable: 'Canvas context unavailable',
  pngExportFailed: (message: string) => `PNG export failed: ${message}`,

  enterApiKey: 'Enter an API Key',
  enterAppId: 'Enter an APP ID',
  enterAccessToken: 'Enter an Access Token',
  enterMistralApiKey: 'Enter a Mistral API Key',
  enterDeepgramApiKey: 'Enter a Deepgram API Key',
  enterAssemblyAiApiKey: 'Enter an AssemblyAI API Key',
  enterElevenLabsApiKey: 'Enter an ElevenLabs API Key',
  enterGladiaApiKey: 'Enter a Gladia API Key',
  enterCloudflareApiToken: 'Enter a Cloudflare API Token',
  enterCloudflareAccountId: 'Enter a Cloudflare Account ID',
  cloudflareTokenInvalid:
    'API Token is invalid or lacks permission. Ensure it has Workers AI read/write access.',
  cloudflareAccountInvalid: 'Account ID is invalid or the model does not exist. Check your configuration.',
  cloudflareApiError: (status: number) => `Cloudflare API error: ${status}`,
  cloudflareApiFailedStatus: 'Cloudflare API returned a failure status. Check your configuration.',
  enterBaseUrl: 'Enter a Base URL',
  enterModelName: 'Enter a model name',
  invalidBaseUrl: 'Base URL format is invalid',
  serviceReturnedError: (status: number) => `Service returned error: ${status}`,
  enterGroqApiKey: 'Enter a Groq API Key',
  groqServiceError: (status: number) => `Groq service error: ${status}`,
  enterSiliconflowApiKey: 'Enter a SiliconFlow API Key',
  enterSixtydbApiKey: 'Enter a 60db API Key',
  invalidServiceUrl: 'Service URL format is invalid',
  funasrConnectFailed: (baseUrl: string, detail: string) =>
    `Cannot connect to funasr-server (${baseUrl}): ${detail}. Ensure the service is running.`,
  funasrHealthCheckFailed: (status: number) => `funasr-server health check failed: HTTP ${status}`,
  funasrTranscriptionTestFailed: (status: number) => `funasr-server transcription test failed: HTTP ${status}`,
  notElectronWhisperTest: 'Not running in Electron; cannot test local whisper.cpp runtime',
  whisperRuntimeStartFailed: 'Local whisper.cpp runtime failed to start',
  whisperInferenceError: (status: number) => `whisper.cpp /inference error: HTTP ${status}`,
  providerConfigTestNotImplemented: 'Config test is not implemented for this provider',

  fillModelNameFirst: 'Enter a model name first',
  pullNotSupportedDownloadOnServer:
    'One-click pull is not supported for this service. Download the model on the server side first.',
  notElectronBundledRuntime: 'Not running in Electron; cannot manage bundled runtime',
  runtimeStartFailed: 'Failed to start runtime',
  runtimeStopFailed: 'Failed to stop runtime',
  openModelsDirFailed: 'Failed to open models directory',
  importModelFailed: 'Failed to import model',
  importRuntimeBinaryFailed: 'Failed to import runtime binary',
  downloadModelFailed: 'Failed to download model',
  downloadRuntimeBinaryFailed: 'Failed to download runtime binary',

  openAiCompatibleEmptyTranscript:
    'OpenAI-compatible service returned an empty transcript. Check the audio file or service configuration.',
  volcEmptyTranscript:
    'Volcengine returned an empty transcript. Check the audio file or try another provider.',
  cloudflareCredentialsNotConfigured: 'Cloudflare API Token or Account ID is not configured',
  volcCredentialsNotConfigured: 'Volcengine APP ID or Access Token is not configured',
  configureBaseUrlFirst: 'Configure Base URL first',
  openAiCompatibleServiceError: (status: number) => `OpenAI-compatible service error: HTTP ${status}`,
  gladiaEmptyTranscript: (debugInfo: string) =>
    `Gladia returned an empty transcript (${debugInfo}). Check that the audio contains recognizable speech.`,
  providerApiKeyNotConfigured: (providerId: string) => `${providerId} API Key not configured`,

  localModelSetupServiceError: (status: number) => `Service returned error: ${status}`,
  localModelPullFailed: (status: number) => `Pull failed: ${status}`,
} satisfies typeof zhErrors
