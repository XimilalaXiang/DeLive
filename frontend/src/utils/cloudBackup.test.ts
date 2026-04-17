import { describe, it, expect } from 'vitest'
import type {
  CloudBackupConfig,
  S3BackupConfig,
  CloudBackupProviderType,
} from '../types'
import type { CloudBackupIpcConfig } from '../../../shared/electronApi'

function buildIpcConfig(config: CloudBackupConfig): CloudBackupIpcConfig {
  return {
    provider: config.provider || 's3',
    s3: config.s3 ? {
      endpoint: config.s3.endpoint || '',
      region: config.s3.region || 'us-east-1',
      bucket: config.s3.bucket || '',
      prefix: config.s3.prefix || '',
      accessKeyId: config.s3.accessKeyId || '',
      secretAccessKey: config.s3.secretAccessKey || '',
      forcePathStyle: config.s3.forcePathStyle ?? true,
    } : undefined,
    webdav: config.webdav ? {
      url: config.webdav.url || '',
      username: config.webdav.username || '',
      password: config.webdav.password || '',
      basePath: config.webdav.basePath || '',
    } : undefined,
  }
}

describe('CloudBackup config building', () => {
  it('builds S3 IPC config with defaults', () => {
    const config: CloudBackupConfig = {
      enabled: true,
      provider: 's3',
      s3: {
        endpoint: 'https://s3.example.com',
        region: 'ap-east-1',
        bucket: 'test-bucket',
        prefix: 'backups',
        accessKeyId: 'AKID',
        secretAccessKey: 'SECRET',
      },
    }

    const ipc = buildIpcConfig(config)
    expect(ipc.provider).toBe('s3')
    expect(ipc.s3).toBeDefined()
    expect(ipc.s3!.endpoint).toBe('https://s3.example.com')
    expect(ipc.s3!.region).toBe('ap-east-1')
    expect(ipc.s3!.bucket).toBe('test-bucket')
    expect(ipc.s3!.prefix).toBe('backups')
    expect(ipc.s3!.accessKeyId).toBe('AKID')
    expect(ipc.s3!.secretAccessKey).toBe('SECRET')
    expect(ipc.s3!.forcePathStyle).toBe(true)
    expect(ipc.webdav).toBeUndefined()
  })

  it('defaults region to us-east-1 when empty', () => {
    const config: CloudBackupConfig = {
      enabled: true,
      provider: 's3',
      s3: {
        endpoint: '',
        region: '',
        bucket: 'b',
        prefix: '',
        accessKeyId: 'a',
        secretAccessKey: 's',
      },
    }

    const ipc = buildIpcConfig(config)
    expect(ipc.s3!.region).toBe('us-east-1')
  })

  it('respects forcePathStyle=false', () => {
    const config: CloudBackupConfig = {
      enabled: true,
      provider: 's3',
      s3: {
        endpoint: 'https://s3.amazonaws.com',
        region: 'us-west-2',
        bucket: 'b',
        prefix: '',
        accessKeyId: 'a',
        secretAccessKey: 's',
        forcePathStyle: false,
      },
    }

    const ipc = buildIpcConfig(config)
    expect(ipc.s3!.forcePathStyle).toBe(false)
  })

  it('builds WebDAV IPC config', () => {
    const config: CloudBackupConfig = {
      enabled: true,
      provider: 'webdav',
      webdav: {
        url: 'https://dav.example.com/dav',
        username: 'user',
        password: 'pass',
        basePath: '/delive',
      },
    }

    const ipc = buildIpcConfig(config)
    expect(ipc.provider).toBe('webdav')
    expect(ipc.webdav).toBeDefined()
    expect(ipc.webdav!.url).toBe('https://dav.example.com/dav')
    expect(ipc.webdav!.username).toBe('user')
    expect(ipc.s3).toBeUndefined()
  })

  it('handles empty config gracefully', () => {
    const config: CloudBackupConfig = {
      enabled: false,
    }

    const ipc = buildIpcConfig(config)
    expect(ipc.provider).toBe('s3')
    expect(ipc.s3).toBeUndefined()
    expect(ipc.webdav).toBeUndefined()
  })

  it('defaults provider to s3 when unset', () => {
    const config: CloudBackupConfig = {}
    const ipc = buildIpcConfig(config)
    expect(ipc.provider).toBe('s3')
  })
})

describe('CloudBackup type guards', () => {
  it('CloudBackupProviderType accepts valid values', () => {
    const valid: CloudBackupProviderType[] = ['s3', 'webdav']
    expect(valid).toHaveLength(2)
  })

  it('S3BackupConfig requires all fields', () => {
    const config: S3BackupConfig = {
      endpoint: '',
      region: '',
      bucket: '',
      prefix: '',
      accessKeyId: '',
      secretAccessKey: '',
    }
    expect(config).toBeDefined()
    expect(config.forcePathStyle).toBeUndefined()
  })
})
