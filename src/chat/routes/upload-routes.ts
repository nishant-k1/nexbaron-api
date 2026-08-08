import { Router, Request, Response } from 'express'
import crypto from 'crypto'

const router = Router()

/**
 * Generates a Cloudinary unsigned upload signature for direct browser upload.
 * The client sends: api_key, timestamp, and this signature.
 */
router.post('/upload-signature', (req: Request, res: Response) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiSecret) {
      res.status(503).json({ success: false, message: 'Uploads not configured' })
      return
    }

    const timestamp = Math.round(Date.now() / 1000)
    const params: Record<string, string> = { timestamp: String(timestamp) }

    if (req.body.folder) params.folder = req.body.folder
    if (req.body.public_id) params.public_id = req.body.public_id

    // Sort params alphabetically for signature
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&') + apiSecret

    const signature = crypto.createHash('sha1').update(toSign).digest('hex')

    res.json({
      success: true,
      cloudName,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
    })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate signature' })
  }
})

export const uploadRouter = router
