// Context-file size limits, progress, cancel and interruption on the phone (autobyteus-workspace-6). Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after its other cases
// (`--cases=MSP-53,MSP-54,MSP-55` runs only these).
//
// Stack (owned by these cases, removed at their end, inside the probe's temp root):
// - `eta`, one more node from this worktree's `autobyteus-server-ts/dist/app.js` with the probe's owner credential and
//   the scripted AGY CLI, default limits (audio/video 2048 MiB, other 25 MiB). One "Size Checker" run.
// - A phone on the production phone bundle eta serves at /mobile, in a headless Chrome of its own that maps
//   192.168.77.40 to 127.0.0.1, paired through Phone Access, 390×844, UI language zh-CN (the stored language preference).
//   Every request, its status and the upload requests are recorded.
//
// Cases:
//   MSP-53 AC-001, AC-015 (client side), REQ-001, REQ-007, REQ-009; ASM-001  A 26 MiB video (above the old 25 MiB limit) on
//                  the default limits: the item shows a percentage while a throttled upload runs and Send is blocked; it
//                  attaches; the page's `File.type` is `video/mp4`; the draft on the node has all 26 MiB; the message is sent
//                  and its final file on the node has all 26 MiB; the agent's input (recorded by the scripted CLI) lists that
//                  file's absolute path under `Reference files:` and the agent opened the whole file (SHA-256 equal).
//   MSP-54 AC-004, AC-005, AC-006, REQ-005, REQ-006  Limits lowered through the node's settings (3 MiB audio/video, 1 MiB
//                  other): a 4 MiB video and a 2 MiB PDF are refused before any upload request, as two zh-CN lines (one per
//                  limit, each naming its file and limit); the same pick after the limits were raised (no reload) attaches the
//                  video; with the node's limit lowered again and the phone's read of the limits answered stale (a route
//                  answer for that one read, the limit as it was before), the file is sent and the node's 413 shows the same
//                  zh-CN line with the node's limit; no draft is left on the node.
//   MSP-55 AC-007, AC-008, REQ-007, REQ-008  Cancel mid-upload (paced by the forwarder): no message, the item is gone, no draft file on the
//                  node, Send usable; the link reset mid-upload (a TCP forwarder in front of the node drops every connection): the zh-CN interrupted line, no
//                  draft file on the node, Send usable after the network returns.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ownerSocketUrl } from './fixtures/probe-node-access.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import net from 'node:net';

const PHONE_HOST = '192.168.77.40';
const MODEL = 'gemini-3.8-flash-low';
const MiB = 1024 * 1024;
const VIDEO_KEY = 'AUTOBYTEUS_CONTEXT_FILE_AUDIO_VIDEO_MAX_MB';
const OTHER_KEY = 'AUTOBYTEUS_CONTEXT_FILE_OTHER_MAX_MB';

/** Every regular file under `dir` with its size. */
const filesUnder = async (dir) => {
  const found = [];
  const walk = async (current) => {
    let entries = [];
    try { entries = await fs.readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else found.push({ path: full, size: (await fs.stat(full).catch(() => ({ size: -1 }))).size });
    }
  };
  await walk(dir);
  return found;
};

