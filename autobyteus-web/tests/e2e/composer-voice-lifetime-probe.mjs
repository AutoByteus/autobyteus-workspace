#!/usr/bin/env node
// Durable renderer regression. Prerequisites: installed dependencies, built workspace contracts,
// `pnpm exec nuxt prepare`, and Chrome. Owns Nuxt/Chrome/page; never uses an installed app/data.
// Native getUserMedia + AudioContext + production AudioWorklet use synthetic PCM, NOT a real mic.
// Team events enter the actual schema/view; selection/projections/callers/button/store are real.
// Only transcription IPC is a fixture: no network Team producer, model or packaged-shell claim.
// pnpm test:e2e:composer-voice-lifetime [--output-dir <dir>] [--ledger-file <existing file>]
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1] }
const out = path.resolve(webDir, arg('output-dir', 'test-results/composer-voice-lifetime'))
const ledger = arg('ledger-file', null)
const pagePath = path.join(webDir, 'pages/api-e2e-composer-voice-lifetime.vue')
const fixturePath = path.join(webDir, 'tests/e2e/fixtures/composer-voice-lifetime.page.vue')
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
const evidencePath = path.join(out, 'evidence.json')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version,
  webDir, fixturePath, pagePath, cases: {}, pageErrors: [], apiRequests: [], cleanup: {}, failures: [] }
