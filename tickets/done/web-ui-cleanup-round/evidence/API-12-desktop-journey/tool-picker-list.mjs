import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, projectId, taskId] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html'))
await page.evaluate((h) => { location.hash = '/projects' }, '')
await page.waitForTimeout(800)
await page.evaluate((h) => { location.hash = h }, `/projects/${projectId}/tasks/${taskId}/edit`)
const input = page.locator('[data-testid=task-dependency-input]')
await input.waitFor({ timeout: 20000 })
await page.waitForTimeout(1500)
await input.click()
await page.waitForTimeout(600)
const list = await page.evaluate(() => {
  const ul = document.querySelector('[data-testid=task-dependency-options]')
  return { open: !!ul, html: ul ? [...ul.children].map((li) => ({ testid: li.getAttribute('data-testid'), text: li.innerText.replace(/\s+/g, ' ').trim().slice(0, 80),
    ariaDisabled: li.getAttribute('aria-disabled'), ariaSelected: li.getAttribute('aria-selected'), id: li.id })) : [],
    active: document.querySelector('[data-testid=task-dependency-input]')?.getAttribute('aria-activedescendant'),
    selected: [...document.querySelectorAll('[data-testid^=task-dependency-selected-]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()) }
})
console.log(JSON.stringify(list, null, 1))
process.exit(0)
