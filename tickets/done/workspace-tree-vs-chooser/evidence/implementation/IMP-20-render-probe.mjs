#!/usr/bin/env node
// IMP-20: rendered self-check of workspace-tree-vs-chooser (autobyteus-385, SR-004) against VIS-001…VIS-017.
// Ticket-owned automation (TESTING.md). Real headless Chrome (playwright-core) → real Nuxt dev (this worktree) → real
// backend (`autobyteus-server-ts/dist/app.js`) in an owned temp data root on free ports. Agents run on the AGY runtime with
// the repository's scripted CLI (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, AGY_FAKE_CASE=linked_skills):
// no inference, no provider keys, no user data.
//
// Usage (from the worktree root, after `pnpm -C autobyteus-server-ts build`):
//   node tickets/in-progress/workspace-tree-vs-chooser/evidence/implementation/IMP-20-render-probe.mjs --output-dir <fresh dir>
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const webDir = path.join(repoDir, 'autobyteus-web')
const serverDir = path.join(repoDir, 'autobyteus-server-ts')
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1] }
const outDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `imp-20-${Date.now()}`)))
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p))
const AGY = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low' }

const evidence = { startedAt: new Date().toISOString(), cases: {}, processes: [], cleanup: [] }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const until = async (what, fn, timeout = 60000, interval = 250) => {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch (e) { last = e } await sleep(interval) }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`)
}
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const owned = []
const spawnOwned = (name, cmd, args, cwd, env) => {
  const log = fs.createWriteStream(path.join(outDir, `${name}.log`))
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.output = ''
  child.stdout.on('data', (d) => { child.output += d; log.write(d) }); child.stderr.on('data', (d) => { child.output += d; log.write(d) })
  owned.push(child); evidence.processes.push({ name, pid: child.pid })
  return child
}
const stopOwned = async (child) => {
  if (child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), sleep(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
  return exited ? 'SIGTERM' : 'SIGKILL'
}
const baseEnv = () => Object.fromEntries(['PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))

const stack = {}
const gql = async (query, variables = {}) => {
  const res = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const folders = {}
const s = { ids: {}, projects: {}, runs: {} }
const T = (id) => `[data-test="${id}"]`
let browser
const newPage = async ({ width = 1440, height = 900, locale = 'en-US', mode = null } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, locale, deviceScaleFactor: 1 })
  await context.addInitScript(([l, m]) => {
    try {
      if (l !== 'en-US') localStorage.setItem('autobyteus.localization.preference-mode', l)
      if (m) for (const key of Object.keys(localStorage)) if (key.startsWith('autobyteus.leftPanel.runSectionMode.')) localStorage.setItem(key, m)
    } catch { /* ignore */ }
  }, [locale, mode])
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization|Failed to load resource|WebSocket connection to/.test(m.text())) errors.push(m.text()) })
  return { context, page, errors }
}
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const openWorkspace = async (page) => {
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator(T('run-section-view-menu')).waitFor({ timeout: 120000 })
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' })
  await sleep(1500)
}
const currentMode = (page) => page.evaluate(() => Object.entries(window.localStorage).find(([k]) => k.startsWith('autobyteus.leftPanel.runSectionMode.'))?.[1] ?? 'workspaces')
const chooseView = async (page, mode) => {
  await page.locator(T('run-section-view-menu')).click()
  await page.locator(T(`run-section-view-${mode}`)).click()
  await until(`${mode} view`, async () => (await currentMode(page)) === mode)
  await sleep(800)
}
const treeRoots = (page) => page.locator(T('workspace-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-workspace-root')))
const chooserIds = (page) => page.locator('[data-test^="chat-workspace-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-workspace-option-', '')))
const newChat = async (page) => {
  await page.goto(`${stack.frontendUrl}/chat`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator(T('chat-new')).waitFor({ timeout: 120000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;caret-color:transparent!important}' })
  await sleep(1000)
}
const openChooser = async (page) => {
  await page.locator(T('chat-workspace-trigger')).click()
  await page.locator(T('chat-workspace-menu')).waitFor()
  await page.locator(T('chat-target-tab-workspaces')).click().catch(() => undefined)
}
const chooseTarget = async (page, definitionId) => {
  await page.locator(T('run-target-switcher-trigger')).click()
  await page.locator(T(`run-target-switcher-option-${definitionId}`)).click()
  await until('target chosen', async () => (await page.locator(T('run-target-switcher-menu')).count()) === 0, 10000)
}
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const pickAgyModel = async (page) => {
  await page.locator(T('chat-model-trigger')).first().click()
  const list = page.locator(T(`chat-model-list-${AGY.runtimeKind}`))
  const row = page.locator(T(`chat-runtime-${AGY.runtimeKind}`))
  for (let attempt = 0; attempt < 6 && !(await list.isVisible().catch(() => false)); attempt += 1) {
    await row.hover().catch(() => {}); await sleep(400)
    if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await sleep(700) }
  }
  await list.locator(MODEL_ROW).first().waitFor({ timeout: 60000 })
  const rowBox = await row.boundingBox({ timeout: 1000 }).catch(() => null)
  const listBox = await list.boundingBox({ timeout: 1000 }).catch(() => null)
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 })
  await list.locator(T(`chat-model-option-${AGY.llmModelIdentifier}`)).click()
  await until('AGY model chosen', async () => (await page.locator(T('chat-model-menu')).count()) === 0 || !(await list.isVisible().catch(() => false)), 10000).catch(() => page.keyboard.press('Escape'))
}
/**
 * Opens the View menu and waits for its icons. @iconify/vue fetches an icon's data from the Iconify API the first time a
 * browser context uses it, and renders an empty <svg> until then, so an icon counts as drawn only once its svg has content.
 */
const openViewMenu = async (page) => {
  await page.locator(T('run-section-view-menu')).click()
  const list = page.locator(T('run-section-view-menu-list'))
  await list.waitFor()
  await until('View menu icons drawn', async () => {
    const drawn = await list.locator('svg').evaluateAll((els) => els.map((e) => e.innerHTML.trim().length > 0))
    return drawn.length >= 4 && drawn.every(Boolean)
  }, 15000)
}
const toasts = (page) => page.locator('[role="alert"], [role="status"], .toast, [data-test^="toast"]').allInnerTexts().catch(() => [])

/** A run started through the public API, as the chat does: prepared, then its first message over the agent socket. */
const startRun = async (rootPath, { projectId = null, activate = false } = {}) => {
  const prepared = (await gql('mutation($input:CreateAgentRunInput!){prepareAgentRun(input:$input){success message runId}}', { input: {
    agentDefinitionId: s.ids.writer, workspaceRootPath: rootPath, llmModelIdentifier: AGY.llmModelIdentifier, autoExecuteTools: true,
    runtimeKind: AGY.runtimeKind, initialSummary: `Notes for ${path.basename(rootPath)}`, ...(projectId ? { projectId } : {}) } })).prepareAgentRun
  assert(prepared.success, prepared.message)
  if (activate) {
    const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${prepared.runId}`)
    const frames = []
    socket.addEventListener('message', (e) => frames.push(JSON.parse(String(e.data))))
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject) })
    await until('agent socket connected', () => frames.some((f) => f.type === 'CONNECTED'))
    const messageId = `imp20-${randomUUID()}`
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: prepared.runId, content: 'Reply OK.', message_id: messageId,
      dedupe_key: `agent_run_input:imp20:${messageId}`, context_file_paths: [], image_urls: [] } }))
    await until('run held by the runtime', async () => {
      const groups = (await gql('{listWorkspaceRunHistory(limitPerAgent:null){workspaceRootPath agentDefinitions{runs{runId statusSource}}}}')).listWorkspaceRunHistory
      return groups.some((g) => g.agentDefinitions.some((a) => a.runs.some((r) => r.runId === prepared.runId && r.statusSource === 'ACTIVE_RUNTIME')))
    }, 90000)
    socket.close()
  }
  return prepared.runId
}

