import crypto from 'crypto'
import { runtimeBrand } from '../../../config/brand'

/**
 * Cloudflare R2 (S3-compatible) chat attachment storage.
 *
 * Each runtime brand has its own Cloudflare account/bucket — the credentials
 * are resolved per `runtimeBrand` so the Digital and Print deployments can
 * never write to each other's storage.
 *
 * Uploads flow: server mints a presigned PUT URL -> browser PUTs bytes
 * directly to R2 (no server bandwidth) -> client stores the permanent public
 * URL in the message. Reads are served from the bucket's public URL.
 */

const S3_REGION = 'auto'
const S3_SERVICE = 's3'

const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico',
  'mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi',
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
])

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string
}

export function readConfig(): R2Config {
  const brand = runtimeBrand.toUpperCase()
  const pick = (base: string): string | undefined =>
    process.env[`${base}_${brand}`] || process.env[base]

  const accountId = pick('R2_ACCOUNT_ID')
  const accessKeyId = pick('R2_ACCESS_KEY_ID')
  const secretAccessKey = pick('R2_ACCESS_KEY_SECRET')
  const bucket = pick('R2_BUCKET')
  const publicUrl = pick('R2_PUBLIC_URL')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(`R2 not configured for ${runtimeBrand}`)
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: publicUrl.replace(/\/+$/, ''),
  }
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function hmac(key: string | Buffer, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value).digest()
}

function signingKey(secret: string, date: string): Buffer {
  const kDate = hmac('AWS4' + secret, date)
  const kRegion = hmac(kDate, S3_REGION)
  const kService = hmac(kRegion, S3_SERVICE)
  return hmac(kService, 'aws4_request')
}

/**
 * Sign the query for a presigned S3 request (SigV4 query-parameter auth).
 * Signs only `host`, with `UNSIGNED-PAYLOAD` — so a browser can PUT a body of
 * any size with any Content-Type header without breaking the signature.
 */
function presignQuery(
  cfg: R2Config,
  method: string,
  key: string,
  amzDate: string,
  expiresInSeconds: number
): string {
  const date = amzDate.slice(0, 8)
  const host = `${cfg.bucket}.${cfg.accountId}.r2.cloudflarestorage.com`

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKeyId}/${date}/${S3_REGION}/${S3_SERVICE}/aws4_request`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  }

  const canonicalHeaders = `host:${host}\n`
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(query[name])}`)
    .join('&')

  const canonicalRequest = [
    method,
    `/${key}`,
    canonicalQuery,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const scope = `${date}/${S3_REGION}/${S3_SERVICE}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const signature = hmac(signingKey(cfg.secretAccessKey, date), stringToSign).toString('hex')
  query['X-Amz-Signature'] = signature

  const encodedQuery = Object.keys(query)
    .sort()
    .map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(query[name])}`)
    .join('&')

  return `https://${host}/${key}?${encodedQuery}`
}

export function isAllowedAttachmentName(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return ALLOWED_EXTENSIONS.has(ext)
}

export interface UploadTarget {
  key: string
  uploadUrl: string
  publicUrl: string
}

/**
 * Mint a presigned PUT URL for a single file plus its permanent public URL.
 * Keys are server-generated (uuid + validated extension) so clients can never
 * choose paths or overwrite other assets.
 */
export function createUploadTarget(fileName: string): UploadTarget {
  if (!isAllowedAttachmentName(fileName)) {
    throw new Error('File type not allowed')
  }
  const cfg = readConfig()
  const ext = (fileName.split('.').pop() || 'bin').toLowerCase()
  const key = `${runtimeBrand}/${crypto.randomUUID()}.${ext}`
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const uploadUrl = presignQuery(cfg, 'PUT', key, amzDate, 15 * 60)

  return {
    key,
    uploadUrl,
    publicUrl: `${cfg.publicUrl}/${key}`,
  }
}