export const runContextFileSizeCases = async (probe) => {
  const { runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact } = probe;
  const wants = id => !selected || selected.has(id);
  if (!['MSP-53', 'MSP-54', 'MSP-55'].some(wants)) return;
  const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);

  // The scripted AGY CLI's `context_files` case records each raw user input line and opens every absolute path listed as
  // `- /…` under `Reference files:` with view_file, answering `sha256:<hex>` of the whole file and `VIEWED:<count>`.
  const agentInputLog = path.join(outputDir, 'eta-agent-input.log');
  const eta = await serverAt('eta', await freePort(), { AGY_FAKE_CASE: 'context_files', AGY_FAKE_INPUT_LOG: agentInputLog });
  // The phone reaches eta through a TCP forwarder of this case, so that the case can drop the link the way a phone losing
  // its network does: every open connection is reset at once (`sever`), mid-body.
  // It also paces the phone's upload direction (`rate` bytes per second; Chrome's own network throttle does not slow loopback).
  const proxySockets = new Set();
  let rate = Infinity;
  let linkDown = false;
  const proxy = net.createServer((client) => {
    if (linkDown) { client.resetAndDestroy(); return; }
    const upstream = net.connect(eta.port, '127.0.0.1');
    for (const socket of [client, upstream]) { proxySockets.add(socket); socket.on('close', () => proxySockets.delete(socket)); socket.on('error', () => socket.destroy()); }
    client.on('data', (chunk) => {
      upstream.write(chunk);
      if (rate !== Infinity) { client.pause(); setTimeout(() => client.resume(), (chunk.length / rate) * 1000); }
    });
    client.on('end', () => upstream.end());
    upstream.pipe(client);
  });
  const proxyPort = await freePort();
  await new Promise(resolve => proxy.listen(proxyPort, '127.0.0.1', resolve));
  // Chrome retries a POST once when a reused connection is reset, so the link stays down (new connections are reset too) until `restore`.
  const sever = () => { linkDown = true; for (const socket of [...proxySockets]) { if (!socket.destroyed) socket.resetAndDestroy(); } };
  const restore = () => { linkDown = false; };
  const phoneOrigin = `http://${PHONE_HOST}:${proxyPort}`;
  const draftDir = path.join(eta.dataDir, 'draft_context_files');
  let phoneBrowser = null;
  let currentCase = 'size-setup';
  try {
    // ---- data ---------------------------------------------------------------------------------------------------------
    const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
    const definition = (await eta.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
      { i: { name: 'Size Checker', role: 'assistant', description: 'size limit probe', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
    const workspace = path.join(eta.dataDir, '..', 'workspace');
    await fs.mkdir(workspace, { recursive: true });
    await eta.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
    const created = (await eta.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: definition, workspaceRootPath: workspace, autoExecuteTools: true, ...agy } })).createAgentRun;
    assert(created.success, created.message);
    const run = created.runId;
    const conversationOf = async () => JSON.stringify((await eta.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: run })).getRunProjection?.conversation ?? []);
    {
      const socket = new WebSocket(ownerSocketUrl(`${eta.baseUrl.replace(/^http/, 'ws')}/ws/agent/${run}`));
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      await sleep(300);
      socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: run, content: 'SIZE-READY-WS6 ready' } }));
      await sleep(600);
      socket.close();
    }
    await waitFor('the first echo', async () => (await conversationOf()).includes('SIZE-READY-WS6'), 60_000);
    // The two settings are predefined (not deletable), so "the defaults" are written back as values: 2048 and 25.
    const setLimits = async (video, other) => {
      for (const [key, value] of [[VIDEO_KEY, video ?? 2048], [OTHER_KEY, other ?? 25]]) {
        assert(/successfully/i.test((await eta.gql('mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}', { k: key, v: String(value) })).updateServerSetting), `setting ${key}=${value}`);
      }
      const limits = (await eta.rest('GET', '/context-files/size-limits')).body;
      assert(limits.audioVideoMaxBytes === (video ?? 2048) * MiB && limits.otherFileMaxBytes === (other ?? 25) * MiB, 'the node reports the limits just set', limits);
      return limits;
    };
    const files = path.join(outputDir, 'msp-53-55-files');
    await fs.mkdir(files, { recursive: true });
    const make = async (name, mib) => { const p = path.join(files, name); await fs.writeFile(p, Buffer.alloc(Math.round(mib * MiB), 5)); return p; };

    // ---- the phone ----------------------------------------------------------------------------------------------------
    phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
    assert((await eta.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true })).status === 200, 'eta Phone Access on');
    const pairing = await eta.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Eta Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'eta pairing session', pairing.status);
    const context = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'zh-CN', timezoneId: 'UTC' });
    await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    const page = await context.newPage();
    // A browser error is known only when it is the case's own refusal (the node's 413 of the upload route in MSP-54) or the
    // browser's own favicon request at the origin root; anything else fails the probe.
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const line = redact(`phone-eta console: ${message.text()}`);
      const sourceUrl = message.location()?.url ?? '';
      const pathname = sourceUrl.startsWith(phoneOrigin) ? new URL(sourceUrl).pathname : '';
      const favicon = /status of 40[14] \((Unauthorized|Not Found)\)$/.test(line) && pathname === '/favicon.ico';
      const refusal = currentCase === 'MSP-54' && /status of 413 \(Payload Too Large\)$/.test(line) && pathname === '/rest/context-files/upload';
      // MSP-55 resets the link on purpose: the browser logs the reset request, and the composer logs the failed upload's
      // technical detail to the console (REQ-006: raw text goes to the console, never to the UI). The same cut can end the
      // request as ERR_CONNECTION_RESET or ERR_SOCKET_NOT_CONNECTED, depending on where Chrome is in it (as the reconnect
      // cases record, mobile-live-reconnect-cases.mjs; autobyteus-609 REQ-G). Any other error still fails the probe.
      const drop = currentCase === 'MSP-55' && (/net::ERR_(CONNECTION_RESET|SOCKET_NOT_CONNECTED)$/.test(line) || /^phone-eta console: Context file upload failed for 'drop-clip\.mp4'/.test(line));
      evidence.browserErrors.push({ case: currentCase, line, known: favicon || refusal || drop,
        ...(favicon ? { cause: 'the browser\'s own favicon request at the origin root (/favicon.ico)' } : refusal ? { cause: 'the node\'s 413 of the stale-limits upload, provoked on purpose' }
          : drop ? { cause: 'the link reset of the interrupted-upload case, provoked on purpose' } : {}) });
    });
    page.on('pageerror', error => evidence.browserErrors.push({ case: currentCase, line: redact(`phone-eta pageerror ${error.message}`), known: false }));
    const net = [];
    const failedRequests = [];
    context.on('requestfailed', request => { if (request.url().startsWith(phoneOrigin)) failedRequests.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText ?? null }); });
    context.on('request', (request) => { if (request.url().startsWith(phoneOrigin)) net.push({ at: Date.now(), method: request.method(), path: new URL(request.url()).pathname, status: null, request }); });
    context.on('response', (response) => { const entry = net.find(e => e.request === response.request()); if (entry) entry.status = response.status(); });
    const uploadsSince = from => net.filter(e => e.at >= from && e.method === 'POST' && e.path === '/rest/context-files/upload');
    const limitReadsSince = from => net.filter(e => e.at >= from && e.path === '/rest/context-files/size-limits');
    await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    const conv = page.locator('[data-testid="mobile-run-conversation"]');
    const key = `agent:${run}`;
    await waitFor(`row ${key}`, async () => (await page.locator(`[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-open"]`).count()) > 0, 30_000);
    await page.locator(`[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-open"]`).click();
    await waitFor('the run screen', async () => (await page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000);
    await waitFor('the conversation', async () => (await conv.innerText().catch(() => '')).includes('SIZE-READY-WS6'), 30_000);
    const throttle = (bytesPerSecond) => { rate = bytesPerSecond; };
    const online = () => { rate = Infinity; };
    const input = conv.locator('input[type="file"]').first();
    const errorLines = async () => (await conv.locator('[data-testid="context-file-error-line"]').allInnerTexts()).map(t => t.trim()).filter(Boolean);
    const progress = conv.locator('[data-testid="context-file-upload-progress"]');
    const sendButton = conv.locator('button[aria-label="发送消息"], button[aria-label="Send message"]').last();
    const clearItems = async () => {
      for (let guard = 0; guard < 6; guard += 1) {
        const remove = conv.locator('button[aria-label="删除文件"], button[aria-label="Remove file"]').first();
        if (!(await remove.count())) break;
        await remove.click().catch(() => undefined); await sleep(300);
      }
    };
    const pick = async (...paths) => { await input.setInputFiles(paths); };
    const percentages = async () => (await progress.allInnerTexts().catch(() => [])).map(t => Number((t.match(/(\d+)%/) ?? [])[1])).filter(Number.isFinite);

    await runCase('MSP-53', async () => {
      currentCase = 'MSP-53';
      await setLimits(null, null);
      const from = Date.now();
      const video = await make('video-26mib.mp4', 26);
      await throttle(6 * MiB);
      await pick(video);
      const seen = [];
      let sendBlockedWhileUploading = false;
      await waitFor('a percentage above 0 while uploading', async () => {
        const values = await percentages(); seen.push(...values);
        if (values.some(v => v > 0 && v < 100)) { sendBlockedWhileUploading = sendBlockedWhileUploading || !(await sendButton.isEnabled().catch(() => false)); return true; }
        return false;
      }, 30_000);
      await shot(page, 'MSP-53-uploading-zh-CN');
      const fileType = await input.evaluate(el => el.files?.[0]?.type ?? null).catch(() => null);
      const sendState = sendBlockedWhileUploading;
      await online();
      await waitFor('the video attached', async () => (await conv.locator('button[title="video-26mib.mp4"]').count()) > 0 && (await progress.count()) === 0, 90_000);
      await shot(page, 'MSP-53-attached');
      const uploads = uploadsSince(from);
      const draft = (await filesUnder(draftDir)).filter(f => f.path.endsWith('video-26mib.mp4'));
      assert(draft.length === 1 && draft[0].size === 26 * MiB, 'the node holds the draft with all 26 MiB (AC-001)', { draft, uploads: uploads.map(u => u.status) });
      await conv.locator('textarea').last().fill('SENT-VIDEO-WS6 a 26 MiB video');
      await waitFor('Send enabled', async () => await sendButton.isEnabled().catch(() => false), 30_000);
      await sendButton.click();
      await waitFor('the sent message with the video', async () => { const t = await conversationOf(); return t.includes('SENT-VIDEO-WS6') && t.includes('video-26mib.mp4'); }, 60_000);
      await shot(page, 'MSP-53-sent');
      const text = await conversationOf();
      const final = (await filesUnder(eta.dataDir)).filter(f => f.path.endsWith('video-26mib.mp4') && !f.path.startsWith(draftDir));
      assert(final.length === 1 && final[0].size === 26 * MiB, 'the final file on the node has all 26 MiB (AC-001, REQ-009)', { final });
      // What the agent received: the scripted CLI recorded the raw input line; it opened the listed path and answered the file's SHA-256.
      const sha = await new Promise((resolve, reject) => { const h = createHash('sha256'); createReadStream(video).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject); });
      await waitFor('the agent opened the listed file', async () => (await conversationOf()).includes(`sha256:${sha}`), 60_000);
      const inputs = (await fs.readFile(agentInputLog, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l));
      const agentInput = inputs.find(i => String(i.line?.message?.content ?? '').includes('SENT-VIDEO-WS6'));
      const received = String(agentInput?.line?.message?.content ?? '');
      const listed = [...received.matchAll(/^- (\/.*)$/gm)].map(m => m[1]);
      const pathInMessage = received.includes('Reference files:') && listed.length === 1 && listed[0] === final[0].path && path.isAbsolute(listed[0]);
      const details = { fileType, percentagesSeen: [...new Set(seen)].slice(0, 12), sendBlockedWhileUploading: sendState, uploadStatuses: uploads.map(u => u.status),
        draftSize: draft[0].size, finalSize: final[0].size, referenceFilesLine: listed.map(p => p.replace(eta.dataDir, '<eta data dir>')), agentOpenedWholeFileSha256Matches: true, pathInAgentInput: pathInMessage };
      assert(fileType === 'video/mp4', 'the page\'s File.type of the picked video is video/mp4 (ASM-001, headless Chrome derives it from the extension)', details);
      assert(details.percentagesSeen.some(v => v > 0 && v < 100), 'the item showed a percentage while uploading (REQ-007)', details);
      assert(sendState, 'Send stayed blocked while the upload ran (REQ-007)', details);
      assert(uploads.length === 1 && uploads[0].status === 200, 'one upload request, answered 200', details);
      assert(pathInMessage, 'the agent\'s input lists the absolute path of the final file under Reference files and the agent opened the whole file (REQ-009, AC-001)', details);
      return details;
    });

    await runCase('MSP-54', async () => {
      currentCase = 'MSP-54';
      await online();
      await setLimits(3, 1);
      const big = await make('big-clip.mp4', 4);
      const spec = await make('big-spec.pdf', 2);
      let from = Date.now();
      await pick(big, spec);
      await waitFor('two limit lines', async () => (await errorLines()).length >= 2, 15_000);
      const lines = await errorLines();
      await shot(page, 'MSP-54-over-limit-zh-CN');
      const refusedUploads = uploadsSince(from).length;
      const limitReads = limitReadsSince(from).length;
      assert(lines.length === 2, 'one line per limit (AC-005)', { lines });
      assert(lines.some(l => l === '无法附加 big-clip.mp4：文件超过 3 MB 大小限制。') && lines.some(l => l === '无法附加 big-spec.pdf：文件超过 1 MB 大小限制。'),
        'the zh-CN too-large lines name the file and its limit (AC-005)', { lines });
      assert(refusedUploads === 0 && limitReads >= 1, 'no upload request was made, the limits were read at the pick (REQ-005)', { refusedUploads, limitReads });
      assert((await conv.locator('button[title="big-clip.mp4"]').count()) === 0, 'no item was added');
      // Raised without a reload: the next pick uses the new limit (AC-004).
      await setLimits(8, 1);
      from = Date.now();
      await pick(big);
      await waitFor('the 4 MiB video attached under the raised limit', async () => (await conv.locator('button[title="big-clip.mp4"]').count()) > 0 && (await progress.count()) === 0, 60_000);
      const raised = { uploads: uploadsSince(from).map(u => u.status), lines: await errorLines() };
      await shot(page, 'MSP-54-attached-after-raise');
      assert(raised.uploads.length === 1 && raised.uploads[0] === 200 && raised.lines.length === 0, 'the video attaches after the limit was raised, no reload (AC-004)', raised);
      await clearItems();
      await waitFor('the draft removed', async () => (await filesUnder(draftDir)).length === 0, 15_000);
      // Lowered again after the phone's read: the phone's read is answered with the earlier limit (AC-006).
      await setLimits(3, 1);
      await page.route('**/rest/context-files/size-limits', route => route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ otherFileMaxBytes: 1 * MiB, audioVideoMaxBytes: 8 * MiB, audioVideoMimeTypes: ['video/mp4'] }) }));
      from = Date.now();
      await pick(big);
      await waitFor('the node refusal line', async () => (await errorLines()).length >= 1, 60_000);
      const refused = await errorLines();
      await shot(page, 'MSP-54-server-413-zh-CN');
      await page.unroute('**/rest/context-files/size-limits');
      const sent = uploadsSince(from);
      const left = await filesUnder(draftDir);
      assert(sent.length === 1 && sent[0].status === 413, 'the stale phone sent the file and the node answered 413 (AC-006)', { sent: sent.map(u => u.status), refused });
      assert(refused.length === 1 && refused[0] === '无法附加 big-clip.mp4：文件超过 3 MB 大小限制。', 'the same zh-CN line, with the node\'s limit (AC-006)', { refused });
      assert(left.length === 0, 'no draft left on the node after the refusal (QR-002)', { left });
      await setLimits(null, null);
      return { firstPick: { lines, refusedUploads, limitReads }, afterRaise: raised, staleRead: { sent: sent.map(u => u.status), refused } };
    });

    await runCase('MSP-55', async () => {
      currentCase = 'MSP-55';
      await setLimits(null, null);
      await clearItems();
      const clip = await make('drop-clip.mp4', 12);
      // Cancel.
      let from = Date.now();
      await throttle(1 * MiB);
      await pick(clip);
      await waitFor('upload progress above 0', async () => (await percentages()).some(v => v > 0), 30_000).catch(async (error) => {
        await shot(page, 'MSP-55-no-progress');
        error.details = { conversationText: (await conv.innerText().catch(() => '')).slice(-600), progress: await progress.allInnerTexts().catch(() => null),
          uploads: uploadsSince(from).map(u => u.status), lines: await errorLines() };
        throw error;
      });
      await shot(page, 'MSP-55-uploading-before-cancel');
      const cancel = conv.locator('button[aria-label="取消上传 drop-clip.mp4"], button[aria-label="Cancel upload of drop-clip.mp4"]').first();
      assert((await cancel.count()) === 1, 'the uploading item has a cancel control with its accessible name (REQ-007)');
      const cancelLabel = await cancel.getAttribute('aria-label');
      await cancel.click();
      await waitFor('the cancelled item gone', async () => (await progress.count()) === 0 && (await conv.locator('button[title="drop-clip.mp4"]').count()) === 0, 15_000);
      const afterCancelLines = await errorLines();
      await waitFor('no draft file after cancel', async () => (await filesUnder(draftDir)).length === 0, 15_000);
      await shot(page, 'MSP-55-after-cancel');
      const cancelSend = uploadsSince(from).length;
      // Drop the network mid-upload.
      from = Date.now();
      await pick(clip);
      await waitFor('upload progress above 0 before the drop', async () => (await percentages()).some(v => v > 0), 30_000);
      sever();
      await waitFor('the interrupted line', async () => (await errorLines()).length >= 1, 30_000).catch(async (error) => {
        await shot(page, 'MSP-55-no-interrupted-line');
        error.details = { conversationText: (await conv.innerText().catch(() => '')).slice(-500), progress: await progress.allInnerTexts().catch(() => null),
          uploadRequests: uploadsSince(from).map(u => u.status), failedRequests, proxySocketsLeft: proxySockets.size, lines: await errorLines() };
        throw error;
      });
      const dropLines = await errorLines();
      await shot(page, 'MSP-55-interrupted-zh-CN');
      restore();
      online();
      await sleep(1_500);
      const leftAfterDrop = await filesUnder(draftDir);
      const itemAfterDrop = await conv.locator('button[title="drop-clip.mp4"]').count();
      // Send is usable again once the network returns.
      await conv.locator('textarea').last().fill('AFTER-DROP-WS6 text only');
      const sendUsable = await waitFor('Send enabled after the drop', async () => await sendButton.isEnabled().catch(() => false), 20_000).then(() => true, () => false);
      await conv.locator('textarea').last().fill('');
      const details = { cancelLabel, cancelLines: afterCancelLines, cancelUploadRequests: cancelSend, dropLines, draftFilesAfterDrop: leftAfterDrop.length, itemAfterDrop, sendUsable };
      assert(afterCancelLines.length === 0, 'cancel shows no message (REQ-007, AC-007)', details);
      assert(dropLines.length === 1 && dropLines[0] === '无法附加 drop-clip.mp4：上传中断，请检查网络后重试。', 'the dropped network shows the zh-CN interrupted line naming the file (AC-008)', details);
      assert(leftAfterDrop.length === 0 && itemAfterDrop === 0, 'no draft file on the node and no item after the drop (AC-008, QR-002)', details);
      assert(sendUsable, 'Send is usable after the drop', details);
      return details;
    });
  } finally {
    if (phoneBrowser) await phoneBrowser.close().catch(() => undefined);
    for (const socket of [...proxySockets]) socket.destroy();
    proxy?.close();
    await eta.stop();
  }
};
