import { Router, Request, Response } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { optionalAuth } from '../../middleware/optional-auth'
import { runtimeBrand } from '../../utils/runtime-brand'
import { rateLimit } from '../../utils/rate-limit'
import { createUploadTarget, isAllowedAttachmentName, readConfig } from '../services/r2-service'

const router = Router()

const MAX_FILES_PER_REQUEST = 10

interface UploadRequestFile {
  name: string
  size?: number
}

/**
 * POST /{division}/upload — mint presigned R2 PUT URLs for direct browser
 * uploads, plus the permanent public URL for each file.
 *
 * Authentication is required — storage is billed to our account, so only
 * signed-in customers may upload. Keys are server-generated (brand/uuid.ext)
 * and the extension is validated, so a caller can never overwrite other
 * assets or upload arbitrary file types.
 */
router.post('/upload', requireAuth, rateLimit({ windowMs: 60 * 60 * 1000, max: 120 }), (req: Request, res: Response) => {
  try {
    const files: UploadRequestFile[] = Array.isArray(req.body?.files) ? req.body.files : null

    if (!files || files.length === 0 || files.length > MAX_FILES_PER_REQUEST) {
      res.status(400).json({ success: false, message: `Provide between 1 and ${MAX_FILES_PER_REQUEST} files` })
      return
    }

    const targets = []
    for (const file of files) {
      const name = String(file?.name ?? '').trim()
      if (!name || !isAllowedAttachmentName(name)) {
        res.status(400).json({ success: false, message: `File type not allowed: ${name}` })
        return
      }
      const size = Number(file?.size)
      if (Number.isFinite(size) && size > 10 * 1024 * 1024) {
        res.status(400).json({ success: false, message: `File too large: ${name} (max 10MB)` })
        return
      }
      targets.push(createUploadTarget(name))
    }

    res.json({ success: true, division: runtimeBrand, files: targets })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create upload URLs' })
  }
})

/**
 * GET /{division}/chat/download?url=...&name=... — proxy an attachment and
 * force it to download (Content-Disposition: attachment) instead of opening
 * inline. The url is validated to live under this brand's R2 public bucket so
 * the endpoint cannot be abused as an open proxy.
 */
router.get('/chat/download', optionalAuth, rateLimit({ windowMs: 60 * 60 * 1000, max: 600 }), async (req: Request, res: Response) => {
  try {
    const rawUrl = String(req.query.url ?? '')
    const name = String(req.query.name ?? 'attachment')

    const config = readConfig()
    const publicBase = config.publicUrl
    if (!rawUrl.startsWith(publicBase + '/')) {
      res.status(403).json({ success: false, message: 'Invalid attachment URL' })
      return
    }

    const upstream = await fetch(rawUrl)
    if (!upstream.ok) {
      res.status(404).json({ success: false, message: 'Attachment not found' })
      return
    }

    const safeName = name.replace(/[^\w.\- ]/g, '_')
    const body = await upstream.arrayBuffer()
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
    res.setHeader('Content-Length', String(Buffer.byteLength(body)))
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.status(200).send(Buffer.from(body))
  } catch {
    res.status(500).json({ success: false, message: 'Failed to download attachment' })
  }
})

export const uploadRouter = router
