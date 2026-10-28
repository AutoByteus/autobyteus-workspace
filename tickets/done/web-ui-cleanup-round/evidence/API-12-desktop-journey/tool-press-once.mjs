import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html'))
const btn = page.locator('main button[aria-label="Start voice input"]').first()
await btn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(2000)
console.log(JSON.stringify(await page.evaluate(() => ({ value: document.querySelector('main input')?.value,
  status: [...document.querySelectorAll('[data-testid^=memory-search-voice]')].map((e) => e.getAttribute('data-testid') + ': ' + e.innerText.replace(/\s+/g, ' ').trim()),
  toasts: document.querySelector('[data-testid=toast-container]')?.innerText.replace(/\s+/g, ' ').trim() || '', button: document.querySelector('main button.rounded-full')?.getAttribute('aria-label') }))))
process.exit(0)
