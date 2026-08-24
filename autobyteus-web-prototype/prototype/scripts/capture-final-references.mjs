#!/usr/bin/env node
import { chromium } from 'playwright-core'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { applyExperienceScenario } from '../shared/apply-experience-scenario.js'

const root = resolve(new URL('../..', import.meta.url).pathname)
const baseUrl = process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1:3200'
const outDir = resolve(root, 'final-reference-screenshots')
const sourceCommit = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const approvalReference = 'User message "approved" on 2026-08-22 for the complete baseline, plus user message "done. i checked. thanks" on 2026-08-24 immediately following the explicit RER-009 corrected-journey approval request.'
const fixedCaptureClock = '2026-08-22T16:50:00.000Z'
const normalizedStyle = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
const sha256 = value => createHash('sha256').update(value).digest('hex')

const references = [
  { id: 'VIS-001', file: 'VIS-001-agents-desktop-en.png', label: 'Agents — populated browser/external-node catalog', path: '/agents?view=list', scenario: 'populated', context: 'desktop', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-002', file: 'VIS-002-agents-error-desktop-en.png', label: 'Agents — recoverable catalog error', path: '/agents?view=list', scenario: 'error', context: 'desktop', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-003', file: 'VIS-003-electron-extensions-desktop-en.png', label: 'Electron/internal node — installed Voice Input extension', path: '/settings?section=extensions', scenario: 'populated', context: 'electron_internal', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-004', file: 'VIS-004-electron-server-error-recovery-desktop-en.png', label: 'Electron/internal node — server failure details and recovery', path: '/agents?view=list', scenario: 'electron_error', context: 'electron_internal', viewport: 'desktop', locale: 'en', action: 'server-error-details' },
  { id: 'VIS-005', file: 'VIS-005-agent-workspace-files-desktop-en.png', label: 'Active agent workspace — conversation and Files viewer', path: '/workspace', scenario: 'workspace_agent_active', context: 'desktop', viewport: 'desktop', locale: 'en', action: 'files' },
  { id: 'VIS-006', file: 'VIS-006-agent-workspace-streaming-desktop-en.png', label: 'Agent workspace — progressive streaming response', path: '/workspace', scenario: 'workspace_agent_streaming', context: 'desktop', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-007', file: 'VIS-007-team-workspace-messages-desktop-en.png', label: 'Active team workspace — messages and delegated work', path: '/workspace', scenario: 'workspace_team_active', context: 'desktop', viewport: 'desktop', locale: 'en', action: 'team-messages' },
  { id: 'VIS-008', file: 'VIS-008-team-workspace-history-desktop-en.png', label: 'Team workspace — reopened historical run', path: '/workspace', scenario: 'workspace_team_history', context: 'desktop', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-009', file: 'VIS-009-messaging-settings-desktop-en.png', label: 'Managed Messaging settings', path: '/settings?section=messaging', scenario: 'populated', context: 'desktop', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-010', file: 'VIS-010-agents-narrow-zh.png', label: 'Agents — narrow Simplified Chinese layout', path: '/agents?view=list', scenario: 'populated', context: 'desktop', viewport: 'narrow', locale: 'zh-CN' },
  { id: 'VIS-011', file: 'VIS-011-mobile-agent-chat-en.png', label: 'Paired mobile — active agent chat', path: '/mobile', scenario: 'mobile_agent_active', context: 'paired', viewport: 'narrow', locale: 'en', mobileTab: 'chat' },
  { id: 'VIS-012', file: 'VIS-012-mobile-team-reference-en.png', label: 'Paired mobile — team messages and reference viewer', path: '/mobile', scenario: 'mobile_team_active', context: 'paired', viewport: 'narrow', locale: 'en', mobileTab: 'activity', action: 'mobile-team-reference' },
  { id: 'VIS-013', file: 'VIS-013-mobile-permission-denied-en.png', label: 'Paired mobile — permission denied and recovery guidance', path: '/mobile', scenario: 'permission_denied', context: 'paired', viewport: 'narrow', locale: 'en' },
  { id: 'VIS-014', file: 'VIS-014-applications-disabled-desktop-en.png', label: 'Applications disabled — route recovery to Agents', path: '/applications', scenario: 'apps_disabled', context: 'desktop', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-015', file: 'VIS-015-agents-empty-desktop-en.png', label: 'Agents — empty catalog', path: '/agents?view=list', scenario: 'empty', context: 'desktop', viewport: 'desktop', locale: 'en' },
  { id: 'VIS-016', file: 'VIS-016-team-launch-ready-desktop-en.png', label: 'Agent Team launch — chosen workspace and enabled Run Team action', path: '/agent-teams?view=team-list', scenario: 'team_launch', context: 'desktop', viewport: 'desktop', locale: 'en', action: 'team-launch-ready' },
  { id: 'VIS-017', file: 'VIS-017-team-launched-writer-focused-desktop-en.png', label: 'Launched Agent Team — writer selected under the chosen workspace', path: '/agent-teams?view=team-list', scenario: 'team_launch', context: 'desktop', viewport: 'desktop', locale: 'en', action: 'team-launch-writer-focus' },
]

const viewportFor = item => item.viewport === 'narrow' ? { width: 390, height: 844 } : { width: 1440, height: 900 }
const mobileSession = () => ({
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://127.0.0.1:4310',
  credential: 'prototype_mobile_session',
  device: {
    deviceId: 'prototype-phone',
    displayName: 'Prototype phone',
    clientFacingBaseUrl: 'http://127.0.0.1:4310',
    createdAt: '2026-08-22T04:00:00.000Z',
    lastSeenAt: '2026-08-22T04:00:00.000Z',
    revokedAt: null,
  },
  pairedAt: '2026-08-22T04:00:00.000Z',
})

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
      if ('screen' in (instance.setupState || {})) {
        instance.setupState.screen = 'work'
        return true
      }
      instance = instance.parent
    }
    return false
  })
  if (!setThroughComponent) {
    const label = scenario.includes('team') ? 'Product Review Team' : 'Research Assistant'
    await page.getByTestId('mobile-readable-work-row').filter({ hasText: label }).first().click()
  }
  await page.getByTestId('mobile-work-shell').waitFor()
}

