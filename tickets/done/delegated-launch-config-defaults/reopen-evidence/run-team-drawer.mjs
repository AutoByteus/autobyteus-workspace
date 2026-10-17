// Diagnosis only: opens the Marketing Team via Agent Teams → Run against the user's node (read-only),
// opens Customize members, and prints the member rows and browser console output.
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-diagnosis/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const mode = process.argv[2] ?? 'run'
const base = 'http://127.0.0.1:3917'
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const gql = []
page.on('request', (r) => { if (r.url().includes('graphql')) { try { gql.push(JSON.parse(r.postData() ?? '{}').operationName) } catch {} } })
try {
  if (mode === 'run') {
    await page.goto(`${base}/agent-teams`, { waitUntil: 'networkidle', timeout: 120000 })
    await page.getByText('Marketing Team', { exact: true }).first().waitFor({ timeout: 60000 })
    const card = page.locator('div, li, article').filter({ hasText: 'Marketing Team' }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last()
    await card.getByRole('button', { name: /^Run/ }).first().click()
  } else {
    // The user's journey: plain New chat, type text, switch the heading to Marketing Team.
    await page.goto(`${base}/chat`, { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForTimeout(4000)
    await page.locator('textarea, [contenteditable="true"]').first().fill('hell')
    await page.locator('h1, h2, button').filter({ hasText: /Daily Assistant|Assistant/ }).first().click()
    await page.waitForTimeout(1000)
    await page.getByText('Marketing Team', { exact: true }).last().click()
  }
  await page.waitForURL(/\/chat/, { timeout: 60000 })
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `/tmp/ldd-scripts/${mode}-composer.png` })
  await page.getByText(/^(Customize members|Edit)$/).first().click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `/tmp/ldd-scripts/${mode}-drawer.png` })
  const drawer = await page.locator('aside, [role="dialog"]').filter({ hasText: 'Member settings' }).first().innerText().catch(() => '(no drawer)')
  console.log('--- DRAWER ---\n' + drawer)
  console.log('--- composer line ---\n' + (await page.getByText(/members use these settings|customized/).first().innerText().catch(() => '?')))
} catch (e) {
  console.log('ERROR', e.message)
  await page.screenshot({ path: `/tmp/ldd-scripts/${mode}-error.png` })
} finally {
  console.log('--- GQL ops ---\n' + [...new Set(gql)].join(', '))
  console.log('--- CONSOLE ---\n' + logs.filter((l) => !l.includes('[vite]')).slice(0, 60).join('\n'))
  await browser.close()
}
