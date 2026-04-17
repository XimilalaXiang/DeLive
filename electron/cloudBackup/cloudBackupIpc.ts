import type { IpcMain } from 'electron'
import { assertTrustedSender } from '../ipcSecurity'
import type { CloudBackupIpcConfig } from '../../shared/electronApi'
import { s3Test, s3Upload, s3List, s3Download, s3Delete } from './s3Provider'
import { webdavTest, webdavUpload, webdavList, webdavDownload, webdavDelete } from './webdavProvider'

function requireS3Config(config: CloudBackupIpcConfig) {
  if (config.provider !== 's3' || !config.s3) {
    throw new Error('S3 configuration is required')
  }
  return config.s3
}

function requireWebDAVConfig(config: CloudBackupIpcConfig) {
  if (config.provider !== 'webdav' || !config.webdav) {
    throw new Error('WebDAV configuration is required')
  }
  return config.webdav
}

export function registerCloudBackupIpc(ipcMain: IpcMain): void {
  ipcMain.handle('cloud-backup-test', async (event, config: CloudBackupIpcConfig) => {
    assertTrustedSender(event, 'cloud-backup-test')

    if (config.provider === 's3') {
      return s3Test(requireS3Config(config))
    }
    if (config.provider === 'webdav') {
      return webdavTest(requireWebDAVConfig(config))
    }

    return { ok: false, error: `Unsupported provider: ${config.provider}` }
  })

  ipcMain.handle('cloud-backup-upload', async (event, config: CloudBackupIpcConfig, jsonData: string) => {
    assertTrustedSender(event, 'cloud-backup-upload')

    if (config.provider === 's3') {
      return s3Upload(requireS3Config(config), jsonData)
    }
    if (config.provider === 'webdav') {
      return webdavUpload(requireWebDAVConfig(config), jsonData)
    }

    return { ok: false, error: `Unsupported provider: ${config.provider}` }
  })

  ipcMain.handle('cloud-backup-list', async (event, config: CloudBackupIpcConfig) => {
    assertTrustedSender(event, 'cloud-backup-list')

    if (config.provider === 's3') {
      return s3List(requireS3Config(config))
    }
    if (config.provider === 'webdav') {
      return webdavList(requireWebDAVConfig(config))
    }

    return { ok: false, error: `Unsupported provider: ${config.provider}` }
  })

  ipcMain.handle('cloud-backup-download', async (event, config: CloudBackupIpcConfig, key: string) => {
    assertTrustedSender(event, 'cloud-backup-download')

    if (config.provider === 's3') {
      return s3Download(requireS3Config(config), key)
    }
    if (config.provider === 'webdav') {
      return webdavDownload(requireWebDAVConfig(config), key)
    }

    return { ok: false, error: `Unsupported provider: ${config.provider}` }
  })

  ipcMain.handle('cloud-backup-delete', async (event, config: CloudBackupIpcConfig, key: string) => {
    assertTrustedSender(event, 'cloud-backup-delete')

    if (config.provider === 's3') {
      return s3Delete(requireS3Config(config), key)
    }
    if (config.provider === 'webdav') {
      return webdavDelete(requireWebDAVConfig(config), key)
    }

    return { ok: false, error: `Unsupported provider: ${config.provider}` }
  })
}