async function clickWorkspaceTab(page, tab) {
  const candidates = page.locator(`[data-test="right-side-tab-list"] [data-tab-name="${tab}"], [data-test="workspace-right-tool-strip"] [data-tab-name="${tab}"]`)
  for (let index = 0; index < await candidates.count(); index += 1) {
    if (await candidates.nth(index).isVisible()) {
      await candidates.nth(index).click()
      return
    }
  }
  throw new Error(`Visible workspace tab unavailable: ${tab}`)
}

async function applyAction(page, item) {
  if (item.action === 'server-error-details') {
    await page.getByRole('button', { name: 'Show technical details', exact: true }).click()
    await page.getByRole('button', { name: 'Show Advanced Recovery Options', exact: true }).click()
  }
  if (item.action === 'files') await clickWorkspaceTab(page, 'files')
  if (item.action === 'team-messages') {
    await clickWorkspaceTab(page, 'teamMembers')
    await page.locator('[data-test="team-messages-header"]').click()
  }
  if (item.action === 'mobile-team-reference') {
    await page.getByTestId('mobile-open-team-messages').click()
    await page.getByTestId('mobile-team-reference-row').first().click()
  }
  if (item.action === 'team-launch-ready' || item.action === 'team-launch-writer-focus') {
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await page.waitForURL(/\/workspace$/)
    await page.getByRole('button', { name: 'Run Team', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Select a workspace...', exact: true }).click()
    await page.locator('li').filter({ hasText: '/synthetic/prototype-workspace' }).click()
    await page.waitForFunction(() => {
      const run = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Run Team')
      return run && !run.disabled
    })
  }
  if (item.action === 'team-launch-writer-focus') {
    await page.getByRole('button', { name: 'Run Team', exact: true }).click()
    await page.locator('[data-test="workspace-team-row-team-run-created-fixture"]').waitFor({ timeout: 20_000 })
    const teamRow = page.locator('[data-test="workspace-team-row-team-run-created-fixture"]')
    await teamRow.click()
    await page.waitForFunction(() => document.querySelector('[data-test="workspace-team-row-team-run-created-fixture"]')?.getAttribute('aria-expanded') === 'false')
    await teamRow.click()
    await page.waitForFunction(() => document.querySelector('[data-test="workspace-team-row-team-run-created-fixture"]')?.getAttribute('aria-expanded') === 'true')
    const writerRow = page.locator('[data-row-kind="stable_member"][data-test="workspace-team-member-team-run-created-fixture-/writer"]')
    await writerRow.click()
    await page.waitForFunction(() => document.querySelector('[data-test="workspace-team-member-team-run-created-fixture-/writer"]')?.getAttribute('aria-current') === 'true')
  }
}

const previousManifest = await readFile(resolve(outDir, 'manifest.json'), 'utf8')
  .then(value => JSON.parse(value))
  .catch(() => null)
const preservedHashes = new Map((previousManifest?.results ?? [])
  .filter(row => /^VIS-0(0[1-9]|1[0-5])$/.test(row.id))
  .map(row => [row.id, row.screenshotSha256]))

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'],
})