const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('VIS-015', 'Projects view with no Projects on the node: text-only empty state', async () => {
  const { page, errors, context } = await newPage()
  try {
    await openWorkspace(page)
    await chooseView(page, 'projects')
    const empty = page.locator(T('projects-tree-empty'))
    await empty.waitFor({ timeout: 60000 })
    const text = (await empty.innerText()).trim()
    assert(text.includes('No Projects yet') && text.includes('Create a Project on the Projects page'), 'VIS-015 copy', text)
    assert(await empty.locator('a, button').count() === 0, 'VIS-015 has a button or link')
    await shot(page, 'IMP-20-VIS-015-projects-no-projects')
    await chooseView(page, 'workspaces')
    assert(errors.length === 0, 'browser errors', errors)
    return { text }
  } finally { await context.close() }
})

defineCase('VIS-014', 'Workspaces view with folders but no run: text-only empty state; the chooser lists every folder', async () => {
  const { page, errors, context } = await newPage()
  try {
    await openWorkspace(page)
    const empty = page.locator(T('workspaces-tree-empty'))
    await empty.waitFor({ timeout: 60000 })
    const text = (await empty.innerText()).trim()
    assert(text.includes('No runs in any folder yet') && text.includes('A folder is listed here once it has a run.'), 'VIS-014 copy', text)
    assert((await treeRoots(page)).length === 0, 'a folder without runs is listed')
    assert(await empty.locator('a, button').count() === 0, 'VIS-014 has a button or link')
    await shot(page, 'IMP-20-VIS-014-workspaces-no-runs')
    assert(errors.length === 0, 'browser errors', errors)
    return { text }
  } finally { await context.close() }
})

