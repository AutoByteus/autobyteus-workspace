#!/usr/bin/env node
// Live probe: New chat Draft rows under the Chat row (ticket chat-new-draft-kept-on-navigation).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → a real
// runtime. Everything runs in an owned temp data root on free ports with a sanitized environment, so
// a running desktop app or the user's `~/.autobyteus` data is never touched.
//
// Prerequisites: `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build`,
// `pnpm -C autobyteus-web exec nuxt prepare`, Google Chrome, and a logged-in runtime CLI for the
// selected runtime (default Codex). Only the send cases (D07–D09) call the model, with tiny prompts.
//
// Usage: pnpm -C autobyteus-web test:e2e:chat-draft-rows-live [--runtime codex_app_server]
//        [--model <id>] [--output-dir test-results/chat-draft-rows-live] [--cases D01,D04]
//        [--ledger-file <initialized absolute path>] [--keep] [--serve-only]
// `--serve-only` starts the owned stack, prints its URLs and waits for Ctrl+C (no cases).
//
// Failure injection is limited to GraphQL responses that the real product would receive from a
// failing backend (team first send, agent first send after registration, workspace creation).
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const rootDir = path.resolve(webDir, '..')
const serverDir = path.join(rootDir, 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const runtime = arg('runtime', 'codex_app_server')
const preferredModel = arg('model', null) // default: the runtime's first listed model
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/chat-draft-rows-live'))
const ledgerFile = arg('ledger-file', null)
const keep = process.argv.includes('--keep')
const serveOnly = process.argv.includes('--serve-only')
const onlyCases = arg('cases', null)?.split(',') ?? null
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))

const evidence = { startedAt: new Date().toISOString(), runtime, cases: {}, processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 90000, interval = 250) => {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { last = await fn(); if (last) return last } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}

// A sanitized environment: nothing from a surrounding AutoByteus process leaks into owned processes.
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`))
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log)
  owned.push(child); evidence.processes.push({ label, pid: child.pid })
  return child
}
const stopOwned = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
  return exited ? 'SIGTERM' : 'SIGKILL'
}

let ownedRoot, dataRoot, browser, backendPort, frontendPort, backendUrl, frontUrl, dbUrl
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const writeAgent = async (id, name, skillNames = []) => {
  const dir = path.join(dataRoot, 'agents', id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${name}\ndescription: ${name} probe agent\nrole: Helper\n---\n\nYou are a helper. Follow the user's request exactly and reply briefly.\n`)
  await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames, inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2))
}
/** A small valid PNG (solid colour) so the composer shows a real image preview. */
const writePng = async (file, rgb = [79, 70, 229], size = 48) => {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.concat(Array.from({ length: size }, () => Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => rgb).flat())])))
  await fs.writeFile(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}

// ---------------------------------------------------------------------------------------------
// Page helpers (selectors are the product's data-test attributes)
const sel = (t) => `[data-test="${t}"]`
const composer = (page) => page.locator(sel('chat-composer')).first()
const composerInput = (page) => page.locator(`${sel('chat-composer')} textarea`).first()
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const routeOf = (page) => { const u = new URL(page.url()); return `${u.pathname}${u.search}` }
const push = (page, to) => page.evaluate((p) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(p), to)
const chatRow = (page) => page.locator(sel('app-left-panel-chat')).first()
const pencil = (page) => page.locator(sel('app-left-panel-new-chat')).first()
const rowsList = (page) => page.locator(sel('chat-draft-rows')).first()
const draftRows = (page) => page.locator(`${sel('chat-draft-rows')} ${sel('chat-draft-row')}`)

/** The rows as the user sees them: preview text, selection, aria, × visibility. */
const readRows = (page) => page.evaluate(() => [...document.querySelectorAll('[data-test="chat-draft-rows"] > li')].filter((li) => !/chat-draft-row-leave/.test(li.className)).map((li) => {
  const row = li.querySelector('[data-test="chat-draft-row"]')
  const x = li.querySelector('[data-test="chat-draft-discard"]')
  return {
    id: li.getAttribute('data-draft-id'),
    text: row.innerText.trim(),
    selected: row.getAttribute('aria-current') === 'page',
    ariaLabel: row.getAttribute('aria-label'),
    title: row.getAttribute('title'),
    xOpacity: getComputedStyle(x).opacity,
    xLabel: x.getAttribute('aria-label'),
  }
}))
const rowTexts = async (page) => (await readRows(page)).map((r) => r.text)
/** The product's Tailwind tokens as this build computes them (the spec names tokens, not raw values). */
let TOKENS = null
const readTokens = async (page) => {
  TOKENS = await page.evaluate(() => {
    const probe = (cls, prop) => { const el = document.createElement('div'); el.className = cls; document.body.appendChild(el); const v = getComputedStyle(el)[prop]; el.remove(); return v }
    return {
      gray100: probe('bg-gray-100', 'backgroundColor'), gray200: probe('bg-gray-200', 'backgroundColor'),
      gray900: probe('text-gray-900', 'color'), gray700: probe('text-gray-700', 'color'), gray400: probe('text-gray-400', 'color'),
      indigo500: probe('text-indigo-500', 'color'),
    }
  })
  return TOKENS
}
/** The Chat row's selected style (bg-gray-100 + gray-900), read from computed colours. */
const chatRowSelected = async (page) => { await delay(250); return chatRow(page).evaluate((el, t) => getComputedStyle(el).backgroundColor === t.gray100 && getComputedStyle(el).color === t.gray900, TOKENS) }

const waitForNewChat = async (page) => { await page.locator(sel('chat-new')).waitFor({ timeout: 120000 }); await composerInput(page).waitFor({ timeout: 60000 }) }
const gotoNewChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await waitForNewChat(page)
  await delay(800)
}
const clickChat = async (page) => { await chatRow(page).click(); await page.waitForURL((u) => u.pathname === '/chat' && !u.searchParams.get('id')); await waitForNewChat(page) }
const clickPencil = async (page) => { await pencil(page).click(); await page.waitForURL((u) => u.pathname === '/chat' && !u.searchParams.get('id')); await waitForNewChat(page) }
const openRow = async (page, text) => {
  await draftRows(page).filter({ hasText: text }).first().click()
  await page.waitForURL((u) => u.pathname === '/chat' && !u.searchParams.get('id'))
  await waitForNewChat(page)
  await page.waitForFunction((t) => document.querySelector('[data-test="chat-composer"] textarea')?.value === t || document.querySelector('[aria-current="page"][data-test="chat-draft-row"]')?.innerText.trim() === t, text, { timeout: 10000 }).catch(() => {})
}
const typeText = async (page, text) => { const input = composerInput(page); await input.click(); await input.type(text, { delay: 5 }) }
const switchTarget = async (page, query, id) => {
  await page.locator(sel('run-target-switcher-trigger')).click()
  await page.locator(sel('run-target-switcher-search')).fill(query)
  await page.locator(sel(`run-target-switcher-option-${id}`)).click()
  await page.locator(sel('run-target-switcher-menu')).waitFor({ state: 'detached', timeout: 30000 })
}
const attach = async (page, file) => {
  const before = await composer(page).innerText()
  await page.locator(`${sel('chat-composer')} input[type="file"]`).first().setInputFiles(file)
  await waitFor('attachment chip', async () => /Context Files \(1\)/.test(await composer(page).innerText()) && (await composer(page).innerText()) !== before, 60000)
}
/** Everything the New chat shows for the open draft (REQ-003 fields). */
const snapshotNewChat = async (page) => page.evaluate(() => {
  const q = (t) => document.querySelector(`[data-test="${t}"]`)
  const composerEl = q('chat-composer')
  const imgs = [...(composerEl?.querySelectorAll('img') ?? [])].map((img) => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 }))
  return {
    target: q('run-target-name')?.innerText.trim() ?? null,
    text: composerEl?.querySelector('textarea')?.value ?? null,
    contextFiles: (composerEl?.innerText.match(/Context Files \((\d+)\)/) ?? [])[1] ?? '0',
    images: imgs,
    workspace: q('chat-workspace-trigger')?.innerText.trim() ?? null,
    approval: q('chat-approval-toggle')?.innerText.trim() ?? null,
    approvalPressed: q('chat-approval-toggle')?.getAttribute('aria-pressed') ?? q('chat-approval-toggle')?.getAttribute('aria-checked') ?? null,
    model: q('chat-model-trigger')?.innerText.trim().replace(/\s+/g, ' ') ?? null,
    thinking: q('chat-thinking-trigger')?.innerText.trim().replace(/\s+/g, ' ') ?? null,
    members: q('run-members-line-text')?.innerText.trim().replace(/\s+/g, ' ') ?? null,
    chips: q('chat-composer-chips')?.innerText.trim().replace(/\s+/g, ' ') ?? null,
    caretInBox: document.activeElement === composerEl?.querySelector('textarea'),
  }
})
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const openRuntimeList = async (page, runtimeKind) => {
  const list = page.locator(sel(`chat-model-list-${runtimeKind}`))
  const row = page.locator(sel(`chat-runtime-${runtimeKind}`))
  for (let attempt = 0; attempt < 6 && !(await list.isVisible().catch(() => false)); attempt += 1) {
    await row.hover().catch(() => {}); await delay(400)
    if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await delay(700) }
  }
  await list.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const rowBox = await row.boundingBox({ timeout: 1000 }).catch(() => null)
  const listBox = await list.boundingBox({ timeout: 1000 }).catch(() => null)
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 })
  return list
}
const pickModel = async (page, runtimeKind, model) => {
  await page.locator(sel('chat-model-trigger')).click()
  const list = await openRuntimeList(page, runtimeKind)
  const models = await list.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = model && models.includes(model) ? model : models[0]
  await list.locator(sel(`chat-model-option-${chosen}`)).click()
  await page.keyboard.press('Escape').catch(() => {})
  return { chosen, models }
}

