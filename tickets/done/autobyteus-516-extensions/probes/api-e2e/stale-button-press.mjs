#!/usr/bin/env node
// API/E2E (autobyteus-516) temporary probe, AC-009 alternate: a node window still shows the microphone button after this
// computer's Voice Input was turned Off elsewhere; pressing it records, the embedded node answers EXTENSION_OFF, and the
// button hides at once. The microphone is the driver's Web Audio stand-in (as packaged-driver.mjs fake-mic).
//   node stale-button-press.mjs <control port> <node entry id> <clip.wav> <out.json>
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, entryId, clip, outFile] = process.argv.slice(2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
let page
for (const p of browser.contexts().flatMap((c) => c.pages())) if ((await p.evaluate(() => window.electronAPI.getWindowContext()))?.entryId === entryId) page = p
const data = (await fs.readFile(clip)).toString('base64')
await page.evaluate((b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const device = { deviceId: 'api-e2e-fake-mic', groupId: 'g', kind: 'audioinput', label: 'API/E2E fake microphone', toJSON() { return this } }
  navigator.mediaDevices.enumerateDevices = async () => [device]
  const q = navigator.permissions.query.bind(navigator.permissions)
  navigator.permissions.query = async (d) => (d?.name === 'microphone' ? { state: 'granted', addEventListener() {}, removeEventListener() {} } : q(d))
  navigator.mediaDevices.getUserMedia = async () => { const c = new AudioContext(); const s = c.createBufferSource(); s.buffer = await c.decodeAudioData(bytes.buffer.slice(0)); const d = c.createMediaStreamDestination(); s.connect(d); s.start(); return d.stream }
}, data)
const responses = []
page.on('response', async (r) => { if (r.url().includes('/actions/transcribe')) responses.push({ status: r.status(), url: r.url(), body: await r.text().catch(() => null) }) })
const result = { at: new Date().toISOString(), entryId, micBefore: await page.locator('button[aria-label="Start voice input"]').count() }
await page.locator('button[aria-label="Start voice input"]').first().click()
await sleep(4000)
await page.getByRole('button', { name: /Stop voice input|Stop recording/ }).first().click().catch((e) => { result.stopError = e.message })
await sleep(5000)
result.responses = responses
result.micAfter = await page.locator('button[aria-label="Start voice input"]').count()
result.composerText = await page.evaluate(() => [...document.querySelectorAll('textarea')].map((t) => t.value))
result.visibleError = await page.evaluate(() => [...document.querySelectorAll('[role="alert"], [role="status"]')].map((e) => e.innerText.trim()).filter(Boolean).slice(0, 5))
await page.screenshot({ path: outFile.replace(/\.json$/, '.png') })
await fs.writeFile(outFile, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
process.exit(0)
