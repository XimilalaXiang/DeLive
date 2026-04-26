/**
 * ASR 提供商官方 Logo SVG 组件
 */

import type { SVGProps } from 'react'
import ggmlOrgLogo from '../../assets/ggml-org.png'

type LogoProps = SVGProps<SVGSVGElement> & { size?: number }
type AnyLogoProps = { size?: number; className?: string }

const defaultSize = 20

export function SonioxLogo({ size = defaultSize, className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="-1 -1 16 19"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="m0 14.866 2.1606-3.5214c1.8927 1.2576 3.9669 1.8995 5.6694 1.8995 1.0025 0 1.4606-0.3036 1.4606-0.8847v-0.0607c0-0.6419-0.9161-0.9194-2.6532-1.4138-3.2582-0.8587-5.8509-1.9602-5.8509-5.2995v-0.06938c0-3.5214 2.8088-5.4903 6.6114-5.4903 2.4112 0 4.9089 0.70255 6.8016 1.9342l-1.9791 3.6775c-1.7112-0.95408-3.5693-1.5352-4.8744-1.5352-0.88152 0-1.3396 0.33827-1.3396 0.79796v0.06071c0 0.64184 0.94202 0.95409 2.6792 1.4745 3.2582 0.91939 5.8509 2.0556 5.8509 5.2735v0.0607c0 3.6515-2.7137 5.551-6.741 5.551-2.7656-0.0087-5.5052-0.798-7.7955-2.4546z"
        fill="#3B82F6"
      />
    </svg>
  )
}

export function VolcengineLogo({ size = defaultSize, className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M19.44 10.153l-2.936 11.586a.215.215 0 00.214.261h5.87a.215.215 0 00.214-.261l-2.95-11.586a.214.214 0 00-.412 0zM3.28 12.778l-2.275 8.96A.214.214 0 001.22 22h4.532a.212.212 0 00.214-.165.214.214 0 000-.097l-2.276-8.96a.214.214 0 00-.41 0z"
        fill="#00E5E5"
      />
      <path
        d="M7.29 5.359L3.148 21.738a.215.215 0 00.203.261h8.29a.214.214 0 00.215-.261L7.7 5.358a.214.214 0 00-.41 0z"
        fill="#006EFF"
      />
      <path
        d="M14.44.15a.214.214 0 00-.41 0L8.366 21.739a.214.214 0 00.214.261H19.9a.216.216 0 00.171-.078.214.214 0 00.044-.183L14.439.15z"
        fill="#006EFF"
      />
      <path
        d="M10.278 7.741L6.685 21.736a.214.214 0 00.214.264h7.17a.215.215 0 00.214-.264L10.688 7.741a.214.214 0 00-.41 0z"
        fill="#00E5E5"
      />
    </svg>
  )
}

export function GroqLogo({ size = defaultSize, className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 201 201"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="201" height="201" rx="8" fill="#F54F35" />
      <path
        fill="#FEFBFB"
        d="m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 11.576 3.77 18 2l.008-12.98-16.014.036.004-14.033 31.97-.086.032 32.032c-6.354 5.852-12.299 9.032-20.93 11.18-13.526 2.54-25.3-.567-35.07-10.149-5.59-6.853-8.775-14.274-9.937-23.063-.027-2.204-.005-4.41.066-6.613C56.3 66.098 63.09 55.46 74.918 48.395c12.832-5.698 24.504-5.99 36.766-1.266L115 49h13z"
      />
    </svg>
  )
}

export function SiliconFlowLogo({ size = defaultSize, className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 56 27"
      width={size}
      height={size * (27 / 56)}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M52.988 0.0947418H28.9026C27.5711 0.0947418 26.494 1.17186 26.494 2.50329V9.72894C26.494 11.0604 25.4169 12.1375 24.0855 12.1375H2.40856C1.07712 12.1375 0 13.2146 0 14.546V24.1802C0 25.5117 1.07712 26.5888 2.40856 26.5888H26.494C27.8255 26.5888 28.9026 25.5117 28.9026 24.1802V16.9546C28.9026 15.6231 29.9797 14.546 31.3111 14.546H52.988C54.3195 14.546 55.3966 13.4689 55.3966 12.1375V2.50329C55.3966 1.17186 54.3195 0.0947418 52.988 0.0947418Z"
        fill="#6E29F5"
      />
    </svg>
  )
}

