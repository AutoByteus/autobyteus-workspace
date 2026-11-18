// API-02 (autobyteus-436, temporary): the phone, paired with a test-owned Docker node over this Mac's Tailscale address,
// opens files by the container's absolute paths (REQ-006, AC-005). Args: <port> <setup-code-file> <outDir>.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [port, codeFile, out] = process.argv.slice(2);
const TS = '100.127.30.107'; const local = `http://127.0.0.1:${port}`; const origin = `http://${TS}:${port}`;
const lines = []; const log = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser, ok = true;
const expect = (c, m) => { log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) ok = false; };
try {
  const code = fs.readFileSync(codeFile, 'utf8').match(/Setup code for [^:]+: (\S+)/)[1];
  const ex = await (await fetch(`${local}/rest/node-access/setup-exchanges`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setupCode: code, desktopName: 'API-02 436 probe' }) })).json();
  const owner = ex.credential; log(`owner credential from the setup code: ${/^own_/.test(owner ?? '') ? 'yes' : 'NO'}`);
  const rest = async (method, route, body, cred = owner) => { const r = await fetch(`${local}/rest${route}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${cred}` }, body: body ? JSON.stringify(body) : undefined }); let b = null; try { b = await r.clone().json(); } catch { b = null; } return { status: r.status, headers: r.headers, body: b, r }; };
  // The route itself, as the owner (API level)
  const get = async (p, cred = owner) => { const r = await fetch(`${local}/rest/node-files/content?path=${encodeURIComponent(p)}`, { headers: { authorization: `Bearer ${cred}` } }); const t = Buffer.from(await r.arrayBuffer()); let code = null; try { code = JSON.parse(t.toString()).code ?? null; } catch {} return { status: r.status, type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), nosniff: r.headers.get('x-content-type-options'), bytes: t.length, code, text: t.toString('utf8', 0, 200) }; };
  const md = await get('/home/autobyteus/shared/ac005-notes.md');
  expect(md.status === 200 && md.text.includes('SHARED-MARKER-436') && md.nosniff === 'nosniff' && !!md.csp, `owner GET shared Markdown: ${md.status} ${md.type} nosniff=${md.nosniff} csp=${md.csp ? 'set' : 'none'}`);
  const pdf = await get('/home/autobyteus/shared/ac005-large.pdf');
  expect(pdf.status === 200 && pdf.bytes === fs.statSync('/tmp/abtest436/shared-host/shared/ac005-large.pdf').size, `owner GET large PDF: ${pdf.status} ${pdf.type} ${pdf.bytes} bytes`);
  const unmounted = await get('/tmp/abtest436/sample/ac005-notes.md');
  expect(unmounted.status === 404 && unmounted.code === 'NODE_FILE_NOT_FOUND', `owner GET a host path not mounted into the container: ${unmounted.status} ${unmounted.code}`);
  const folder = await get('/home/autobyteus/shared/a-folder');
  expect(folder.status === 400 && folder.code === 'NODE_FILE_IS_FOLDER', `owner GET a folder: ${folder.status} ${folder.code}`);
  const sys = await get('/etc/hostname');
  expect(sys.status === 200, `owner GET a container file outside the shared folder (/etc/hostname): ${sys.status}`);
  // The phone: pairing through Phone Access on the Tailscale address
  const settings = await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const session = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'tailscale', serverBaseUrl: origin, serverName: 'Docker 436', trustedPrivateHttpAcknowledged: true });
  log(`phone access ${settings.status}; pairing session ${session.status}`);
  if (session.status !== 201) { log(JSON.stringify(session.body).slice(0, 300)); throw new Error('pairing session'); }
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(session.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60000 });
  // A node without runs shows its empty list ('No runs yet'), not the run tree.
  await page.getByText('Connected', { exact: true }).first().waitFor({ timeout: 60000 });
  log(`phone paired at ${new URL(page.url()).origin} (the container's node over Tailscale)`);
  const open = async (label, p, check, timeout = 30000) => {
    const u = new URL(page.url()); u.search = ''; u.searchParams.set('screen', 'files'); u.searchParams.set('nodeFile', p);
    const t0 = Date.now(); await page.goto(u.toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="mobile-file-viewer"]').waitFor({ timeout });
    let result = null; const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { result = await check(); if (result?.done) break; await sleep(200); }
    result.ms = Date.now() - t0; await page.screenshot({ path: path.join(out, `API-02-phone-${label}.png`) });
    return result;
  };
  const viewerText = () => page.locator('[data-testid="mobile-file-viewer"]').innerText().catch(() => '');
  const r1 = await open('shared-markdown', '/home/autobyteus/shared/ac005-notes.md', async () => { const t = await viewerText(); return { done: t.includes('SHARED-MARKER-436'), text: t.slice(0, 160) }; });
  expect(r1.done, `phone opens /home/autobyteus/shared/ac005-notes.md: ${JSON.stringify(r1.text)} (${r1.ms} ms)`);
  const r2 = await open('shared-image', '/home/autobyteus/shared/ac005-picture.png', async () => { const w = await page.locator('[data-testid="mobile-file-viewer"] img').evaluateAll(els => els.map(e => e.naturalWidth)); return { done: w.includes(120), widths: w }; });
  expect(r2.done, `phone shows /home/autobyteus/shared/ac005-picture.png: img naturalWidth ${JSON.stringify(r2.widths)} (${r2.ms} ms)`);
  const r3 = await open('shared-large-pdf', '/home/autobyteus/shared/ac005-large.pdf', async () => { const s = await page.evaluate(() => { const v = document.querySelector('[data-testid="mobile-file-viewer"]'); const c = [...(v?.querySelectorAll('canvas') ?? [])]; return { canvases: c.length, drawn: c.some(x => x.width > 0 && x.height > 0), error: v?.querySelector('[role="alert"]')?.textContent ?? null }; }); return { done: s.drawn || !!s.error, ...s }; }, 90000);
  expect(r3.drawn && !r3.error, `phone renders the 18 MB PDF: ${JSON.stringify(r3)}`);
  const r4 = await open('unmounted-host-path', '/tmp/abtest436/sample/ac005-notes.md', async () => { const t = await page.locator('[data-testid="mobile-file-preview-error"]').innerText().catch(() => ''); return { done: !!t, text: t }; });
  expect(r4.text === 'This file was not found on the computer.', `phone, a host path not mounted into the container: ${JSON.stringify(r4.text)}`);
  const r5 = await open('folder', '/home/autobyteus/shared/a-folder', async () => { const t = await page.locator('[data-testid="mobile-file-preview-error"]').innerText().catch(() => ''); return { done: !!t, text: t }; });
  expect(r5.text === 'This path is a folder, not a file.', `phone, a folder: ${JSON.stringify(r5.text)}`);
  const unexpected = errors.filter(e => !/status of (404|400)|favicon|401 \(Unauthorized\)/.test(e));
  log(`phone console errors: ${errors.length} (${JSON.stringify(errors.slice(0, 6))}); unexpected: ${unexpected.length}`);
} catch (e) { ok = false; log('ERROR', e.stack); }
finally { if (browser) await browser.close(); log(`result ${ok ? 'Pass' : 'Fail'}`); fs.writeFileSync(path.join(out, 'API-02-phone-docker.log'), lines.join('\n').replace(/own_[A-Za-z0-9_-]{20,}/g, 'own_…').replace(/mra_[A-Za-z0-9_-]{20,}/g, 'mra_…') + '\n'); process.exitCode = ok ? 0 : 1; }
