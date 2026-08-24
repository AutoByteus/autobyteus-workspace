#!/usr/bin/env node
import { chromium } from 'playwright-core'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { installHostScenario } from '../shared/install-host-scenario.js'
import { applyExperienceScenario } from '../shared/apply-experience-scenario.js'

const root = resolve(new URL('../..', import.meta.url).pathname)
const sourceBaseUrl = process.env.SOURCE_BASE_URL || 'http://127.0.0.1:3100'
const prototypeBaseUrl = process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1:3200'
const mockBaseUrl = process.env.MOCK_BASE_URL || 'http://127.0.0.1:4310'
const require = createRequire(import.meta.url)
const iconCollections = Object.fromEntries(['heroicons', 'ph', 'mdi', 'svg-spinners', 'vscode-icons', 'logos'].map(prefix => [prefix, require(`@iconify-json/${prefix}/icons.json`)]))
const normalizedStyle = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
const sha256 = value => createHash('sha256').update(value).digest('hex')
const monacoRoot = resolve(root, 'node_modules/monaco-editor/min/vs')

const baseScenarios = [
  { id: 'HOST-001', path: '/settings?section=extensions', context: 'electron_internal', scenario: 'populated' },
  { id: 'HOST-002', path: '/settings?section=updates', context: 'electron_internal', scenario: 'populated' },
  { id: 'HOST-003', path: '/settings?section=updates', context: 'electron_internal', scenario: 'update_available' },
  { id: 'HOST-004', path: '/settings?section=server-settings&mode=advanced', context: 'electron_internal', scenario: 'populated' },
  { id: 'HOST-005', path: '/settings?section=server-settings&mode=advanced', context: 'electron_internal', scenario: 'populated', action: 'server-monitor' },
  { id: 'HOST-006', path: '/settings?section=extensions', context: 'electron_external', scenario: 'populated' },
  { id: 'HOST-007', path: '/settings?section=updates', context: 'electron_external', scenario: 'populated' },
  { id: 'HOST-008', path: '/settings?section=server-settings&mode=advanced', context: 'electron_external', scenario: 'populated' },
  { id: 'STATE-009', path: '/agents?view=list', context: 'electron_internal', scenario: 'electron_starting', waitMs: 500 },
  { id: 'STATE-010', path: '/agents?view=list', context: 'electron_internal', scenario: 'electron_error' },
  { id: 'STATE-011', path: '/agents?view=list', context: 'electron_internal', scenario: 'electron_error', action: 'server-error-details' },
  { id: 'STATE-012', path: '/agents?view=list', context: 'electron_internal', scenario: 'electron_restarting', waitMs: 500 },
  { id: 'STATE-013', path: '/agents?view=list', context: 'electron_internal', scenario: 'electron_shutdown' },
  { id: 'WKS-001', path: '/workspace', scenario: 'workspace_agent_active' },
  { id: 'WKS-002', path: '/workspace', scenario: 'workspace_agent_streaming' },
  { id: 'WKS-003', path: '/workspace', scenario: 'workspace_agent_completed' },
  { id: 'WKS-004', path: '/workspace', scenario: 'workspace_agent_error' },
  { id: 'WKS-005', path: '/workspace', scenario: 'workspace_agent_active', action: 'files' },
  { id: 'WKS-006', path: '/workspace', scenario: 'workspace_agent_active', action: 'terminal' },
  { id: 'WKS-007', path: '/workspace', scenario: 'workspace_agent_active', action: 'activity' },
  { id: 'WKS-008', path: '/workspace', scenario: 'workspace_agent_active', action: 'token' },
  { id: 'WKS-009', path: '/workspace', scenario: 'workspace_agent_active', action: 'artifacts' },
  { id: 'WKS-010', path: '/workspace', scenario: 'workspace_agent_active', action: 'vnc' },
  { id: 'WKS-011', path: '/workspace', context: 'electron_internal', scenario: 'workspace_agent_active', action: 'browser' },
  { id: 'WKS-012', path: '/workspace', scenario: 'workspace_team_active' },
  { id: 'WKS-013', path: '/workspace', scenario: 'workspace_team_active', action: 'team' },
  { id: 'WKS-014', path: '/workspace', scenario: 'workspace_team_active', action: 'team-messages' },
  { id: 'WKS-015', path: '/workspace', scenario: 'workspace_agent_history' },
  { id: 'WKS-016', path: '/workspace', scenario: 'workspace_agent_interrupted' },
  { id: 'WKS-017', path: '/workspace', scenario: 'workspace_team_streaming' },
  { id: 'WKS-018', path: '/workspace', scenario: 'workspace_team_completed' },
  { id: 'WKS-019', path: '/workspace', scenario: 'workspace_team_error' },
  { id: 'WKS-020', path: '/workspace', scenario: 'workspace_team_interrupted' },
  { id: 'WKS-021', path: '/workspace', scenario: 'workspace_team_history' },
  { id: 'MOB-001', path: '/mobile', context: 'paired', scenario: 'mobile_agent_active', viewport: 'narrow', mobileTab: 'chat' },
  { id: 'MOB-002', path: '/mobile', context: 'paired', scenario: 'mobile_agent_active', viewport: 'narrow', mobileTab: 'runs' },
  { id: 'MOB-003', path: '/mobile', context: 'paired', scenario: 'mobile_agent_active', viewport: 'narrow', mobileTab: 'runs', action: 'mobile-run-setup' },
  { id: 'MOB-004', path: '/mobile', context: 'paired', scenario: 'mobile_agent_active', viewport: 'narrow', mobileTab: 'files' },
  { id: 'MOB-005', path: '/mobile', context: 'paired', scenario: 'mobile_agent_active', viewport: 'narrow', mobileTab: 'files', action: 'mobile-file-viewer' },
  { id: 'MOB-006', path: '/mobile', context: 'paired', scenario: 'mobile_agent_active', viewport: 'narrow', mobileTab: 'artifacts' },
  { id: 'MOB-007', path: '/mobile', context: 'paired', scenario: 'mobile_agent_active', viewport: 'narrow', mobileTab: 'activity' },
  { id: 'MOB-008', path: '/mobile', context: 'paired', scenario: 'mobile_team_active', viewport: 'narrow', mobileTab: 'chat' },
  { id: 'MOB-009', path: '/mobile', context: 'paired', scenario: 'mobile_team_active', viewport: 'narrow', mobileTab: 'files' },
  { id: 'MOB-010', path: '/mobile', context: 'paired', scenario: 'mobile_team_active', viewport: 'narrow', mobileTab: 'artifacts' },
  { id: 'MOB-011', path: '/mobile', context: 'paired', scenario: 'mobile_team_active', viewport: 'narrow', mobileTab: 'activity' },
  { id: 'MOB-012', path: '/mobile', context: 'paired', scenario: 'mobile_team_active', viewport: 'narrow', mobileTab: 'activity', action: 'mobile-team-reference' },
  { id: 'MOB-013', path: '/mobile', context: 'paired', scenario: 'populated', viewport: 'narrow', action: 'mobile-troubleshooting' },
  { id: 'MOB-014', path: '/mobile', context: 'paired', scenario: 'populated', viewport: 'narrow', action: 'mobile-unpair' },
]
const correctionMatrixMode = process.env.CORRECTION_MATRIX === '1'
const correctionMatrixScenarios = baseScenarios.flatMap(item => {
  if (item.viewport === 'narrow') return [{ ...item, id: `${item.id}-NZH`, locale: 'zh-CN', matrixVariant: 'narrow-zh' }]
  return [
    { ...item, id: `${item.id}-DZH`, locale: 'zh-CN', matrixVariant: 'desktop-zh' },
    { ...item, id: `${item.id}-NEN`, viewport: 'narrow', locale: 'en', matrixVariant: 'narrow-en' },
    { ...item, id: `${item.id}-NZH`, viewport: 'narrow', locale: 'zh-CN', matrixVariant: 'narrow-zh' },
  ]
})
const scenarios = correctionMatrixMode ? correctionMatrixScenarios : baseScenarios
const ids = new Set(String(process.env.CORRECTION_IDS || '').split(',').map(value => value.trim()).filter(Boolean))
const selected = ids.size ? scenarios.filter(item => ids.has(item.id)) : scenarios
const viewportFor = item => item.viewport === 'narrow' ? { width: 390, height: 844 } : { width: 1440, height: 900 }