const state = { model: null, existingRunId: null, image: null, image2: null }
const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
let ledgerSeq = 0
const ledger = async (line) => { if (ledgerFile) await fs.appendFile(ledgerFile, `${line}\n`) }

const draftState = (page) => page.evaluate(() => {
  const s = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('chatDraft')
  return { openId: s.openDraftId, drafts: s.drafts.map((d) => ({ id: d.id, listed: d.listed, text: d.context?.requirement ?? null, files: d.context?.contextFilePaths?.length ?? 0, starting: d.starting })) }
})
const storageDump = (page) => page.evaluate(async () => ({
  local: Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])),
  session: Object.fromEntries(Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)])),
  indexedDb: (await indexedDB.databases?.().catch(() => []) ?? []).map((d) => d.name).sort(),
}))
/** Records row enter/leave classes and computed transition durations as Vue applies them. */
const watchRowMotion = (page) => page.evaluate(() => {
  window.__rowMotion = []
  window.__rowObserver?.disconnect()
  const list = document.querySelector('[data-test="chat-draft-rows"]')
  const record = (kind, li) => window.__rowMotion.push({ kind, id: li.getAttribute('data-draft-id'), cls: li.className, duration: getComputedStyle(li).transitionDuration, timing: getComputedStyle(li).transitionTimingFunction, t: performance.now() })
  window.__rowObserver = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') {
        // Vue's TransitionGroup appends and removes a shallow clone carrying the move class to test for a
        // move transition; that probe is not a row entering or leaving.
        const real = (n) => n.nodeType === 1 && n.tagName === 'LI' && !/chat-draft-row-move/.test(n.className)
        r.addedNodes.forEach((n) => real(n) && record('added', n))
        r.removedNodes.forEach((n) => real(n) && window.__rowMotion.push({ kind: 'removed', id: n.getAttribute('data-draft-id'), t: performance.now() }))
      } else if (r.type === 'attributes' && r.target.tagName === 'LI' && /leave-active/.test(r.target.className) && !window.__rowMotion.some((m) => m.kind === 'leave' && m.id === r.target.getAttribute('data-draft-id'))) record('leave', r.target)
    }
  })
  window.__rowObserver.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
})
const rowMotion = (page) => page.evaluate(() => window.__rowMotion ?? [])
const selectAllDelete = async (page) => { const input = composerInput(page); await input.click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await page.keyboard.press('Backspace') }
const atSize = async (page, w, h, fn) => { const prev = page.viewportSize(); await page.setViewportSize({ width: w, height: h }); await delay(400); try { return await fn() } finally { await page.setViewportSize(prev); await delay(300) } }
const sameDraft = (a, b) => ['target', 'text', 'contextFiles', 'workspace', 'approval', 'model', 'thinking', 'members', 'chips'].every((k) => a[k] === b[k]) && a.images.length === b.images.length && a.images.every((img, i) => img.src === b.images[i].src)
const openSeedRun = async (page) => {
  const row = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${state.seedRunId}"]`).first()
  if (!(await row.isVisible().catch(() => false))) await page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="autobyteus-daily-assistant"]').first().click()
  await row.click()
  await page.waitForURL((u) => u.searchParams.get('id') === state.seedRunId)
  await page.locator(RUN_VIEW).waitFor({ timeout: 60000 })
  await delay(500)
}
const navTo = async (page, label, urlPart) => { await page.locator(`${sel('app-left-panel-primary-nav')} button`).filter({ hasText: new RegExp(`^${label}$`) }).first().click(); await page.waitForURL((u) => u.pathname.startsWith(urlPart)); await delay(800) }
const send = (page) => page.locator(sel('chat-primary-action')).first().click()
/** Samples what the sent draft's row shows from Send until the launch lands (TR-004: the row only fades out). */
const startRowSampler = (page, draftId) => page.evaluate((id) => {
  const t0 = performance.now(); window.__rowSamples = []
  window.__rowSampler = setInterval(() => {
    const li = document.querySelector(`[data-test="chat-draft-rows"] > li[data-draft-id="${id}"]`)
    const text = li ? li.querySelector('[data-test="chat-draft-preview"]')?.innerText.trim() : null
    const last = window.__rowSamples[window.__rowSamples.length - 1]
    if (!last || last.text !== text) window.__rowSamples.push({ t: Math.round(performance.now() - t0), text, path: location.pathname + location.search })
  }, 20)
}, draftId)
const stopRowSampler = (page) => page.evaluate(() => { clearInterval(window.__rowSampler); return window.__rowSamples })
const emptyDraftMs = (samples) => samples.reduce((ms, s, i) => s.text === 'Empty draft' ? ms + ((samples[i + 1]?.t ?? s.t) - s.t) : ms, 0)
const waitReply = (page, marker, timeout = 240000) => page.waitForFunction((m) => [...(document.querySelector('[data-testid="agent-workspace-surface"]')?.querySelectorAll('*') ?? [])].some((n) => n.children.length === 0 && n.textContent.trim() === m), marker, { timeout })
const pickThinking = async (page, option) => { await page.locator(`${sel('chat-composer')} ${sel('chat-thinking-trigger')}`).click(); await page.locator(sel(`chat-thinking-option-reasoning_effort-${option}`)).click(); await page.keyboard.press('Escape').catch(() => {}); await delay(300) }
const T = {
  team: 'Team draft: compare the screenshot with the seed run answer',
  agent: 'Agent draft: ask the writer about the notes',
}