defineCase('VIS-016', 'Projects exist but none has a run: its own text-only state', async () => {
  for (const name of ['Customer Onboarding Experience Redesign', 'Website Launch']) {
    const created = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}', { input: {
      name, workspaces: name === 'Website Launch' ? [{ workspaceRootPath: folders['client-portal'], description: 'folder' }] : [] } })).createProject
    s.projects[name] = created.projectId
  }
  const { page, errors, context } = await newPage()
  try {
    await openWorkspace(page)
    await chooseView(page, 'projects')
    const none = page.locator(T('projects-tree-no-runs'))
    await none.waitFor({ timeout: 60000 })
    const text = (await none.innerText()).trim()
    assert(text.includes('No Project has a run yet') && text.includes('Your Projects are on the Projects page.'), 'VIS-016 copy', text)
    assert(await page.locator(T('project-row')).count() === 0, 'a Project without runs is listed')
    await shot(page, 'IMP-20-VIS-016-projects-no-runs')
    await chooseView(page, 'workspaces')
    assert(errors.length === 0, 'browser errors', errors)
    return { text }
  } finally { await context.close() }
})

defineCase('VIS-001/002', 'Workspaces view (default): only folders with runs, no remove button; the View menu', async () => {
  s.runs.portalA = await startRun(folders['client-portal'])
  s.runs.portalProject = await startRun(folders['client-portal'], { projectId: s.projects['Website Launch'] })
  s.runs.running = await startRun(folders['prototype-workspace'], { activate: true })
  const { page, errors, context } = await newPage()
  try {
    await openWorkspace(page)
    assert((await page.locator(T('run-section-title')).innerText()).trim() === 'Workspaces', 'title')
    await until('two folders listed', async () => (await treeRoots(page)).length === 2, 30000)
    const roots = (await treeRoots(page)).sort()
    assert(JSON.stringify(roots) === JSON.stringify([folders['client-portal'], folders['prototype-workspace']].sort()), 'listed folders', roots)
    await page.locator(T('workspace-row')).first().hover()
    const removeButtons = await page.locator(`${T('workspace-row')} button[title*="emove"]`).count()
    assert(removeButtons === 0, 'a folder row has a remove button', { removeButtons })
    assert(await page.locator(T('run-section-add-workspace')).count() === 0 && await page.locator(T('create-workspace-form')).count() === 0, 'an add action is offered')
    await shot(page, 'IMP-20-VIS-001-workspaces-default')
    await openViewMenu(page)
    const items = await page.locator('[role="menuitemradio"]').evaluateAll((els) => els.map((e) => [e.textContent.trim(), e.getAttribute('aria-checked')]))
    assert(JSON.stringify(items) === JSON.stringify([['Runs', 'false'], ['Workspaces', 'true'], ['Projects', 'false']]), 'menu items', items)
    const menuBox = await page.locator(T('run-section-view-menu-list')).boundingBox()
    await shot(page, 'IMP-20-VIS-002-menu-open-workspaces')
    await page.keyboard.press('Escape')
    assert(errors.length === 0, 'browser errors', errors)
    return { roots, items, menuWidth: menuBox?.width }
  } finally { await context.close() }
})

