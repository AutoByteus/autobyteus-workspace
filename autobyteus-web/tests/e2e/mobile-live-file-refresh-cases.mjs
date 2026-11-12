// An open file viewer shows a workspace file's new content by itself when the file changes on disk, in any folder
// (autobyteus-452). Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after all its
// other cases (`--cases=MSP-39,MSP-40,MSP-41,MSP-42` runs only these).
//
// On alpha (the node of the probe's desktop window), in a folder of its workspace that no window ever expands
// (`live-452/`), with test files only: a run whose message links `deep/inner/a.md`, `pics/c.png`, `docs/d.pdf` and a root
// image. The desktop window (`nuxt dev`) and a phone of these cases (the production bundle alpha serves at /mobile, a
// headless Chrome mapping 192.168.77.60 to 127.0.0.1, paired through Phone Access) open them from those links and leave
// them open; then the files change on disk. Each surface's GraphQL and content reads and its file-explorer stream frames
// are recorded.
//
// Cases:
//   MSP-39 AC-001  `deep/inner/a.md` open on both: rewritten in place, atomically with a temp file in the same folder, and
//                  atomically with a temp file in another folder (the watcher's move): each version shown on both surfaces
//                  within 3 s; the folder is never read (it stays unexpanded).
//   MSP-40 AC-002  `pics/c.png` (40×20 → 80×30), `docs/d.pdf` (page 200×100 → 400×100) and a root image (30×30 → 60×20),
//                  each open on both and rewritten: the new size / page shape shown within 3 s.
//   MSP-41 AC-003, AC-004  The desktop window edits `notes/edit.md` (opened from the Files tab): an unsaved edit survives an
//                  outside rewrite; the window's own save writes once and causes no loop (at most the one read-back of the
//                  watcher's report, as before this change, and no further write).
//   MSP-42 AC-004, RSK-001  20 files that are not open are rewritten: no content and no folder read on either surface; then
//                  200 files in an unexpanded folder are rewritten at once: the stream frames and `modify` entries each
//                  surface receives are counted (every path reported), still with no read.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { attachToBrowserContext } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const PHONE_HOST = '192.168.77.60';
const DIR = 'live-452';

