#!/usr/bin/env node
import { chromium } from 'playwright-core'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(new URL('../..', import.meta.url).pathname)
const sourceBaseUrl = process.env.SOURCE_BASE_URL || 'http://127.0.0.1:3100'
const prototypeBaseUrl = process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1:3200'
const mockBaseUrl = process.env.MOCK_BASE_URL || 'http://127.0.0.1:4310'
const normalizedStyle = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
const require = createRequire(import.meta.url)
const iconCollections = Object.fromEntries(['heroicons', 'ph', 'mdi', 'svg-spinners', 'vscode-icons', 'logos'].map(prefix => [prefix, require(`@iconify-json/${prefix}/icons.json`)]))

const scenarios = [
  { id: 'ROUTE-001', path: '/', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-002', path: '/agents?view=list', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-003', path: '/agents?view=create', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-004', path: '/agents?view=detail&id=agent-researcher', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-005', path: '/agents?view=edit&id=agent-researcher', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-006', path: '/agents?view=unsupported', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-007', path: '/agent-teams?view=team-list', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-008', path: '/agent-teams?view=team-create', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-009', path: '/agent-teams?view=team-detail&id=team-product', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-010', path: '/agent-teams?view=team-edit&id=team-product', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-011', path: '/agent-teams?view=unsupported', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-012', path: '/applications', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-013', path: '/applications/sample-app', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-014', path: '/skills', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-015', path: '/skills?skill=prototype-research', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-016', path: '/memory?view=home&tab=agents', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-017', path: '/memory?view=home&tab=teams', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-018', path: '/memory?view=agent-detail&agentDefinitionId=agent-researcher&agentName=Research%20Assistant', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-019', path: '/memory?view=team-detail&teamDefinitionId=team-product&teamName=Product%20Review%20Team', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-020', path: '/memory?view=unsupported', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-021', path: '/nodes?tab=manage', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-022', path: '/nodes?tab=memorySync', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-023', path: '/nodes?tab=phoneSetup', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-024', path: '/nodes?tab=dockerGuide', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-025', path: '/workspace', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-026', path: '/tools', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  { id: 'ROUTE-027', path: '/media', viewport: 'desktop', locale: 'en', scenario: 'populated' },
  ...[
    ['api-keys', 'ROUTE-028'], ['token-usage', 'ROUTE-029'], ['messaging', 'ROUTE-030'],
    ['display', 'ROUTE-031'], ['language', 'ROUTE-032'], ['local-tools', 'ROUTE-033'],
    ['mcp-servers', 'ROUTE-034'], ['application-packages', 'ROUTE-035'], ['agent-packages', 'ROUTE-036'],
    ['server-settings&mode=quick', 'ROUTE-037'], ['server-settings&mode=advanced', 'ROUTE-038'],
    ['server-settings&mode=migrations', 'ROUTE-039'], ['extensions', 'ROUTE-040'], ['updates', 'ROUTE-041'],
  ].map(([section, id]) => ({ id, path: `/settings?section=${section}`, viewport: 'desktop', locale: 'en', scenario: 'populated' })),
  { id: 'CFG-001', path: '/agents?view=list', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-002', path: '/agent-teams?view=team-list', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-003', path: '/applications', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-004', path: '/skills', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-005', path: '/memory', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-006', path: '/nodes', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-007', path: '/workspace', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-008', path: '/settings?section=language', viewport: 'narrow', locale: 'zh-CN', scenario: 'populated' },
  { id: 'CFG-009', path: '/mobile', viewport: 'narrow', locale: 'en', scenario: 'populated', mobile: 'unpaired' },
  { id: 'CFG-010', path: '/mobile', viewport: 'narrow', locale: 'en', scenario: 'populated', mobile: 'paired' },
  { id: 'CFG-011', path: '/mobile?unsupported=desktopSettings', viewport: 'narrow', locale: 'en', scenario: 'populated', mobile: 'paired' },
  { id: 'STATE-001', path: '/agents?view=list', viewport: 'desktop', locale: 'en', scenario: 'empty' },
  { id: 'STATE-002', path: '/applications', viewport: 'desktop', locale: 'en', scenario: 'empty', allowRedirect: true },
  { id: 'STATE-003', path: '/memory', viewport: 'desktop', locale: 'en', scenario: 'empty' },
  { id: 'STATE-004', path: '/skills', viewport: 'desktop', locale: 'en', scenario: 'empty' },
  { id: 'STATE-005', path: '/applications', viewport: 'desktop', locale: 'en', scenario: 'apps_disabled', allowRedirect: true },
  { id: 'STATE-006', path: '/agents?view=list', viewport: 'desktop', locale: 'en', scenario: 'loading', waitMs: 250 },
  { id: 'STATE-007', path: '/agents?view=list', viewport: 'desktop', locale: 'en', scenario: 'error' },
  { id: 'STATE-008', path: '/mobile', viewport: 'narrow', locale: 'en', scenario: 'permission_denied', mobile: 'paired' },
]
const requestedIds = new Set(String(process.env.CAPTURE_IDS || '').split(',').map(value => value.trim()).filter(Boolean))
const selectedScenarios = requestedIds.size ? scenarios.filter(item => requestedIds.has(item.id)) : scenarios

const viewportFor = name => name === 'narrow' ? { width: 390, height: 844 } : { width: 1440, height: 900 }
const sha256 = value => createHash('sha256').update(value).digest('hex')
async function perceptualDifference(sourcePath, prototypePath) {
  const [source, prototype] = await Promise.all([
    sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(prototypePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  if (source.info.width !== prototype.info.width || source.info.height !== prototype.info.height || source.info.channels !== prototype.info.channels) {
    return { dimensionsEqual: false, changedPixels: null, changedPixelRatio: 1, maximumChannelDelta: 255, normalizedRenderingNoiseOnly: false }
  }
  let changedPixels = 0
  let maximumChannelDelta = 0
  const channels = source.info.channels
  for (let index = 0; index < source.data.length; index += channels) {
    let pixelChanged = false
    for (let channel = 0; channel < channels; channel += 1) {
      const delta = Math.abs(source.data[index + channel] - prototype.data[index + channel])
      if (delta) pixelChanged = true
      if (delta > maximumChannelDelta) maximumChannelDelta = delta
    }
    if (pixelChanged) changedPixels += 1
  }
  const totalPixels = source.info.width * source.info.height
  const changedPixelRatio = changedPixels / totalPixels
  // Chromium can rasterize a few antialiased SVG edge pixels differently when
  // the source loads an icon asynchronously and the prototype has the same
  // collection locally. This bound accepts only a sub-pixel-sized region
  // (<=0.01% of the frame) with modest edge-channel variance; text, geometry,
  // missing controls, or a different icon exceed it by orders of magnitude.
  return { dimensionsEqual: true, changedPixels, totalPixels, changedPixelRatio, maximumChannelDelta, normalizedRenderingNoiseOnly: changedPixelRatio <= 0.0001 && maximumChannelDelta <= 64 }
}

async function setScenario(name) {
  const response = await fetch(`${mockBaseUrl}/__prototype/scenario`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: name, operationFailures: {} }),
  })
  if (!response.ok) throw new Error(`Unable to select scenario ${name}`)
}

function initPayload(item) {
  return {
    locale: item.locale,
    mobile: item.mobile,
    mockBaseUrl,
    scenario: item.scenario,
  }
}

async function capture(browser, baseUrl, target, item) {
  const context = await browser.newContext({ viewport: viewportFor(item.viewport), locale: item.locale === 'zh-CN' ? 'zh-CN' : 'en-US', colorScheme: 'light', reducedMotion: 'reduce' })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com'].includes(url.hostname)) {
      const prefix = url.pathname.split('/').pop()?.replace(/\.json$/, '')
      if (prefix && iconCollections[prefix]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(iconCollections[prefix]) })
    }
    if (url.protocol === 'data:' || url.protocol === 'blob:' || ['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue()
    return route.abort('blockedbyclient')
  })
  await context.addInitScript(({ locale, mobile, mockBaseUrl: mock, scenario }) => {
    localStorage.clear()
    localStorage.setItem('autobyteus.localization.preference-mode', locale)
    localStorage.setItem('autobyteus.prototype.scenario', scenario || 'populated')
    localStorage.setItem('autobyteus.prototype.context', mobile || 'desktop')
    if (mobile === 'paired') {
      localStorage.setItem('autobyteus.remote_access.mobile_session.v1', JSON.stringify({
        version: 1, nodeId: 'mobile-paired-node', serverBaseUrl: mock,
        credential: 'prototype_mobile_session',
        device: { deviceId: 'prototype-phone', displayName: 'Prototype phone', clientFacingBaseUrl: mock, createdAt: '2026-08-22T04:00:00.000Z', lastSeenAt: '2026-08-22T04:00:00.000Z', revokedAt: null },
        pairedAt: '2026-08-22T04:00:00.000Z',
      }))
    }
  }, initPayload(item))
  const page = await context.newPage()
  const browserErrors = []
  const failedRequests = []
  page.on('pageerror', error => browserErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('requestfailed', request => {
    if (!request.url().includes('/_nuxt/') || request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push({ url: request.url(), error: request.failure()?.errorText })
  })
  await page.goto(baseUrl + item.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  if (item.path === '/') await page.waitForURL(url => url.pathname !== '/', { timeout: 5000 }).catch(() => undefined)
  await page.waitForTimeout(item.waitMs ?? 1800)
  if (item.id === 'STATE-006') {
    // Keep the intended pre-response loading frame, but do not capture the
    // source while its localization/layout chunk has not painted anything.
    await page.waitForFunction(() => (document.body?.innerText.trim().length || 0) > 0, undefined, { timeout: 1200 })
  }
  if (item.id !== 'STATE-006') {
    // Nuxt may finish a route chunk or Iconify replacement shortly after
    // DOMContentLoaded. Compare only a settled frame so a source-side async
    // paint cannot be mistaken for a prototype discrepancy.
    await page.waitForFunction(() => (document.body?.innerText.trim().length || 0) > 0, undefined, { timeout: 15000 })
    await page.waitForFunction(() => {
      const icons = Array.from(document.querySelectorAll('svg.iconify'))
      return icons.every(icon => icon.querySelector('path,g,rect,circle,line,polyline,polygon'))
    }, undefined, { timeout: 10000 }).catch(() => undefined)
    await page.waitForFunction(async () => {
      const signature = () => `${document.body?.innerText || ''}\n${document.body?.innerHTML.length || 0}`
      const first = signature()
      await new Promise(resolve => setTimeout(resolve, 250))
      const second = signature()
      await new Promise(resolve => setTimeout(resolve, 250))
      return first === second && second === signature()
    }, undefined, { timeout: 15000 })
  }
  await page.addStyleTag({ content: normalizedStyle })
  await page.waitForTimeout(50)
  const screenshotPath = resolve(root, `evidence/${target}/screenshots/${item.id}.png`)
  await mkdir(resolve(root, `evidence/${target}/screenshots`), { recursive: true })
  const screenshot = await page.screenshot({ path: screenshotPath, fullPage: false })
  const bodyText = await page.locator('body').innerText()
  const dom = await page.locator('body').evaluate(body => ({
    lang: document.documentElement.lang,
    route: location.pathname + location.search,
    headings: Array.from(body.querySelectorAll('h1,h2,h3')).map(node => ({ tag: node.tagName, text: node.textContent?.trim(), level: Number(node.tagName.slice(1)) })),
    controls: Array.from(body.querySelectorAll('button,input,select,textarea,a,[role]')).map(node => ({ tag: node.tagName, role: node.getAttribute('role'), label: node.getAttribute('aria-label'), text: node.textContent?.trim().slice(0, 120), disabled: 'disabled' in node ? Boolean(node.disabled) : undefined, tabindex: node.getAttribute('tabindex') })),
    dialogs: Array.from(body.querySelectorAll('[role="dialog"]')).length,
    htmlHash: '',
  }))
  dom.htmlHash = await page.locator('body').evaluate((body, pageBaseUrl) => body.innerHTML.replaceAll(pageBaseUrl, 'BASE_URL').replace(/data-v-[a-f0-9]+/g, 'data-v-HASH'), baseUrl).then(sha256)
  const result = {
    id: item.id, target, requestedPath: item.path, actualRoute: dom.route, viewport: viewportFor(item.viewport), locale: item.locale,
    scenario: item.scenario, screenshotPath, screenshotSha256: sha256(screenshot), bodyTextSha256: sha256(bodyText), bodyText,
    dom, browserErrors, failedRequests,
  }
  await context.close()
  return result
}

await mkdir(resolve(root, 'evidence/source/screenshots'), { recursive: true })
await mkdir(resolve(root, 'evidence/prototype/screenshots'), { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] })
const results = []
try {
  for (const item of selectedScenarios) {
    await setScenario(item.scenario)
    const source = await capture(browser, sourceBaseUrl, 'source', item)
    await setScenario(item.scenario)
    const prototype = await capture(browser, prototypeBaseUrl, 'prototype', item)
    const perceptual = await perceptualDifference(source.screenshotPath, prototype.screenshotPath)
    const comparison = {
      id: item.id,
      screenshotEqual: source.screenshotSha256 === prototype.screenshotSha256,
      perceptual,
      bodyTextEqual: source.bodyTextSha256 === prototype.bodyTextSha256,
      domEqual: source.dom.htmlHash === prototype.dom.htmlHash,
      sourceScreenshot: source.screenshotPath,
      prototypeScreenshot: prototype.screenshotPath,
      sourceRoute: source.actualRoute,
      prototypeRoute: prototype.actualRoute,
      sourceBrowserErrors: source.browserErrors,
      prototypeBrowserErrors: prototype.browserErrors,
      sourceFailedRequests: source.failedRequests,
      prototypeFailedRequests: prototype.failedRequests,
      pass: (source.screenshotSha256 === prototype.screenshotSha256 || perceptual.normalizedRenderingNoiseOnly) && source.bodyTextSha256 === prototype.bodyTextSha256 && source.actualRoute === prototype.actualRoute,
    }
    results.push({ item, source, prototype, comparison })
    process.stdout.write(`${comparison.pass ? 'PASS' : 'FAIL'} ${item.id} ${item.path}\n`)
  }
} finally {
  await setScenario('populated').catch(() => undefined)
  await browser.close()
}

await writeFile(resolve(root, 'evidence/comparison/browser-parity-results.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), sourceBaseUrl, prototypeBaseUrl, mockBaseUrl, normalizedStyle, chromiumPath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', scenarios: results,
}, null, 2))
const summary = {
  total: results.length,
  passed: results.filter(result => result.comparison.pass).length,
  failed: results.filter(result => !result.comparison.pass).map(result => result.item.id),
  sourceBrowserErrorScenarios: results.filter(result => result.source.browserErrors.length).map(result => result.item.id),
  prototypeBrowserErrorScenarios: results.filter(result => result.prototype.browserErrors.length).map(result => result.item.id),
}
await writeFile(resolve(root, 'evidence/comparison/browser-parity-summary.json'), JSON.stringify(summary, null, 2))
if (summary.failed.length) process.exitCode = 1