defineCase('D00', 'Seed: a real New chat send leaves no row (REQ-006) and records the run to visit', async (page) => {
  await gotoNewChat(page)
  state.baselineStorage = await storageDump(page)
  state.tokens = await readTokens(page)
  const picked = await pickModel(page, runtime, preferredModel)
  state.model = picked.chosen; state.models = picked.models
  await typeText(page, 'Reply with exactly SEED-OK and nothing else.')
  assert((await rowTexts(page)).length === 1, 'No row while typing the seed message', await rowTexts(page))
  await startRowSampler(page, (await readRows(page))[0].id)
  await send(page)
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  await delay(300)
  state.sendSamples = { seedAgent: await stopRowSampler(page) }
  state.seedRunId = new URL(page.url()).searchParams.get('id')
  await waitReply(page, 'SEED-OK')
  await delay(500)
  const rows = await readRows(page); const store = await draftState(page)
  assert(rows.length === 0, 'The sent draft still has a row', rows)
  // TR-004: on Send the row keeps its text until the run opens, then fades out; "Empty draft" is only for text the user cleared (TR-008).
  assert(emptyDraftMs(state.sendSamples.seedAgent) === 0, 'The sent row reads "Empty draft" while the send is in flight (TR-004)', { emptyDraftMs: emptyDraftMs(state.sendSamples.seedAgent), samples: state.sendSamples.seedAgent })
  assert(store.drafts.every((d) => !d.listed && !d.text), 'The sent draft is still kept', store)
  return { seedRunId: state.seedRunId, model: state.model, models: state.models, store, sendRowSamples: state.sendSamples.seedAgent }
})

defineCase('D01', 'AC-001 alternates + VIS-001: attachment, lone /command, skill chip and settings alone make no row; a textless New chat is not kept', async (page) => {
  await clickChat(page)
  const empty = { rows: await readRows(page), ariaHidden: await rowsList(page).getAttribute('aria-hidden'), chatSelected: await chatRowSelected(page) }
  assert(empty.rows.length === 0 && empty.ariaHidden === 'true' && empty.chatSelected, 'Blank New chat is not as today (VIS-001)', empty)
  await atSize(page, 800, 738, () => shot(page, 'VIS-001-new-chat-no-drafts-800x738'))
  await attach(page, state.image)
  const afterAttach = (await readRows(page)).length
  await typeText(page, '/probe-no')
  await page.locator(sel('chat-skill-option-probe-notes')).waitFor({ timeout: 30000 })
  const loneCommand = (await readRows(page)).length
  await page.keyboard.press('Enter')
  await delay(500)
  const chips = await page.locator(`${sel('chat-composer')} ${sel('chat-composer-chips')}`).innerText().catch(() => '')
  const afterSkill = (await readRows(page)).length
  await page.locator(sel('chat-approval-toggle')).click()
  const afterSettings = (await readRows(page)).length
  const before = await draftState(page)
  assert([afterAttach, loneCommand, afterSkill, afterSettings].every((n) => n === 0), 'A row appeared without typed text (REQ-001)', { afterAttach, loneCommand, afterSkill, afterSettings, chips })
  await clickPencil(page)
  const after = await draftState(page); const snap = await snapshotNewChat(page)
  assert(after.drafts.length === 1 && after.drafts[0].id !== before.openId && snap.contextFiles === '0' && !snap.chips && snap.text === '', 'The textless New chat was kept (REQ-004)', { before, after, snap })
  assert((await readRows(page)).length === 0, 'Row after pencil on a textless New chat')
  return { chips, before, after }
})

defineCase('D02', 'SCN-001 Team (AC-001/002, VIS-002/004): row at the first character; leave to a run; the row restores target, image, text, workspace, model, thinking, Ask first and member customization', async (page) => {
  const folder = path.join(ownedRoot, 'team-folder'); await fs.mkdir(folder, { recursive: true })
  await switchTarget(page, 'probe-te', state.teamId)
  await page.locator(`${sel('chat-composer')} ${sel('chat-approval-toggle')}`).click()
  await page.locator(sel('chat-workspace-trigger')).click()
  await page.locator(sel('chat-workspace-open-folder')).click()
  const folderInput = page.locator(`${sel('chat-workspace-folder-form')} input`)
  await folderInput.fill(folder); await folderInput.press('Enter')
  await delay(500)
  await pickModel(page, runtime, state.model)
  await pickThinking(page, 'high')
  // The writer member keeps Auto-approve while the root is Ask first: a real member customization.
  await page.locator(sel('run-members-open')).click()
  await page.locator(`[data-test="run-member-/writer"] [data-test="run-member-toggle"]`).click()
  await page.locator(`[data-test="run-member-/writer"] [data-test="chat-approval-toggle"]`).click()
  const customized = await page.locator(`[data-test="run-member-/writer"] [data-test="run-member-summary"]`).innerText()
  await page.locator(sel('run-member-settings-done')).click()
  await page.locator(sel('run-member-settings-drawer')).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})
  assert(/Customized/.test(customized) && /Auto-approve/.test(customized), 'Member customization not applied', customized)
  await attach(page, state.image)
  assert((await readRows(page)).length === 0, 'Row before typing')
  await watchRowMotion(page)
  await composerInput(page).click(); await page.keyboard.type('T')
  await delay(60)
  const first = { rows: await readRows(page), chatSelected: await chatRowSelected(page) }
  assert(first.rows.length === 1 && first.rows[0].text === 'T' && first.rows[0].selected && first.rows[0].xOpacity === '1' && !first.chatSelected, 'No selected row at the first typed character (AC-001)', first)
  await page.keyboard.type(T.team.slice(1), { delay: 5 })
  await delay(300)
  const s1 = await snapshotNewChat(page)
  const typed = await readRows(page)
  assert(typed[0].text === T.team && typed[0].ariaLabel === `Draft: ${T.team} — Probe Team` && typed[0].title === `${T.team}\nProbe Team` && typed[0].xLabel === `Discard draft: ${T.team}`, 'Row names/tooltip wrong', typed)
  state.teamDraftId = typed[0].id
  await atSize(page, 800, 738, () => shot(page, 'VIS-002-first-text-draft-row-selected-800x738'))
  await openSeedRun(page)
  const onRun = { rows: await readRows(page), chatSelected: await chatRowSelected(page) }
  assert(onRun.rows.length === 1 && !onRun.rows[0].selected && onRun.rows[0].xOpacity === '0' && onRun.chatSelected, 'On a run: row not kept unselected / Chat row not as for a chat run (VIS-003)', onRun)
  await openRow(page, T.team)
  await delay(800)
  const s2 = await snapshotNewChat(page)
  const back = { rows: await readRows(page), chatSelected: await chatRowSelected(page) }
  assert(sameDraft(s1, s2), 'Re-entered Team draft differs (AC-002)', { s1, s2 })
  assert(s2.images.length === 1 && s2.images[0].loaded, 'Image preview does not resolve after re-entry', s2.images)
  assert(back.rows[0].selected && !back.chatSelected, 'Row not selected after re-entry (REQ-003)', back)
  await page.locator(sel('run-members-open')).click()
  const writer = await page.locator(`[data-test="run-member-/writer"] [data-test="run-member-summary"]`).innerText()
  await page.locator(sel('run-member-settings-done')).click()
  await delay(400)
  assert(writer === customized, 'Member customization lost on re-entry', { writer, customized })
  await atSize(page, 800, 738, () => shot(page, 'VIS-004-draft-reentered-restored-selected-800x738'))
  state.teamSnapshot = s2
  return { s1, s2, writer, caretInBoxAfterReentry: s2.caretInBox, motion: await rowMotion(page) }
})