const persist = () => fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
const event = async (id, phase, message) => {
  if (ledger) await fs.appendFile(ledger, `\n${new Date().toISOString()} ${id} ${phase}: ${message}; evidence ${evidencePath}\n`)
}
async function waitFor(label, fn, timeout = 60000) {
  const end = Date.now() + timeout
  while (Date.now() < end) { const value = await fn(); if (value) return value; await delay(100) }
  throw new Error(`Timed out: ${label}`)
}
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer(); server.on('error', reject)
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)) })
})
// Synthetic PCM stays within owned output; Chrome consumes a native fake-device stream.
function syntheticWav() {
  const rate = 48000, count = rate * 10, wav = Buffer.alloc(44 + count * 2)
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
  wav.write('data', 36); wav.writeUInt32LE(count * 2, 40)
  for (let i = 0; i < count; i++) wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 220 * i / rate) * 8192), 44 + i * 2)
  return wav
}
let dev, log, browserServer, browser, page, pageInstalled = false, evidenceOwned = false
const state = () => page.evaluate(() => window.__composerVoiceProbe.snapshot())
const button = id => page.getByTestId(id)
const host = () => page.getByTestId('composer')
const mic = label => host().getByRole('button', { name: label, exact: true })
async function open(kind = 'run', viewport = { width: 1280, height: 800 }) {
  if (page) await page.evaluate(() => window.__composerVoiceProbe?.dispose())
  await page.setViewportSize(viewport)
  await page.goto(`${evidence.baseUrl}/api-e2e-composer-voice-lifetime?kind=${kind}`, { waitUntil: 'domcontentloaded' })
  await mic('Start voice input').waitFor()
  await host().locator('textarea').fill('existing draft')
  assert.equal((await state()).leadDraft, 'existing draft')
}
async function start(keyboard = false) {
  if (keyboard) { await mic('Start voice input').focus(); await mic('Start voice input').press('Enter') }
  else await mic('Start voice input').click()
  await waitFor('native worklet capture-stats', async () => { const s = await state(); return s.recording && s.captureStats && s.level > 0 })
  const s = await state()
  assert.deepEqual(s.tracks, ['live']); assert.deepEqual(s.audioContexts, ['running']); assert.equal(s.current, true)
  return s
}
async function publish(expected) {
  const before = await state()
  await button('publish').click()
  await waitFor('actual wrapper publication', async () => (await state()).publications === before.publications + 1)
  const after = await state()
  assert.equal(after.wrappersChanged, after.publications)
  assert.equal(after.key, before.key); assert.equal(after.current, true)
  assert.equal(after.cancellations, before.cancellations); assert.equal(after[expected], true)
  return after
}
async function appended() {
  await waitFor('once-only draft append', async () => (await state()).leadDraft === 'existing draft dictated words')
  const s = await state()
  assert.equal(await host().locator('textarea').inputValue(), s.leadDraft)
  assert.equal(s.ipc, 1); assert.equal(s.stops, 1); assert.equal(s.sends, 0); assert.equal(s.transcribing, false)
  assert.equal(s.outcome, 'transcript-ready'); assert.equal(s.error, null)
  assert.deepEqual(s.tracks, ['ended']); assert.deepEqual(s.audioContexts, ['closed'])
  assert.equal(s.wavs[0].riff, 0x52494646); assert.equal(s.wavs[0].wave, 0x57415645)
  assert(s.wavs[0].samples > 0 && s.diagnostics.sampleCount === s.wavs[0].samples)
  assert(s.diagnostics.rms > 0 && s.diagnostics.durationMs > 0)
  return s
}
async function scenario(id, description, fn) {
  await event(id, 'Started', `expected ${description}`)
  try {
    const observations = await fn()
    await page.screenshot({ path: path.join(out, `${id}.png`), fullPage: true })
    evidence.cases[id] = { result: 'Pass', description, observations }
  } catch (error) {
    evidence.cases[id] = { result: 'Fail', description, message: error.message, state: await state().catch(() => null) }
    evidence.failures.push({ id, message: error.message, stack: error.stack })
    await page.screenshot({ path: path.join(out, `${id}-failure.png`), fullPage: true }).catch(() => {})
    throw error
  } finally { await persist(); await event(id, 'Completed', `${evidence.cases[id].result}: ${description}`) }
}
async function stopDev() {
  if (!dev) return { result: 'not-started' }
  const exited = () => dev.exitCode !== null || dev.signalCode !== null
  const signal = sig => { try { process.kill(-dev.pid, sig) } catch (e) { if (e.code !== 'ESRCH') dev.kill(sig) } }
  signal('SIGTERM')
  try { await waitFor('owned Nuxt exit', exited, 10000) } catch { signal('SIGKILL'); await waitFor('owned Nuxt exit after kill', exited, 5000) }
  await waitFor('owned Nuxt process group exit', () => { try { process.kill(-dev.pid, 0); return false } catch(e) { if (e.code === 'ESRCH') return true; throw e } }, 10000)
  const portClosed = await new Promise(resolve => { const socket = net.connect(evidence.port, '127.0.0.1'); socket.once('connect', () => { socket.destroy(); resolve(false) }); socket.once('error', () => resolve(true)) })
  assert(portClosed, 'Owned Nuxt listener still open')
  return { result: 'terminated', pid: dev.pid, exitCode: dev.exitCode, signal: dev.signalCode, groupExited: true, portClosed }
}
try {
  assert(!existsSync(evidencePath), `Refusing to overwrite evidence ${evidencePath}; choose a fresh output directory`)
  assert(!existsSync(pagePath), `Refusing to overwrite page ${pagePath}`)
  assert(!ledger || existsSync(ledger), 'Ledger must be initialized first')
  assert(executablePath && existsSync(executablePath), 'Chrome unavailable; supply --browser-executable')
  await fs.mkdir(out, { recursive: true }); evidenceOwned = true
  const wavPath = path.join(out, 'synthetic-microphone.wav'); await fs.writeFile(wavPath, syntheticWav())
  await fs.copyFile(fixturePath, pagePath); pageInstalled = true
  evidence.port = await freePort(); evidence.baseUrl = `http://127.0.0.1:${evidence.port}`
  log = createWriteStream(path.join(out, 'nuxt-dev.log'))
  const env = Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL'].filter(k => process.env[k]).map(k => [k, process.env[k]]))
  dev = spawn('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(evidence.port)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:9', NUXT_TELEMETRY_DISABLED: '1' } })
  dev.stdout.pipe(log); dev.stderr.pipe(log); evidence.devPid = dev.pid; await persist()
  await waitFor('Nuxt HTTP ready', async () => { if (dev.exitCode !== null) throw new Error('Nuxt exited during startup'); return fetch(`${evidence.baseUrl}/api-e2e-composer-voice-lifetime`).then(r => r.ok).catch(() => false) })
  browserServer = await chromium.launchServer({ executablePath, headless: true, args: ['--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wavPath}`, '--disable-dev-shm-usage'] })
  evidence.browserPid = browserServer.process().pid
  browser = await chromium.connect(browserServer.wsEndpoint()); evidence.browserVersion = browser.version()
  const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Etc/UTC' })
  await context.route('**/graphql', async route => {
    const payload = route.request().postDataJSON(); evidence.apiRequests.push(payload)
    if (/mutation\s/i.test(payload.query ?? '')) evidence.failures.push({ message: 'Unexpected automatic mutation', operationName: payload.operationName })
    await route.fulfill({ json: { data: { collaboratorCandidates: [] } } })
  })
  page = await context.newPage(); page.on('pageerror', error => evidence.pageErrors.push(error.message))
  await scenario('B-001', 'Run caller survives repeated publications and Stop appends once/no Send', async () => {
    await open(); const initial = await start()
    await delay(3000) // Cross the existing capture-start watchdog window with genuine native stats.
    for (let i = 0; i < 3; i++) {
      const s = await publish('recording'); assert.equal(s.ipc, 0); assert.deepEqual(s.tracks, ['live'])
      assert(await mic('Stop recording').isEnabled()); assert((await host().innerText()).includes('Recording...'))
    }
    await page.screenshot({ path: path.join(out, 'B-001-recording.png'), fullPage: true })
    await mic('Stop recording').click(); return { initial, final: await appended() }
  })
  await scenario('B-002', 'Chat 390px viewport keyboard Start/Stop retains draft and no Send', async () => {
    await open('chat', { width: 390, height: 844 }); await start(true); await publish('recording')
    const box = await mic('Stop recording').boundingBox(); assert(box && box.x >= 0 && box.x + box.width <= 390)
    await mic('Stop recording').focus(); await mic('Stop recording').press('Space'); return await appended()
  })
  await scenario('B-003', 'Publication during deferred native microphone acquisition preserves startup', async () => {
    await open(); await button('startup').click(); await mic('Start voice input').click()
    await waitFor('deferred native media', async () => (await state()).pendingMedia)
    const pending = await publish('starting'); assert(await mic('Starting microphone...').isDisabled())
    await button('release-media').click(); await waitFor('capture after release', async () => (await state()).captureStats)
    assert.equal((await state()).recording, true); await mic('Stop recording').click()
    return { pending, final: await appended() }
  })
  await scenario('B-004', 'Genuine member change during startup disposes late acquired native stream', async () => {
    await open(); await button('startup').click(); await mic('Start voice input').click()
    await waitFor('deferred media', async () => (await state()).pendingMedia); await button('member').click()
    await button('release-media').click(); await waitFor('late stream disposal', async () => (await state()).tracks[0] === 'ended')
    const s = await state(); assert.equal(s.starting, false); assert.equal(s.recording, false)
    assert.equal(s.ipc, 0); assert.equal(s.sends, 0); assert.equal(s.leadDraft, 'existing draft'); assert.equal(s.reviewerDraft, '')
    return s
  })
  await scenario('B-005', 'Publication during pending transcription preserves once-only append', async () => {
    await open(); await button('ipc').click(); await start(); await mic('Stop recording').click()
    await waitFor('pending IPC', async () => (await state()).pendingIpc)
    const pending = await publish('transcribing'); assert(await mic('Transcribing...').isDisabled())
    await page.screenshot({ path: path.join(out, 'B-005-transcribing.png'), fullPage: true })
    await button('release-ipc').click(); return { pending, final: await appended() }
  })
  await scenario('B-006', 'Genuine member switch rejects late pending transcription', async () => {
    await open(); await button('ipc').click(); await start(); await mic('Stop recording').click()
    await waitFor('pending IPC', async () => (await state()).pendingIpc); await button('member').click()
    const cancelled = await state(); assert.equal(cancelled.transcribing, true); assert.equal(cancelled.focused, 'reviewer')
    await button('release-ipc').click(); await waitFor('IPC settlement', async () => !(await state()).transcribing)
    const s = await state(); assert.equal(s.leadDraft, 'existing draft'); assert.equal(s.reviewerDraft, '')
    assert.equal(await host().locator('textarea').inputValue(), ''); assert.equal(s.sends, 0)
    assert.deepEqual(s.tracks, ['ended']); assert.deepEqual(s.audioContexts, ['closed']); return { cancelled, final: s }
  })
  await scenario('B-007', 'Composer teardown cancels and disposes actual native capture', async () => {
    await open(); await start(); await button('unmount').click()
    await waitFor('native resource disposal', async () => { const s = await state(); return !s.recording && s.tracks[0] === 'ended' && s.audioContexts[0] === 'closed' })
    const s = await state(); assert.equal(s.ipc, 0); assert.equal(s.sends, 0); assert.equal(s.leadDraft, 'existing draft'); return s
  })
  assert.deepEqual(evidence.pageErrors, [], 'Unexpected browser page error')
  assert.deepEqual(evidence.failures, [], 'Unexpected API mutation/failure')
} catch(error) {
  evidence.failures.push({ message: error.message, stack: error.stack }); process.exitCode = 1; console.error(error)
} finally {
  try {
    if (page) { await page.evaluate(() => window.__composerVoiceProbe?.dispose()); evidence.cleanup.renderer = await state() }
    if (browserServer) { await browserServer.close(); evidence.cleanup.browser = { result: 'closed', pid: evidence.browserPid } }
  } catch(error) { evidence.failures.push({ cleanup: 'browser', message: error.message }); process.exitCode = 1 }
  try { evidence.cleanup.dev = await stopDev() } catch(error) { evidence.failures.push({ cleanup: 'Nuxt', message: error.message }); process.exitCode = 1 }
  log?.end()
  if (pageInstalled) { await fs.unlink(pagePath); evidence.cleanup.page = 'removed' }
  evidence.result = process.exitCode ? 'Fail' : 'Pass'; evidence.finishedAt = new Date().toISOString()
  if (evidenceOwned) await persist()
  console.log(JSON.stringify({ result: evidence.result, evidencePath, cases: Object.fromEntries(Object.entries(evidence.cases).map(([id, v]) => [id, v.result])), cleanup: evidence.cleanup }, null, 2))
}
