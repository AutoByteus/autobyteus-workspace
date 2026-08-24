#!/usr/bin/env node
import { chromium } from 'playwright-core'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(new URL('../..', import.meta.url).pathname)
const sourceBaseUrl = process.env.SOURCE_BASE_URL || 'http://127.0.0.1:3100'
const prototypeBaseUrl = process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1:3200'
const mockBaseUrl = process.env.MOCK_BASE_URL || 'http://127.0.0.1:4310'
const sourcePin = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const require = createRequire(import.meta.url)
const icons = Object.fromEntries(['heroicons', 'ph', 'mdi', 'svg-spinners', 'vscode-icons', 'logos'].map(prefix => [prefix, require(`@iconify-json/${prefix}/icons.json`)]))
const monacoRoot = resolve(root, 'node_modules/monaco-editor/min/vs')
const outputRoot = resolve(root, 'evidence/gap-010')
const style = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
const sha256 = value => createHash('sha256').update(value).digest('hex')

const checkpoints = Object.freeze([
  { id: 'JRN-050-A', name: 'Agent Teams catalog Run entry' },
  { id: 'JRN-050-B', name: 'Workspace Team launch draft' },
  { id: 'JRN-050-C', name: 'Chosen-workspace launch-ready draft' },
  { id: 'JRN-050-D', name: 'Launched Team selected and projected in the chosen workspace tree' },
  { id: 'JRN-050-E', name: 'Writer Team member focused from the launched left-tree row' },
])

async function setBackend() {
  const response = await fetch(`${mockBaseUrl}/__prototype/scenario`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenario: 'team_launch', operationFailures: {} }),
  })
  if (!response.ok) throw new Error(`Unable to select Team launch source fixture: ${response.status}`)
}

async function settle(page, ms = 450) {
  await page.waitForFunction(() => document.body?.innerText.trim().length > 0, undefined, { timeout: 20_000 })
  await page.waitForTimeout(ms)
}

async function piniaContract(page) {
  return page.evaluate(() => {
    const mounted = Array.from(document.querySelectorAll('*')).find(node => node.__vueParentComponent)
    let instance = mounted?.__vueParentComponent
    while (instance?.parent) instance = instance.parent
    const pinia = instance?.appContext?.config?.globalProperties?.$pinia
    const store = id => pinia?._s?.get(id)
    const selection = store('agentSelection')
    const drafts = store('teamRunConfig')
    const teams = store('agentTeamContexts')
    const history = store('runHistory')
    const projection = history?.navigationProjection
    const selectedTeamRunId = selection?.selectedType === 'team' ? selection.selectedRunId : null
    const selectedTeam = selectedTeamRunId ? teams?.getTeamContextById?.(selectedTeamRunId) : null
    return {
      selection: selection?.subject ?? null,
      draftCount: drafts?.drafts instanceof Map ? drafts.drafts.size : null,
      selectedDraftIdPresent: Boolean(drafts?.selectedDraftId),
      teamRunIds: teams?.teams instanceof Map ? Array.from(teams.teams.keys()) : [],
      workspaceNodes: (projection?.workspaceNodes ?? []).map(node => ({
        workspaceId: node.workspaceId, workspaceRootPath: node.workspaceRootPath, workspaceName: node.workspaceName,
      })),
      teamNodes: (projection?.teamNodes ?? []).map(team => ({
        teamRunId: team.teamRunId, teamDefinitionId: team.teamDefinitionId, teamDefinitionName: team.teamDefinitionName,
        workspaceRootPath: team.workspaceRootPath, isActive: team.isActive,
        members: team.executionRows.map(row => ({ memberAddress: row.memberAddress, displayName: row.displayName, agentRunId: row.agentRunId })),
      })),
      selectedTeam: selectedTeam ? {
        rootTeamRunId: selectedTeam.view.getRootTeamRunId(),
        focusedAgentRunId: selectedTeam.view.getFocusedAgentRunId(),
        focusedMemberAddress: selectedTeam.view.getFocusedMemberAddress(),
      } : null,
    }
  })
}