async function setBackendScenario() {
  const response = await fetch(`${mockBaseUrl}/__prototype/scenario`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: 'populated', operationFailures: {} }) })
  if (!response.ok) throw new Error('Unable to select controlled source fixture')
}

function mobileSession() {
  return { version: 1, nodeId: 'mobile-paired-node', serverBaseUrl: mockBaseUrl, credential: 'prototype_mobile_session', device: { deviceId: 'prototype-phone', displayName: 'Prototype phone', clientFacingBaseUrl: mockBaseUrl, createdAt: '2026-08-22T04:00:00.000Z', lastSeenAt: '2026-08-22T04:00:00.000Z', revokedAt: null }, pairedAt: '2026-08-22T04:00:00.000Z' }
}

async function settle(page, waitMs = 650) {
  await page.waitForFunction(() => document.body?.innerText.trim().length > 0, undefined, { timeout: 15000 })
  await page.waitForTimeout(waitMs)
  await page.addStyleTag({ content: normalizedStyle })
  await page.waitForTimeout(50)
}

async function forceMobileWork(page, scenario) {
  const setThroughComponent = await page.evaluate(() => {
    let instance = document.querySelector('[data-testid="mobile-remote-access-shell"]')?.__vueParentComponent
    while (instance) {
      if ('screen' in (instance.setupState || {})) { instance.setupState.screen = 'work'; return true }
      instance = instance.parent
    }
    return false
  })
  if (!setThroughComponent) {
    const label = String(scenario).includes('team') ? 'Product Review Team' : 'Research Assistant'
    await page.getByTestId('mobile-readable-work-row').filter({ hasText: label }).first().click()
  }
  await page.getByTestId('mobile-work-shell').waitFor()
}

