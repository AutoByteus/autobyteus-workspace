#!/usr/bin/env node
// Renderer-only regression. Own free-port Nuxt, fresh Chrome and temporary fixture pages.
// Real default layout, both consumers, capability stores, Projects pages and Vue Router;
// GraphQL/status reads emulated (no backend, database, provider, Electron or user data).
// Prerequisites: dependencies, workspace contract builds, nuxt prepare, Chrome.
// pnpm test:e2e:projects-navigation --output-dir <fresh-dir> [--ledger-file <path>]
import assert from 'node:assert/strict'
import { existsSync, createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1] }
const out = path.resolve(web, arg('output-dir', 'test-results/projects-primary-navigation'))
const ledger = arg('ledger-file')
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync))
const routes = ['/api-e2e-projects-navigation', '/mobile/api-e2e-projects-navigation']
const pages = ['api-e2e-projects-navigation.vue', 'api-e2e-projects-mobile.vue'].map(p => path.join(web, 'pages', p))
const evidenceFile = path.join(out, 'evidence.json')
assert(!existsSync(evidenceFile), 'Use a fresh evidence directory')
for (const p of pages) assert(!existsSync(p), `Refusing existing fixture page ${p}`)
await fs.mkdir(out, { recursive: true })
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version, cases: {}, graphql: [], pageErrors: [], cleanup: {} }
const save = () => fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const wait = async (label, fn, timeout = 90000) => { const start = Date.now(); while (Date.now() - start < timeout) { if (await fn()) return; await sleep(100) } throw new Error(`Timeout: ${label}`) }
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })
const listening = port => new Promise(resolve => { const s = net.connect(port, '127.0.0.1'); s.once('connect', () => { s.destroy(); resolve(true) }); s.once('error', () => resolve(false)) })
const record = async (id, fn) => {
  evidence.cases[id] = { result: 'Running', startedAt: new Date().toISOString() }; await save()
  try { evidence.cases[id].observed = await fn(); evidence.cases[id].result = 'Pass' }
  catch (error) { evidence.cases[id].result = 'Fail'; evidence.cases[id].error = error.stack; if (page) { evidence.cases[id].failureUrl = page.url(); evidence.cases[id].failureBody = await page.locator('body').innerText().catch(() => 'unavailable'); await page.screenshot({ path: path.join(out, `${id}-failure.png`) }).catch(() => {}) } throw error }
  finally { evidence.cases[id].finishedAt = new Date().toISOString(); await save(); if (ledger) await fs.appendFile(ledger, `- ${id}: ${evidence.cases[id].result}; ${evidenceFile}\n`) }
}
let child, browser, page, log, port
const installed = []
const expanded = () => page.locator('[data-test="app-left-panel-primary-nav"] li > div > button:first-child')
const strip = () => page.locator('[data-test="workspace-left-navigation-strip"] button[data-nav-key]:not([data-nav-key="settings"])')
const labels = ['Chat', 'Agents', 'Agent Teams', 'Agent Orgs', 'Projects', 'Applications', 'Skills', 'Memory', 'Nodes']
const collapse = async () => { await page.getByRole('button', { name: 'Collapse left panel', exact: true }).click(); await strip().first().waitFor() }
const redock = async () => { await strip().filter({ has: page.locator('svg') }).first().click(); await expanded().first().waitFor() }
const checkOrder = async (mode, expected) => {
  const nav = mode === 'expanded' ? expanded() : strip()
  await wait(`${mode} exact order`, async () => JSON.stringify(await nav.evaluateAll((es, mode) => es.map(e => mode === 'expanded' ? e.innerText.trim() : e.getAttribute('aria-label')), mode)) === JSON.stringify(expected))
  const actual = await nav.evaluateAll((es, mode) => es.map(e => ({ label: mode === 'expanded' ? e.innerText.trim() : e.getAttribute('aria-label'), top: e.getBoundingClientRect().top })), mode)
  assert(actual.every((x, i) => i === 0 || x.top > actual[i - 1].top), 'Visual order agrees with DOM')
  return actual
}
const screenshot = name => page.screenshot({ path: path.join(out, `${name}.png`) })
try {
  for (const p of pages) { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.copyFile(path.join(web, 'tests/e2e/fixtures/projects-primary-navigation.page.vue'), p); installed.push(p); if (p === pages[1]) { const text = await fs.readFile(p, 'utf8'); await fs.writeFile(p, text.replace('<script setup lang="ts">', `<script setup lang="ts">\ndefinePageMeta({ path: '/mobile/api-e2e-projects-navigation' })`)) } }
  port = await freePort(); const backendPort = await freePort()
  evidence.frontendPort = port; evidence.backendFixturePort = backendPort
  log = createWriteStream(path.join(out, 'nuxt-dev.log'))
  child = spawn('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(port)], { cwd: web, detached: true, env: { ...process.env, BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` }, stdio: ['ignore', 'pipe', 'pipe'] })
  evidence.pid = child.pid; child.stdout.pipe(log); child.stderr.pipe(log)
  await wait('Nuxt HTTP ready', async () => { assert(child.exitCode === null, 'Nuxt exited'); try { return (await fetch(`http://127.0.0.1:${port}${routes[0]}`)).ok } catch { return false } })
  browser = await chromium.launch({ executablePath, headless: true }); evidence.browser = browser.version()
  const context = await browser.newContext({ viewport: { width: 1512, height: 900 }, locale: 'en-US' })
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'))
  // Browser has no permission to contact user's services. Only local frontend resources and
  // deterministic API reads are permitted. Unexpected GraphQL mutations are rejected.
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (url.pathname === '/graphql') {
      const body = req.postDataJSON() || {}; evidence.graphql.push({ operation: body.operationName, query: body.query })
      assert(!/^\s*mutation/.test(body.query || ''), 'Navigation must not mutate project/backend data')
      const data = { projects: [], agentDefinitions: [], agentTeamDefinitions: [], agentOrgDefinitions: [], workspaces: [], listWorkspaceRunHistory: [], listCollaborationRootHistory: [], projectsCapability: { __typename: 'ProjectsCapability', enabled: true, settingKey: 'ENABLE_PROJECTS', source: 'SERVER_SETTING' }, applicationsCapability: { __typename: 'ApplicationsCapability', enabled: true, settingKey: 'ENABLE_APPLICATIONS', source: 'SERVER_SETTING', scope: 'BOUND_NODE' } }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) })
    }
    if (url.pathname.startsWith('/rest/') || url.pathname === '/health') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    if (['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com'].includes(url.hostname)) return route.continue()
    if (url.origin === `http://127.0.0.1:${port}`) return route.continue()
    return route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', error => evidence.pageErrors.push(error.stack || String(error)))
  const gotoFixture = async (mobile = false) => { await page.goto(`http://127.0.0.1:${port}${routes[mobile ? 1 : 0]}`); await page.getByTestId('navigation-probe-ready').waitFor(); await expanded().first().waitFor() }
  await gotoFixture()
  await record('B-001', async () => {
    const observations = {}; observations.expandedOn = await checkOrder('expanded', labels); await screenshot('expanded-applications-on')
    await collapse(); observations.compactOn = await checkOrder('compact', labels); await screenshot('compact-applications-on')
    await page.getByTestId('toggle-applications').click(); observations.compactOff = await checkOrder('compact', labels.filter(x => x !== 'Applications'))
    await redock(); observations.expandedOff = await checkOrder('expanded', labels.filter(x => x !== 'Applications')); return observations
  })
  await record('B-002', async () => {
    await page.getByTestId('toggle-projects').click(); const off = labels.filter(x => !['Projects', 'Applications'].includes(x))
    const result = { expandedOff: await checkOrder('expanded', off) }; await collapse(); result.compactOff = await checkOrder('compact', off)
    await page.getByTestId('toggle-applications').click(); result.compactOn = await checkOrder('compact', labels.filter(x => x !== 'Projects'))
    await redock(); result.expandedOn = await checkOrder('expanded', labels.filter(x => x !== 'Projects')); await page.getByTestId('toggle-projects').click(); return result
  })
  await record('B-003', async () => {
    const projects = () => expanded().filter({ hasText: /^Projects$/ })
    await wait('folder icon loaded', async () => await projects().locator('svg.iconify--heroicons').count() === 1)
    const folderPath = await projects().locator('svg path').first().getAttribute('d')
    await projects().click(); await wait('/projects route', async () => new URL(page.url()).pathname === '/projects'); await page.getByTestId('projects-empty').waitFor()
    assert(await projects().evaluate(e => e.classList.contains('bg-gray-100')), 'Projects active after click')
    await page.getByTestId('projects-new-button').click(); await page.getByTestId('project-name-input').waitFor(); assert.equal(new URL(page.url()).pathname, '/projects/new')
    assert(await projects().evaluate(e => e.classList.contains('bg-gray-100')), 'Projects active on new subroute')
    await collapse(); const compactProjects = strip().filter({ has: page.locator('svg.iconify--heroicons') }).filter({ hasText: 'Projects' })
    assert.equal(await compactProjects.getAttribute('aria-label'), 'Projects'); assert.equal(await compactProjects.locator('svg path').first().getAttribute('d'), folderPath)
    assert(await compactProjects.evaluate(e => e.classList.contains('bg-gray-100')), 'Compact subroute active')
    await screenshot('compact-subroute-active'); await compactProjects.click(); await expanded().first().waitFor(); await wait('compact click route settled', async () => new URL(page.url()).pathname === '/projects'); return { route: '/projects', subroute: '/projects/new', folderPath }
  })
  await record('B-004', async () => {
    await page.getByTestId('projects-new-button').click(); await page.getByTestId('project-name-input').waitFor();
    await page.setViewportSize({ width: 390, height: 844 }); await strip().first().waitFor()
    assert.equal(await page.locator('[data-test="workspace-left-navigation-strip"]').getAttribute('data-strip-activation'), 'open-drawer')
    const before = page.url(); await strip().filter({ hasText: 'Projects' }).click(); await page.locator('[data-test="app-left-navigation-drawer"]').waitFor(); assert.equal(page.url(), before, 'Drawer opener must not navigate')
    await checkOrder('expanded', labels); await screenshot('narrow-drawer')
    await expanded().filter({ hasText: /^Projects$/ }).click(); await strip().first().waitFor(); assert.equal(new URL(page.url()).pathname, '/projects')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No narrow horizontal overflow'); await screenshot('narrow-strip'); return { activation: 'open-drawer', destination: '/projects' }
  })
  await record('B-005', async () => {
    await page.setViewportSize({ width: 1512, height: 900 }); await gotoFixture(true)
    const expected = labels.filter(x => !['Projects', 'Applications', 'Nodes'].includes(x))
    const result = { expanded: await checkOrder('expanded', expected) }; await collapse(); result.compact = await checkOrder('compact', expected); await screenshot('mobile-runtime-eligibility'); return result
  })
  assert.deepEqual(evidence.pageErrors, [], 'No uncaught browser exceptions')
  evidence.result = 'Pass'
} catch (error) { evidence.result = 'Fail'; evidence.error = error.stack || String(error) }
finally {
  try { if (browser) await browser.close(); evidence.cleanup.browserClosed = true } catch (e) { evidence.cleanup.browserError = String(e); evidence.result = 'Fail' }
  try {
    if (child?.pid) {
      try { process.kill(-child.pid, 'SIGTERM') } catch (e) { if (e.code !== 'ESRCH') throw e }
      await wait('owned Nuxt group exit', async () => { try { process.kill(-child.pid, 0); return false } catch (e) { return e.code === 'ESRCH' } }, 15000).catch(async () => { try { process.kill(-child.pid, 'SIGKILL') } catch (e) { if (e.code !== 'ESRCH') throw e }; await wait('owned Nuxt SIGKILL exit', async () => { try { process.kill(-child.pid, 0); return false } catch (e) { return e.code === 'ESRCH' } }, 5000) })
      assert(!(await listening(port)), 'Owned frontend listener must be absent')
    }
    evidence.cleanup.nuxtStopped = true
  } catch (e) { evidence.cleanup.nuxtError = String(e); evidence.result = 'Fail' }
  for (const p of installed) { await fs.rm(p); }
  evidence.cleanup.fixturePagesRemoved = installed.every(p => !existsSync(p))
  if (log) log.end()
  evidence.finishedAt = new Date().toISOString(); await save()
  process.stdout.write(JSON.stringify({ result: evidence.result, error: evidence.error, cases: evidence.cases, cleanup: evidence.cleanup }) + '\n')
}
if (evidence.result !== 'Pass') process.exitCode = 1
