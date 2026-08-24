#!/usr/bin/env node
import { chromium } from 'playwright-core'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const sourceBaseUrl = process.env.SOURCE_BASE_URL || 'http://127.0.0.1:3100'
const mockBaseUrl = process.env.MOCK_BASE_URL || 'http://127.0.0.1:4310'
const output = process.env.OUTPUT || resolve(root, 'prototype/fixtures/source-state-snapshots.json')

const routes = [
  '/', '/agents?view=list', '/agents?view=create', '/agents?view=detail&id=agent-researcher', '/agents?view=edit&id=agent-researcher', '/agents?view=unsupported',
  '/agent-teams?view=team-list', '/agent-teams?view=team-create', '/agent-teams?view=team-detail&id=team-product', '/agent-teams?view=team-edit&id=team-product', '/agent-teams?view=unsupported',
  '/applications', '/applications/sample-app', '/skills', '/skills?skill=prototype-research',
  '/memory?view=home&tab=agents', '/memory?view=home&tab=teams', '/memory?view=agent-detail&agentDefinitionId=agent-researcher&agentName=Research%20Assistant', '/memory?view=team-detail&teamDefinitionId=team-product&teamName=Product%20Review%20Team', '/memory?view=unsupported',
  '/nodes?tab=manage', '/nodes?tab=memorySync', '/nodes?tab=phoneSetup', '/nodes?tab=dockerGuide',
  '/workspace', '/tools', '/media',
  ...['api-keys', 'token-usage', 'messaging', 'display', 'language', 'local-tools', 'mcp-servers', 'application-packages', 'agent-packages', 'server-settings&mode=quick', 'server-settings&mode=advanced', 'server-settings&mode=migrations', 'extensions', 'updates'].map(section => `/settings?section=${section}`),
]

const scenarios = routes.map(path => ({ path, scenario: 'populated', locale: 'en' }))
scenarios.push(
  { path: '/agents?view=list', scenario: 'empty', locale: 'en' },
  { path: '/applications', scenario: 'empty', locale: 'en' },
  { path: '/memory', scenario: 'empty', locale: 'en' },
  { path: '/skills', scenario: 'empty', locale: 'en' },
  { path: '/applications', scenario: 'apps_disabled', locale: 'en' },
  { path: '/agents?view=list', scenario: 'loading', locale: 'en', waitMs: 220 },
  { path: '/agents?view=list', scenario: 'error', locale: 'en' },
  { path: '/mobile', scenario: 'populated', locale: 'en', mobile: 'unpaired' },
  { path: '/mobile', scenario: 'populated', locale: 'en', mobile: 'paired' },
  { path: '/mobile?unsupported=desktopSettings', scenario: 'populated', locale: 'en', mobile: 'paired' },
  { path: '/mobile', scenario: 'permission_denied', locale: 'en', mobile: 'paired' },
)

const setScenario = async scenario => {
  const response = await fetch(`${mockBaseUrl}/__prototype/scenario`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario, operationFailures: {} }) })
  if (!response.ok) throw new Error(`Unable to set ${scenario}`)
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const snapshots = {}
try {
  for (const item of scenarios) {
    await setScenario(item.scenario)
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: item.locale === 'zh-CN' ? 'zh-CN' : 'en-US' })
    await context.addInitScript(({ locale, mobile, mock }) => {
      localStorage.clear()
      localStorage.setItem('autobyteus.localization.preference-mode', locale)
      if (mobile === 'paired') {
        localStorage.setItem('autobyteus.remote_access.mobile_session.v1', JSON.stringify({
          version: 1, nodeId: 'mobile-paired-node', serverBaseUrl: mock, credential: 'prototype_mobile_session',
          device: { deviceId: 'prototype-phone', displayName: 'Prototype phone', clientFacingBaseUrl: mock, createdAt: '2026-08-22T04:00:00.000Z', lastSeenAt: '2026-08-22T04:00:00.000Z', revokedAt: null },
          pairedAt: '2026-08-22T04:00:00.000Z',
        }))
      }
    }, { locale: item.locale, mobile: item.mobile, mock: mockBaseUrl })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(sourceBaseUrl + item.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(item.waitMs ?? 1700)
    const captured = await page.evaluate(() => {
      if (typeof window.useNuxtApp !== 'function') {
        return { actualPath: location.pathname + location.search, state: {}, stores: {}, bodyText: document.body.innerText, bootstrapPending: true }
      }
      const nuxt = window.useNuxtApp()
      const pinia = nuxt?.$pinia
      if (!pinia) {
        return { actualPath: location.pathname + location.search, state: {}, stores: {}, bodyText: document.body.innerText, bootstrapPending: true }
      }
      const state = JSON.parse(JSON.stringify(pinia.state.value))
      const stores = {}
      for (const [id, store] of pinia._s.entries()) {
        stores[id] = {
          actions: Object.keys(store._hmrPayload?.actions || {}),
          getters: Object.keys(store._hmrPayload?.getters || {}),
          keys: Object.keys(store).filter(key => !key.startsWith('$') && !key.startsWith('_')),
        }
      }
      return { actualPath: location.pathname + location.search, state, stores, bodyText: document.body.innerText }
    })
    const key = `${item.scenario}|${item.mobile || 'desktop'}|${item.path}`
    snapshots[key] = { item, ...captured, errors }
    process.stdout.write(`${key} stores=${Object.keys(captured.state).length} errors=${errors.length}\n`)
    await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), sourceBaseUrl, mockBaseUrl, snapshots }, null, 2))
    await context.close()
  }
} finally {
  await setScenario('populated').catch(() => undefined)
  await browser.close()
}

await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), sourceBaseUrl, mockBaseUrl, snapshots }, null, 2))
console.log(`wrote ${output}`)
