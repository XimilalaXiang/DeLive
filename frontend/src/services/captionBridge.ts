/**
 * CaptionBridge — 字幕窗口文本同步
 *
 * 封装与 Electron 字幕窗口之间的 IPC 调用，
 * 内部维护去重状态，避免重复推送相同内容。
 */

export class CaptionBridge {
  private lastStableText = ''
  private lastActiveText = ''
  private lastIsFinal = false

  /** 推送文本到字幕窗口，自动去重 */
  update(stableText: string, activeText: string): void {
    const isFinal = activeText.length === 0 && stableText.length > 0

    if (
      stableText === this.lastStableText &&
      activeText === this.lastActiveText &&
      isFinal === this.lastIsFinal
    ) {
      return
    }
    this.lastStableText = stableText
    this.lastActiveText = activeText
    this.lastIsFinal = isFinal
    window.electronAPI?.captionUpdateText(stableText, activeText, isFinal)
  }

  /** 清空字幕并重置去重状态 */
  clear(): void {
    this.lastStableText = ''
    this.lastActiveText = ''
    this.lastIsFinal = false
    window.electronAPI?.captionUpdateText('', '', false)
  }
}