async function capture(page, target, checkpoint) {
  await settle(page, 250)
  const screenshotPath = resolve(outputRoot, target, `${checkpoint.id}.png`)
  await mkdir(resolve(outputRoot, target), { recursive: true })
  const screenshot = await page.screenshot({ path: screenshotPath })
  const semantic = await page.locator('body').evaluate(body => ({
    route: location.pathname + location.search,
    bodyText: body.innerText,
    selectedTeamMemberTestId: document.querySelector('[data-row-kind="stable_member"][aria-current="true"]')?.getAttribute('data-test') ?? null,
    teamWorkspaceHeader: document.querySelector('main h4[title]')?.textContent?.trim() ?? null,
    activeElement: {
      tag: document.activeElement?.tagName ?? null,
      text: document.activeElement && /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)
        ? document.activeElement.textContent?.trim() ?? null : null,
    },
  }))
  return { screenshotPath, screenshotSha256: sha256(screenshot), semantic, state: await piniaContract(page) }
}

async function exercise(browser, baseUrl, target) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', colorScheme: 'light', reducedMotion: 'reduce' })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/monaco-editor@') && url.pathname.includes('/min/vs/')) {
      const relative = url.pathname.split('/min/vs/')[1]
      try {
        const body = await readFile(resolve(monacoRoot, relative))
        return route.fulfill({ status: 200, contentType: relative.endsWith('.css') ? 'text/css' : relative.endsWith('.ttf') ? 'font/ttf' : 'text/javascript', body })
      } catch { return route.fulfill({ status: 404, body: 'missing local asset' }) }
    }
    if (['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com'].includes(url.hostname)) {
      const prefix = url.pathname.split('/').pop()?.replace(/\.json$/, '')
      if (prefix && icons[prefix]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(icons[prefix]) })
    }
    if (url.protocol === 'data:' || url.protocol === 'blob:' || ['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue()
    return route.abort('blockedbyclient')
  })
  await context.addInitScript(({ target }) => {
    localStorage.clear()
    localStorage.setItem('autobyteus.localization.preference-mode', 'en')
    localStorage.setItem('autobyteus.prototype.scenario', target === 'prototype' ? 'team_launch' : 'populated')
    localStorage.setItem('autobyteus.prototype.context', 'desktop')
    localStorage.setItem('autobyteus.app-left-panel.primary-nav-height', '240')
  }, { target })
  const page = await context.newPage()
  const browserErrors = []
  page.on('pageerror', error => browserErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  await page.goto(`${baseUrl}/agent-teams?view=team-list`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await settle(page, 900)
  await page.addStyleTag({ content: style })
  const frames = [await capture(page, target, checkpoints[0])]

  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await page.waitForURL(/\/workspace$/)
  await page.getByRole('button', { name: 'Run Team', exact: true }).waitFor()
  frames.push(await capture(page, target, checkpoints[1]))

  await page.getByRole('button', { name: 'Select a workspace...', exact: true }).click()
  await page.locator('li').filter({ hasText: '/synthetic/prototype-workspace' }).click()
  await page.waitForFunction(() => {
    const run = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Run Team')
    return run && !run.disabled
  })
  frames.push(await capture(page, target, checkpoints[2]))

  await page.getByRole('button', { name: 'Run Team', exact: true }).click()
  await page.locator('[data-test="workspace-team-row-team-run-created-fixture"]').waitFor({ timeout: 20_000 })
  await page.getByText('researcher', { exact: true }).first().waitFor()
  frames.push(await capture(page, target, checkpoints[3]))

  const writerRow = page.locator('[data-row-kind="stable_member"][data-test="workspace-team-member-team-run-created-fixture-/writer"]')
  await writerRow.waitFor({ timeout: 20_000 })
  await writerRow.click()
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-row-kind="stable_member"][data-test="workspace-team-member-team-run-created-fixture-/writer"]')
    return row?.getAttribute('aria-current') === 'true'
  })
  frames.push(await capture(page, target, checkpoints[4]))
  await context.close()
  return { frames, browserErrors }
}

