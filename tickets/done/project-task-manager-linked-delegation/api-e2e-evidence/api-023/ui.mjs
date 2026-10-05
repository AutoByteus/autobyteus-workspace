// API-REV-023 UI driver: attaches to the owned isolated app window over its control port and runs ONE step
// through the real UI (clicks/typing/keyboard), like a user. No GraphQL/REST/WebSocket calls are made here.
//   node ui.mjs '<async step body using page>' <label>
// The step body gets `page`, `shot(name)`, `log(obj)`. A screenshot is always taken after the step.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const E = 'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-023';
const i = JSON.parse(await fs.readFile(`${E}/instance.json`, 'utf8')).result;
const { chromium } = createRequire(new URL('./autobyteus-web/package.json', `file://${process.cwd()}/`))('playwright-core');
const [body, label = 'step'] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(i.controlEndpoint);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('index.html'));
if (!page) throw new Error('app window not found');
await fs.mkdir(`${E}/ui`, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const shot = async name => { const f = `${E}/ui/${stamp}-${name}.png`; await page.screenshot({ path: f }); return f; };
const out = [];
const log = o => { out.push(o); console.log(typeof o === 'string' ? o : JSON.stringify(o)); };
let ok = true;
try {
  const fn = new Function('page', 'shot', 'log', `return (async () => { ${body} })();`);
  await fn(page, shot, log);
} catch (e) { ok = false; console.log('STEP ERROR:', String(e).slice(0, 800)); }
finally {
  const f = await shot(label);
  console.log('screenshot:', f);
  await fs.appendFile(`${E}/ui-steps.jsonl`, JSON.stringify({ at: new Date().toISOString(), label, ok, body, out, screenshot: f }) + '\n');
  await browser.close();
  process.exitCode = ok ? 0 : 1;
}