const results = []
try {
  for (const item of references) {
    const context = await browser.newContext({
      viewport: viewportFor(item),
      locale: item.locale === 'zh-CN' ? 'zh-CN' : 'en-US',
      colorScheme: 'light',
      reducedMotion: 'reduce',
    })
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.protocol === 'data:' || url.protocol === 'blob:' || ['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue()
      return route.abort('blockedbyclient')
    })
    await context.addInitScript(({ item, session, fixedClock }) => {
      const NativeDate = Date
      const fixedNow = NativeDate.parse(fixedClock)
      function FixedDate(...args) {
        if (!(this instanceof FixedDate)) return new NativeDate(fixedNow).toString()
        return args.length ? new NativeDate(...args) : new NativeDate(fixedNow)
      }
      FixedDate.now = () => fixedNow
      FixedDate.parse = NativeDate.parse
      FixedDate.UTC = NativeDate.UTC
      FixedDate.prototype = NativeDate.prototype
      globalThis.Date = FixedDate
      localStorage.clear()
      localStorage.setItem('autobyteus.localization.preference-mode', item.locale)
      localStorage.setItem('autobyteus.prototype.scenario', item.scenario)
      localStorage.setItem('autobyteus.prototype.context', item.context)
      localStorage.setItem('autobyteus.prototype.deferExperienceScenario', '1')
      if (item.context === 'paired') localStorage.setItem('autobyteus.remote_access.mobile_session.v1', JSON.stringify(session))
    }, { item, session: mobileSession(), fixedClock: fixedCaptureClock })

    const page = await context.newPage()
    const browserErrors = []
    page.on('pageerror', error => browserErrors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
    await page.goto(baseUrl + item.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await settle(page, item.scenario === 'electron_error' ? 900 : 650)

    if (item.scenario.startsWith('workspace_')) {
      await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context })
    }
    if (item.scenario.startsWith('mobile_')) {
      await forceMobileWork(page, item.scenario)
      await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context, tab: item.mobileTab })
      if (item.mobileTab) {
        await page.getByTestId(`mobile-tab-${item.mobileTab}`).click()
        await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context, tab: item.mobileTab })
      }
    }

    await applyAction(page, item)
    if (item.scenario.startsWith('mobile_')) {
      await page.evaluate(applyExperienceScenario, { scenario: item.scenario, context: item.context, tab: item.mobileTab })
    }
    await settle(page, 450)

    const path = resolve(outDir, item.file)
    const screenshot = await page.screenshot({ path })
    const bodyText = await page.locator('body').innerText()
    const runtime = await page.evaluate(() => ({
      route: location.pathname + location.search,
      sourceCommit: window.__AUTOBYTEUS_PROTOTYPE__?.sourceCommit,
      scenario: window.__AUTOBYTEUS_PROTOTYPE__?.scenario,
      context: window.__AUTOBYTEUS_PROTOTYPE__?.context,
      externalResources: performance.getEntriesByType('resource').map(entry => entry.name).filter(name => !name.startsWith(location.origin)),
    }))
    if (runtime.sourceCommit !== sourceCommit) throw new Error(`${item.id} source pin mismatch: ${runtime.sourceCommit}`)
    if (runtime.externalResources.length) throw new Error(`${item.id} loaded external resources: ${runtime.externalResources.join(', ')}`)
    if (browserErrors.length) throw new Error(`${item.id} browser errors: ${browserErrors.join(' | ')}`)
    if (preservedHashes.has(item.id) && preservedHashes.get(item.id) !== sha256(screenshot)) {
      throw new Error(`${item.id} changed from its previously approved screenshot hash`)
    }

    results.push({
      id: item.id,
      label: item.label,
      imagePath: path,
      viewport: viewportFor(item),
      locale: item.locale,
      requestedPath: item.path,
      actualRoute: runtime.route,
      scenario: item.scenario,
      context: item.context,
      sourceCommit: runtime.sourceCommit,
      screenshotSha256: sha256(screenshot),
      bodyTextSha256: sha256(bodyText),
      browserErrors,
      externalResources: runtime.externalResources,
    })
    await context.close()
    process.stdout.write(`CAPTURED ${item.id} ${item.file}\n`)
  }
} finally {
  await browser.close()
}

const manifest = {
  generatedAt: new Date().toISOString(),
  approvalReference,
  fixedCaptureClock,
  prototypeBaseUrl: baseUrl,
  sourceCommit,
  result: `${results.length}/${references.length} captured without browser errors or external resources`,
  results,
}
await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(resolve(outDir, 'README.md'), [
  '# Final User-Confirmed Visual References',
  '',
  `- Approval reference: ${approvalReference}`,
  `- Accepted source commit: \`${sourceCommit}\``,
  `- Deterministic capture clock: \`${fixedCaptureClock}\``,
  `- Capture result: **${results.length}/${references.length}** without browser errors or external resources`,
  '- These post-confirmation images are normative current-state references. Synthetic domain names, paths, timestamps, usage values and record content are illustrative fixtures; layout, hierarchy, styling, controls, labels, states and interactions are requirements-defining.',
  '',
  '| Visual ID | Surface / state | Viewport | Locale | Image |',
  '| --- | --- | --- | --- | --- |',
  ...results.map(row => `| ${row.id} | ${row.label} | ${row.viewport.width}×${row.viewport.height} | ${row.locale} | [${row.imagePath.split('/').pop()}](${row.imagePath.split('/').pop()}) |`),
  '',
  'Machine-readable capture metadata, hashes, routes, scenarios and browser-boundary results are in [manifest.json](manifest.json).',
  '',
].join('\n'))
process.stdout.write(`${results.length}/${references.length} final references captured.\n`)
