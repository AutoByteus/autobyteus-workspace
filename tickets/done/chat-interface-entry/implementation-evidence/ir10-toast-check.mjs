#!/usr/bin/env node
// CR-010 / UF-05 (IR-010): the tier-4 notice toast is visible above the Skill sources dialog.
//
// The dev env must run with `CODEX_HOME=/tmp/cie-t4/.codex` (`CODEX_HOME=... pnpm dev`), so that
// folder's `skills` is the Codex runtime default folder (tier 4) and the real `~/.codex` is untouched.
// Fixtures: `ui-t4` in that folder and in the dev skills folder (tier 1). The added source and the
// fixtures are removed at the end. Results and screenshots: `ir10-toast/`.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '../../../..')
const require = createRequire(path.join(rootDir, 'autobyteus-web/package.json'))
const { chromium } = require('playwright-core')
const FRONT = 'http://127.0.0.1:3000'
const BACK = 'http://127.0.0.1:8000'
const devSkills = path.join(rootDir, '.autobyteus/development/server-data/skills')
const codexSkills = '/tmp/cie-t4/.codex/skills'
const outDir = path.join(scriptDir, 'ir10-toast')
const results = { startedAt: new Date().toISOString() }
const gql = async (query, variables = {}) => (await fetch(`${BACK}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
const writeSkill = async (dir, name) => {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: toast fixture\n---\n\nFixture.\n`)
}

let browser
try {
  await fs.mkdir(outDir, { recursive: true })
  await writeSkill(path.join(codexSkills, 'ui-t4'), 'ui-t4')
  await writeSkill(path.join(devSkills, 'ui-t4'), 'ui-t4')
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage()
  page.setDefaultTimeout(60000)
  await page.goto(`${FRONT}/skills`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Sources/ }).click()
  await page.locator('.add-source-section input').fill(codexSkills)
  await page.locator('.btn-add').click()
  const toast = page.locator('[data-testid="toast-container"] >> text=/Ignored 1 skill from the Codex default folder/')
  await toast.waitFor({ timeout: 30000 })
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(outDir, 'U6-tier4-toast-above-sources-dialog.png') })
  const probe = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="toast-container"]')
    const item = container?.querySelector('div > div')
    const rect = item?.getBoundingClientRect()
    const hit = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null
    const overlay = document.querySelector('.dialog-overlay')
    return {
      toastText: item?.textContent?.trim() ?? null,
      toastOnTop: Boolean(hit && container?.contains(hit)),
      toastZ: container ? getComputedStyle(container).zIndex : null,
      dialogZ: overlay ? getComputedStyle(overlay).zIndex : null,
      dialogOpen: Boolean(overlay),
    }
  })
  Object.assign(results, probe, { result: probe.toastOnTop && probe.dialogOpen && /Codex default folder/.test(probe.toastText ?? '') ? 'Pass' : 'Fail' })
} catch (error) {
  results.result = 'Fail'; results.error = String(error?.stack ?? error)
} finally {
  await browser?.close()
  results.removeSource = (await gql('mutation($p:String!){removeSkillSource(path:$p){path}}', { p: codexSkills }).catch((e) => ({ error: String(e) })))
  await fs.rm(path.join(devSkills, 'ui-t4'), { recursive: true, force: true })
  await fs.rm('/tmp/cie-t4', { recursive: true, force: true })
  results.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2))
  console.log(`U6: ${results.result} — tier-4 notice above the Skill sources dialog`, JSON.stringify({ toastOnTop: results.toastOnTop, toastZ: results.toastZ, dialogZ: results.dialogZ }))
}
