// ab320 temporary: where does keyboard focus go after Enter on a voice button (start) and Enter again (stop)?
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, scope] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html'))
await page.keyboard.press('Escape')
const sel = ['Start voice input', 'Stop recording', 'Starting microphone...', 'Transcribing...'].map((l) => `${scope} button[aria-label="${l}"]`).join(', ')
const btn = page.locator(sel).first()
const focus = () => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : ''}` : null })
const out = []
await btn.focus(); out.push(['focused button', await focus()])
await page.keyboard.press('Enter'); await page.waitForTimeout(50); out.push(['50ms after Enter (start)', await focus(), await btn.getAttribute('aria-label')])
await page.waitForTimeout(1200); out.push(['1.2s after start', await focus(), await btn.getAttribute('aria-label')])
await btn.focus(); out.push(['refocused', await focus()])
await page.keyboard.press('Enter'); await page.waitForTimeout(50); out.push(['50ms after Enter (stop)', await focus(), await btn.getAttribute('aria-label')])
for (let i = 0; i < 80; i += 1) { await page.waitForTimeout(500); if (/^Start/.test(await btn.getAttribute('aria-label') || '')) break }
out.push(['settled', await focus(), await btn.getAttribute('aria-label')])
console.log(JSON.stringify(out))
process.exit(0)
