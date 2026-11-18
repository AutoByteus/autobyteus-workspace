// ab320 temporary: emulate the microphone in the instance renderer (attach over CDP).
// Usage: node mic-inject.mjs <controlPort> <speech|silence|deny|real> [wav path]
// speech/silence: navigator.mediaDevices.getUserMedia returns a MediaStream from a MediaStreamDestination that plays the
// WAV (the voice store then captures it through its own AudioContext + AudioWorklet, as with a microphone).
// deny: getUserMedia rejects with NotAllowedError (as a denied microphone). real: restores the original.
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, mode, wavPath] = process.argv.slice(2)
const b64 = wavPath ? fs.readFileSync(wavPath).toString('base64') : null
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html'))
const result = await page.evaluate(({ mode, b64 }) => {
  const md = navigator.mediaDevices
  if (!window.__abOriginalGetUserMedia) window.__abOriginalGetUserMedia = md.getUserMedia.bind(md)
  window.__abMicCalls = window.__abMicCalls ?? []
  if (mode === 'real') { md.getUserMedia = window.__abOriginalGetUserMedia; return 'restored' }
  md.getUserMedia = async (constraints) => {
    window.__abMicCalls.push({ mode, constraints, at: new Date().toISOString() })
    if (mode === 'deny') throw new DOMException('Permission denied', 'NotAllowedError')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const ctx = new AudioContext()
    const buffer = await ctx.decodeAudioData(bytes.buffer)
    const dest = ctx.createMediaStreamDestination()
    const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(dest); src.start()
    window.__abMicPlayback = { seconds: buffer.duration, startedAt: Date.now() }
    return dest.stream
  }
  return `getUserMedia emulated: ${mode}`
}, { mode, b64 })
console.log(result)
process.exit(0)