async function applyAction(page, item) {
  const tabNames = { Files: 'files', Terminal: 'terminal', Activity: 'progress', Token: 'usage', Artifacts: 'artifacts', 'VNC Viewer': 'vnc', Browser: 'browser', Team: 'teamMembers' }
  const clickTab = async label => {
    const tab = tabNames[label]
    const candidates = page.locator(`[data-test="right-side-tab-list"] [data-tab-name="${tab}"], [data-test="workspace-right-tool-strip"] [data-tab-name="${tab}"]`)
    for (let index = 0; index < await candidates.count(); index += 1) {
      if (await candidates.nth(index).isVisible()) return candidates.nth(index).click()
    }
    throw new Error(`Visible right-side tab unavailable: ${tab}`)
  }
  if (item.action === 'server-monitor') await page.locator('.server-settings-manager .flex.items-center.gap-8 button').nth(1).click()
  if (item.action === 'server-error-details') { await page.getByRole('button', { name: 'Show technical details', exact: true }).click(); await page.getByRole('button', { name: 'Show Advanced Recovery Options', exact: true }).click() }
  if (item.action === 'files') await clickTab('Files')
  if (item.action === 'terminal') await clickTab('Terminal')
  if (item.action === 'activity') await clickTab('Activity')
  if (item.action === 'token') await clickTab('Token')
  if (item.action === 'artifacts') await clickTab('Artifacts')
  if (item.action === 'vnc') await clickTab('VNC Viewer')
  if (item.action === 'browser') await clickTab('Browser')
  if (item.action === 'team' || item.action === 'team-messages') await clickTab('Team')
  if (item.action === 'team-messages') await page.locator('[data-test="team-messages-header"]').click()
  if (item.action === 'mobile-run-setup') await page.getByTestId('mobile-start-run').click()
  if (item.action === 'mobile-file-viewer') await page.locator('[data-testid="mobile-files-list"] button').filter({ hasText: 'requirements.md' }).click()
  if (item.action === 'mobile-team-reference') { await page.getByTestId('mobile-open-team-messages').click(); await page.getByTestId('mobile-team-reference-row').first().click() }
  if (item.action === 'mobile-troubleshooting') await page.getByRole('button', { name: /Troubleshoot/ }).click()
  if (item.action === 'mobile-unpair') await page.getByRole('button', { name: /Unpair/ }).click()
}

