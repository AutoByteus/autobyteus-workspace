// Attach-only CDP helper for one isolated AutoByteus instance (never launches a browser).
// node ui.mjs <controlPort> <command> [args...]
//   text [selector]            -> innerText of selector (default body), truncated
//   snap                       -> interactive elements (tag, data-test, text, aria) as JSON lines
//   click-text <text> [nth]    -> click the nth visible element whose text matches exactly/contains
//   click <selector>           -> click selector
//   fill <selector> <value>    -> fill an input/textarea
//   press <selector> <key>     -> press key in selector
//   eval <js expression>       -> page.evaluate result as JSON
//   shot <file>                -> viewport screenshot
//   url                        -> current URL
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [port, cmd, ...args] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => p.url().includes('/renderer/index.html')) ?? pages[0];
page.on('dialog', (d) => d.accept());
const out = (v) => process.stdout.write(`${typeof v === 'string' ? v : JSON.stringify(v, null, 1)}\n`);
try {
  if (cmd === 'url') out(page.url());
  else if (cmd === 'text') out((await page.locator(args[0] ?? 'body').first().innerText()).slice(0, Number(args[1] ?? 6000)));
  else if (cmd === 'snap') out(await page.evaluate((filter) => [...document.querySelectorAll('button,a,input,textarea,select,[role=button],[role=tab],[role=treeitem],[data-test]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((e) => `${e.tagName.toLowerCase()} dt=${e.getAttribute('data-test') ?? ''} ${e.getAttribute('aria-label') ? `aria=${e.getAttribute('aria-label')} ` : ''}${e.getAttribute('placeholder') ? `ph=${e.getAttribute('placeholder')} ` : ''}| ${(e.innerText ?? e.value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)}`)
    .filter((l) => !filter || l.toLowerCase().includes(filter.toLowerCase())).slice(0, 300).join('\n'), args[0] ?? ''));
  else if (cmd === 'click-text') { const loc = page.getByText(args[0], { exact: args[2] !== 'loose' }); await loc.nth(Number(args[1] ?? 0)).click({ timeout: 10000 }); out('clicked'); }
  else if (cmd === 'click') { await page.locator(args[0]).first().click({ timeout: 10000 }); out('clicked'); }
  else if (cmd === 'fill') { await page.locator(args[0]).first().fill(args[1], { timeout: 10000 }); out('filled'); }
  else if (cmd === 'press') { await page.locator(args[0]).first().press(args[1], { timeout: 10000 }); out('pressed'); }
  else if (cmd === 'eval') out(await page.evaluate(args[0]));
  else if (cmd === 'shot') { await page.screenshot({ path: args[0] }); out(args[0]); }
  else throw new Error(`unknown command ${cmd}`);
} catch (error) { out(`ERROR: ${error.message.split('\n').slice(0, 6).join(' | ')}`); process.exit(1); }
// Never close the attached app: just drop the CDP connection by exiting.
process.exit(0);
