#!/usr/bin/env node
// R1 / SR-002, AC-001..005 + renderer preservation of AC-006.
// pnpm -C autobyteus-web test:e2e:workspaces-sidebar-dock --output-dir <fresh dir> [--ledger-file <path>]
// Prereqs: pnpm install, contract builds, nuxt prepare, Chromium/playwright-core. No provider gate/cost.
// --browser-executable <path>; root Linux requires --browser-uid <dedicated non-root UID> (same GID).
// Owns free-loopback Nuxt, exclusive temporary fixture route, private HOME and sandboxed browser.
// BR-001: Team/Activity 1000/1280/1440 pointer/cycles/hit effects; BR-002:930/1130 edges and open drag;
// BR-003:767/768/700/short480 modal/focus/recovery; BR-004:automatic1210 center floor.
// Fixture I/O never proves backend/data/worker or native Electron; isolated desktop is a separate layer.
// Browser errors and unknown GraphQL operations fail; optimizer warmup is retained separately.
import fs from 'node:fs/promises'
import { existsSync, createWriteStream, constants } from 'node:fs'
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import net from 'node:net'
import os from 'node:os'
import assert from 'node:assert/strict'
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (name, fallback) => {
  const inline = process.argv.find(a => a.startsWith(`--${name}=`)), i = process.argv.indexOf(`--${name}`)
  return inline ? inline.slice(name.length + 3) : i >= 0 ? process.argv[i + 1] : fallback
}
const out = path.resolve(web, arg('output-dir', `test-results/workspaces-sidebar-dock-${Date.now()}`))
const ledger = arg('ledger-file'), uid = Number(arg('browser-uid', 0))
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ||
  ['/usr/bin/chromium', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync))
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core')
const routeFile = path.join(web, 'pages/api-e2e-workspaces-sidebar-dock.vue')
const fixture = path.join(web, 'tests/e2e/fixtures/workspaces-sidebar-dock.page.vue')
const delay = ms => new Promise(r => setTimeout(r, ms))
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject)
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) })
})
const portFree = port => new Promise(resolve => {
  const s = net.createConnection({ host: '127.0.0.1', port })
  s.once('connect', () => { s.destroy(); resolve(false) }); s.once('error', () => resolve(true))
})
const until = async (name, fn, timeout = 90000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) { if (await fn()) return; await delay(100) }
  throw new Error(`Timed out: ${name}`)
}
await fs.mkdir(path.dirname(out), { recursive: true })
assert(!existsSync(out), `Use a fresh output directory: ${out}`)
await fs.mkdir(out)
const evidence = { startedAt: new Date().toISOString(), source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: web, encoding: 'utf8' }).trim(),
  platform: `${process.platform}-${process.arch}`, cases: {}, snapshots: [], browserErrors: [], operations: [], cleanup: {} }
