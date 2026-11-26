#!/usr/bin/env node
// API/E2E (autobyteus-516) temporary probe, QR-002 "after": from the packaged app's main window (renderer), POST the same
// WAV to this computer's node's voice-input transcribe action, as voiceInputStore.transcribe does (the desktop attaches the
// owner credential), 1 + N runs; prints each time and the warm median.
//   node qr002-after-renderer.mjs <control port> <embedded node url> <clip.wav> <runs>
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, nodeUrl, clip, runs] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
let page
for (const p of browser.contexts().flatMap((c) => c.pages())) if ((await p.evaluate(() => window.electronAPI.getWindowContext()))?.entryId === 'embedded-local') page = p
const out = await page.evaluate(async ({ b64, url, n }) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const rows = []
  for (let i = 0; i <= n; i++) {
    const t0 = performance.now()
    const response = await fetch(`${url}/rest/extensions/voice-input/actions/transcribe`, { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: bytes })
    const body = await response.json()
    rows.push({ run: i, warm: i > 0, ms: Math.round(performance.now() - t0), status: response.status, text: body.output?.text ?? body.message })
  }
  return rows
}, { b64: (await fs.readFile(clip)).toString('base64'), url: nodeUrl, n: Number(runs) })
for (const row of out) console.log(JSON.stringify(row))
const warm = out.filter((r) => r.warm).map((r) => r.ms).sort((a, b) => a - b)
console.log(JSON.stringify({ summary: true, n: warm.length, medianMs: warm[Math.floor(warm.length / 2)], minMs: warm[0], maxMs: warm.at(-1) }))
process.exit(0)