export function OpenAILogo({ size = defaultSize, className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
        fill="currentColor"
      />
    </svg>
  )
}

export function MistralLogo({ size = defaultSize, className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="0" y="0" width="4" height="4" fill="#F7D046" />
      <rect x="8" y="0" width="4" height="4" fill="#F7D046" />
      <rect x="16" y="0" width="4" height="4" fill="#F7D046" />
      <rect x="24" y="0" width="4" height="4" fill="#F7D046" />
      <rect x="0" y="4" width="4" height="4" fill="#F2A73B" />
      <rect x="4" y="4" width="4" height="4" fill="#F2A73B" />
      <rect x="8" y="4" width="4" height="4" fill="#F2A73B" />
      <rect x="16" y="4" width="4" height="4" fill="#F2A73B" />
      <rect x="20" y="4" width="4" height="4" fill="#F2A73B" />
      <rect x="24" y="4" width="4" height="4" fill="#F2A73B" />
      <rect x="0" y="8" width="4" height="4" fill="#EE792F" />
      <rect x="8" y="8" width="4" height="4" fill="#EE792F" />
      <rect x="12" y="8" width="4" height="4" fill="#EE792F" />
      <rect x="16" y="8" width="4" height="4" fill="#EE792F" />
      <rect x="24" y="8" width="4" height="4" fill="#EE792F" />
      <rect x="0" y="12" width="4" height="4" fill="#EB5829" />
      <rect x="8" y="12" width="4" height="4" fill="#EB5829" />
      <rect x="16" y="12" width="4" height="4" fill="#EB5829" />
      <rect x="24" y="12" width="4" height="4" fill="#EB5829" />
      <rect x="0" y="16" width="4" height="4" fill="#EA3326" />
      <rect x="8" y="16" width="4" height="4" fill="#EA3326" />
      <rect x="12" y="16" width="4" height="4" fill="#EA3326" />
      <rect x="16" y="16" width="4" height="4" fill="#EA3326" />
      <rect x="24" y="16" width="4" height="4" fill="#EA3326" />
      <rect x="0" y="20" width="4" height="4" fill="#D42A78" />
      <rect x="4" y="20" width="4" height="4" fill="#D42A78" />
      <rect x="8" y="20" width="4" height="4" fill="#D42A78" />
      <rect x="16" y="20" width="4" height="4" fill="#D42A78" />
      <rect x="20" y="20" width="4" height="4" fill="#D42A78" />
      <rect x="24" y="20" width="4" height="4" fill="#D42A78" />
      <rect x="0" y="24" width="4" height="4" fill="#AB35E9" />
      <rect x="8" y="24" width="4" height="4" fill="#AB35E9" />
      <rect x="16" y="24" width="4" height="4" fill="#AB35E9" />
      <rect x="24" y="24" width="4" height="4" fill="#AB35E9" />
    </svg>
  )
}

export function WhisperCppLogo({ size = defaultSize, className }: LogoProps) {
  return (
    <img
      src={ggmlOrgLogo}
      alt="whisper.cpp (ggml)"
      width={size}
      height={size}
      className={`rounded ${className || ''}`}
      style={{ objectFit: 'contain' }}
    />
  )
}

const PROVIDER_LOGO_MAP: Record<string, (props: AnyLogoProps) => JSX.Element> = {
  soniox: SonioxLogo,
  volc: VolcengineLogo,
  groq: GroqLogo,
  siliconflow: SiliconFlowLogo,
  mistral: MistralLogo,
  local_openai: OpenAILogo,
  local_whisper_cpp: WhisperCppLogo,
}

export function getProviderLogo(
  providerId: string,
  size = defaultSize,
  className?: string
): JSX.Element | null {
  const Logo = PROVIDER_LOGO_MAP[providerId]
  if (!Logo) return null
  return <Logo size={size} className={className} />
}