defineCase('D03', 'SCN-001 Agent (AC-002): skill chip, @ mention, image, model and thinking restored after another page; editing does not reorder', async (page) => {
  await clickPencil(page)
  await switchTarget(page, 'probe-hel', 'probe-helper')
  const other = state.models.find((m) => m !== state.model) ?? state.model
  await pickModel(page, runtime, other)
  await pickThinking(page, 'low')
  await attach(page, state.image2)
  await typeText(page, '/probe-no')
  await page.locator(sel('chat-skill-option-probe-notes')).waitFor({ timeout: 30000 })
  await page.keyboard.press('Enter')
  await composerInput(page).type('@')
  await page.locator(sel('run-mention-menu')).waitFor({ timeout: 30000 })
  await page.locator(sel('run-mention-option-probe-writer')).click()
  await composerInput(page).type(` ${T.agent}`, { delay: 5 })
  await delay(300)
  const s1 = await snapshotNewChat(page)
  state.agentText = s1.text
  state.agentRow = s1.text.replace(/\s+/g, ' ').trim()
  const rows = await readRows(page)
  assert(rows.length === 2 && rows[0].selected && rows[1].text === T.team, 'Rows not newest first (REQ-002)', rows)
  await navTo(page, 'Agents', '/agents')
  const onAgents = { rows: await readRows(page), chatSelected: await chatRowSelected(page) }
  assert(onAgents.rows.length === 2 && onAgents.rows.every((r) => !r.selected) && !onAgents.chatSelected, 'Rows/selection wrong on another page', onAgents)
  await openRow(page, rows[0].text)
  await delay(800)
  const s2 = await snapshotNewChat(page)
  assert(sameDraft(s1, s2) && s2.images[0]?.loaded, 'Re-entered Agent draft differs (AC-002)', { s1, s2 })
  await openRow(page, T.team)
  const team = await snapshotNewChat(page)
  assert(sameDraft(team, state.teamSnapshot), 'Team draft changed after opening the agent draft', { team, before: state.teamSnapshot })
  await composerInput(page).press('End'); await composerInput(page).type(' (edited)')
  T.team = `${T.team} (edited)`
  state.teamSnapshot = await snapshotNewChat(page)
  const order = await rowTexts(page)
  assert(order[0] === rows[0].text && order[1] === T.team, 'Editing reordered the rows (REQ-002)', order)
  return { s1, s2, order }
})