async function capture(browser, baseUrl, target, item) {
  const context = await browser.newContext({ viewport: viewportFor(item), locale: item.locale === 'zh-CN' ? 'zh-CN' : 'en-US', colorScheme: 'light', reducedMotion: 'reduce' })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/monaco-editor@') && url.pathname.includes('/min/vs/')) {
      const relative = url.pathname.split('/min/vs/')[1]
      try {
        const body = await readFile(resolve(monacoRoot, relative))
        const contentType = relative.endsWith('.css') ? 'text/css' : relative.endsWith('.ttf') ? 'font/ttf' : relative.endsWith('.json') ? 'application/json' : 'text/javascript'
        return route.fulfill({ status: 200, contentType, body })
      } catch { return route.fulfill({ status: 404, body: 'missing local prototype Monaco asset' }) }
    }
    if (['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com'].includes(url.hostname)) {
      const prefix = url.pathname.split('/').pop()?.replace(/\.json$/, '')
      if (prefix && iconCollections[prefix]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(iconCollections[prefix]) })
    }
    if (url.protocol === 'data:' || url.protocol === 'blob:' || ['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue()
    return route.abort('blockedbyclient')
  })
  await context.addInitScript(({ item, session, mockBaseUrl: mock, hostInstaller, captureTarget }) => {
    localStorage.clear()
    localStorage.setItem('autobyteus.localization.preference-mode', item.locale || 'en')
    localStorage.setItem('autobyteus.prototype.scenario', item.scenario)
    localStorage.setItem('autobyteus.prototype.context', item.context || 'desktop')
    localStorage.setItem('autobyteus.prototype.deferExperienceScenario', '1')
    if (item.context === 'paired') localStorage.setItem('autobyteus.remote_access.mobile_session.v1', JSON.stringify(session))
    if (String(item.context || '').startsWith('electron_')) eval(`(${hostInstaller})`)({ context: item.context, scenario: item.scenario, mockBaseUrl: mock })
    if (captureTarget === 'source') {
      const NativeWebSocket = window.WebSocket
      class ControlledFileExplorerWebSocket extends EventTarget {
        static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
        CONNECTING = 0; OPEN = 1; CLOSING = 2; CLOSED = 3
        protocol = ''; extensions = ''; bufferedAmount = 0; binaryType = 'blob'
        readyState = ControlledFileExplorerWebSocket.CONNECTING
        onopen = null; onclose = null; onerror = null; onmessage = null
        constructor(url) {
          super(); this.url = String(url)
          queueMicrotask(() => {
            this.readyState = ControlledFileExplorerWebSocket.OPEN
            this.onopen?.(new Event('open'))
            this.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ type: 'CONNECTED', payload: { session_id: 'controlled-source-fixture' } }) }))
          })
        }
        send() {}
        close() { this.readyState = ControlledFileExplorerWebSocket.CLOSED; this.onclose?.(new CloseEvent('close', { code: 1000, reason: 'controlled source fixture' })) }
      }
      const ControlledWebSocket = function (url, protocols) {
        if (String(url).includes('/ws/file-explorer/')) return new ControlledFileExplorerWebSocket(url)
        return protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols)
      }
      Object.assign(ControlledWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 })
      ControlledWebSocket.prototype = NativeWebSocket.prototype
      window.WebSocket = ControlledWebSocket
    }
  }, { item, session: mobileSession(), mockBaseUrl, hostInstaller: installHostScenario.toString(), captureTarget: target })
  const page = await context.newPage()
  const browserErrors = []
  page.on('pageerror', error => browserErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  await page.goto(baseUrl + item.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await settle(page, item.waitMs ?? 900)
  if (item.scenario.startsWith('mobile_')) {
    await forceMobileWork(page, item.scenario)
    await page.waitForTimeout(100)
    await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context, tab: item.mobileTab })
  } else if (item.scenario.startsWith('workspace_')) {
    await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context })
  }
  if (item.mobileTab) {
    await page.getByTestId(`mobile-tab-${item.mobileTab}`).click()
    await page.waitForTimeout(100)
    await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context, tab: item.mobileTab })
  }
  await applyAction(page, item)
  if (item.scenario.startsWith('mobile_') || item.action === 'artifacts') {
    await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context, tab: item.mobileTab })
  }
  await settle(page, 450)
  const screenshotGroup = correctionMatrixMode ? 'correction-matrix' : 'correction'
  const screenshotPath = resolve(root, `evidence/${target}/${screenshotGroup}/${item.id}.png`)
  await mkdir(resolve(root, `evidence/${target}/${screenshotGroup}`), { recursive: true })
  const screenshot = await page.screenshot({ path: screenshotPath })
  const bodyText = await page.locator('body').innerText()
  const semantic = await page.locator('body').evaluate(body => ({
    route: location.pathname + location.search, lang: document.documentElement.lang,
    headings: Array.from(body.querySelectorAll('h1,h2,h3')).map(node => `${node.tagName}:${node.textContent?.trim()}`),
    controls: Array.from(body.querySelectorAll('button,input,select,textarea,a,[role]')).map(node => ({ tag: node.tagName, role: node.getAttribute('role'), label: node.getAttribute('aria-label'), text: node.textContent?.trim().slice(0, 100), disabled: 'disabled' in node ? Boolean(node.disabled) : undefined })),
    dialogs: Array.from(body.querySelectorAll('[role="dialog"]')).map(node => ({ label: node.getAttribute('aria-label'), modal: node.getAttribute('aria-modal') })),
  }))
  await context.close()
  return { target, screenshotPath, screenshotSha256: sha256(screenshot), bodyText, bodyTextSha256: sha256(bodyText), semantic, browserErrors }
}

