import { Router } from 'express'

export const printRouter = Router()

// Print division placeholder. Mounts the same auth/draft structure as digital
// once print onboarding exists.
printRouter.get('/status', (req, res) => {
  res.json({ success: true, division: 'print', status: 'available' })
})