defineCase('VIS-003/004', 'Runs view: every run newest first; menu open on Runs', async () => {
  const { page, errors, context } = await newPage()
  try {
    await openWorkspace(page)
    await chooseView(page, 'runs')
    assert((await page.locator(T('run-section-title')).innerText()).trim() === 'Runs', 'title')
    await until('runs listed', async () => (await page.locator(`${T('run-list')} > li`).count()) >= 3, 30000)
    const rows = await page.locator(`${T('run-list')} > li`).count()
    await shot(page, 'IMP-20-VIS-003-runs-view')
    await openViewMenu(page)
    await shot(page, 'IMP-20-VIS-004-menu-open-runs')
    await page.keyboard.press('Escape')
    assert(errors.length === 0, 'browser errors', errors)
    return { rows }
  } finally { await context.close() }
})

defineCase('VIS-005/006', 'Projects view: only the Project with a run; menu open on Projects', async () => {
  const { page, errors, context } = await newPage()
  try {
    await openWorkspace(page)
    await chooseView(page, 'projects')
    await until('one Project listed', async () => (await page.locator(T('project-row')).count()) === 1, 60000)
    const names = await page.locator(`${T('project-row')} ${T('project-row-select')}`).allInnerTexts()
    assert(names.length === 1 && names[0].includes('Website Launch'), 'listed Projects', names)
    await shot(page, 'IMP-20-VIS-005-projects-view')
    await openViewMenu(page)
    await shot(page, 'IMP-20-VIS-006-menu-open-projects')
    await page.keyboard.press('Escape')
    await chooseView(page, 'workspaces')
    assert(errors.length === 0, 'browser errors', errors)
    return { names }
  } finally { await context.close() }
})

defineCase('VIS-011', 'Keyboard focus ring on the View button; arrows, Escape returns focus', async () => {
  const { page, errors, context } = await newPage()
  try {
    await openWorkspace(page)
    const button = page.locator(T('run-section-view-menu'))
    for (let i = 0; i < 80 && !(await button.evaluate((el) => el === document.activeElement)); i += 1) await page.keyboard.press('Tab')
    assert(await button.evaluate((el) => el === document.activeElement), 'the View button is not reachable by Tab')
    const ring = await button.evaluate((el) => getComputedStyle(el).boxShadow)
    await shot(page, 'IMP-20-VIS-011-keyboard-focus')
    await page.keyboard.press('ArrowDown')
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-test'))
    await page.keyboard.press('Escape')
    const back = await button.evaluate((el) => el === document.activeElement)
    assert(focused === 'run-section-view-workspaces' && back, 'menu keyboard', { focused, back })
    assert(errors.length === 0, 'browser errors', errors)
    return { ring, focused }
  } finally { await context.close() }
})

defineCase('VIS-012', 'zh-CN: the Runs view and its title', async () => {
  const { page, errors, context } = await newPage({ locale: 'zh-CN', mode: 'runs' })
  try {
    await openWorkspace(page)
    if ((await currentMode(page)) !== 'runs') await chooseView(page, 'runs')
    await until('runs listed', async () => (await page.locator(`${T('run-list')} > li`).count()) >= 3, 30000)
    const title = (await page.locator(T('run-section-title')).innerText()).trim()
    await page.locator(T('run-section-view-menu')).click()
    const items = (await page.locator('[role="menuitemradio"]').allInnerTexts()).map((t) => t.trim())
    await page.keyboard.press('Escape')
    await shot(page, 'IMP-20-VIS-012-runs-view-zh-CN')
    await chooseView(page, 'workspaces')
    assert(title === '运行', 'zh-CN title', { title, items })
    assert(errors.length === 0, 'browser errors', errors)
    return { title, items }
  } finally { await context.close() }
})

