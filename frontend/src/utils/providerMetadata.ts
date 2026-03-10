import type { TranscriptSourceMeta } from '../types'
import type { ASRVendor } from '../types/asr'
import { providerRegistry } from '../providers'

export function resolveProviderMode(providerId: string | undefined): TranscriptSourceMeta['providerMode'] {
  if (!providerId) {
    return 'unknown'
  }

  const providerInfo = providerRegistry.getInfo(providerId as ASRVendor)
  if (!providerInfo) {
    return 'unknown'
  }

  switch (providerInfo.capabilities.transport.type) {
    case 'realtime':
      return 'realtime'
    case 'full-session-retranscription':
      return 'full-session-retranscription'
    case 'local-runtime':
      return 'local-runtime'
    default:
      return 'unknown'
  }
}
