import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'
import type { CloudBackupIpcConfig, CloudBackupIpcFileInfo } from '../../shared/electronApi'

function createS3Client(config: NonNullable<CloudBackupIpcConfig['s3']>): S3Client {
  return new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region || 'us-east-1',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle ?? true,
  })
}

function resolveKey(prefix: string, filename: string): string {
  const p = prefix.replace(/\/+$/, '')
  return p ? `${p}/${filename}` : filename
}

export async function s3Test(
  config: NonNullable<CloudBackupIpcConfig['s3']>,
): Promise<{ ok: boolean; error?: string }> {
  const client = createS3Client(config)
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    client.destroy()
  }
}

export async function s3Upload(
  config: NonNullable<CloudBackupIpcConfig['s3']>,
  jsonData: string,
): Promise<{ ok: boolean; key?: string; error?: string }> {
  const client = createS3Client(config)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const key = resolveKey(config.prefix, `delive_backup_${timestamp}.json`)

  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: jsonData,
      ContentType: 'application/json; charset=utf-8',
    }))
    return { ok: true, key }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    client.destroy()
  }
}

export async function s3List(
  config: NonNullable<CloudBackupIpcConfig['s3']>,
): Promise<{ ok: boolean; files?: CloudBackupIpcFileInfo[]; error?: string }> {
  const client = createS3Client(config)
  const prefix = config.prefix.replace(/\/+$/, '')

  try {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix ? `${prefix}/` : undefined,
      MaxKeys: 100,
    }))

    const files: CloudBackupIpcFileInfo[] = (response.Contents ?? [])
      .filter(obj => obj.Key?.endsWith('.json'))
      .sort((a, b) => {
        const ta = a.LastModified?.getTime() ?? 0
        const tb = b.LastModified?.getTime() ?? 0
        return tb - ta
      })
      .map(obj => ({
        key: obj.Key!,
        lastModified: obj.LastModified?.toISOString() ?? '',
        size: obj.Size ?? 0,
      }))

    return { ok: true, files }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    client.destroy()
  }
}

export async function s3Download(
  config: NonNullable<CloudBackupIpcConfig['s3']>,
  key: string,
): Promise<{ ok: boolean; data?: string; error?: string }> {
  const client = createS3Client(config)

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }))

    const body = await response.Body?.transformToString('utf-8')
    if (!body) {
      return { ok: false, error: 'Empty response body' }
    }
    return { ok: true, data: body }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    client.destroy()
  }
}

export async function s3Delete(
  config: NonNullable<CloudBackupIpcConfig['s3']>,
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const client = createS3Client(config)

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }))
    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    client.destroy()
  }
}
