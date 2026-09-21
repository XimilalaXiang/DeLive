import { zhErrors } from './errors.zh'

/** User-facing error strings (Korean). */
export const koErrors = {
  unknownError: '알 수 없는 오류가 발생했습니다',
  correctionFailed: '교정에 실패했습니다',

  apiNoModelsReturned: 'API에서 사용 가능한 모델을 반환하지 않았습니다',
  aiNoStructuredResult: 'AI가 사용할 수 있는 구조화된 결과를 반환하지 않았습니다',
  aiNoValidAnswer: 'AI가 유효한 답변을 반환하지 않았습니다',
  aiNoMindMapMarkdown: 'AI가 마인드맵 Markdown을 반환하지 않았습니다',
  aiNoContent: 'AI가 내용을 반환하지 않았습니다',
  aiInvalidJson: 'AI 응답이 유효한 JSON이 아닙니다',
  aiJsonParseFailed: 'AI 응답을 JSON으로 파싱할 수 없습니다',
  aiInvalidJsonArray: 'AI 응답이 유효한 JSON 배열이 아닙니다',
  aiResponseNotArray: 'AI 응답이 배열이 아닙니다',
  aiPostProcessDisabled: '먼저 설정에서 AI 후처리를 사용하세요',
  aiModelNotConfigured: '먼저 AI 모델을 구성하세요',
  aiCorrectionModelNotConfigured: '먼저 AI 교정 모델을 구성하세요',
  noTranscriptForAnalysis: 'AI 분석에 사용할 전사 내용이 이 세션에 없습니다',
  noTranscriptForQa: '질의응답에 사용할 전사 내용이 이 세션에 없습니다',
  noTranscriptForMindMap: '마인드맵 생성에 사용할 전사 내용이 이 세션에 없습니다',
  noTranscriptForCorrection: '교정에 사용할 전사 내용이 이 세션에 없습니다',
  enterQuestion: '질문을 입력하세요',
  noAcceptedIssues: '적용할 확인된 수정 항목이 없습니다',
  aiRequestFailed: (status: number) => `AI 요청 실패: HTTP ${status}`,
  responseBodyNotReadable: 'Response body is not readable',

  sessionNotFoundForMindMap: '마인드맵을 생성할 세션을 찾을 수 없습니다',
  sessionNotFoundForAsk: '질문할 세션을 찾을 수 없습니다',
  sessionNotFoundForAnalysis: '분석할 세션을 찾을 수 없습니다',
  sessionNotFoundForCorrection: '교정할 세션을 찾을 수 없습니다',

  systemAudioShareHint:
    '시스템 오디오를 가져오지 못했습니다. 화면 공유 시 "오디오 공유" 옵션을 켰는지 확인하세요.',

  siliconflowApiKeyMissing: 'SiliconFlow API 키가 없습니다',
  cloudflareCredentialsMissing: 'Cloudflare API 토큰 또는 Account ID가 없습니다',
  groqApiKeyMissing: 'Groq API 키가 없습니다',
  whisperCppRuntimeInvalidUrl: '로컬 whisper.cpp runtime URL이 유효하지 않습니다',

  mindMapSvgNotFound: '마인드맵 SVG 내용을 찾을 수 없습니다',
  mindMapEmptyDimensions: '마인드맵 크기가 비어 있어 내보낼 수 없습니다',
  canvasContextUnavailable: 'Canvas context unavailable',
  pngExportFailed: (message: string) => `PNG 내보내기 실패: ${message}`,

  enterApiKey: 'API 키를 입력하세요',
  enterAppId: 'APP ID를 입력하세요',
  enterAccessToken: 'Access Token을 입력하세요',
  enterMistralApiKey: 'Mistral API 키를 입력하세요',
  enterDeepgramApiKey: 'Deepgram API 키를 입력하세요',
  enterAssemblyAiApiKey: 'AssemblyAI API 키를 입력하세요',
  enterElevenLabsApiKey: 'ElevenLabs API 키를 입력하세요',
  enterGladiaApiKey: 'Gladia API 키를 입력하세요',
  enterCloudflareApiToken: 'Cloudflare API 토큰을 입력하세요',
  enterCloudflareAccountId: 'Cloudflare Account ID를 입력하세요',
  cloudflareTokenInvalid:
    'API 토큰이 유효하지 않거나 권한이 부족합니다. Workers AI 읽기/쓰기 권한이 있는지 확인하세요.',
  cloudflareAccountInvalid: 'Account ID가 유효하지 않거나 모델이 없습니다. 구성을 확인하세요.',
  cloudflareApiError: (status: number) => `Cloudflare API 오류: ${status}`,
  cloudflareApiFailedStatus: 'Cloudflare API가 실패 상태를 반환했습니다. 구성을 확인하세요.',
  enterBaseUrl: 'Base URL을 입력하세요',
  enterModelName: '모델 이름을 입력하세요',
  invalidBaseUrl: 'Base URL 형식이 올바르지 않습니다',
  serviceReturnedError: (status: number) => `서비스 오류: ${status}`,
  enterGroqApiKey: 'Groq API 키를 입력하세요',
  groqServiceError: (status: number) => `Groq 서비스 오류: ${status}`,
  enterSiliconflowApiKey: 'SiliconFlow API 키를 입력하세요',
  enterSixtydbApiKey: '60db API 키를 입력하세요',
  invalidServiceUrl: '서비스 URL 형식이 올바르지 않습니다',
  funasrConnectFailed: (baseUrl: string, detail: string) =>
    `funasr-server(${baseUrl})에 연결할 수 없습니다: ${detail}. 서비스가 실행 중인지 확인하세요.`,
  funasrHealthCheckFailed: (status: number) => `funasr-server 상태 확인 실패: HTTP ${status}`,
  funasrTranscriptionTestFailed: (status: number) => `funasr-server 전사 테스트 실패: HTTP ${status}`,
  notElectronWhisperTest: 'Electron 환경이 아니어서 로컬 whisper.cpp runtime을 테스트할 수 없습니다',
  whisperRuntimeStartFailed: '로컬 whisper.cpp runtime을 시작하지 못했습니다',
  whisperInferenceError: (status: number) => `whisper.cpp /inference 오류: HTTP ${status}`,
  providerConfigTestNotImplemented: '이 제공업체는 아직 구성 테스트가 구현되지 않았습니다',

  fillModelNameFirst: '먼저 모델 이름을 입력하세요',
  pullNotSupportedDownloadOnServer:
    '이 서비스는 원클릭 다운로드를 지원하지 않습니다. 서버에서 먼저 모델을 받으세요.',
  notElectronBundledRuntime: 'Electron 환경이 아니어서 bundled runtime을 관리할 수 없습니다',
  runtimeStartFailed: 'runtime 시작에 실패했습니다',
  runtimeStopFailed: 'runtime 중지에 실패했습니다',
  openModelsDirFailed: '모델 디렉터리를 열지 못했습니다',
  importModelFailed: '모델 가져오기에 실패했습니다',
  importRuntimeBinaryFailed: 'runtime binary 가져오기에 실패했습니다',
  downloadModelFailed: '모델 다운로드에 실패했습니다',
  downloadRuntimeBinaryFailed: 'runtime binary 다운로드에 실패했습니다',

  openAiCompatibleEmptyTranscript:
    'OpenAI 호환 서비스가 빈 전사 결과를 반환했습니다. 오디오 파일 또는 서비스 구성을 확인하세요.',
  volcEmptyTranscript:
    'Volcengine이 빈 전사 결과를 반환했습니다. 오디오 파일을 확인하거나 다른 제공업체를 사용하세요.',
  cloudflareCredentialsNotConfigured: 'Cloudflare API 토큰 또는 Account ID가 구성되지 않았습니다',
  volcCredentialsNotConfigured: 'Volcengine APP ID 또는 Access Token이 구성되지 않았습니다',
  configureBaseUrlFirst: '먼저 Base URL을 구성하세요',
  openAiCompatibleServiceError: (status: number) => `OpenAI 호환 서비스 오류: HTTP ${status}`,
  gladiaEmptyTranscript: (debugInfo: string) =>
    `Gladia가 빈 전사 결과를 반환했습니다 (${debugInfo}). 오디오에 인식 가능한 음성이 있는지 확인하세요.`,
  providerApiKeyNotConfigured: (providerId: string) => `${providerId} API Key not configured`,

  localModelSetupServiceError: (status: number) => `서비스 오류: ${status}`,
  localModelPullFailed: (status: number) => `가져오기 실패: ${status}`,
} satisfies typeof zhErrors
