#!/usr/bin/env node
// D-19 rendered check (IR-008) on the dev env (`pnpm dev`; web :3000, backend :8000, data root
// `.autobyteus/development/server-data`). Real Chrome at 1440×900. Fixtures are created in the dev
// data root and a temp folder, and removed at the end. Results and screenshots: `ir8-d19-ui/`.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '../../../..')
const require = createRequire(path.join(rootDir, 'autobyteus-web/package.json'))
const { chromium } = require('playwright-core')
const FRONT = 'http://127.0.0.1:3000'
const devData = path.join(rootDir, '.autobyteus/development/server-data')
const outDir = path.join(scriptDir, 'ir8-d19-ui')
const sel = (t) => `[data-testid="${t}"]`
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const results = { startedAt: new Date().toISOString(), checks: {} }

const writeSkill = async (dir, name) => {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: UI fixture ${name}\n---\n\nFixture.\n`)
  return dir
}
const tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cie-d19-ui-')))
const fixtures = {
  tier1: path.join(devData, 'skills', 'ui-dup'),
  tier2Agent: path.join(devData, 'agents', 'ui-fixture-agent'),
  folder: path.join(tmp, 'folder'),
  pkg: path.join(tmp, 'pkg'),
}
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const check = async (id, title, fn, page) => {
  try { results.checks[id] = { title, ...(await fn()) } }
  catch (error) { results.checks[id] = { title, result: 'Fail', error: String(error?.message ?? error).slice(0, 600) }; await shot(page, `${id}-failure`).catch(() => {}) }
  console.log(`${id}: ${results.checks[id].result} — ${title}`)
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
}
const dialogRows = (page) => page.locator(`${sel('skill-name-conflict-rows')} li`).evaluateAll((items) => items.map((item) => item.innerText))

let browser
try {
  await fs.mkdir(outDir, { recursive: true })
  // Out-of-band duplicate (tier 1 vs tier 2) for the banner; incoming copies for the rejections.
  await writeSkill(fixtures.tier1, 'ui-dup')
  await writeSkill(path.join(fixtures.tier2Agent, 'skills', 'ui-dup'), 'ui-dup')
  await writeSkill(path.join(fixtures.tier2Agent, 'skills', 'ui-dup-pkg'), 'ui-dup-pkg')
  await writeSkill(path.join(fixtures.folder, 'ui-dup'), 'ui-dup')
  await fs.mkdir(path.join(fixtures.pkg, 'agents', 'ui-pkg-agent'), { recursive: true })
  await fs.writeFile(path.join(fixtures.pkg, 'agents', 'ui-pkg-agent', 'agent.md'), '---\nname: UI Pkg Agent\ndescription: fixture\nrole: Helper\n---\n\nFixture.\n')
  await fs.writeFile(path.join(fixtures.pkg, 'agents', 'ui-pkg-agent', 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames: [], defaultLaunchConfig: null }))
  await writeSkill(path.join(fixtures.pkg, 'agents', 'ui-pkg-agent', 'skills', 'ui-dup'), 'ui-dup')

  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  page.setDefaultTimeout(30000)
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message)); results.pageErrors = pageErrors

  await check('U1', 'Skills page banner for an out-of-band duplicate (REQ-024): text, details, used and ignored paths', async () => {
    await page.goto(`${FRONT}/skills`, { waitUntil: 'domcontentloaded' })
    await page.locator(sel('skill-name-issues-banner')).waitFor({ timeout: 120000 })
    await delay(800)
    await shot(page, 'U1-banner-collapsed')
    const bannerText = await page.locator(sel('skill-name-issues-banner')).innerText()
    await page.locator(sel('skill-name-issues-toggle')).click()
    await delay(400)
    await shot(page, 'U1-banner-details')
    const row = await page.locator(sel('skill-name-issue-conflict-ui-dup')).innerText()
    const listedOnce = await page.locator('text=ui-dup').count()
    return { bannerText, row,
      result: bannerText.includes('Some skills share a name. AutoByteus uses one copy per name.') && row.includes(fixtures.tier1)
        && row.includes(path.join(fixtures.tier2Agent, 'skills', 'ui-dup')) && row.includes('Rename or remove one copy.') ? 'Pass' : 'Fail', listedOnce }
  }, page)

  await check('U2', 'Sources → add a folder with a duplicate → "Duplicate skill names" pop-up above the Sources dialog; Esc closes it; folder not added', async () => {
    await page.getByRole('button', { name: /Sources/ }).click()
    await page.locator('.add-source-section input').fill(fixtures.folder)
    await page.locator('.btn-add').click()
    await page.locator(sel('skill-name-conflict-dialog')).waitFor()
    await delay(500)
    await shot(page, 'U2-add-folder-conflict')
    const title = await page.locator('#modal-headline').innerText()
    const rows = await dialogRows(page)
    const okFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
    const onTop = await page.evaluate(() => {
      const ok = document.querySelector('[data-testid="skill-name-conflict-ok"]')
      const rect = ok.getBoundingClientRect()
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('[data-testid="skill-name-conflict-ok"]') !== null
    })
    await page.keyboard.press('Escape')
    await delay(300)
    const closed = await page.locator(sel('skill-name-conflict-dialog')).count() === 0
    const folderListed = (await page.locator('.sources-list').innerText()).includes(fixtures.folder)
    const inlineError = await page.locator('.dialog .error-alert').count()
    await page.locator('.btn-done').click()
    return { title, rows, okFocused, onTop, closed, folderListed, inlineError,
      result: title === 'Duplicate skill names' && rows.length === 1 && rows[0].includes('Already installed:') && rows[0].includes(fixtures.tier1)
        && rows[0].includes(path.join(fixtures.folder, 'ui-dup')) && okFocused === 'skill-name-conflict-ok' && onTop && closed && !folderListed && inlineError === 0 ? 'Pass' : 'Fail' }
  }, page)

  await check('U3', 'Create skill with a name a package already has → pop-up; OK closes it; the create dialog stays open for a rename; nothing created', async () => {
    await page.getByRole('button', { name: /Create skill/i }).click()
    await page.locator('.dialog input').first().fill('ui-dup-pkg')
    await page.locator('.dialog-footer .btn-primary').click()
    await page.locator(sel('skill-name-conflict-dialog')).waitFor()
    await delay(400)
    await shot(page, 'U3-create-conflict')
    const rows = await dialogRows(page)
    await page.locator(sel('skill-name-conflict-ok')).click()
    await delay(300)
    const createDialogOpen = await page.locator('.dialog').count() > 0
    const nameKept = await page.locator('.dialog input').first().inputValue()
    await page.locator('.dialog-footer .btn-secondary').click()
    const created = await fs.access(path.join(devData, 'skills', 'ui-dup-pkg')).then(() => true, () => false)
    return { rows, createDialogOpen, nameKept, created,
      result: rows.length === 1 && rows[0].includes(path.join(fixtures.tier2Agent, 'skills', 'ui-dup-pkg'))
        && rows[0].includes(path.join(devData, 'skills', 'ui-dup-pkg')) && createDialogOpen && nameKept === 'ui-dup-pkg' && !created ? 'Pass' : 'Fail' }
  }, page)

  await check('U4', 'Settings → Agent Packages → import a package with a duplicate → pop-up; backdrop click closes it; package not imported', async () => {
    await page.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/settings?section=agent-packages'))
    await page.locator(sel('agent-package-source-input')).waitFor({ timeout: 60000 })
    await page.locator(sel('agent-package-source-input')).fill(fixtures.pkg)
    await page.locator(sel('agent-package-import-button')).click()
    await page.locator(sel('skill-name-conflict-dialog')).waitFor()
    await delay(400)
    await shot(page, 'U4-package-import-conflict')
    const rows = await dialogRows(page)
    await page.mouse.click(20, 20)
    await delay(300)
    const closed = await page.locator(sel('skill-name-conflict-dialog')).count() === 0
    const listed = (await page.locator(sel('agent-packages-manager')).innerText()).includes(fixtures.pkg)
    const successShown = await page.locator(sel('agent-packages-success')).count()
    const inlineError = await page.locator(`${sel('agent-packages-manager')} .bg-red-50`).count()
    await shot(page, 'U4-after-close')
    return { rows, closed, listed, successShown, inlineError,
      result: rows.length === 1 && rows[0].includes(path.join(fixtures.pkg, 'agents', 'ui-pkg-agent', 'skills', 'ui-dup')) && closed && !listed && successShown === 0 && inlineError === 0 ? 'Pass' : 'Fail' }
  }, page)

  await check('U5', 'Narrow 390×844: the pop-up fits and paths truncate with full-path tooltips', async () => {
    const narrow = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' })).newPage()
    await narrow.goto(`${FRONT}/skills`, { waitUntil: 'domcontentloaded' })
    await narrow.locator(sel('skill-name-issues-banner')).waitFor({ timeout: 120000 })
    await narrow.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('skillNames').showConflicts([
      { name: 'ui-dup', existingPath: '/Users/someone/.autobyteus/server-data/skills/ui-dup', incomingPath: '/Users/someone/work/a/very/long/package/path/agents/ui-pkg-agent/skills/ui-dup' }]))
    await narrow.locator(sel('skill-name-conflict-dialog')).waitFor()
    await delay(400)
    await narrow.screenshot({ path: path.join(outDir, 'U5-narrow-conflict.png') })
    const fits = await narrow.evaluate(() => {
      const box = document.querySelector('[role="dialog"]').getBoundingClientRect()
      return box.left >= 0 && box.right <= window.innerWidth
    })
    const titles = await narrow.locator(`${sel('skill-name-conflict-rows')} [title]`).evaluateAll((els) => els.map((el) => el.getAttribute('title')))
    return { fits, titles, result: fits && titles.length === 2 ? 'Pass' : 'Fail' }
  }, page)
} catch (error) {
  results.fatal = String(error?.stack ?? error); console.error(error)
} finally {
  await browser?.close()
  await fs.rm(fixtures.tier1, { recursive: true, force: true })
  await fs.rm(fixtures.tier2Agent, { recursive: true, force: true })
  await fs.rm(tmp, { recursive: true, force: true })
  results.cleanup = [fixtures.tier1, fixtures.tier2Agent, tmp]
  results.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
}