defineCase('VIS-013', '600x800: the run section in the left drawer with the same menu', async () => {
  const { page, errors, context } = await newPage({ width: 600, height: 800 })
  try {
    await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 })
    await sleep(2000)
    const strip = page.locator('[data-nav-key="workspaces"]').first()
    const stripLabel = await strip.getAttribute('aria-label').catch(() => null)
    if (await strip.isVisible().catch(() => false)) { await strip.click(); await sleep(800) }
    await page.locator(T('run-section-view-menu')).waitFor({ timeout: 30000 })
    await openViewMenu(page)
    const items = await page.locator('[role="menuitemradio"]').count()
    await shot(page, 'IMP-20-VIS-013-drawer-narrow')
    await page.keyboard.press('Escape')
    assert(items === 3 && stripLabel === 'Workspaces', 'narrow drawer', { items, stripLabel })
    assert(errors.length === 0, 'browser errors', errors)
    return { stripLabel, items }
  } finally { await context.close() }
})

defineCase('VIS-007/008/009', 'Chat chooser: every folder; Remove on hover; confirmation; removed from every list', async () => {
  const { page, errors, context } = await newPage()
  try {
    await newChat(page)
    await openChooser(page)
    const ids = await chooserIds(page)
    for (const name of ['docs-site', 'design-notes', 'client-portal']) assert(ids.includes(folders.ids[name]), `chooser lacks ${name}`, ids)
    assert(await page.locator(T('chat-workspace-remove-temp_ws_default')).count() === 0, 'Remove on Temp workspace')
    const option = page.locator(T(`chat-workspace-option-${folders.ids['docs-site']}`))
    await option.hover()
    const remove = page.locator(T(`chat-workspace-remove-${folders.ids['docs-site']}`))
    await until('Remove visible on hover', async () => (await remove.evaluate((e) => getComputedStyle(e).opacity)) === '1', 5000)
    const box = await remove.boundingBox()
    await shot(page, 'IMP-20-VIS-007-chooser-remove-on-hover')
    await remove.click()
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor()
    const confirmation = (await dialog.innerText()).trim()
    assert(confirmation.includes('Remove folder') && confirmation.includes('Remove docs-site?') && confirmation.includes('It will no longer be offered when you choose a folder'), 'VIS-008 copy', confirmation)
    await shot(page, 'IMP-20-VIS-008-chooser-remove-confirmation')
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    await until('success toast', async () => (await page.locator('body').innerText()).includes('docs-site removed. Files, memories, and run history were not deleted.'), 10000)
    await shot(page, 'IMP-20-VIS-009-chooser-folder-removed')
    await openChooser(page)
    assert(!(await chooserIds(page)).includes(folders.ids['docs-site']), 'docs-site still offered')
    await page.keyboard.press('Escape')
    const registered = (await gql('{workspaces{workspaceId}}')).workspaces.map((w) => w.workspaceId)
    assert(!registered.includes(folders.ids['docs-site']), 'docs-site still registered')
    assert(fs.existsSync(path.join(folders['docs-site'], 'keep.txt')), 'docs-site files deleted')
    assert(errors.length === 0, 'browser errors', errors)
    return { confirmation, removeButton: box }
  } finally { await context.close() }
})

defineCase('VIS-010', 'Remove refused while a run is running in the folder; nothing changes', async () => {
  const { page, errors, context } = await newPage()
  try {
    await newChat(page)
    await openChooser(page)
    await page.locator(T(`chat-workspace-option-${folders.ids['prototype-workspace']}`)).hover()
    await page.locator(T(`chat-workspace-remove-${folders.ids['prototype-workspace']}`)).click()
    const dialog = page.locator('[role="dialog"]')
    await dialog.waitFor()
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click()
    await until('refusal toast', async () => (await page.locator('body').innerText()).includes('Stop active runs before removing this workspace.'), 10000)
    await shot(page, 'IMP-20-VIS-010-chooser-remove-refused')
    const registered = (await gql('{workspaces{workspaceId}}')).workspaces.map((w) => w.workspaceId)
    assert(registered.includes(folders.ids['prototype-workspace']), 'the running folder was removed')
    // The store logs the refused removal it rethrows to the toast; that one line is expected here.
    const unexpected = errors.filter((e) => !/^Error removing workspace: .*Stop active runs before removing this workspace\./.test(e))
    assert(unexpected.length === 0, 'browser errors', unexpected)
    return { refused: true }
  } finally { await context.close() }
})