defineCase('D04', 'SCN-002 (AC-003/004): Chat, pencil, catalog Run, Team Run, run header + and tree + start fresh and keep both drafts', async (page) => {
  const steps = {}
  const check = async (label, expectTarget) => {
    const snap = await snapshotNewChat(page); const rows = await readRows(page); const store = await draftState(page)
    steps[label] = { target: snap.target, text: snap.text, files: snap.contextFiles, rows: rows.map((r) => r.text), selected: rows.filter((r) => r.selected).length, chatSelected: await chatRowSelected(page), stored: store.drafts.length }
    assert(snap.text === '' && snap.contextFiles === '0' && snap.target === expectTarget, `${label}: not a fresh New chat for ${expectTarget}`, steps[label])
    assert(rows.length === 2 && rows[1].text === T.team && rows.every((r) => !r.selected) && steps[label].chatSelected, `${label}: drafts not kept / selection wrong`, steps[label])
    assert(store.drafts.length === 3, `${label}: a textless New chat was kept`, store)
  }
  await clickChat(page); await check('chat', 'Daily Assistant')
  await clickPencil(page); await check('pencil', 'Daily Assistant')
  await navTo(page, 'Agents', '/agents')
  const card = page.locator('div,article,li').filter({ has: page.getByText('Probe Writer', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
  await card.getByRole('button', { name: /^Run/ }).first().click(); await waitForNewChat(page); await delay(500)
  await check('agent catalog Run', 'Probe Writer')
  await navTo(page, 'Agent Teams', '/agent-teams')
  const teamCard = page.locator('div,article,li').filter({ has: page.getByText('Probe Team', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
  await teamCard.getByRole('button', { name: /^Run/ }).first().click(); await waitForNewChat(page); await delay(500)
  await check('team catalog Run', 'Probe Team')
  await openSeedRun(page)
  await page.locator(`${RUN_VIEW} button[aria-label="New Agent"]`).first().click(); await waitForNewChat(page); await delay(500)
  await check('run header +', 'Daily Assistant')
  await openSeedRun(page)
  await page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="autobyteus-daily-assistant"]').first().locator('xpath=..').locator('button').nth(1).click()
  await waitForNewChat(page); await delay(500)
  await check('workspace tree +', 'Daily Assistant')
  await openRow(page, T.agent)
  const agent = await snapshotNewChat(page)
  assert(agent.text === state.agentText && agent.contextFiles === '1' && /probe-notes/.test(agent.chips ?? ''), 'Agent draft not intact after the starts', agent)
  assert((await draftState(page)).drafts.length === 2, 'The blank New chat left was not dropped on re-entry')
  return steps
})

defineCase('D05', 'SCN-005 (AC-007, VIS-005) + retarget keeps the same draft: Empty draft until left, via a row, Chat or another page', async (page) => {
  await clickPencil(page)
  await typeText(page, 'Temporary words to clear')
  const id = (await readRows(page))[0].id
  await switchTarget(page, 'probe-wri', 'probe-writer')
  const afterRetarget = await readRows(page)
  assert(afterRetarget[0].id === id && afterRetarget[0].text === 'Temporary words to clear' && afterRetarget.length === 3, 'Heading switcher changed the draft identity or text', afterRetarget)
  await selectAllDelete(page)
  const emptyRow = await page.evaluate((i) => { const span = document.querySelector(`[data-draft-id="${i}"] [data-test="chat-draft-preview"]`); const s = getComputedStyle(span); return { text: span.innerText, italic: s.fontStyle, color: s.color } }, id)
  const rowsEmpty = await readRows(page)
  assert(emptyRow.text === 'Empty draft' && emptyRow.italic === 'italic' && emptyRow.color === TOKENS.gray400 && rowsEmpty[0].selected && rowsEmpty[0].xOpacity === '1', 'Cleared open draft not shown as Empty draft (VIS-005)', { emptyRow, rowsEmpty })
  await atSize(page, 800, 738, () => shot(page, 'VIS-005-open-draft-text-cleared-empty-draft-800x738'))
  await composerInput(page).type('again')
  const again = (await readRows(page))[0].text
  await selectAllDelete(page)
  await openRow(page, T.team)
  const viaRow = await readRows(page); const store1 = await draftState(page)
  assert(again === 'again' && viaRow.length === 2 && !viaRow.some((r) => r.id === id) && !store1.drafts.some((d) => d.id === id), 'Empty draft not dropped after opening another row', { again, viaRow, store1 })
  await clickPencil(page); await typeText(page, 'Another temporary'); await selectAllDelete(page)
  const id2 = (await readRows(page))[0].id
  await clickChat(page)
  const viaChat = await readRows(page)
  assert(viaChat.length === 2 && !viaChat.some((r) => r.id === id2), 'Empty draft not dropped after Chat', viaChat)
  await typeText(page, 'Third temporary'); await selectAllDelete(page)
  await navTo(page, 'Agents', '/agents')
  const viaPage = await readRows(page)
  assert(viaPage.length === 2, 'Empty draft still shown on another page', viaPage)
  return { afterRetarget, emptyRow, viaRow: viaRow.map((r) => r.text), viaChat: viaChat.map((r) => r.text), viaPage: viaPage.map((r) => r.text) }
})

defineCase('D06', 'AC-005 alternate + RU-4: a Team launch failure and an agent failure before registration keep the user on New chat with the draft and row', async (page) => {
  const injected = []
  let failOp = /mutation\s+CreateAgentTeamRun/
  await page.route('**/graphql', async (route) => {
    const body = route.request().postData() ?? ''
    if (failOp && failOp.test(body)) {
      injected.push(/CreateAgentTeamRun/.test(body) ? 'team' : 'workspace'); failOp = null
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Injected launch failure (probe)' }] }) })
    }
    return route.continue()
  })
  try {
    await openRow(page, T.team)
    await send(page)
    await waitFor('team failure handled', async () => injected.includes('team') && !(await draftState(page)).drafts.some((d) => d.starting), 30000)
    const teamToast = await waitFor('team failure toast', async () => (await page.locator('[data-testid="toast-container"]').innerText().catch(() => '')).trim() || null, 5000).catch(() => '')
    await delay(1000)
    const team = { route: routeOf(page), rows: await readRows(page), snap: await snapshotNewChat(page), toast: teamToast }
    assert(team.route === '/chat' && team.rows.length === 2 && team.rows.find((r) => r.text === T.team)?.selected && sameDraft(team.snap, state.teamSnapshot), 'Team launch failure did not keep the draft (REQ-006)', team)
    const folder = path.join(ownedRoot, 'agent-folder'); await fs.mkdir(folder, { recursive: true })
    await openRow(page, T.agent)
    await page.locator(sel('chat-workspace-trigger')).click()
    await page.locator(sel('chat-workspace-open-folder')).click()
    const input = page.locator(`${sel('chat-workspace-folder-form')} input`); await input.fill(folder); await input.press('Enter')
    await delay(500)
    const agentBefore = await snapshotNewChat(page)
    failOp = /mutation\s+CreateWorkspace/
    await send(page)
    await waitFor('agent pre-registration failure handled', async () => injected.includes('workspace') && !(await draftState(page)).drafts.some((d) => d.starting), 30000)
    const agentToast = await waitFor('agent failure toast', async () => (await page.locator('[data-testid="toast-container"]').innerText().catch(() => '')).trim() || null, 5000).catch(() => '')
    await delay(1000)
    const agent = { route: routeOf(page), rows: await readRows(page), snap: await snapshotNewChat(page), toast: agentToast }
    assert(agent.route === '/chat' && agent.rows.length === 2 && agent.rows.find((r) => r.text === state.agentRow)?.selected && sameDraft(agent.snap, agentBefore), 'Agent pre-registration failure did not keep the draft', { agent, agentBefore })
    state.agentSnapshot = agent.snap
    await shot(page, 'D06-agent-pre-registration-failure')
    return { injected, team: { ...team, snap: undefined }, agent: { ...agent, snap: undefined }, agentBefore }
  } finally { await page.unroute('**/graphql') }
})

defineCase('D07', 'SCN-003 (AC-005, RU-2): real Team and Agent sends from re-entered drafts; only the sent row goes; attachments, skill and mention reach the runs', async (page) => {
  await openRow(page, T.team)
  await startRowSampler(page, (await readRows(page)).find((r) => r.text === T.team).id)
  await send(page)
  await page.waitForURL(/\/workspace/, { timeout: 180000 })
  await delay(300)
  state.sendSamples.team = await stopRowSampler(page)
  await delay(1200)
  const afterTeam = await readRows(page)
  assert(afterTeam.length === 1 && afterTeam[0].text === state.agentRow && !afterTeam[0].selected, 'After the Team send: wrong rows', afterTeam)
  await page.waitForFunction((t) => (document.querySelector('main')?.innerText ?? '').includes(t), T.team, { timeout: 120000 })
  const teamImages = await page.evaluate(() => [...document.querySelectorAll('main img')].map((i) => ({ src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0 })))
  const history = await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { teamDefinitions { teamDefinitionId runs { teamRunId summary } } } }')
  const teamRun = history.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions ?? []).find((t) => t.teamDefinitionId === state.teamId)?.runs?.[0]
  assert(teamRun, 'No Team run recorded', history)
  assert(teamImages.some((i) => i.loaded && !/\/rest\/drafts\//.test(i.src ?? '')), 'The Team message does not show the finalized image', teamImages)
  await openRow(page, T.agent)
  await startRowSampler(page, (await readRows(page)).find((r) => r.text === state.agentRow).id)
  await send(page)
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
  await delay(300)
  state.sendSamples.agent = await stopRowSampler(page)
  const agentRunId = new URL(page.url()).searchParams.get('id')
  assert(emptyDraftMs(state.sendSamples.team) === 0 && emptyDraftMs(state.sendSamples.agent) === 0, 'A sent row reads "Empty draft" while the send is in flight (TR-004)', state.sendSamples)
  await delay(1500)
  const afterAgent = await readRows(page)
  assert(afterAgent.length === 0, 'After the Agent send: the row is still there', afterAgent)
  const projection = await waitFor('agent projection', async () => {
    const p = (await gql('query($runId:String!){getRunProjection(runId:$runId){conversation}}', { runId: agentRunId })).getRunProjection
    return p.conversation.find((e) => e.role === 'user') ? p : null
  }, 60000)
  const firstUser = projection.conversation.find((e) => e.role === 'user')
  const userText = typeof firstUser.content === 'string' ? firstUser.content : JSON.stringify(firstUser)
  assert(/probe-notes/.test(userText) && userText.includes(T.agent), 'The sent agent message lost the restored skill or text', firstUser)
  const cfg = (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){metadataConfig{llmModelIdentifier llmConfig workspaceRootPath agentDefinitionId}}}', { runId: agentRunId })).getAgentRunResumeConfig.metadataConfig
  assert(cfg.agentDefinitionId === 'probe-helper' && /low/.test(JSON.stringify(cfg.llmConfig)) && cfg.workspaceRootPath === path.join(ownedRoot, 'agent-folder'), 'The run did not use the restored target/model config/workspace', cfg)
  const agentImages = await page.evaluate(() => [...document.querySelectorAll('[data-testid="agent-workspace-surface"] img')].map((i) => ({ src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0 })))
  state.texts = [...(state.texts ?? []), T.team, T.agent]
  return { sendRowSamples: { team: state.sendSamples.team, agent: state.sendSamples.agent }, teamRun, teamImages, agentRunId, firstUser: userText.slice(0, 400), cfg, agentImages }
})

defineCase('D08', 'REQ-006 mapping: an agent first send that fails after registration shows its error in the temp run and the row goes; other rows stay', async (page) => {
  await clickChat(page)
  await typeText(page, 'Bystander draft Q')
  await clickPencil(page)
  await pickModel(page, runtime, state.model)
  await typeText(page, 'Post-registration failure draft')
  let injected = 0
  await page.route('**/graphql', async (route) => {
    if (injected === 0 && /prepareAgentRun/i.test(route.request().postData() ?? '')) { injected += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Injected prepare failure (probe)' }] }) }) }
    return route.continue()
  })
  try {
    await send(page)
    await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 })
    await page.getByText('Injected prepare failure (probe)').first().waitFor({ timeout: 30000 })
    await delay(800)
    const rows = await readRows(page)
    assert(rows.length === 1 && rows[0].text === 'Bystander draft Q' && !rows[0].selected, 'Rows after a post-registration failure wrong', rows)
    const runText = await page.locator(RUN_VIEW).innerText()
    assert(runText.includes('Post-registration failure draft'), 'The message is not in the temp run', runText.slice(0, 300))
    await shot(page, 'D08-agent-post-registration-failure-temp-run')
    return { injected, route: routeOf(page), rows }
  } finally { await page.unroute('**/graphql') }
})

defineCase('D09', 'RU-1: opening another draft while a send is in flight keeps it open; the launch still lands in its run and removes only the sent row', async (page) => {
  await clickPencil(page)
  await pickModel(page, runtime, state.model)
  await typeText(page, 'Reply with exactly INFLIGHT-OK and nothing else.')
  let held = 0
  await page.route('**/graphql', async (route) => {
    if (held === 0 && /prepareAgentRun/i.test(route.request().postData() ?? '')) { held += 1; await delay(6000) }
    return route.continue()
  })
  try {
    await send(page)
    await waitFor('send in flight', async () => held === 1, 15000)
    const during = await readRows(page)
    await draftRows(page).filter({ hasText: 'Bystander draft Q' }).first().click()
    await delay(300)
    const opened = { rows: await readRows(page), text: (await snapshotNewChat(page)).text }
    assert(opened.text === 'Bystander draft Q' && opened.rows.find((r) => r.text === 'Bystander draft Q')?.selected, 'Could not open another draft during the send', opened)
    // TR-004: the sent row keeps its text (never "Empty draft") until the launch finishes it, even with another draft open.
    const sentText = 'Reply with exactly INFLIGHT-OK and nothing else.'
    assert(during.some((r) => r.text === sentText) && !during.some((r) => r.text === 'Empty draft') && opened.rows.some((r) => r.text === sentText && !r.selected), 'The in-flight sent row lost its text', { during, opened })
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    await waitReply(page, 'INFLIGHT-OK')
    const afterSend = await readRows(page); const store = await draftState(page)
    assert(afterSend.length === 1 && afterSend[0].text === 'Bystander draft Q' && !afterSend[0].selected, 'After the in-flight send: wrong rows', afterSend)
    await page.goBack()
    await page.waitForURL((u) => u.pathname === '/chat' && !u.searchParams.get('id'))
    await waitForNewChat(page); await delay(500)
    const back = { rows: await readRows(page), text: (await snapshotNewChat(page)).text }
    assert(back.text === 'Bystander draft Q' && back.rows[0]?.selected, 'The draft opened during the send is not the open draft afterwards', back)
    return { during: during.map((r) => r.text), opened: { text: opened.text, rows: opened.rows.map((r) => ({ text: r.text, selected: r.selected })) }, store, back }
  } finally { await page.unroute('**/graphql') }
})

defineCase('D10', 'SCN-004 (AC-006): × without confirmation; focus to the next row, else previous, else Chat; discarding the open draft shows a blank New chat', async (page) => {
  await clickPencil(page); await typeText(page, 'Discard me Z1')
  await clickPencil(page); await typeText(page, 'Keep me Z2')
  await openSeedRun(page)
  await watchRowMotion(page)
  const ids = Object.fromEntries((await readRows(page)).map((r) => [r.text, r.id]))
  assert(Object.keys(ids).join('|') === 'Keep me Z2|Discard me Z1|Bystander draft Q', 'Unexpected rows', ids)
  const z1 = page.locator(`[data-draft-id="${ids['Discard me Z1']}"]`)
  const rest = await z1.locator(sel('chat-draft-discard')).evaluate((x) => getComputedStyle(x).opacity)
  await z1.hover(); await delay(250)
  const hover = await z1.locator(sel('chat-draft-discard')).evaluate((x) => getComputedStyle(x).opacity)
  await z1.locator(sel('chat-draft-discard')).click()
  await delay(400)
  const focus1 = await page.evaluate(() => ({ test: document.activeElement?.getAttribute('data-test'), id: document.activeElement?.closest('li')?.getAttribute('data-draft-id') }))
  assert(rest === '0' && hover === '1', '× visibility on hover wrong', { rest, hover })
  assert(focus1.test === 'chat-draft-row' && focus1.id === ids['Bystander draft Q'], 'Focus did not move to the next row', focus1)
  await page.keyboard.press('Tab')
  const xFocused = await page.evaluate(() => ({ test: document.activeElement?.getAttribute('data-test'), opacity: getComputedStyle(document.activeElement).opacity }))
  await page.keyboard.press('Enter')
  await delay(400)
  const focus2 = await page.evaluate(() => ({ test: document.activeElement?.getAttribute('data-test'), id: document.activeElement?.closest('li')?.getAttribute('data-draft-id') }))
  assert(xFocused.test === 'chat-draft-discard' && xFocused.opacity === '1', '× not visible on keyboard focus', xFocused)
  assert(focus2.test === 'chat-draft-row' && focus2.id === ids['Keep me Z2'], 'Focus did not move to the previous row', focus2)
  await openRow(page, 'Keep me Z2')
  await page.locator(`[data-draft-id="${ids['Keep me Z2']}"] ${sel('chat-draft-discard')}`).click()
  await delay(400)
  const focusImmediate = await page.evaluate(() => document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName)
  await delay(1200)
  const after = { rows: await readRows(page), snap: await snapshotNewChat(page), chatSelected: await chatRowSelected(page), route: routeOf(page), focus: await page.evaluate(() => document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName) }
  assert(after.rows.length === 0 && after.snap.text === '' && after.snap.target === 'Daily Assistant' && after.chatSelected && after.route === '/chat', 'Discarding the open draft did not show a blank New chat', after)
  assert(focusImmediate === 'app-left-panel-chat', 'Focus did not move to the Chat row after the last row', { focusImmediate, later: after.focus })
  const motion = await rowMotion(page)
  const z1Leave = motion.find((m) => m.kind === 'leave' && m.id === ids['Discard me Z1']); const z1Removed = motion.find((m) => m.kind === 'removed' && m.id === ids['Discard me Z1'])
  assert(z1Leave && z1Leave.duration.split(',').every((d) => d.trim() === '0.15s') && /ease-out/.test(z1Leave.timing) && z1Removed && z1Removed.t - z1Leave.t >= 120 && z1Removed.t - z1Leave.t < 500, 'The discarded row does not fade out in 150 ms', { z1Leave, z1Removed })
  return { rest, hover, leaveMs: Math.round(z1Removed.t - z1Leave.t), focus1, focus2, focusImmediate, focusAfter1200ms: after.focus, motion }
})

defineCase('D11', 'AC-008/009 (VIS-003/006/007): seven long drafts, one line each, geometry and colours, scroll and resize, keyboard order, focus ring, motion and reduced motion, collapsed strip unchanged', async (page) => {
  await page.setViewportSize({ width: 800, height: 738 }); await delay(400)
  const long = Array.from({ length: 7 }, (_, i) => `Long draft ${i + 1}: in the frontend I got one problem, it shows this but the output is actually different from what I expected`)
  await watchRowMotion(page)
  for (const text of long) { await clickPencil(page); await typeText(page, text) }
  await delay(400)
  const enter = (await rowMotion(page)).filter((m) => m.kind === 'added')
  await watchRowMotion(page)
  await composerInput(page).type(' more', { delay: 30 })
  const reinsertsWhileTyping = (await rowMotion(page)).filter((m) => m.kind === 'added').length
  assert(reinsertsWhileTyping === 0, 'Typing re-creates the open row', await rowMotion(page))
  await selectAllDelete(page); await composerInput(page).type(long[6])
  await delay(300)
  const rows = await readRows(page)
  assert(rows.length === 7 && rows.map((r) => r.text).join('|') === [...long].reverse().join('|'), 'Not newest first', rows.map((r) => r.text))
  const geo = await page.evaluate(() => {
    const chatBtn = document.querySelector('[data-test="app-left-panel-chat"]')
    const label = [...chatBtn.querySelectorAll('span')].find((s) => s.innerText.trim() === 'Chat')
    const lis = [...document.querySelectorAll('[data-test="chat-draft-rows"] > li')]
    const r = (el) => el.getBoundingClientRect()
    return {
      chatBottom: r(chatBtn).bottom, labelLeft: r(label).left,
      rows: lis.map((li) => {
        const row = li.querySelector('[data-test="chat-draft-row"]'); const span = li.querySelector('[data-test="chat-draft-preview"]'); const x = li.querySelector('[data-test="chat-draft-discard"]')
        const rs = getComputedStyle(row); const ss = getComputedStyle(span); const xs = getComputedStyle(x)
        return { top: r(li).top, height: r(row).height, textLeft: r(span).left, oneLine: ss.whiteSpace === 'nowrap' && ss.textOverflow === 'ellipsis' && span.scrollWidth > span.clientWidth, font: `${rs.fontSize}/${rs.lineHeight}`, weight: rs.fontWeight, color: rs.color, bg: rs.backgroundColor, radius: rs.borderTopLeftRadius, xW: r(x).width, xH: r(x).height, xRightGap: r(row).right - r(x).right, xCenter: Math.abs((r(x).top + r(x).bottom) / 2 - (r(row).top + r(row).bottom) / 2), xColor: xs.color, selected: row.getAttribute('aria-current') === 'page' }
      }),
    }
  })
  const g = geo.rows
  const problems = []
  if (Math.abs(g[0].top - geo.chatBottom - 2) > 0.6) problems.push(`gap below Chat ${g[0].top - geo.chatBottom}`)
  g.forEach((row, i) => {
    if (Math.abs(row.height - 32) > 0.6) problems.push(`row ${i} height ${row.height}`)
    if (Math.abs(row.textLeft - geo.labelLeft) > 1) problems.push(`row ${i} text left ${row.textLeft} vs Chat label ${geo.labelLeft}`)
    if (!row.oneLine) problems.push(`row ${i} not one line with ellipsis`)
    if (row.font !== '13px/20px' || row.weight !== '400' || row.radius !== '6px') problems.push(`row ${i} type/radius ${row.font} ${row.weight} ${row.radius}`)
    if (row.selected ? (row.color !== TOKENS.gray900 || row.bg !== TOKENS.gray100) : row.color !== TOKENS.gray700) problems.push(`row ${i} colours ${row.color} ${row.bg}`)
    if (row.xW !== 24 || row.xH !== 24 || Math.abs(row.xRightGap - 6) > 0.6 || row.xCenter > 0.6 || row.xColor !== TOKENS.gray400) problems.push(`row ${i} × ${row.xW}x${row.xH} gap ${row.xRightGap} centre ${row.xCenter} ${row.xColor}`)
    if (i > 0 && Math.abs(row.top - (g[i - 1].top + g[i - 1].height) - 1) > 0.6) problems.push(`row ${i} gap ${row.top - (g[i - 1].top + g[i - 1].height)}`)
  })
  assert(problems.length === 0, 'Row geometry/style differs from the spec', { problems, geo })
  const enterOk = enter.length >= 7 && enter.every((m) => /chat-draft-row-enter-active/.test(m.cls) && m.duration.split(',').every((d) => d.trim() === '0.15s') && /ease-out/.test(m.timing))
  assert(enterOk, 'Rows do not fade in with 150 ms ease-out', enter)
  const section = await page.evaluate(() => {
    let el = document.querySelector('[data-test="app-left-panel-primary-nav"]')
    while (el && !(/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight)) el = el.parentElement
    if (!el) return null
    el.setAttribute('data-probe-scroll', '1')
    return { clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }
  })
  assert(section && section.scrollHeight > section.clientHeight, 'The primary section does not scroll with many drafts', section)
  await shot(page, 'VIS-006-many-drafts-section-scrolls-800x738')
  const handle = await page.locator(sel('app-left-panel-section-resize-handle')).boundingBox()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down(); await page.mouse.move(handle.x + handle.width / 2, handle.y + 90, { steps: 8 }); await page.mouse.up()
  await delay(300)
  const resized = await page.evaluate(() => document.querySelector('[data-probe-scroll]').clientHeight)
  assert(resized > section.clientHeight + 40, 'The section did not resize', { before: section.clientHeight, after: resized })
  await chatRow(page).focus()
  const order = []
  for (let i = 0; i < 5; i += 1) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => { const a = document.activeElement; return a.getAttribute('data-test') ?? a.getAttribute('title') ?? a.innerText.trim() })) }
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab')
  const ring = await page.evaluate(() => ({ test: document.activeElement.getAttribute('data-test'), shadow: getComputedStyle(document.activeElement).boxShadow }))
  assert(order.join('|') === 'app-left-panel-new-chat|Collapse left panel|chat-draft-row|chat-draft-discard|chat-draft-row', 'Keyboard order differs', order)
  assert(ring.test === 'chat-draft-row' && ring.shadow.includes(TOKENS.indigo500), 'No indigo focus ring on a keyboard-focused row', ring)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await watchRowMotion(page)
  await clickPencil(page); await typeText(page, 'Reduced motion row')
  await delay(200)
  const reducedRow = (await readRows(page))[0]
  await page.locator(`[data-draft-id="${reducedRow.id}"] ${sel('chat-draft-discard')}`).click()
  await delay(300)
  const reduced = await rowMotion(page)
  await page.emulateMedia({ reducedMotion: null })
  const mine = reduced.filter((m) => m.id === reducedRow.id)
  const reducedAdded = mine.find((m) => m.kind === 'added')
  const reducedLeave = mine.find((m) => m.kind === 'leave'); const reducedRemoved = mine.find((m) => m.kind === 'removed')
  assert(reducedAdded && reducedAdded.duration.split(',').every((d) => d.trim() === '0s') && reducedRemoved && (!reducedLeave || reducedRemoved.t - reducedLeave.t < 60), 'Row animation not off under reduced motion', mine)
  await openSeedRun(page)
  await shot(page, 'VIS-003-drafts-kept-while-on-a-run-800x738')
  const stripBefore = await page.locator(sel('workspace-left-navigation-strip')).count()
  await page.locator('button[title="Collapse left panel"]').first().click()
  await page.locator(sel('workspace-left-navigation-strip')).waitFor({ timeout: 10000 })
  await delay(400)
  // Every strip item is its icon plus a hover tooltip; the Chat item must look like the others (no count/badge).
  const strip = await page.locator(sel('workspace-left-navigation-strip')).evaluate((el) => {
    const shape = (key) => { const b = el.querySelector(`[data-nav-key="${key}"]`); return { tags: [...b.children].map((c) => c.tagName).join(','), text: b.textContent.trim() } }
    return { chat: shape('chat'), agents: shape('agents'), digits: /\d/.test(el.textContent) }
  })
  await shot(page, 'VIS-007-collapsed-strip-unchanged-800x738')
  assert(!strip.digits && strip.chat.text === 'Chat' && strip.chat.tags === strip.agents.tags, 'The collapsed strip shows a draft indicator', strip)
  await page.locator(`${sel('workspace-left-navigation-strip')} [data-nav-key="chat"]`).click()
  await delay(800)
  const reopened = { route: routeOf(page), rows: (await readRows(page)).length, panel: await page.locator(sel('app-left-panel-chat')).isVisible() }
  if (!reopened.panel) { await page.locator('[data-test="workspace-left-strip-open"]').first().click().catch(() => {}); await delay(500) }
  state.texts = [...(state.texts ?? []), ...long]
  return { problems, geo: geo.rows[0], enter: enter.slice(0, 2), enterCount: enter.length, rowsAddedWhileTyping: reinsertsWhileTyping, section, resized, order, ring, reduced, stripBefore, strip, reopened }
})