const png = (width, height) => {
  const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(body) >>> 0); return Buffer.concat([l, body, c]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x60)]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
};
const pdf = (text, width, height) => {
  const stream = `BT /F1 18 Tf 10 ${Math.round(height / 2)} Td (${text}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => { const at = out.length; out += `${index + 1} 0 obj\n${object}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(at => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
};

/**
 * @param probe the probe's helpers: `runCase`, `chromium`, `executablePath`, `outputDir`, `evidence`, `selected`, `sleep`,
 *   `waitFor`, `assert`, `redact`, `browser`, `alpha`, `stack`, `desktopRunsView`.
 */
export const runLiveFileRefreshCases = async (probe) => {
  const { runCase, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView } = probe;
  const ids = ['MSP-39', 'MSP-40', 'MSP-41', 'MSP-42'];
  if (selected && !ids.some(id => selected.has(id))) return;
  let currentCase = 'live-refresh-setup';
  const ws = stack.workspace;
  const rel = name => `${DIR}/${name}`;
  const abs = name => path.join(ws, DIR, name);
  const file = { a: 'deep/inner/a.md', c: 'pics/c.png', d: 'docs/d.pdf', edit: 'notes/edit.md' };
  const rootImage = 'live452-root.png';
  const bulk = Array.from({ length: 20 }, (_, i) => `bulk/b${String(i).padStart(2, '0')}.md`);
  const burst = Array.from({ length: 200 }, (_, i) => `burst/s${String(i).padStart(3, '0')}.md`);
  for (const name of [...Object.values(file), ...bulk, ...burst, 'elsewhere/keep.md']) await fs.mkdir(path.dirname(abs(name)), { recursive: true });
  await fs.writeFile(abs(file.a), 'A-VERSION-1\n');
  await fs.writeFile(abs(file.c), png(40, 20));
  await fs.writeFile(abs(file.d), pdf('D VERSION 1', 200, 100));
  await fs.writeFile(abs(file.edit), '# Edit\n\nEDIT-VERSION-1\n');
  await fs.writeFile(abs('elsewhere/keep.md'), 'keep\n');
  await fs.writeFile(path.join(ws, rootImage), png(30, 30));
  for (const name of [...bulk, ...burst]) await fs.writeFile(abs(name), `${name} v1\n`);
  await sleep(1_500);

  // A run whose message links the files (as the agent writes links in its answer).
  const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
  assert(created.success, created.message);
  const run = created.runId;
  const links = [[file.a, abs(file.a)], [file.c, abs(file.c)], [file.d, abs(file.d)], [rootImage, path.join(ws, rootImage)]];
  await stack.agentSay(run, `ECHO_INPUT LIVE-452 ${links.map(([name, target]) => `[${path.basename(name)}](${target})`).join(' ')}`);
  await waitFor('the links message', async () => { const text = await stack.projection(run); return text.includes('ECHO:') && text.includes('LIVE-452'); }, 60_000);
  evidence.liveFileRefresh = { run };

  /** Records a surface's reads (text content, media content, folder children, saves) and its file-explorer stream frames. */
  const record = (context, page, label, origin) => {
    const surface = { label, page, reads: [], frames: [] };
    context.on('request', (request) => {
      const url = request.url();
      if (url.includes('/graphql') && request.method() === 'POST') {
        try { const body = JSON.parse(request.postData() ?? '{}'); const op = body.operationName ?? null; const v = body.variables ?? {};
          if (['GetFileContent', 'GetFolderChildren', 'WriteFileContent'].includes(op)) surface.reads.push({ at: Date.now(), op, path: v.filePath ?? v.folderPath ?? null }); } catch { /* not JSON */ }
      } else if (/\/rest\/workspaces\/[^/]+\/content\?path=/.test(url)) {
        surface.reads.push({ at: Date.now(), op: 'content', path: decodeURIComponent(new URL(url).searchParams.get('path') ?? '') });
      }
    });
    page.on('websocket', (socket) => { if (!socket.url().includes('/ws/file-explorer/')) return;
      socket.on('framereceived', ({ payload }) => { const text = String(payload); surface.frames.push({ at: Date.now(), bytes: text.length, paths: [...text.matchAll(/"type":"modify","path":"([^"]+)"/g)].map(m => m[1]), text: text.length < 4_000 ? text : null }); }); });
    const browserLine = (text, sourceUrl = '') => {
      const line = redact(`${label} console: ${text}`);
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(line) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      evidence.browserErrors.push({ case: currentCase, line, known: favicon, ...(favicon ? { cause: 'the browser\'s favicon request at the origin root (/favicon.ico)' } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') browserLine(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => browserLine(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: currentCase, label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
    return surface;
  };
  const readsOf = (surface, from, test = () => true) => surface.reads.filter(r => r.at >= from && test(r));
  /** What a viewer shows: text, image size, the PDF canvas's shape. */
  const viewerState = viewer => viewer.evaluate((el) => {
    const img = el.querySelector('img'); const canvas = el.querySelector('canvas');
    return { text: el.innerText.replace(/\s+/g, ' ').slice(0, 300), image: img && img.complete ? [img.naturalWidth, img.naturalHeight] : null,
      pdfRatio: canvas && canvas.height ? Math.round((canvas.width / canvas.height) * 10) / 10 : null };
  }).catch(() => null);
  /** Milliseconds until `test(viewerState)` on each surface, or null after `timeoutMs`. */
  const shownWithin = async (surfaces, test, timeoutMs = 6_000) => {
    const from = Date.now(); const out = {};
    await Promise.all(surfaces.map(async (s) => {
      out[s.label] = null;
      while (Date.now() - from < timeoutMs) { const state = await viewerState(s.viewer()); if (state && test(state)) { out[s.label] = Date.now() - from; return; } await sleep(100); }
    }));
    return out;
  };

  // ---- the desktop window ---------------------------------------------------------------------------------------------
  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await attachToBrowserContext(deskContext);
  await deskContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const deskPage = await deskContext.newPage();
  const desk = record(deskContext, deskPage, 'desktop', stack.frontendUrl);
  desk.viewer = () => deskPage.locator('#contentViewer:visible').first();
  // ---- the phone ------------------------------------------------------------------------------------------------------
  const phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const phoneOrigin = `http://${PHONE_HOST}:${alpha.port}`;
  try {
    await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
    await deskPage.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(3_000);
    await deskPage.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(deskPage);
    const showOlder = deskPage.locator('[data-test="run-list-show-older"]');
    if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
    await deskPage.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
    const deskLink = target => deskPage.locator(`[data-event-monitor-file-action-control="true"][title="${target}"]`).last();
    await deskLink(abs(file.a)).waitFor({ timeout: 60_000 });

    const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'alpha Phone Access on', settings);
    const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Alpha Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'alpha pairing session for the live-refresh phone', pairing.status);
    const phoneContext = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
    const phonePage = await phoneContext.newPage();
    const phone = record(phoneContext, phonePage, 'phone-live', phoneOrigin);
    phone.viewer = () => phonePage.locator('[data-testid="mobile-file-viewer"]');
    await phonePage.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await phonePage.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await phonePage.locator(`[data-testid="mobile-run-row-agent:${run}"] [data-testid="mobile-run-open"]`).click({ timeout: 60_000 });
    const conv = phonePage.locator('[data-testid="mobile-run-conversation"]');
    const phoneLink = target => conv.locator(`[data-event-monitor-file-action-control="true"][title="${target}"]`).last();
    await phoneLink(abs(file.a)).waitFor({ timeout: 60_000 });
    /** Opens a file from its link on both surfaces and waits until both show `ready`. */
    const openOnBoth = async (target, ready) => {
      if (await phone.viewer().count()) { await phonePage.goBack(); await waitFor('the phone conversation', async () => (await phone.viewer().count()) === 0, 10_000); }
      await deskLink(target).scrollIntoViewIfNeeded(); await deskLink(target).click();
      await phoneLink(target).scrollIntoViewIfNeeded(); await phoneLink(target).tap();
      const shown = await shownWithin([desk, phone], ready, 20_000);
      assert(shown.desktop !== null && shown['phone-live'] !== null, `${path.basename(target)} opened on both surfaces`, { shown, desktop: await viewerState(desk.viewer()), phone: await viewerState(phone.viewer()) });
      await sleep(1_500);
    };
    const folderReads = from => [desk, phone].map(s => readsOf(s, from, r => r.op === 'GetFolderChildren' && String(r.path).startsWith(DIR)).length).reduce((a, b) => a + b, 0);
    const setupFrom = Date.now();

    await runCase('MSP-39', async () => {
      currentCase = 'MSP-39';
      await openOnBoth(abs(file.a), s => s.text.includes('A-VERSION-1'));
      const rewrites = {
        inPlace: async () => fs.writeFile(abs(file.a), 'A-VERSION-2\n'),
        atomicSameFolder: async () => { await fs.writeFile(`${abs(file.a)}.tmp`, 'A-VERSION-3\n'); await fs.rename(`${abs(file.a)}.tmp`, abs(file.a)); },
        atomicOtherFolder: async () => { await fs.writeFile(abs('elsewhere/a.md.tmp'), 'A-VERSION-4\n'); await fs.rename(abs('elsewhere/a.md.tmp'), abs(file.a)); },
      };
      const results = {};
      let version = 2;
      for (const [name, rewrite] of Object.entries(rewrites)) {
        const from = Date.now();
        await rewrite();
        const want = `A-VERSION-${version}`;
        results[name] = { shownMs: await shownWithin([desk, phone], s => s.text.includes(want)), version: want };
        await sleep(1_000);
        results[name].reads = { desktop: readsOf(desk, from, r => r.path === rel(file.a) && r.op === 'GetFileContent').length, phone: readsOf(phone, from, r => r.path === rel(file.a) && r.op === 'GetFileContent').length };
        await sleep(1_500);
        version += 1;
      }
      await deskPage.screenshot({ path: path.join(outputDir, 'MSP-39-desktop-a.png') });
      await phonePage.screenshot({ path: path.join(outputDir, 'MSP-39-phone-a.png') });
      const details = { results, folderReadsOfLive452: folderReads(setupFrom) };
      assert(Object.values(results).every(r => r.shownMs.desktop !== null && r.shownMs.desktop <= 3_000 && r.shownMs['phone-live'] !== null && r.shownMs['phone-live'] <= 3_000),
        'each rewrite (in place, atomic in the folder, atomic from another folder) shown on both surfaces within 3 s (AC-001)', details);
      assert(details.folderReadsOfLive452 === 0, 'the folder stayed unexpanded: never read', details);
      return details;
    });

    await runCase('MSP-40', async () => {
      currentCase = 'MSP-40';
      const results = {};
      const media = [
        ['image', abs(file.c), s => s.image?.[0] === 40, () => fs.writeFile(abs(file.c), png(80, 30)), s => s.image?.[0] === 80 && s.image?.[1] === 30],
        // The page's shape (width / height of the rendered canvas, rounded): 2 for 200×100, 4 for 400×100.
        ['pdf', abs(file.d), s => s.pdfRatio !== null && s.pdfRatio <= 2.5, () => fs.writeFile(abs(file.d), pdf('D VERSION 2', 400, 100)), s => s.pdfRatio !== null && s.pdfRatio >= 3.5],
        ['rootImage', path.join(ws, rootImage), s => s.image?.[0] === 30, () => fs.writeFile(path.join(ws, rootImage), png(60, 20)), s => s.image?.[0] === 60 && s.image?.[1] === 20],
      ];
      for (const [name, target, before, rewrite, after] of media) {
        await openOnBoth(target, before);
        const from = Date.now();
        await rewrite();
        results[name] = { shownMs: await shownWithin([desk, phone], after), desktop: await viewerState(desk.viewer()), phone: await viewerState(phone.viewer()) };
        for (const key of ['desktop', 'phone']) if (results[name][key]) delete results[name][key].text;
        results[name].contentReads = { desktop: readsOf(desk, from, r => r.op === 'content').length, phone: readsOf(phone, from, r => r.op === 'content').length };
        await deskPage.screenshot({ path: path.join(outputDir, `MSP-40-desktop-${name}.png`) });
        await phonePage.screenshot({ path: path.join(outputDir, `MSP-40-phone-${name}.png`) });
      }
      const details = { results, folderReadsOfLive452: folderReads(setupFrom) };
      assert(Object.values(results).every(r => r.shownMs.desktop !== null && r.shownMs.desktop <= 3_000 && r.shownMs['phone-live'] !== null && r.shownMs['phone-live'] <= 3_000),
        'the image\'s new size and the PDF\'s new page shown on both surfaces within 3 s (AC-002)', details);
      return details;
    });

    await runCase('MSP-41', async () => {
      currentCase = 'MSP-41';
      // Open notes/edit.md from the Files tab (editable), in the editor.
      await deskPage.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click();
      const files = deskPage.locator('[data-test="right-side-files-panel"]');
      const treeName = name => files.locator('.file-item span.select-none').filter({ hasText: new RegExp(`^${name.replace(/[.]/g, '\\.')}$`) }).first();
      for (const folder of [DIR, 'notes']) { await treeName(folder).waitFor({ timeout: 30_000 }); await treeName(folder).click(); await sleep(800); }
      await treeName('edit.md').click();
      await waitFor('edit.md in the viewer', async () => ((await viewerState(desk.viewer()))?.text ?? '').includes('EDIT-VERSION-1'), 15_000);
      const toggle = (await deskPage.evaluate(() => [...document.querySelectorAll('[title="Edit Mode"]')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, inView: r.width > 0 && r.top < innerHeight }; }))).find(t => t.inView);
      assert(toggle, 'the edit toggle of the open file');
      await deskPage.mouse.click(toggle.x, toggle.y);
      const editor = deskPage.locator('#contentViewer:visible .monaco-editor .view-lines').first();
      await editor.waitFor({ timeout: 30_000 });
      await editor.click();
      await deskPage.keyboard.press('ControlOrMeta+End');
      await deskPage.keyboard.type(' UNSAVED-452');
      await sleep(500);
      const rewriteFrom = Date.now();
      await fs.writeFile(abs(file.edit), '# Edit\n\nEDIT-VERSION-2 rewritten outside.\n');
      await sleep(4_000);
      const editorAfterRewrite = (await editor.innerText()).replace(/\s+/g, ' ');
      const readsAfterRewrite = readsOf(desk, rewriteFrom, r => r.op === 'GetFileContent' && r.path === rel(file.edit)).length;
      // The window's own save.
      await editor.click();
      const saveFrom = Date.now();
      await deskPage.keyboard.press('ControlOrMeta+s');
      await sleep(6_000);
      const writes = readsOf(desk, saveFrom, r => r.op === 'WriteFileContent');
      const readsAfterSave = readsOf(desk, saveFrom, r => r.op === 'GetFileContent' && r.path === rel(file.edit)).length;
      const onDisk = await fs.readFile(abs(file.edit), 'utf8');
      await deskPage.screenshot({ path: path.join(outputDir, 'MSP-41-desktop-edit.png') });
      const details = { editKeptAfterRewrite: editorAfterRewrite.includes('UNSAVED-452'), readsAfterRewrite, writes: writes.map(w => w.path), readsAfterSave, savedToDisk: onDisk.includes('UNSAVED-452'), editorAfterRewrite: editorAfterRewrite.slice(0, 160) };
      assert(details.editKeptAfterRewrite, 'the unsaved edit survives the outside rewrite (AC-003)', details);
      assert(writes.length === 1 && details.savedToDisk, 'one save, written to disk (AC-004)', details);
      // As before this change, the save's own result consumes the window's mark and the watcher's report of the same write
      // reads the file once (base `fileExplorerTreeActions`: `filesToIgnoreNextModify`, then `invalidateFileContent`); a loop
      // would be repeated reads or writes.
      assert(readsAfterSave <= 1, 'no reload loop after the own save: at most the one read-back, no further write (AC-004)', details);
      return details;
    });

    await runCase('MSP-42', async () => {
      currentCase = 'MSP-42';
      // 20 files that are not open.
      const bulkFrom = Date.now();
      for (const name of bulk) await fs.writeFile(abs(name), `${name} v2\n`);
      await sleep(6_000);
      const bulkReads = Object.fromEntries([desk, phone].map(s => [s.label, readsOf(s, bulkFrom, r => String(r.path).startsWith(rel('bulk')) || (r.op === 'GetFolderChildren' && String(r.path).startsWith(DIR))).length]));
      const bulkReported = Object.fromEntries([desk, phone].map(s => [s.label, new Set(s.frames.filter(f => f.at >= bulkFrom).flatMap(f => f.paths).filter(p => p.startsWith(rel('bulk')))).size]));
      // RSK-001: 200 changes at once in an unexpanded folder.
      const burstFrom = Date.now();
      await Promise.all(burst.map(name => fs.writeFile(abs(name), `${name} v2\n`)));
      await sleep(12_000);
      const burstStream = Object.fromEntries([desk, phone].map((s) => {
        const frames = s.frames.filter(f => f.at >= burstFrom);
        const paths = frames.flatMap(f => f.paths).filter(p => p.startsWith(rel('burst')));
        return [s.label, { frames: frames.length, bytes: frames.reduce((n, f) => n + f.bytes, 0), modifyEntries: paths.length, uniquePaths: new Set(paths).size,
          spreadMs: frames.length ? frames.at(-1).at - frames[0].at : null }];
      }));
      const burstReads = Object.fromEntries([desk, phone].map(s => [s.label, readsOf(s, burstFrom, r => String(r.path).startsWith(rel('burst')) || (r.op === 'GetFolderChildren' && String(r.path).startsWith(DIR))).length]));
      const sample = desk.frames.find(f => f.at >= bulkFrom && f.paths.length)?.text ?? null;
      const details = { bulk: { files: bulk.length, reads: bulkReads, reportedPaths: bulkReported }, burst: { files: burst.length, stream: burstStream, reads: burstReads }, sampleFrame: sample };
      assert(Object.values(bulkReads).every(n => n === 0) && Object.values(burstReads).every(n => n === 0), 'no content or folder read for files that are not open (AC-004, QR-002)', details);
      assert(bulkReported.desktop === 20 && burstStream.desktop.uniquePaths === 200, 'every changed path reaches the desktop window', details);
      return details;
    });
    await phoneContext.close().catch(() => undefined);
  } finally {
    await deskContext.close().catch(() => undefined);
    await phoneBrowser.close().catch(() => undefined);
  }
};
