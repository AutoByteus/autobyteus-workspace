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
const require = createRequire(import.meta.url)
const icons = Object.fromEntries(['heroicons', 'ph', 'mdi', 'svg-spinners', 'vscode-icons', 'logos'].map(prefix => [prefix, require(`@iconify-json/${prefix}/icons.json`)]))
const style = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
const sha256 = value => createHash('sha256').update(value).digest('hex')
const routes = [
  '/', '/agents?view=list', '/agents?view=create', '/agents?view=detail&id=agent-researcher', '/agents?view=edit&id=agent-researcher', '/agents?view=unsupported',
  '/agent-teams?view=team-list', '/agent-teams?view=team-create', '/agent-teams?view=team-detail&id=team-product', '/agent-teams?view=team-edit&id=team-product', '/agent-teams?view=unsupported',
  '/applications', '/applications/sample-app', '/skills', '/skills?skill=prototype-research', '/memory?view=home&tab=agents', '/memory?view=home&tab=teams',
  '/memory?view=agent-detail&agentDefinitionId=agent-researcher&agentName=Research%20Assistant', '/memory?view=team-detail&teamDefinitionId=team-product&teamName=Product%20Review%20Team', '/memory?view=unsupported',
  '/nodes?tab=manage', '/nodes?tab=memorySync', '/nodes?tab=phoneSetup', '/nodes?tab=dockerGuide', '/workspace', '/tools', '/media',
  '/settings?section=api-keys', '/settings?section=token-usage', '/settings?section=messaging', '/settings?section=display', '/settings?section=language',
  '/settings?section=local-tools', '/settings?section=mcp-servers', '/settings?section=application-packages', '/settings?section=agent-packages',
  '/settings?section=server-settings&mode=quick', '/settings?section=server-settings&mode=advanced', '/settings?section=server-settings&mode=migrations', '/settings?section=extensions', '/settings?section=updates',
]
const variants = [
  { suffix: 'DZH', locale: 'zh-CN', viewport: { width: 1440, height: 900 } },
  { suffix: 'NEN', locale: 'en', viewport: { width: 390, height: 844 } },
  { suffix: 'NZH', locale: 'zh-CN', viewport: { width: 390, height: 844 } },
]
const rows = routes.flatMap((path, index) => variants.map(variant => ({ id: `MAT-R${String(index + 1).padStart(3, '0')}-${variant.suffix}`, routeId: `ROUTE-${String(index + 1).padStart(3, '0')}`, path, ...variant })))
const requested = new Set(String(process.env.MATRIX_IDS || '').split(',').map(value => value.trim()).filter(Boolean))
const selected = requested.size ? rows.filter(row => requested.has(row.id)) : rows

async function selectFixture() {
  const response = await fetch(`${mockBaseUrl}/__prototype/scenario`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: 'populated', operationFailures: {} }) })
  if (!response.ok) throw new Error('Unable to select populated fixture')
}

async function capture(browser, baseUrl, target, row) {
  const context = await browser.newContext({ viewport: row.viewport, locale: row.locale === 'zh-CN' ? 'zh-CN' : 'en-US', colorScheme: 'light', reducedMotion: 'reduce' })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com'].includes(url.hostname)) {
      const prefix = url.pathname.split('/').pop()?.replace(/\.json$/, '')
      if (prefix && icons[prefix]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(icons[prefix]) })
    }
    if (url.protocol === 'data:' || url.protocol === 'blob:' || ['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue()
    return route.abort('blockedbyclient')
  })
  await context.addInitScript(({ locale }) => {
    localStorage.clear()
    localStorage.setItem('autobyteus.localization.preference-mode', locale)
    localStorage.setItem('autobyteus.prototype.scenario', 'populated')
    localStorage.setItem('autobyteus.prototype.context', 'desktop')
  }, { locale: row.locale })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(baseUrl + row.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  if (row.path === '/') await page.waitForURL(url => url.pathname !== '/', { timeout: 5000 }).catch(() => undefined)
  await page.waitForFunction(() => document.body?.innerText.trim().length > 0, undefined, { timeout: 15000 })
  await page.waitForTimeout(700)
  await page.addStyleTag({ content: style })
  await page.waitForTimeout(50)
  const screenshotPath = resolve(root, `evidence/${target}/matrix/${row.id}.png`)
  await mkdir(resolve(root, `evidence/${target}/matrix`), { recursive: true })
  const screenshot = await page.screenshot({ path: screenshotPath })
  const bodyText = await page.locator('body').innerText()
  const semantic = await page.locator('body').evaluate(body => ({ route: location.pathname + location.search, lang: document.documentElement.lang, controls: Array.from(body.querySelectorAll('button,input,select,textarea,a,[role]')).map(node => ({ tag: node.tagName, role: node.getAttribute('role'), label: node.getAttribute('aria-label'), text: node.textContent?.trim().slice(0, 100), disabled: 'disabled' in node ? Boolean(node.disabled) : undefined })) }))
  await context.close()
  return { screenshotPath, screenshotSha256: sha256(screenshot), bodyText, bodyTextSha256: sha256(bodyText), semantic, errors }
}

async function diff(a, b) {
  const [source, prototype] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true }), sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })])
  let changedPixels = 0; let maximumChannelDelta = 0
  for (let i = 0; i < source.data.length; i += source.info.channels) { let changed = false; for (let c = 0; c < source.info.channels; c += 1) { const delta = Math.abs(source.data[i + c] - prototype.data[i + c]); changed ||= delta > 0; maximumChannelDelta = Math.max(maximumChannelDelta, delta) } changedPixels += changed ? 1 : 0 }
  const totalPixels = source.info.width * source.info.height; const changedPixelRatio = changedPixels / totalPixels
  return { changedPixels, totalPixels, changedPixelRatio, maximumChannelDelta, normalizedRenderingNoiseOnly: changedPixelRatio <= 0.0005 && maximumChannelDelta <= 4 }
}

await selectFixture()
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] })
const results = []
try {
  for (const row of selected) {
    const source = await capture(browser, sourceBaseUrl, 'source', row)
    const prototype = await capture(browser, prototypeBaseUrl, 'prototype', row)
    const perceptual = await diff(source.screenshotPath, prototype.screenshotPath)
    const semanticEqual = source.bodyTextSha256 === prototype.bodyTextSha256 && JSON.stringify(source.semantic) === JSON.stringify(prototype.semantic)
    const pass = semanticEqual && (source.screenshotSha256 === prototype.screenshotSha256 || perceptual.normalizedRenderingNoiseOnly)
    results.push({ row, source, prototype, comparison: { semanticEqual, screenshotEqual: source.screenshotSha256 === prototype.screenshotSha256, perceptual, pass } })
    process.stdout.write(`${pass ? 'PASS' : 'FAIL'} ${row.id}\n`)
  }
} finally { await browser.close() }
const summary = { total: results.length, passed: results.filter(result => result.comparison.pass).length, failed: results.filter(result => !result.comparison.pass).map(result => result.row.id) }
await mkdir(resolve(root, 'evidence/matrix'), { recursive: true })
await writeFile(resolve(root, 'evidence/matrix/route-matrix-results.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), sourceBaseUrl, prototypeBaseUrl, rows: results }, null, 2)}\n`)
await writeFile(resolve(root, 'evidence/matrix/route-matrix-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
if (summary.failed.length) process.exitCode = 1