defineCase('D12', 'VIS-008 / TR-010: narrow drawer (390×844, touch): same rows, × always visible, tapping a row opens the draft and closes the drawer', async (page, context) => {
  const cdp = await context.newCDPSession(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  try {
    await delay(800)
    const opener = page.locator(`${sel('app-left-drawer-open')}, ${sel('workspace-left-navigation-strip')} [data-nav-key="chat"]`).first()
    await opener.click()
    await page.locator(sel('app-left-navigation-drawer')).waitFor({ timeout: 10000 })
    await delay(500)
    const rows = await readRows(page)
    assert(rows.length === 7 && rows.every((r) => r.xOpacity === '1'), 'Drawer rows wrong or × hidden on touch', rows)
    await shot(page, 'VIS-008-drawer-draft-rows-narrow-390x844')
    const target = rows[2]
    const box = await page.locator(`[data-draft-id="${target.id}"] ${sel('chat-draft-row')}`).boundingBox()
    const point = { x: box.x + box.width / 3, y: box.y + box.height / 2 }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await delay(1000)
    const drawerOpen = await page.locator(sel('app-left-navigation-drawer')).isVisible().catch(() => false)
    const snap = await snapshotNewChat(page)
    assert(!drawerOpen && snap.text === target.text && routeOf(page) === '/chat', 'Tapping a drawer row did not open the draft and close the drawer', { drawerOpen, snap, route: routeOf(page) })
    await shot(page, 'D12-after-row-tap-390x844')
    return { rows: rows.map((r) => r.text), opened: target.text }
  } finally {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }).catch(() => {})
    await cdp.send('Emulation.setEmulatedMedia', { features: [] }).catch(() => {})
    await page.setViewportSize({ width: 1280, height: 800 })
  }
})

