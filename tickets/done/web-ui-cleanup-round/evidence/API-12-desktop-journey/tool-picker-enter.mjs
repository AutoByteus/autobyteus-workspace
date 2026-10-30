// ab320 temporary: AC-010 in the instance. Open Task A's edit page, focus the Depends-on input (opens the list with options
// already loaded), press Enter; report the options (choosable or loop), the active option and the selection.
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, projectId, taskId, shot] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html'))
await page.evaluate((h) => { location.hash = h }, `/projects/${projectId}/tasks/${taskId}/edit`)
const input = page.locator('[data-testid=task-dependency-input]')
await input.waitFor({ timeout: 20000 })
await page.waitForTimeout(1500) // the options load with the page, before the list opens
await input.focus()
await page.waitForTimeout(400)
const options = await page.locator('[data-testid^=task-dependency-option-]').evaluateAll((els) => els.map((e) => ({
  id: e.getAttribute('data-testid').replace('task-dependency-option-', ''), text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 70),
  disabled: e.getAttribute('aria-disabled'), selected: e.getAttribute('aria-selected') })))
const activeBefore = await input.getAttribute('aria-activedescendant')
await page.keyboard.press('Enter')
await page.waitForTimeout(600)
const chosen = await page.locator('[data-testid^=task-dependency-selected-]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()))
if (shot) await page.screenshot({ path: shot })
console.log(JSON.stringify({ options, activeBefore, chosenAfterEnter: chosen }, null, 1))
process.exit(0)
