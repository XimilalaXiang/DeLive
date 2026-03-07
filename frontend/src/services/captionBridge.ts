/**
 * CaptionBridge — 字幕窗口文本同步
 *
 * 封装与 Electron 字幕窗口之间的 IPC 调用，
 * 内部维护去重状态，避免重复推送相同内容。
 */

export class CaptionBridge {
  private lastText = ''
  private lastIsFinal = false

  /** 推送文本到字幕窗口，自动去重 */
  update(text: string, isFinal: boolean): void {
    if (text === this.lastText && isFinal === this.lastIsFinal) {
      return
    }
    this.lastText = text
    this.lastIsFinal = isFinal
    window.electronAPI?.captionUpdateText(text, isFinal)
  }

  /** 清空字幕并重置去重状态 */
  clear(): void {
    this.lastText = ''
    this.lastIsFinal = false
    window.electronAPI?.captionUpdateText('', false)
  }
}