defineCase('D13', 'AC-010 / REQ-011: reload → no rows, a blank New chat, no draft text in browser storage', async (page) => {
  const before = await storageDump(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForNewChat(page); await delay(1500)
  const after = { rows: await readRows(page), snap: await snapshotNewChat(page), store: await draftState(page), storage: await storageDump(page) }
  const texts = [...(state.texts ?? []), 'Bystander draft Q']
  const blob = JSON.stringify(after.storage)
  const leaked = texts.filter((t) => blob.includes(t.slice(0, 24)))
  const newKeys = Object.keys(after.storage.local).filter((k) => !(k in (state.baselineStorage?.local ?? {})))
  assert(after.rows.length === 0 && after.snap.text === '' && after.store.drafts.length === 1, 'Drafts survived reload', after)
  assert(leaked.length === 0, 'Draft text found in browser storage', { leaked, storage: after.storage })
  return { newLocalKeys: newKeys, indexedDb: after.storage.indexedDb, sessionKeys: Object.keys(after.storage.session), beforeKeys: Object.keys(before.local) }
})

defineCase('D14', 'Localization zh-CN: 草稿 list, 草稿: row name, 丢弃草稿 ×, 空草稿', async (_page, _context) => {
  const zh = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })
  const page = await zh.newPage()
  try {
    await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
    await waitForNewChat(page); await delay(1000)
    await typeText(page, '你好草稿')
    await delay(300)
    const typed = { list: await rowsList(page).getAttribute('aria-label'), rows: await readRows(page), xTitle: await page.locator(sel('chat-draft-discard')).first().getAttribute('title') }
    await selectAllDelete(page)
    const cleared = await page.locator(sel('chat-draft-preview')).first().innerText()
    await shot(page, 'D14-zh-CN-empty-draft')
    assert(typed.list === '草稿' && typed.rows[0].ariaLabel.startsWith('草稿: 你好草稿') && typed.xTitle === '丢弃草稿' && typed.rows[0].xLabel === '丢弃草稿: 你好草稿' && cleared === '空草稿', 'zh-CN strings wrong', { typed, cleared })
    return { typed, cleared }
  } finally { await zh.close() }
})