async function perceptualDifference(sourcePath, prototypePath) {
  const [source, prototype] = await Promise.all([sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }), sharp(prototypePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })])
  let changedPixels = 0; let maximumChannelDelta = 0
  for (let index = 0; index < source.data.length; index += source.info.channels) {
    let changed = false
    for (let channel = 0; channel < source.info.channels; channel += 1) { const delta = Math.abs(source.data[index + channel] - prototype.data[index + channel]); changed ||= delta > 0; maximumChannelDelta = Math.max(maximumChannelDelta, delta) }
    changedPixels += changed ? 1 : 0
  }
  const totalPixels = source.info.width * source.info.height
  const changedPixelRatio = changedPixels / totalPixels
  return { changedPixels, totalPixels, changedPixelRatio, maximumChannelDelta, normalizedRenderingNoiseOnly: changedPixelRatio <= 0.0005 && maximumChannelDelta <= 4 }
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] })
const results = []
try {
  for (const item of selected) {
    await setBackendScenario()
    const source = await capture(browser, sourceBaseUrl, 'source', item)
    await setBackendScenario()
    const prototype = await capture(browser, prototypeBaseUrl, 'prototype', item)
    const perceptual = await perceptualDifference(source.screenshotPath, prototype.screenshotPath)
    const semanticEqual = source.bodyTextSha256 === prototype.bodyTextSha256 && JSON.stringify(source.semantic) === JSON.stringify(prototype.semantic)
    const pass = semanticEqual && (source.screenshotSha256 === prototype.screenshotSha256 || perceptual.normalizedRenderingNoiseOnly)
    results.push({ item, source, prototype, comparison: { semanticEqual, screenshotEqual: source.screenshotSha256 === prototype.screenshotSha256, perceptual, pass } })
    process.stdout.write(`${pass ? 'PASS' : 'FAIL'} ${item.id}\n`)
  }
} finally { await browser.close() }
const summary = { total: results.length, passed: results.filter(row => row.comparison.pass).length, failed: results.filter(row => !row.comparison.pass).map(row => row.item.id), sourceBrowserErrorScenarios: results.filter(row => row.source.browserErrors.length).map(row => row.item.id), prototypeBrowserErrorScenarios: results.filter(row => row.prototype.browserErrors.length).map(row => row.item.id) }
const outputGroup = correctionMatrixMode ? 'correction-matrix' : 'correction'
await mkdir(resolve(root, `evidence/${outputGroup}`), { recursive: true })
await writeFile(resolve(root, `evidence/${outputGroup}/correction-parity-results.json`), `${JSON.stringify({ generatedAt: new Date().toISOString(), sourceBaseUrl, prototypeBaseUrl, mockBaseUrl, matrixMode: correctionMatrixMode, results }, null, 2)}\n`)
await writeFile(resolve(root, `evidence/${outputGroup}/correction-parity-summary.json`), `${JSON.stringify(summary, null, 2)}\n`)
if (summary.failed.length) process.exitCode = 1
