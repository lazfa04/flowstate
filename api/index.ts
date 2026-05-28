import type { Request, Response } from 'express'

type Handler = (req: Request, res: Response) => void

let handler: Handler | null = null
let initError: unknown = null

const ready = (async () => {
  try {
    const { createApp } = await import('../server/src/app.js')
    handler = createApp() as unknown as Handler
  } catch (e) {
    initError = e
    console.error('[api] init failed:', e)
  }
})()

export default async function (req: Request, res: Response) {
  await ready
  if (initError) {
    const err = initError as { message?: string; stack?: string }
    res.status(500).json({
      initError: err?.message ?? String(initError),
      stack: err?.stack?.split('\n').slice(0, 8),
    })
    return
  }
  handler!(req, res)
}
