import { safeStorage, type IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { assertTrustedSender } from './ipcSecurity'

const SAFE_STORE_DIR = 'safe-store'
const SAFE_PREFIX = 'ss_'

function getSafeStorePath(): string {
  return path.join(app.getPath('userData'), SAFE_STORE_DIR)
}

function ensureSafeStoreDir(): void {
  const dir = getSafeStorePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function keyFilePath(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(getSafeStorePath(), `${SAFE_PREFIX}${safeKey}`)
}

export function registerSafeStorageIpc(ipcMain: IpcMain): void {
  ipcMain.handle('safe-storage-set', (event, key: string, value: string) => {
    assertTrustedSender(event, 'safe-storage-set')

    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[SafeStorage] Encryption not available, storing in plaintext fallback')
      return false
    }

    try {
      ensureSafeStoreDir()
      const encrypted = safeStorage.encryptString(value)
      fs.writeFileSync(keyFilePath(key), encrypted)
      return true
    } catch (error) {
      console.error('[SafeStorage] Failed to encrypt and store:', error)
      return false
    }
  })

  ipcMain.handle('safe-storage-get', (event, key: string) => {
    assertTrustedSender(event, 'safe-storage-get')

    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }

    const filePath = keyFilePath(key)
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const encrypted = fs.readFileSync(filePath)
      return safeStorage.decryptString(encrypted)
    } catch (error) {
      console.error('[SafeStorage] Failed to decrypt:', error)
      return null
    }
  })

  ipcMain.handle('safe-storage-delete', (event, key: string) => {
    assertTrustedSender(event, 'safe-storage-delete')

    const filePath = keyFilePath(key)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      return true
    } catch (error) {
      console.error('[SafeStorage] Failed to delete:', error)
      return false
    }
  })

  ipcMain.handle('safe-storage-available', () => {
    return safeStorage.isEncryptionAvailable()
  })
}