// ---------------------------------------------------------------------------------------------
let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  assert(!existsSync(path.join(outDir, 'chat-draft-rows-live-evidence.json')) || serveOnly, `Refusing to overwrite ${outDir}/chat-draft-rows-live-evidence.json; use a fresh --output-dir`)
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-draft-rows-live-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  backendPort = await freePort(); frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await writeAgent('probe-helper', 'Probe Helper', ['probe-notes'])
  await writeAgent('probe-writer', 'Probe Writer')
  await fs.mkdir(path.join(dataRoot, 'skills', 'probe-notes'), { recursive: true })
  await fs.writeFile(path.join(dataRoot, 'skills', 'probe-notes', 'SKILL.md'), '---\nname: probe-notes\ndescription: Notes probe skill\n---\n\n# probe-notes\n\nReply briefly.\n')
  state.image = path.join(ownedRoot, 'draft-screenshot.png'); await writePng(state.image)
  state.image2 = path.join(ownedRoot, 'second-shot.png'); await writePng(state.image2, [16, 185, 129])
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir,
    { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' })
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: 'Probe Team', description: 'Draft rows probe team', instructions: 'Coordinate briefly.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'probe-helper', refScope: 'SHARED' }, { memberName: 'writer', ref: 'probe-writer', refScope: 'SHARED' }] } })
  const teams = (await gql('{ agentTeamDefinitions { id name } }')).agentTeamDefinitions
  state.teamId = teams.find((t) => t.name === 'Probe Team')?.id
  assert(state.teamId, 'Probe Team not created', teams)
  spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 180000, 1000)
  if (serveOnly) {
    console.log(`[chat-draft-rows-live] serving: frontend ${frontUrl} backend ${backendUrl} team ${state.teamId} root ${ownedRoot}`)
    await new Promise((resolve) => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
  } else {
    browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'en-US' })
    const page = await context.newPage(); page.setDefaultTimeout(30000)
    const browserErrors = []; page.on('pageerror', (e) => browserErrors.push(e.message)); evidence.browserErrors = browserErrors
    const dialogs = []; page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss() }); evidence.dialogs = dialogs
    // Warm Nuxt's dependency optimizer so a mid-case reload does not disturb the first journey.
    await gotoNewChat(page); await page.reload({ waitUntil: 'domcontentloaded' }); await waitForNewChat(page)
    for (const c of cases) {
      if (onlyCases && !onlyCases.includes(c.id)) continue
      const started = Date.now()
      await ledger(`| ${++ledgerSeq} | ${c.id} | ${new Date().toISOString()} | Started | test:e2e:chat-draft-rows-live --cases ${c.id} (${runtime}) | ${c.title.replace(/\|/g, '/')} | — | N/A | ${outDir} | Run |`)
      try {
        const details = await c.fn(page, context)
        evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: Date.now() - started, details }
      } catch (error) {
        exitCode = 1
        await shot(page, `${c.id}-failure`).catch(() => {})
        evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
      }
      console.log(`${c.id} ${evidence.cases[c.id].result} ${c.title}${evidence.cases[c.id].error ? ` — ${evidence.cases[c.id].error}` : ''}`)
      await ledger(`| ${++ledgerSeq} | ${c.id} | ${new Date().toISOString()} | Completed | test:e2e:chat-draft-rows-live (${runtime}) | as Started | ${(evidence.cases[c.id].error ?? 'all assertions held').replace(/\|/g, '/')} | ${evidence.cases[c.id].result} | ${outDir}/chat-draft-rows-live-evidence.json | ${evidence.cases[c.id].result === 'Pass' ? 'Next case' : 'Investigate'} |`)
      await fs.writeFile(path.join(outDir, 'chat-draft-rows-live-evidence.json'), JSON.stringify(evidence, null, 2))
    }
    assert(dialogs.length === 0, 'A page dialog appeared (REQ-007: no confirmation)', dialogs)
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[chat-draft-rows-live] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.portsFree = await Promise.all([backendPort, frontendPort].filter(Boolean).map((port) => new Promise((resolve) => {
    const s = net.createServer(); s.once('error', () => resolve({ port, free: false })); s.listen(port, '127.0.0.1', () => s.close(() => resolve({ port, free: true })))
  })))
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'chat-draft-rows-live-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
