import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 2000, height: 1250 } })
page.on('pageerror', e => console.log('pageerror', e.message))
await page.goto('http://127.0.0.1:29812/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await page.screenshot({ path: '/tmp/org-switch-repro/shots/00-home.png' })
await page.getByText("autobyteus-workspace-superrepo").click(); await page.waitForTimeout(1500); await page.screenshot({ path: "/tmp/org-switch-repro/shots/01-ws.png" });

await page.getByText("AutoByteus Org").click(); await page.waitForTimeout(1500)
await page.getByText(/currently our project have/i).first().click(); await page.waitForTimeout(8000)
await page.screenshot({ path: "/tmp/org-switch-repro/shots/02-org.png" })
await browser.close()
