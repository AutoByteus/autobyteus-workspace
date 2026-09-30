#!/usr/bin/env node
// Implementation-scoped rendered check for ticket chat-composer-menus-open-upward (not API/E2E sign-off).
// Real Chrome → owned Nuxt dev → owned backend (dist/app.js) in a temp data root on free ports with a
// sanitized environment; the user's running app and ~/.autobyteus are never touched.
// Usage: node rendered-check.mjs   (from anywhere; needs `pnpm -C autobyteus-server-ts build` first)
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../../..')
const webDir = path.join(repo, 'autobyteus-web')
const serverDir = path.join(repo, 'autobyteus-server-ts')
const outDir = path.join(here, 'rendered')
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core')
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync)
const onlyFrontUrl = process.argv[2] ?? null

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (label, fn, timeout = 120000, interval = 500) => {
  const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`))
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log); owned.push(child)
  return child
}
const stopOwned = async (child) => {
  if (child.exitCode !== null || child.signalCode) return
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
}

const sel = (t) => `[data-test="${t}"]`
const PREFERRED = { target: 300, skill: 300, workspace: 420, model: 360, thinking: 240 }
const results = []; let failures = 0
const record = (id, viewport, fails, details) => {
  results.push({ id, viewport, pass: fails.length === 0, fails, details })
  if (fails.length) failures += 1
  console.log(`${fails.length ? 'FAIL' : 'pass'} ${viewport} ${id}${fails.length ? ' — ' + fails.join('; ') : ''}`)
}

/** Geometry of one open menu: its positioned box, its containing block and the page landmarks. */
const geometry = (page, menuSelector) => page.evaluate((menuSelector) => {
  const box = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height } }
  const q = (s) => document.querySelector(s)
  const menu = q(menuSelector)
  if (!menu) return null
  let positioned = menu
  while (positioned.parentElement && !['absolute', 'fixed'].includes(getComputedStyle(positioned).position)) positioned = positioned.parentElement
  const fixed = getComputedStyle(positioned).position === 'fixed'
  const anchor = fixed ? null : positioned.offsetParent
  const scrollers = [positioned, ...positioned.querySelectorAll('*')].filter((e) => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY))
  const header = menu.firstElementChild; const footer = menu.querySelector('footer')
  return {
    vw: innerWidth, vh: innerHeight, fixed, menu: box(positioned), maxHeight: positioned.style.maxHeight, classes: positioned.className,
    anchor: anchor ? { test: anchor.getAttribute('data-test'), borderTop: anchor.clientTop, ...box(anchor) } : null,
    scrolls: scrollers.some((e) => e.scrollHeight > e.clientHeight + 1),
    header: header ? box(header) : null, footer: footer ? box(footer) : null,
    hint: q('[data-test="chat-new-hint"]') ? box(q('[data-test="chat-new-hint"]')) : null,
    composer: q('[data-test="chat-composer"]') ? box(q('[data-test="chat-composer"]')) : null,
    backdrop: !!q('.fixed.inset-0.bg-black\\/20'),
  }
}, menuSelector)

const checkAbove = (g, preferred) => {
  const fails = []
  if (!g) return ['menu not open']
  if (g.fixed) fails.push('menu is a fixed sheet on a wide window')
  if (!/\bbottom-full\b/.test(g.classes) || /\btop-full\b/.test(g.classes)) fails.push(`placement classes: ${g.classes}`)
  if (g.menu.top < 16 - 0.5) fails.push(`top ${g.menu.top} is inside the 16px viewport margin`)
  if (g.menu.bottom > g.vh) fails.push('bottom is off-screen')
  // `bottom-full mb-1.5` sits 6px above the containing block's padding edge (inside its top border).
  const gap = g.anchor.top + g.anchor.borderTop - g.menu.bottom
  if (Math.abs(gap - 6) > 0.6) fails.push(`gap to the positioning box is ${gap}, not 6`)
  const expected = Math.max(0, Math.min(preferred, Math.floor(g.anchor.top - 22)))
  if (g.maxHeight !== `${expected}px`) fails.push(`max-height ${g.maxHeight} != ${expected}px`)
  if (g.menu.height > expected + 0.5) fails.push(`height ${g.menu.height} exceeds ${expected}`)
  if (g.hint && g.menu.bottom > g.hint.top) fails.push('covers the hint line')
  if (g.header && (g.header.top < g.menu.top - 0.5 || g.header.bottom > g.menu.bottom + 0.5)) fails.push('header row is outside the menu')
  if (g.footer && (g.footer.bottom > g.menu.bottom + 0.5 || g.footer.top < g.menu.top - 0.5)) fails.push('footer row is outside the menu')
  return fails
}
const checkSheet = (g) => {
  if (!g) return ['menu not open']
  const fails = []
  if (!g.fixed) fails.push('not a fixed bottom sheet')
  if (Math.round(g.vh - g.menu.bottom) !== 8) fails.push(`sheet bottom offset ${g.vh - g.menu.bottom} != 8`)
  if (Math.round(g.menu.left) !== 8 || Math.round(g.vw - g.menu.right) !== 8) fails.push('sheet is not inset 8px left/right')
  if (g.maxHeight) fails.push(`inline max-height ${g.maxHeight} on the sheet`)
  if (!g.backdrop) fails.push('no backdrop')
  return fails
}

const newChat = async (page) => {
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 180000 })
  await page.locator(sel('chat-composer')).waitFor({ timeout: 60000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  await delay(1200)
}
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const typeTrigger = async (page, char) => {
  const input = page.locator(sel('chat-message-input'))
  await input.click(); await input.fill(''); await page.keyboard.type(char)
}
const closeMenus = async (page) => { await page.keyboard.press('Escape'); await page.locator(sel('chat-message-input')).fill(''); await delay(150) }

let frontUrl, backendUrl, ownedRoot, browser
const evidence = { startedAt: new Date().toISOString() }
try {
  await fs.mkdir(outDir, { recursive: true })
  if (onlyFrontUrl) frontUrl = onlyFrontUrl
  else {
    if (!existsSync(path.join(serverDir, 'dist/app.js'))) throw new Error('Build the server first: pnpm -C autobyteus-server-ts build')
    ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-composer-menus-up-'))
    const dataRoot = path.join(ownedRoot, 'server-data')
    await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
    const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'check.db')).href
    const backendPort = await freePort(); const frontendPort = await freePort()
    backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
    await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
    await new Promise((resolve, reject) => {
      const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
      child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
    })
    const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' }
    const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
    await waitFor('backend health', async () => { if (backend.exitCode !== null) throw new Error('backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok })
    const gql = async (query, variables = {}) => {
      const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
      const json = await res.json()
      if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
      return json.data
    }
    for (let i = 1; i <= 9; i += 1) {
      await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: `Fixture agent ${i}`, role: 'assistant', description: `Rendered-check fixture ${i}`, instructions: 'Fixture.', toolNames: [] } })
    }
    for (let i = 1; i <= 14; i += 1) {
      const dir = path.join(ownedRoot, 'workspaces', `fixture-ws-${String(i).padStart(2, '0')}`)
      await fs.mkdir(dir, { recursive: true })
      await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: dir } })
    }
    spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
    await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
  }
  Object.assign(evidence, { frontUrl, backendUrl })
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })

  const WIDE = [{ width: 1512, height: 952 }, { width: 1280, height: 720 }, { width: 1024, height: 520 }, { width: 1024, height: 440 }]
  for (const vp of WIDE) {
    const label = `${vp.width}x${vp.height}`
    const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'en-US' })
    const page = await context.newPage(); page.setDefaultTimeout(30000)
    const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
    await newChat(page)

    // Layout (REQ-002 / AC-003)
    const layout = await page.evaluate(() => {
      const root = document.querySelector('[data-test="chat-new"]'); const inner = root.firstElementChild
      const box = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }
      const style = getComputedStyle(inner)
      const parts = ['h1', '[data-test="chat-new-subtitle"]', '[data-test="chat-composer"]', '[data-test="chat-new-hint"]'].map((s) => box(inner.querySelector(s)))
      return { paddingTop: parseFloat(style.paddingTop), paddingBottom: parseFloat(style.paddingBottom), justify: style.justifyContent, parts, area: box(root), overflow: root.scrollHeight > root.clientHeight + 1 }
    })
    {
      const fails = []
      if (Math.abs(layout.paddingTop - 0.14 * vp.height) > 1) fails.push(`padding-top ${layout.paddingTop} is not 14vh`)
      if (layout.paddingBottom !== 40) fails.push(`padding-bottom ${layout.paddingBottom} is not 40px`)
      if (layout.justify !== 'center') fails.push('column is not flex-centered')
      if (!layout.parts.every((b, i) => i === 0 || b.top >= layout.parts[i - 1].bottom - 0.5)) fails.push('heading/subtitle/composer/hint overlap or are out of order')
      if (layout.parts[3].top - layout.parts[2].bottom > 14) fails.push('hint is not directly under the composer')
      record('layout', label, fails, layout)
      await shot(page, `${label}-idle`)
    }

    for (const [id, char, test] of [['at-menu', '@', 'chat-target-menu'], ['slash-menu', '/', 'chat-skill-menu']]) {
      await typeTrigger(page, char)
      await page.locator(sel(test)).waitFor()
      const g = await geometry(page, sel(test))
      const fails = checkAbove(g, PREFERRED.target)
      if (g?.anchor?.test !== 'chat-composer') fails.push(`positioned against ${g?.anchor?.test}, not the composer card`)
      record(id, label, fails, g)
      await shot(page, `${label}-${id}`)
      // Keyboard still works: ArrowDown moves the highlight, Escape closes.
      if (id === 'at-menu') {
        const before = await page.locator(sel('chat-message-input')).getAttribute('aria-activedescendant')
        await page.keyboard.press('ArrowDown')
        const after = await page.locator(sel('chat-message-input')).getAttribute('aria-activedescendant')
        record('at-menu-keyboard', label, before && after && before !== after ? [] : [`highlight did not move (${before} → ${after})`], { before, after })
      }
      await closeMenus(page)
      if (await page.locator(sel(test)).count()) record(`${id}-escape`, label, ['Escape did not close the menu'], null)
    }

    await page.locator(sel('chat-workspace-trigger')).click()
    await page.locator(sel('chat-workspace-menu')).waitFor()
    {
      const g = await geometry(page, sel('chat-workspace-menu'))
      const fails = checkAbove(g, PREFERRED.workspace)
      const focus = await page.evaluate(() => document.activeElement?.getAttribute('data-test'))
      if (focus !== 'chat-workspace-search') fails.push(`focus is on ${focus}, not the search box`)
      record('workspace-menu', label, fails, g)
      await shot(page, `${label}-workspace-menu`)
      await page.keyboard.press('Escape')
    }

    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel('chat-model-menu')).waitFor()
    await delay(500)
    {
      const g = await geometry(page, sel('chat-model-menu'))
      record('model-menu', label, checkAbove(g, PREFERRED.model), g)
      const runtime = page.locator(`${sel('chat-model-menu')} [data-runtime]:not([aria-disabled="true"])`).first()
      if (await runtime.count()) {
        await runtime.hover()
        await page.locator(sel('chat-model-submenu')).waitFor()
        await page.locator(`${sel('chat-model-submenu')} [role="menuitemradio"], ${sel('chat-model-submenu')} ${sel('chat-model-error')}, ${sel('chat-model-submenu')} p`).first().waitFor({ timeout: 60000 }).catch(() => {})
        await delay(1500)
        const f = await page.evaluate(() => {
          const sub = document.querySelector('[data-test="chat-model-submenu"]'); const row = sub.parentElement.querySelector('[data-runtime]')
          const menu = document.querySelector('[data-test="chat-model-menu"]').getBoundingClientRect()
          const r = sub.getBoundingClientRect(); const rr = row.getBoundingClientRect(); const list = sub.firstElementChild
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, rowBottom: rr.bottom, styleBottom: sub.style.bottom, styleTop: sub.style.top, listMax: list.style.maxHeight, listScrolls: list.scrollHeight > list.clientHeight + 1, rows: sub.querySelectorAll('[role="menuitemradio"]').length, menuLeft: menu.left, menuRight: menu.right, vh: innerHeight, vw: innerWidth, hintTop: document.querySelector('[data-test="chat-new-hint"]').getBoundingClientRect().top }
        })
        const fails = []
        if (f.styleBottom !== '-5px' || f.styleTop) fails.push(`flyout style bottom=${f.styleBottom} top=${f.styleTop}`)
        if (Math.abs(f.bottom - (f.rowBottom + 5)) > 0.6) fails.push(`flyout bottom ${f.bottom} is not row bottom + 5 (${f.rowBottom + 5})`)
        if (f.top < 12 - 0.5) fails.push(`flyout top ${f.top} is inside the 12px margin`)
        if (f.bottom > f.hintTop) fails.push('flyout covers the hint line')
        if (f.left < 0 || f.right > f.vw) fails.push('flyout is off-screen horizontally')
        const expected = Math.max(0, Math.min(320, Math.floor(f.rowBottom + 5 - 12 - 10)))
        if (f.listMax !== `${expected}px`) fails.push(`flyout list max-height ${f.listMax} != ${expected}px`)
        if (!(f.right <= f.menuLeft || f.left >= f.menuRight)) fails.push('flyout overlaps the model menu')
        record('model-flyout', label, fails, f)
        await shot(page, `${label}-model-flyout`)
      } else record('model-flyout', label, [], { skipped: 'no enabled runtime in this environment' })
      await page.keyboard.press('Escape')
    }

    if (await page.locator(sel('chat-thinking-trigger')).count()) {
      await page.locator(sel('chat-thinking-trigger')).click()
      await page.locator(sel('chat-thinking-menu')).waitFor()
      const g = await geometry(page, sel('chat-thinking-menu'))
      record('thinking-menu', label, checkAbove(g, PREFERRED.thinking), g)
      await shot(page, `${label}-thinking-menu`)
      await page.keyboard.press('Escape')
    } else record('thinking-menu', label, [], { skipped: 'the selected model exposes no thinking parameters here' })

    record('page-errors', label, pageErrors.length ? pageErrors : [], pageErrors)
    await context.close()
  }

  // Narrow bottom sheet (REQ-004 / AC-005)
  {
    const vp = { width: 390, height: 844 }; const label = '390x844'
    const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'en-US' })
    const page = await context.newPage(); page.setDefaultTimeout(30000)
    await newChat(page)
    await typeTrigger(page, '@')
    await page.locator(sel('chat-target-menu')).waitFor()
    record('at-sheet', label, checkSheet(await geometry(page, sel('chat-target-menu'))), null)
    await shot(page, `${label}-at-sheet`)
    await closeMenus(page)
    for (const [id, trigger, menu] of [['workspace-sheet', 'chat-workspace-trigger', 'chat-workspace-menu'], ['model-sheet', 'chat-model-trigger', 'chat-model-menu']]) {
      await page.locator(sel(trigger)).click()
      await page.locator(sel(menu)).waitFor()
      record(id, label, checkSheet(await geometry(page, sel(menu))), null)
      await shot(page, `${label}-${id}`)
      await page.keyboard.press('Escape')
    }
    await context.close()
  }
} catch (error) {
  failures += 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[rendered-check] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) await stopOwned(child)
  if (ownedRoot) await fs.rm(ownedRoot, { recursive: true, force: true })
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify({ ...evidence, total: results.length, passed: results.filter((r) => r.pass).length, results }, null, 2))
  console.log(`${results.filter((r) => r.pass).length}/${results.length} pass`)
  process.exitCode = failures ? 1 : 0
}
