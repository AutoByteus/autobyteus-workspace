// API-06 (autobyteus-471 round 2, temporary): a phone paired with test-owned Docker node A over this Mac's Tailscale address
// (Phone Access, the phone bundle A serves) opens the run A delegated to host-b-471 and taps the path its own message links,
// then the path a message attaches. Expected (REQ-003, AC-003): "This file is on host-b-471, where this run runs.", no viewer,
// no node-file request, Back stays in the conversation. Reads /tmp/abtest471/state.json (the probe's credential, never
// printed). Arg: <outDir>.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471';
const require = createRequire(`${W}/autobyteus-web/package.json`); const { chromium } = require('playwright-core');
const out = process.argv[2]; const TS = '100.127.30.107'; const NOTICE = 'This file is on host-b-471, where this run runs.';
const s = JSON.parse(fs.readFileSync('/tmp/abtest471/state.json', 'utf8'));
const lines = []; let ok = true; const redact = t => String(t).split(s.owner).join('own_…').replace(/\b(own|mra)_[A-Za-z0-9_-]{20,}/g, '$1_…').replace(/access_token=[^&\s"']+/g, 'access_token=…').replace(/pairing=[^&\s"']+/g, 'pairing=…');
const log = (...a) => { const l = redact(a.join(' ')); lines.push(l); console.log(l); };
const expect = (c, m) => { log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) ok = false; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const local = `http://127.0.0.1:${s.pA}`, origin = `http://${TS}:${s.pA}`;
const rest = (m, r, b) => fetch(`${local}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${s.owner}` }, body: JSON.stringify(b) }).then(async x => ({ status: x.status, body: await x.json().catch(() => null) }));
let browser;
try {
  log(`# API-06 phone, remote run; commit ${require('node:child_process').execFileSync('git', ['-C', W, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}; ${new Date().toISOString()}`);
  log(`node A at ${origin} (Tailscale publishing), run ${s.run}, remote run ${s.remoteRun} on ${s.peer}`);
  expect((await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true })).status === 200, 'Phone Access on for A');
  const ps = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'tailscale', serverBaseUrl: origin, serverName: 'Docker 471', trustedPrivateHttpAcknowledged: true });
  expect(ps.status === 201 && !!ps.body?.mobileUrl, `pairing session ${ps.status}`);
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
  const page = await context.newPage();
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(`${m.text().slice(0, 120)} @ ${redact(new URL(m.location()?.url || 'about:blank').pathname)}`); });
  const refused = []; context.on('response', r => { if (r.status() === 401) { const u = new URL(r.url()); refused.push({ path: u.pathname, ws: u.protocol.startsWith('ws'), paired: pairedAt !== null, msAfterPair: pairedAt === null ? null : Date.now() - pairedAt }); } });
  let pairedAt = null;
  const nodeFileRequests = []; context.on('request', q => { if (new URL(q.url()).pathname.includes('/rest/node-files/')) nodeFileRequests.push(new URL(q.url()).host); });
  await page.goto(ps.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60000 }); pairedAt = Date.now();
  const hostKey = `agent:${s.run}`, remoteKey = `${hostKey}/agent:${s.remoteRun}`;
  const host = page.locator(`[data-testid="mobile-run-row-${hostKey}"]`);
  await host.waitFor({ timeout: 60000 });
  log(`phone paired at ${new URL(page.url()).origin}; A's run is listed`);
  if ((await host.getAttribute('aria-expanded')) === 'false') await host.locator('[data-testid="mobile-run-toggle"]').first().click();
  const remoteOpen = page.locator(`[data-testid="mobile-run-row-${remoteKey}"] [data-testid="mobile-run-open"]`);
  await remoteOpen.waitFor({ timeout: 30000 }); await remoteOpen.click();
  const conv = page.locator('[data-testid="mobile-run-conversation"]');
  for (let i = 0; i < 60 && !(await conv.innerText().catch(() => '')).includes('REMOTE-PATH-471'); i++) await sleep(500);
  expect((await conv.innerText().catch(() => '')).includes('REMOTE-PATH-471'), 'the remote run\'s conversation is open on the phone');
  await page.screenshot({ path: path.join(out, 'API-06-remote-run.png') });
  const viewer = page.locator('[data-testid="mobile-file-viewer"]');
  const shown = async () => ({
    toast: (await page.locator('[data-testid="toast-container"]').innerText({ timeout: 300 }).catch(() => '')).trim(),
    status: (await page.locator('[data-testid="event-monitor-file-preview-status"]').innerText({ timeout: 300 }).catch(() => '')).trim(),
  });
  const tap = async (label, control) => {
    const before = nodeFileRequests.length;
    await control.scrollIntoViewIfNeeded(); await control.tap();
    let r = { toast: '', status: '' }; const end = Date.now() + 8000;
    while (Date.now() < end) { r = await shown(); if (r.toast.includes(NOTICE) || r.status.includes(NOTICE)) break; await sleep(200); }
    await page.screenshot({ path: path.join(out, `API-06-${label}.png`) });
    r.viewerOpened = (await viewer.count()) > 0; r.stillOnConversation = await conv.isVisible().catch(() => false);
    r.nodeFileRequests = nodeFileRequests.slice(before); r.nodeFileQuery = new URL(page.url()).searchParams.get('nodeFile');
    return r;
  };
  const link = await tap('link', conv.locator(`[data-event-monitor-file-action-control="true"][title="${s.bNotes}"]`).last());
  log(`link tap: ${JSON.stringify(link)}`);
  expect((link.toast.includes(NOTICE) || link.status.includes(NOTICE)) && !link.viewerOpened && link.stillOnConversation && link.nodeFileRequests.length === 0 && !link.nodeFileQuery,
    `phone link in a remote run says "${NOTICE}", opens nothing, reads nothing (AC-003)`);
  await sleep(4500);
  const chip = conv.locator('button.message-attachment-chip').filter({ hasText: 'b-notes-471.txt' }).last();
  const attachment = await tap('attachment', chip);
  log(`attachment tap: ${JSON.stringify(attachment)}`);
  expect((attachment.toast.includes(NOTICE) || attachment.status.includes(NOTICE)) && !attachment.viewerOpened && attachment.stillOnConversation && attachment.nodeFileRequests.length === 0,
    `phone path attachment in a remote run says "${NOTICE}", opens nothing, reads nothing (AC-003)`);
  const oldText = (await page.locator('body').innerText()).includes("open the run in that node's window");
  expect(!oldText && !(await page.locator('body').innerText()).includes('host workspace'), 'no autobyteus-278 text, no "host workspace" text');
  log(`phone console errors: ${errors.length} ${JSON.stringify(errors.slice(0, 5))}`);
  log(`401 responses (path, after the Pair click?): ${JSON.stringify(refused)}`);
} catch (e) { ok = false; log('ERROR', e.stack); }
finally { if (browser) await browser.close(); log(`result ${ok ? 'Pass' : 'Fail'}`); fs.writeFileSync(path.join(out, 'API-06-phone-remote-run.log'), lines.join('\n') + '\n'); process.exitCode = ok ? 0 : 1; }