const save = () => fs.writeFile(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n')
const event = async (id, status, message) => {
  await save(); if (ledger) await fs.appendFile(ledger, `\n- ${new Date().toISOString()} ${id} ${status}: ${message}; ${path.join(out, 'evidence.json')}\n`)
}
let home, nuxt, browser, page, installed = false, log
const scenario = async (id, name, fn) => {
  await event(id, 'Started', name)
  try {
    await fn(); assert.deepEqual(evidence.browserErrors, [], 'Browser errors in asserted window')
    evidence.cases[id] = { result: 'Pass', name }; await event(id, 'Completed Pass', name)
  } catch (e) {
    evidence.cases[id] = { result: 'Fail', name, error: e.message, stack: e.stack }
    await page?.screenshot({ path: path.join(out, `${id}-failure.png`) }).catch(() => {})
    if (page) await fs.writeFile(path.join(out, `${id}-failure.html`), await page.content())
    await event(id, 'Completed Fail', e.message); throw e
  }
}
try {
  assert(chrome, 'Chromium executable missing')
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'sidebar-dock-probe-'))
  await fs.chmod(home, 0o711)
  let executable = chrome
  if (process.getuid?.() === 0) {
    assert(process.platform === 'linux' && Number.isInteger(uid) && uid > 0, 'Root Linux needs --browser-uid; never disable sandbox')
    const browserHome = path.join(home, 'browser-home'); await fs.mkdir(browserHome)
    await fs.chown(browserHome, uid, uid); await fs.chmod(browserHome, 0o700)
    executable = path.join(home, 'chromium-unprivileged')
    const quote = s => `'${s.replaceAll("'", "'\\''")}'`
    await fs.writeFile(executable, `#!/bin/sh\nexec setpriv --reuid=${uid} --regid=${uid} --clear-groups env HOME=${quote(browserHome)} ${quote(chrome)} "$@"\n`, { mode: 0o755 })
    evidence.browserUid = uid
  } else evidence.browserUid = process.getuid?.()
  await fs.copyFile(fixture, routeFile, constants.COPYFILE_EXCL); installed = true
  evidence.port = await freePort()
  log = createWriteStream(path.join(out, 'nuxt.log'))
  nuxt = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(evidence.port)], {
    cwd: web, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), LANG: 'C.UTF-8', NUXT_TELEMETRY_DISABLED: '1',
      BACKEND_NODE_BASE_URL: 'http://127.0.0.1:1' },
  })
  nuxt.stdout.pipe(log); nuxt.stderr.pipe(log); evidence.nuxtPid = nuxt.pid
  nuxt.on('error', e => { evidence.spawnError = e.message })
  const url = `http://127.0.0.1:${evidence.port}/api-e2e-workspaces-sidebar-dock`
  await until('Nuxt readiness', async () => {
    assert(!evidence.spawnError && nuxt.exitCode === null && nuxt.signalCode === null, 'Nuxt exited before readiness')
    try { return (await fetch(url)).ok } catch { return false }
  }, 240000)
  const profile = path.join(home, 'browser-profile'); await fs.mkdir(profile)
  if (process.getuid?.() === 0) { await fs.chown(profile, uid, uid); await fs.chmod(profile, 0o700) }
  const context = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: true, chromiumSandbox: true, viewport: { width: 1440, height: 800 }, locale: 'en-US' })
  browser = context.browser(); evidence.browser = browser.version()
  page = await context.newPage()
  page.on('pageerror', e => evidence.browserErrors.push({ type: 'pageerror', text: e.message }))
  page.on('console', m => { if (m.type() === 'error') evidence.browserErrors.push({ type: 'console', text: m.text() }) })
  await page.routeWebSocket(/\/ws\//, ws => ws.send(JSON.stringify({ type: 'connected' })))
  await page.route('**/rest/health', r => r.fulfill({ json: { status: 'ok' } }))
  await page.route('**/graphql', async r => {
    const p = r.request().postDataJSON() || {}; evidence.operations.push(p.operationName)
    const answers = {
      GetApplicationsCapability: { applicationsCapability: { enabled: false, scope: 'BOUND_NODE', settingKey: 'ENABLE_APPLICATIONS', source: 'INITIALIZED_EMPTY_CATALOG' } },
      GetSkillImprovementCapability: { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } },
      GetAgentDefinitions: { agentDefinitions: [] }, GetAgentTeamDefinitions: { agentTeamDefinitions: [] },
      GetAgentOrgDefinitions: { agentOrgDefinitions: [] }, ListWorkspaceRunHistory: { listWorkspaceRunHistory: [] },
      ListCollaborationRootHistory: { listCollaborationRootHistory: [] }, GetWorkspaces: { workspaces: [] },
      GetRunFileChanges: { getRunFileChanges: [] }, GetServerSettings: { getServerSettings: [], getEffectiveStreamingContentFlushIntervalMs: 100 },
      GetWorkspaceRunHistory: { workspaceRunHistory: { workspaceRootPath: '/dock-probe', workspaceName: 'Dock Probe Workspace', agentDefinitions: [], teamDefinitions: [] } },
    }
    const data = answers[p.operationName]
    if (!data) { evidence.browserErrors.push({ type: 'unexpected-operation', operation: p.operationName, query: p.query }); return r.fulfill({ json: { errors: [{ message: 'Unexpected fixture operation' }] } }) }
    await r.fulfill({ json: { data } })
  })
  await page.goto(url); await page.waitForFunction(() => !!window.__sidebarDockProbe)
  await delay(7000); await page.reload(); await page.waitForFunction(() => !!window.__sidebarDockProbe); await delay(1000)
  evidence.warmupErrors = evidence.browserErrors.splice(0)
  const sel = s => page.locator(`[data-test="${s}"]`)
  const state = () => page.evaluate(() => window.__sidebarDockProbe.state())
  const settle = () => delay(250)
  const reset = async (width = 1440, height = 800) => {
    await page.setViewportSize({ width, height }); await page.evaluate(() => window.__sidebarDockProbe.reset()); await settle()
  }
  const collapse = async () => { await sel('app-left-panel-collapse').click(); await settle() }
  const open = async () => { await sel('workspace-left-strip-workspaces').click(); await settle() }
  const drag = async (test, x) => {
    const h = await (test.startsWith('.') ? page.locator(test) : sel(test)).boundingBox(); assert(h, `Missing handle ${test}`)
    await page.mouse.move(h.x + h.width / 2, h.y + 100); await page.mouse.down()
    await page.mouse.move(x, h.y + 100, { steps: 12 }); await page.mouse.up(); await settle()
  }
  const snapshot = async label => {
    const value = await page.evaluate(() => {
      const rect = s => { const e = document.querySelector(`[data-test="${s}"]`); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right } }
      return { viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, state: window.__sidebarDockProbe.state(),
        left: rect('app-left-panel-shell'), center: rect('workspace-center-pane'), right: rect('workspace-right-panel'),
        drawer: rect('app-left-navigation-drawer'), backdrop: rect('app-left-drawer-backdrop'), url: location.href }
    })
    evidence.snapshots.push({ label, ...value }); await save()
    await page.screenshot({ path: path.join(out, `${label}.png`) }); return value
  }
  const docked = async (label, minimum = 200) => {
    const s = await snapshot(label)
    assert.equal(s.state.shell.leftPanel.presentation, 'docked', label)
    assert.equal(s.state.shell.rightPanel.presentation, 'docked', label)
    assert(!s.drawer && !s.backdrop, 'Docked navigation retains modal/scrim')
    assert(s.left && s.right && s.center, 'Dock surfaces missing')
    assert(s.left.right <= s.center.x + 1 && s.center.right <= s.right.x + 5, 'Panel overlap')
    assert(s.right.width >= 400 && s.center.width >= minimum, 'Approved width minimum violated')
    assert(s.right.right <= s.viewport.width + 1, 'Right panel clipped outside viewport')
    // Detect delayed observer hysteresis instead of accepting only one instantaneous fit.
    await settle(); const after = await state()
    assert.deepEqual(after.shell, s.state.shell, 'Layout oscillates after observer settle')
    return s
  }
  const interactive = async label => {
    const selectors = ['[data-test="workspace-center-pane"] textarea', '[data-test="workspace-right-panel"] [role="tab"][aria-selected="true"]']
    const hits = await page.evaluate(selectors => selectors.map(selector => {
      const e = document.querySelector(selector); if (!e) return { selector, hit: false }
      const r = e.getBoundingClientRect(); return { selector, hit: e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) }
    }), selectors)
    assert(hits.every(h => h.hit), 'Invisible click blocker/missing real control')
    const composer = page.locator(selectors[0]); await composer.click()
    assert(await composer.evaluate(e => e === document.activeElement), 'Composer did not receive pointer focus')
    const previous = (await state()).tab, target = previous === 'progress' ? 'teamMembers' : 'progress'
    const button = page.locator(`[role="tab"][data-tab-name="${target}"]`); await button.scrollIntoViewIfNeeded(); await button.click(); await settle()
    assert.equal((await state()).tab, target, 'Tool tab click did not change selected tool')
    await page.locator(`[role="tab"][data-tab-name="${previous}"]`).click(); await settle()
    evidence.snapshots.push({ label, hits, composerFocused: true, tabClickEffect: target }); await save()
  }
  await scenario('BR-001', 'Wide Team/Activity actual pointer drag, three cycles and meaningful controls', async () => {
    for (const width of [1000, 1280, 1440]) for (const tab of ['teamMembers', 'progress']) {
      await reset(width); await collapse(); await page.locator(`[role="tab"][data-tab-name="${tab}"]`).click()
      const before = await state(), beforeUrl = page.url()
      await drag('workspace-right-resize-handle', width * 0.4)
      await open(); await docked(`${width}-${tab}-intermediate`); await interactive(`${width}-${tab}-intermediate-controls`)
      await collapse(); await drag('workspace-right-resize-handle', 0)
      const preference = (await state()).rawRight
      await page.locator('[data-test="workspace-center-pane"] textarea').fill('Retained unsent dock probe draft')
      for (let cycle = 0; cycle < 3; cycle++) {
        await open(); const s = await docked(`${width}-${tab}-max-${cycle}`)
        assert.equal(s.state.rawRight, preference, 'Expansion overwrites preference')
        assert.equal(s.state.intent, 'user-sized'); assert.deepEqual(s.state.selection, before.selection)
        assert.equal(s.state.tab, tab); assert.equal(page.url(), beforeUrl, 'Workspaces navigated')
        await interactive(`${width}-${tab}-max-${cycle}-controls`)
        assert.equal(await page.locator('[data-test="workspace-center-pane"] textarea').inputValue(), 'Retained unsent dock probe draft')
        await collapse(); const c = await snapshot(`${width}-${tab}-restore-${cycle}`)
        assert.equal(c.state.rawRight, preference); assert(Math.abs(c.right.width - preference) <= 6, 'Effective width did not recover')
      }
    }
  })
  await scenario('BR-002', 'Exact capacity neighbors, actual navigation resize and drag while open', async () => {
    for (const navigation of [320, 520]) {
      await reset(); if (navigation === 520) await drag('.left-panel-drag-handle', 521)
      assert.equal((await state()).leftWidth, navigation)
      await collapse(); await drag('workspace-right-resize-handle', 0)
      const preference = (await state()).rawRight, boundary = navigation + 610
      for (const width of [boundary + 1, boundary, boundary - 1]) {
        await page.setViewportSize({ width, height: 800 }); await settle(); await open()
        if (width >= boundary) {
          await docked(`nav-${navigation}-capacity-${width}`); assert.equal((await state()).rawRight, preference); await collapse()
        } else {
          const s = await snapshot(`nav-${navigation}-capacity-${width}`); assert(s.drawer && s.backdrop, 'Below-capacity Workspaces must remain a drawer')
          await page.keyboard.press('Escape'); await settle(); assert.equal(await sel('app-left-drawer-backdrop').count(), 0)
        }
      }
    }
    await reset(); await collapse(); await drag('workspace-right-resize-handle', 0); await open()
    await drag('workspace-right-resize-handle', 950); await docked('drag-while-open'); await interactive('drag-while-open-controls')
  })
  await scenario('BR-003', 'Constrained modal keyboard/backdrop and wide recovery cleanup', async () => {
    await reset(); await collapse(); await drag('workspace-right-resize-handle', 0)
    for (const [width, height] of [[767, 800], [768, 800], [700, 800], [1440, 480]]) {
      await page.setViewportSize({ width, height }); await settle(); await open()
      const s = await snapshot(`constrained-${width}-${height}`); assert(s.drawer && s.backdrop)
      const drawer = sel('app-left-navigation-drawer'); assert.equal(await drawer.getAttribute('aria-modal'), 'true')
      assert(await drawer.evaluate(e => e.contains(document.activeElement)), 'Drawer did not capture focus')
      await page.keyboard.press('Shift+Tab'); assert(await drawer.evaluate(e => e.contains(document.activeElement)), 'Reverse Tab escaped modal')
      await page.keyboard.press('Tab'); assert(await drawer.evaluate(e => e.contains(document.activeElement)), 'Tab escaped modal')
      await page.keyboard.press('Escape'); await settle()
      assert.equal(await sel('app-left-drawer-backdrop').count(), 0)
      assert(await sel('workspace-left-strip-workspaces').evaluate(e => e === document.activeElement), 'Escape lost opener focus')
      await open(); await sel('app-left-drawer-backdrop').click({ position: { x: width - 10, y: 100 } }); await settle()
      assert.equal(await sel('app-left-drawer-backdrop').count(), 0)
    }
    await page.setViewportSize({ width: 700, height: 800 }); await settle(); await open()
    await page.setViewportSize({ width: 1440, height: 800 }); await settle()
    assert.equal(await sel('app-left-navigation-drawer').count(), 0); assert.equal(await sel('app-left-drawer-backdrop').count(), 0)
    await open(); await docked('wide-recovery'); await interactive('wide-recovery-controls')
    const composer = page.locator('[data-test="workspace-center-pane"] textarea'); await composer.focus(); await page.keyboard.press('Tab')
    assert(!(await sel('app-left-panel-shell').evaluate(e => e.contains(document.activeElement))), 'Stale modal trap stole focus')
  })
  await scenario('BR-004', 'Automatic allocation keeps 480 center floor at1210 capacity', async () => {
    for (const width of [1209, 1210, 1211, 1259, 1260]) {
      await reset(width)
      if (width >= 1210) await docked(`automatic-${width}`, 480)
      else { const s = await snapshot(`automatic-${width}`); assert.equal(s.state.shell.rightPanel.presentation, 'strip', 'Automatic infeasible tools must yield') }
      assert.equal((await state()).rawRight, 450); assert.equal((await state()).intent, 'automatic')
    }
  })
  evidence.result = 'Pass'
} catch (e) {
  evidence.result = 'Fail'; evidence.error = e.message; process.exitCode = 1
} finally {
  await browser?.close().catch(e => { evidence.cleanup.browserError = e.message; process.exitCode = 1 })
  if (nuxt && nuxt.exitCode === null && nuxt.signalCode === null) {
    process.kill(-nuxt.pid, 'SIGTERM')
    for (let i = 0; i < 100 && nuxt.exitCode === null && nuxt.signalCode === null; i++) await delay(100)
    if (nuxt.exitCode === null && nuxt.signalCode === null) process.kill(-nuxt.pid, 'SIGKILL')
  }
  if (installed) await fs.rm(routeFile)
  if (home) await fs.rm(home, { recursive: true, force: true })
  evidence.cleanup = { ...evidence.cleanup, routeRemoved: !existsSync(routeFile), privateHomeRemoved: !home || !existsSync(home),
    nuxtExit: nuxt?.exitCode ?? nuxt?.signalCode, portFree: !evidence.port || await portFree(evidence.port), browserClosed: !browser || !browser.isConnected() }
  log?.end(); evidence.finishedAt = new Date().toISOString(); await save()
  if (!evidence.cleanup.portFree || !evidence.cleanup.routeRemoved || !evidence.cleanup.browserClosed) process.exitCode = 1
}
console.log(JSON.stringify({ result: evidence.result, cases: evidence.cases, cleanup: evidence.cleanup, evidence: path.join(out, 'evidence.json') }, null, 2))
