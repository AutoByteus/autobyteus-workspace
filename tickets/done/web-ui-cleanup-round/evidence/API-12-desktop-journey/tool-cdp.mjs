// ab238 temporary: drive an isolated AutoByteus instance window over CDP (attach only).
// Usage: node cdp.mjs <controlPort> <command> [args...]
//   text                      -> visible body text of the renderer window (first 6000 chars)
//   click <css>               -> click the first match
//   clickText <text>          -> click the first button/link whose text contains <text>
//   fill <css> <value>        -> fill an input
//   eval <js>                 -> evaluate an expression in the window, print JSON
//   shot <path>               -> screenshot of the window
//   url                       -> current URL
//   goto <hash-or-path>       -> set location.hash (renderer uses hash routing) or path
import { createRequire } from 'node:module'
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [port, command, ...args] = process.argv.slice(2)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
try {
  const pages = browser.contexts().flatMap((c) => c.pages())
  const page = pages.find((p) => p.url().includes('/renderer/index.html')) ?? pages[0]
  if (!page) throw new Error('no renderer page')
  page.setDefaultTimeout(30000)
  if (command === 'text') console.log((await page.locator('body').innerText()).slice(0, 6000))
  else if (command === 'click') { await page.locator(args[0]).first().click(); console.log('clicked', args[0]) }
  else if (command === 'clickText') { await page.locator('button, a, [role="button"], [role="tab"]').filter({ hasText: args[0] }).first().click(); console.log('clicked text', args[0]) }
  else if (command === 'fill') { await page.locator(args[0]).first().fill(args[1]); console.log('filled', args[0]) }
  else if (command === 'eval') console.log(JSON.stringify(await page.evaluate(args[0]), null, 1))
  else if (command === 'shot') { await page.screenshot({ path: args[0] }); console.log('shot', args[0]) }
  else if (command === 'url') console.log(page.url())
  else if (command === 'goto') { await page.evaluate((target) => { if (target.startsWith('#')) location.hash = target.slice(1); else location.href = target }, args[0]); await page.waitForTimeout(2000); console.log(page.url()) }
  else if (command.startsWith('f')) {
    // Frame commands on the application iframe: ftext | fclickText <text> | ffill <css> <value> | feval <js>
    const frame = page.frames().find((f) => f !== page.mainFrame())
    if (!frame) throw new Error('no application frame')
    if (command === 'ftext') console.log((await frame.locator('body').innerText()).slice(0, 6000))
    else if (command === 'fclickText') { await frame.locator('button, a, [role="button"]').filter({ hasText: args[0] }).first().click(); console.log('clicked frame text', args[0]) }
    else if (command === 'ffill') { await frame.locator(args[0]).first().fill(args[1]); console.log('filled frame', args[0]) }
    else if (command === 'feval') console.log(JSON.stringify(await frame.evaluate(args[0]), null, 1))
    else throw new Error(`unknown command ${command}`)
  }
  else throw new Error(`unknown command ${command}`)
} finally {
  // Attach mode: do not call browser.close(); exiting drops the CDP connection and leaves the app running.
  process.exit(process.exitCode ?? 0)
}
