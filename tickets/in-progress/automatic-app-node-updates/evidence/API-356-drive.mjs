// TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
// Runs one page script in an isolated instance's window over its CDP control port and prints the JSON result.
// The script is the body of an async function; it may use `click(selector)`, `text(selector)`, `wait(ms)`,
// `until(fn, ms)` and `go(hash)` (helpers defined below) and window.electronAPI.
// Usage (cwd = the clean checkout root): node API-356-drive.mjs <controlPort> <script.js> [screenshot.png]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const [port, scriptFile, shot] = process.argv.slice(2);
const { chromium } = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'))('playwright-core');
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('index.html'));
const helpers = `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const text = (s) => q(s)?.innerText?.replace(/\\n+/g, ' | ') ?? null;
  const until = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await wait(250); } return null; };
  const click = async (s) => { const el = await until(() => q(s), 15000); if (!el) throw new Error('missing ' + s); el.scrollIntoView({ block: 'center' }); el.click(); return true; };
  const go = async (hash) => { location.hash = hash; await wait(1500); };
`;
const code = fs.readFileSync(scriptFile, 'utf8');
let result;
try { result = await page.evaluate(`(async () => { ${helpers}\n${code} })()`); } catch (e) { result = { error: String(e).slice(0, 500) }; }
console.log(JSON.stringify(result, null, 2));
if (shot) await page.screenshot({ path: shot });
await browser.close().catch(() => undefined);