defineCase('VIS-017', 'A folder with only a draft is not listed; it appears with the first sent message', async () => {
  const { page, errors, context } = await newPage()
  try {
    await newChat(page)
    await chooseTarget(page, s.ids.writer)
    await pickAgyModel(page)
    await openChooser(page)
    await page.locator(T(`chat-workspace-option-${folders.ids['design-notes']}`)).click()
    const input = page.locator(`${T('chat-composer')} textarea`).first()
    await input.click(); await input.fill('Reply OK.')
    await sleep(1000)
    const beforeRoots = await treeRoots(page)
    assert(!beforeRoots.includes(folders['design-notes']), 'a draft-only folder is listed', beforeRoots)
    await page.locator(T('chat-primary-action')).first().click()
    await page.waitForURL((u) => /[?&]id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 120000 })
    await until('design-notes appears', async () => (await treeRoots(page)).includes(folders['design-notes']), 30000)
    await sleep(800)
    await shot(page, 'IMP-20-VIS-017-folder-appears-after-first-run')
    assert(errors.length === 0, 'browser errors', errors)
    return { beforeRoots, afterRoots: await treeRoots(page) }
  } finally { await context.close() }
})

let exitCode = 0
try {
  assert(chrome, 'Google Chrome not found')
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first')
  await fsp.mkdir(outDir, { recursive: true })
  assert((await fsp.readdir(outDir)).length === 0, `output dir is not empty: ${outDir}`)
  stack.dataRoot = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), 'imp-20-wtv-')))
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'home']) await fsp.mkdir(path.join(stack.dataRoot, dir))
  const backendPort = await freePort(); const frontendPort = await freePort()
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`
  const backendEnv = { APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
    AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') }
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 })
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), HOME: path.join(stack.dataRoot, 'home'), ...backendEnv }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot], serverDir,
    { ...baseEnv(), ...backendEnv, HOME: path.join(stack.dataRoot, 'home'), ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' })
  await until('backend', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${stack.backendUrl}/rest/health`)).ok }, 180000, 500)
  folders.ids = {}
  for (const name of ['client-portal', 'docs-site', 'design-notes', 'prototype-workspace']) {
    const root = path.join(stack.dataRoot, 'folders', name)
    await fsp.mkdir(root, { recursive: true }); await fsp.writeFile(path.join(root, 'keep.txt'), 'kept')
    const created = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId workspaceRootPath}}', { input: { rootPath: root } })).createWorkspace
    folders[name] = created.workspaceRootPath; folders.ids[name] = created.workspaceId
  }
  s.ids.writer = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name: 'Daily Writer', role: 'assistant', description: 'IMP-20 fixture agent', instructions: 'Fixture.', toolNames: [] } })).createAgentDefinition.id
  const ws = stack.backendUrl.replace(/^http/, 'ws')
  spawnOwned('frontend', 'pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...baseEnv(), HOME: process.env.HOME, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` })
  await until('Nuxt dev', async () => (await fetch(`${stack.frontendUrl}/workspace`)).ok, 240000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  { const warm = await newPage(); await warm.page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => undefined); await sleep(4000); await warm.context.close() }
  Object.assign(evidence, { stack: { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot }, folders })
  for (const c of cases) {
    const started = Date.now()
    try {
      evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: 0, details: await c.fn() }
    } catch (error) {
      exitCode = 1
      evidence.cases[c.id] = { title: c.title, result: 'Fail', error: error.message, details: error.details ?? null }
    }
    evidence.cases[c.id].ms = Date.now() - started
    console.log(`${c.id} ${evidence.cases[c.id].result} ${c.title}${evidence.cases[c.id].error ? ` — ${evidence.cases[c.id].error}` : ''}`)
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[IMP-20] ${error.message}`)
} finally {
  if (s.runs.running) await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: s.runs.running }).catch(() => undefined)
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (stack.dataRoot) { await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: stack.dataRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fsp.mkdir(outDir, { recursive: true })
  await fsp.writeFile(path.join(outDir, 'IMP-20-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  process.exitCode = exitCode
}
