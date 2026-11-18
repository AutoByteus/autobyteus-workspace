// autobyteus-525 API/E2E API-09 (temporary, ticket-owned): the desktop renderer's page start (plugin 06 desktop branch).
// Starts `pnpm dev` of this worktree on a free port (no node needed: the font owner runs before any node call), opens the
// desktop page `/` in headless Chrome at 1440×1000 and reads the root font size, `data-*` attributes and whether any
// "On this phone" control exists, for: no stored choice; a stale phone step in this origin's storage (must not matter on
// the desktop); Display font size Large and Extra large. Writes <out>/API-09-desktop.json and screenshots; stops the server.
import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net'; import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const WEB = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/autobyteus-web';
const require = createRequire(`${WEB}/package.json`); const { chromium } = require('playwright-core');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const base = `http://127.0.0.1:${port}`;
const log = fs.createWriteStream(path.join('/tmp/abtest525', 'API-09-dev.log'));
const dev = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(port)], { cwd: WEB, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: 'http://127.0.0.1:9' } });
dev.stdout.pipe(log); dev.stderr.pipe(log);
const result = { base: 'http://127.0.0.1:<free port>', cases: {} };
let browser;
try {
  for (let i = 0; i < 480 && !(await fetch(base).then(r => r.ok).catch(() => false)); i++) await sleep(1000);
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const read = async (name, storage) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
    await context.addInitScript((s) => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
    const page = await context.newPage();
    // A cold dev server re-optimizes and reloads (TESTING.md § Browser probes): warm up, then read.
    await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined); await sleep(3000);
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 240_000 }); await sleep(4000);
    const r = await page.evaluate(() => { const de = document.documentElement; return { path: location.pathname, root: getComputedStyle(de).fontSize, rootStyle: de.style.fontSize,
      phoneAttr: de.getAttribute('data-phone-text-size'), dataAttrs: [...de.attributes].filter(a => a.name.startsWith('data-')).map(a => `${a.name}=${a.value}`),
      appVars: ['--app-editor-font-size', '--app-terminal-font-size'].map(v => `${v}: ${getComputedStyle(de).getPropertyValue(v).trim()}`),
      onThisPhone: document.querySelectorAll('[data-testid^="mobile-on-this-phone"]').length, phoneShell: Boolean(document.querySelector('[data-testid="mobile-remote-access-shell"]')) }; });
    await page.screenshot({ path: path.join(out, `API-09-${name}.png`) });
    result.cases[name] = { storage, ...r };
    await context.close();
  };
  await read('no-choice', {});
  await read('stale-phone-step', { 'autobyteus.phone.textSize': 'largest' });
  await read('display-large', { 'autobyteus.display.app-font-size': 'large', 'autobyteus.phone.textSize': 'small' });
  await read('display-extra-large', { 'autobyteus.display.app-font-size': 'extra-large' });
} catch (e) { result.error = e.message; }
finally {
  if (browser) await browser.close();
  try { process.kill(-dev.pid, 'SIGTERM'); } catch { /* gone */ }
  await sleep(3000); try { process.kill(-dev.pid, 'SIGKILL'); } catch { /* gone */ }
  result.devServerStopped = true;
  fs.writeFileSync(path.join(out, 'API-09-desktop.json'), JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result, null, 1));
}
