/**
 * ASR 提供商选择器组件
 */

import { Check, Cloud, HardDrive, ChevronDown, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranscriptStore } from '../stores/transcriptStore'
import type { ASRProviderInfo } from '../types/asr'

interface ProviderSelectorProps {
  onSelect?: (vendorId: string) => void
}

export function ProviderSelector({ onSelect }: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  const { 
    settings, 
    availableProviders, 
    setCurrentVendor,
    t 
  } = useTranscriptStore()

  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)

  // ESC 键关闭
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSelect = (vendorId: string) => {
    setCurrentVendor(vendorId)
    onSelect?.(vendorId)
    setIsOpen(false)
  }

  // 按类型分组
  const cloudProviders = availableProviders.filter(p => p.type === 'cloud')
  const localProviders = availableProviders.filter(p => p.type === 'local')

  const renderProviderItem = (provider: ASRProviderInfo) => {
    const isSelected = provider.id === currentVendor
    const providerConfig = settings.providerConfigs?.[provider.id]
    
    // 根据提供商类型检查配置
    const hasConfig = (() => {
      if (!providerConfig) return false
      if (provider.id === 'volc') {
        // 火山引擎需要 appKey 和 accessKey
        const volcConfig = providerConfig as { appKey?: string; accessKey?: string }
        return !!(volcConfig.appKey && volcConfig.accessKey)
      }
      // 其他提供商使用 apiKey
      return !!providerConfig.apiKey
    })()

    return (
      <button
        key={provider.id}
        onClick={() => handleSelect(provider.id)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all
          ${isSelected 
            ? 'bg-primary/10 text-primary ring-1 ring-primary/30' 
            : 'hover:bg-muted/80 text-foreground'
          }
        `}
      >
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-xl
          ${provider.type === 'cloud' 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
            : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
          }
        `}>
          {provider.type === 'cloud' ? (
            <Cloud className="w-5 h-5" />
          ) : (
            <HardDrive className="w-5 h-5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{provider.name}</span>
            {provider.supportsStreaming && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                {t.provider?.streaming || '流式'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {provider.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasConfig && (
            <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
              {t.provider?.needConfig || '需配置'}
            </span>
          )}
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </div>
      </button>
    )
  }

  // 使用 Portal 渲染模态框到 body
  const renderModal = () => {
    if (!isOpen) return null

    return createPortal(
      <div className="fixed inset-0 z-[100]">
        {/* 背景遮罩 */}
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
        
        {/* 模态框内容 */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="text-base font-semibold">{t.settings?.asrProvider || '选择语音识别服务'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings?.asrProviderDesc || '选择适合您需求的服务提供商'}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {/* 云端提供商 */}
              {cloudProviders.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t.provider?.cloudProviders || '云端服务'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cloudProviders.map(renderProviderItem)}
                  </div>
                </div>
              )}

              {/* 本地提供商 */}
              {localProviders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-border mt-2 pt-3">
                    <HardDrive className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t.provider?.localProviders || '本地模型'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {localProviders.map(renderProviderItem)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <>
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(true)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
          border-input hover:border-primary/50 hover:bg-muted/50
          bg-background text-foreground
        `}
      >
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-xl
          ${currentProvider?.type === 'cloud' 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
            : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
          }
        `}>
          {currentProvider?.type === 'cloud' ? (
            <Cloud className="w-5 h-5" />
          ) : (
            <HardDrive className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-sm">{currentProvider?.name || 'Soniox V3'}</div>
          <div className="text-xs text-muted-foreground">{t.settings?.asrProvider || '点击选择服务'}</div>
        </div>
        <ChevronDown className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* 模态框 */}
      {renderModal()}
    </>
  )
}