async function diff(sourcePath, prototypePath) {
  const [source, prototype] = await Promise.all([
    sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(prototypePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  if (source.info.width !== prototype.info.width || source.info.height !== prototype.info.height) {
    return { geometryEqual: false, changedPixels: null, totalPixels: null, changedPixelRatio: 1, maximumChannelDelta: 255, normalizedRenderingNoiseOnly: false }
  }
  let changedPixels = 0
  let maximumChannelDelta = 0
  for (let index = 0; index < source.data.length; index += source.info.channels) {
    let changed = false
    for (let channel = 0; channel < source.info.channels; channel += 1) {
      const delta = Math.abs(source.data[index + channel] - prototype.data[index + channel])
      changed ||= delta > 0
      maximumChannelDelta = Math.max(maximumChannelDelta, delta)
    }
    changedPixels += changed ? 1 : 0
  }
  const totalPixels = source.info.width * source.info.height
  const changedPixelRatio = changedPixels / totalPixels
  return { geometryEqual: true, changedPixels, totalPixels, changedPixelRatio, maximumChannelDelta, normalizedRenderingNoiseOnly: changedPixelRatio <= 0.0001 && maximumChannelDelta <= 64 }
}

await setBackend()
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] })
let source
let prototype
try {
  source = await exercise(browser, sourceBaseUrl, 'source')
  await setBackend()
  prototype = await exercise(browser, prototypeBaseUrl, 'prototype')
} finally {
  await browser.close()
}

const results = []
for (let index = 0; index < checkpoints.length; index += 1) {
  const sourceFrame = source.frames[index]
  const prototypeFrame = prototype.frames[index]
  const perceptual = await diff(sourceFrame.screenshotPath, prototypeFrame.screenshotPath)
  const semanticEqual = JSON.stringify(sourceFrame.semantic) === JSON.stringify(prototypeFrame.semantic)
  const stateEqual = JSON.stringify(sourceFrame.state) === JSON.stringify(prototypeFrame.state)
  const screenshotEqual = sourceFrame.screenshotSha256 === prototypeFrame.screenshotSha256
  const pass = semanticEqual && stateEqual && (screenshotEqual || perceptual.normalizedRenderingNoiseOnly)
  results.push({ checkpoint: checkpoints[index], source: sourceFrame, prototype: prototypeFrame, comparison: { semanticEqual, stateEqual, screenshotEqual, perceptual, pass } })
  process.stdout.write(`${pass ? 'PASS' : 'FAIL'} ${checkpoints[index].id} ${checkpoints[index].name}\n`)
}

const summary = {
  inventoryId: 'JRN-050', gapId: 'PP-GAP-010', preservedGapIds: ['PP-GAP-009'], sourcePin,
  total: results.length, passed: results.filter(row => row.comparison.pass).length,
  failed: results.filter(row => !row.comparison.pass).map(row => row.checkpoint.id),
  sourceBrowserErrors: source.browserErrors, prototypeBrowserErrors: prototype.browserErrors,
  journeyContractPassed: results.every(row => row.comparison.pass)
    && source.browserErrors.length === 0 && prototype.browserErrors.length === 0
    && results.at(-1)?.source.state.selection?.rootTeamRunId === 'team-run-created-fixture'
    && results.at(-1)?.prototype.state.selection?.rootTeamRunId === 'team-run-created-fixture'
    && results.at(-1)?.source.state.draftCount === 0 && results.at(-1)?.prototype.state.draftCount === 0
    && results.at(-1)?.source.state.selectedTeam?.focusedMemberAddress === '/writer'
    && results.at(-1)?.prototype.state.selectedTeam?.focusedMemberAddress === '/writer'
    && results.at(-1)?.source.state.selectedTeam?.focusedAgentRunId === 'team-member-writer-created'
    && results.at(-1)?.prototype.state.selectedTeam?.focusedAgentRunId === 'team-member-writer-created'
    && results.at(-1)?.source.semantic.selectedTeamMemberTestId === 'workspace-team-member-team-run-created-fixture-/writer'
    && results.at(-1)?.prototype.semantic.selectedTeamMemberTestId === 'workspace-team-member-team-run-created-fixture-/writer',
}
await mkdir(outputRoot, { recursive: true })
await writeFile(resolve(outputRoot, 'gap-010-results.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), sourceBaseUrl, prototypeBaseUrl, mockBaseUrl, sourcePin, checkpoints: results }, null, 2)}\n`)
await writeFile(resolve(outputRoot, 'gap-010-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
if (!summary.journeyContractPassed) process.exitCode = 1
