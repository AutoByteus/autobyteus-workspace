// Files attached to a conversation open on the phone, and every explicit open of a file shows its current content
// (autobyteus-450). Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after all its
// other cases (`--cases=MSP-28,MSP-29,MSP-30,MSP-31,MSP-37,MSP-89,MSP-90` runs only these). MSP-89 and MSP-90 need ffmpeg
// (`FFMPEG` names it) for their synthetic media.
//
// Stack of MSP-28…30 and MSP-89 (owned by these cases, removed at their end, inside the probe's temp root):
// - epsilon and its peer zeta, two more nodes from this worktree's `autobyteus-server-ts/dist/app.js` with the probe's owner
//   credential, on the scripted AGY CLI (`linked_skills`: `ECHO_INPUT <text>` answers `ECHO:"<text>"`, so an agent message
//   can carry Markdown links to absolute paths; `CALL_TOOL:{…}` calls the real tool). On epsilon a "Content Creator" run
//   whose workspace holds `posts/post.md`, `images/chart.png` and `notes/brief.txt`; it delegated work to zeta's
//   "Publisher" (a run on another node). Messages with a workspace path come from another client of the run (as the
//   desktop composer sends them).
// - A phone on the production phone bundle epsilon serves at /mobile, in a headless Chrome of its own that maps 192.168.77.40
//   to 127.0.0.1 (Host and Origin a private address), paired through Phone Access, 390×844. Its requests (with frame and
//   navigation flag), responses and any new window are recorded.
//
// Cases:
//   MSP-28 AC-001, AC-002  The phone attaches a PNG, a PDF and a text file in the composer: the draft PNG is a thumbnail
//                  loaded with the key; tapped, the composer's full-screen view shows it; the draft PDF and text open in
//                  the phone viewer with their content, and Back returns to the conversation with the drafts kept. Sent:
//                  the PNG is a thumbnail; each of the three opens in the viewer with its content, Back returns. A
//                  message carrying a workspace path (`notes/brief.txt`) opens it in the viewer. Throughout: no 401/403
//                  from the node, no main-frame navigation to `/rest/` or `/graphql`, no new window.
//   MSP-29 AC-002 (DEC-006)  The run on zeta (opened from the phone through its delegating run) shows a message whose path is
//                  on zeta; a tap shows "This file is on zeta-node, where this run runs." (autobyteus-471 AC-003) and opens
//                  nothing.
//   MSP-30 AC-004  Links to `posts/post.md` and `images/chart.png` (2×1 px) opened; both rewritten (VERSION-TWO, 3×1 px) and
//                  linked again: the new links and the old ones show the current text and image.
//   MSP-31 AC-003  A desktop window (`nuxt dev` against alpha): a run's link to `docs/reopen-450.md` (VERSION-ONE); the file
//                  rewritten (TWO) and linked again: the new link, the same old link again and the Files tab each show TWO;
//                  an unsaved edit typed in the editor survives a rewrite (THREE) and two more opens of the same file (its
//                  link, which shows the tab read-only in preview, then the Files tab). Runs last (alpha's desktop window).
//   MSP-37 autobyteus-471 AC-001, AC-002  A desktop window that is not the embedded one (`nuxt dev` against alpha, the
//                  owner credential on its requests as the desktop app attaches it; the same Files panel path a window on a
//                  Docker or remote node takes): a run's links to files outside its folder. A Markdown file and a PNG open
//                  read-only in the Files panel through `GET /rest/node-files/content` (no edit control, typing changes
//                  nothing); a missing path says "This file was not found on the computer.", a folder "This path is a
//                  folder, not a file."; no "host workspace" text; the files are unchanged.
//   MSP-89 autobyteus-572 AC-001…AC-003, AC-005, AC-006  On the phone (after MSP-30): media links in the run's conversation.
//                  A 3 s video and a 3 s tone in the run's folder and outside it play (`blob:` URLs); a relative link's
//                  form is recorded (not a file link; SR-003 DEC-003, FU-003). Two ~9.7 MB videos (in and outside the folder) on an 8 Mbit/s link (CDP)
//                  show "Loading video…" with "x of 9.7 MB" rising, never "URL is not available.", then play. A missing
//                  video says so plainly with Retry. Outside the folder (the phone viewer's own failure state, D-7): a
//                  missing video says so with Retry; the file is then created and Retry opens and plays it; a folder
//                  path says so without Retry. A run delegated by the open run (on epsilon, "Producer") has a video
//                  and an audio link that play. Every media read carries the phone's key in its header; no URL carries
//                  a key; no refusal.
//   MSP-91 autobyteus-572 AC-001, AC-005, AC-006 (API/E2E)  On the phone (after MSP-89): Retry after a real failure: a
//                  ~9.7 MB video in the run's folder on an 8 Mbit/s link; the node stops mid-download (killed: the
//                  connection breaks) and starts again: a plain message with Retry, never "not available"; Retry loads it
//                  again with its progress and it plays. The same for a video outside the folder (the node-file route): a
//                  plain message with the phone viewer's Retry (REQ-005, D-7); Retry loads it again and it plays. (Chrome's offline emulation does not break a download
//                  already under way, so the node itself goes away.) A second phone in Chinese (zh-CN): "正在加载视频…" with "x / y MB" rising, then
//                  the video plays. The node's gate and path rules on the media routes: no key → 401 on the workspace and
//                  node-file routes; the phone's key with a path that climbs out of the folder → refused, no bytes.
//   MSP-92 autobyteus-572 REQ-001 (API/E2E)  A video sent as a Team message's reference: the phone's Messages → the
//                  reference plays in the reference viewer on an 8 Mbit/s link; while it loads the viewer says it is
//                  loading ("Loading reference file..."), never "not available" (the reference route sends no length; the
//                  reference viewer has its own download and loading text, not the players' loading view).
//   MSP-90 autobyteus-572 AC-004  A desktop window (`nuxt dev` against alpha, as MSP-37): a run's links to a video and an
//                  audio file in its folder and outside it play in the Files panel; the outside ones through
//                  `GET /rest/node-files/content`.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { attachToBrowserContext, ownerSocketUrl, pairNodes } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const PHONE_HOST = '192.168.77.40';
const MODEL = 'gemini-3.8-flash-low';
const PEER = 'zeta-node';
const ON_OTHER_NODE_NOTICE = `This file is on ${PEER}, where this run runs.`;

/** A solid-colour PNG of the given size (the size tells versions apart in the viewer). */
const png = (width, height) => {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
};
/** A one-page PDF showing `text`. */
const pdf = (text) => {
  const stream = `BT /F1 18 Tf 20 100 Td (${text}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => { const at = out.length; out += `${index + 1} 0 obj\n${object}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(at => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
};

/**
 * Synthetic media (autobyteus-572), made with ffmpeg's `lavfi` sources (`FFMPEG` names the binary, default `ffmpeg`): a
 * 3 s test-pattern video, a 3 s tone, and a 20 s video of about 9.7 MB (a 4 Mbit/s Mandelbrot zoom).
 */
const SYNTHETIC_MEDIA = {
  clip: ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25', '-t', '3', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
  tone: ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3'],
  big: ['-f', 'lavfi', '-i', 'mandelbrot=size=1280x720:rate=30', '-t', '20', '-b:v', '4M', '-minrate', '4M', '-maxrate', '4M', '-bufsize', '8M',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
};
const makeMedia = async (kind, target, ...copies) => {
  await fs.mkdir(path.dirname(target), { recursive: true });
  try { execFileSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', ...SYNTHETIC_MEDIA[kind], target]); } catch (error) {
    throw new Error(`ffmpeg made no ${kind} media (install ffmpeg or set FFMPEG): ${error.message}`);
  }
  for (const copy of copies) { await fs.mkdir(path.dirname(copy), { recursive: true }); await fs.copyFile(target, copy); }
  return (await fs.stat(target)).size;
};
/** A media viewer's words that would show an internal error rather than a plain message (autobyteus-572 AC-006). */
const INTERNAL_WORDS = /Failed to fetch|protected resource|HTTP|\b[45]\d\d\b|Error:|TypeError|undefined|null/;
/** The text of a loading view's progress, "4.1 of 9.7 MB" (decimal units). */
const PROGRESS_TEXT = /^(\d+(?:\.\d)?) of (\d+(?:\.\d)?) (MB|KB)$/;

/**
 * @param probe the probe's helpers: `runCase`, `serverAt`, `freePort`, `chromium`, `executablePath`, `outputDir`,
 *   `evidence`, `selected`, `sleep`, `waitFor`, `assert`, `redact`; for MSP-31 also `browser`, `alpha`, `stack`,
 *   `desktopRunsView`.
 */
export const runFileOpenCases = async (probe) => {
  const { runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact } = probe;
  const wants = id => !selected || selected.has(id);
  const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);
  /** `expected`: a case's own deliberate failures, `{ test(line, sourceUrl), cause }` (MSP-37's refused node files). */
  const watchBrowser = (page, label, origin, caseOf, expected = null) => {
    const record = (text, sourceUrl = '') => {
      const line = redact(`${label} console: ${text}`);
      // The browser's own favicon request at the origin root carries no credential (401, autobyteus-437) or is absent (404).
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(line) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      const deliberate = !favicon && Boolean(expected?.test(line, sourceUrl));
      const cause = favicon ? 'the browser\'s favicon request at the origin root (/favicon.ico)' : deliberate ? expected.cause : null;
      evidence.browserErrors.push({ case: caseOf(), line, known: favicon || deliberate, ...(cause ? { cause } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') record(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => record(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: caseOf(), label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
  };

  if (['MSP-28', 'MSP-29', 'MSP-30', 'MSP-89', 'MSP-91', 'MSP-92'].some(wants)) {
    const [epsilon, zeta] = await Promise.all([serverAt('epsilon', await freePort(), { AGY_FAKE_CASE: 'linked_skills' }), serverAt('zeta', await freePort(), { AGY_FAKE_CASE: 'linked_skills' })]);
    const phoneOrigin = `http://${PHONE_HOST}:${epsilon.port}`;
    let phoneBrowser = null;
    let currentCase = 'file-open-setup';
    try {
      // ---- data -------------------------------------------------------------------------------------------------------
      for (const node of [epsilon, zeta]) await node.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
      await pairNodes({ inviter: zeta.gql, accepter: epsilon.gql, inviterName: PEER, accepterName: 'epsilon-node' });
      const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
      const def = async (node, name) => (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
        { i: { name, role: 'assistant', description: `${name} (file open probe)`, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
      await def(zeta, 'Publisher');
      const creatorDef = await def(epsilon, 'Content Creator');
      const workspace = path.join(epsilon.dataDir, '..', 'workspace');
      const file = { post: path.join(workspace, 'posts', 'post.md'), chart: path.join(workspace, 'images', 'chart.png'), brief: path.join(workspace, 'notes', 'brief.txt') };
      for (const target of Object.values(file)) await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(file.post, '# Post\n\nVERSION-ONE-1111 the first draft.\n');
      await fs.writeFile(file.chart, png(2, 1));
      await fs.writeFile(file.brief, 'BRIEF-MARKER-450: the brief of the launch.\n');
      const zetaWorkspace = path.join(zeta.dataDir, '..', 'workspace');
      const zetaNotes = path.join(zetaWorkspace, 'zeta-notes.txt');
      await fs.mkdir(zetaWorkspace, { recursive: true });
      await fs.writeFile(zetaNotes, 'ZETA-NOTES-450\n');
      await epsilon.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
      await zeta.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: zetaWorkspace } }).catch(() => undefined);
      const created = (await epsilon.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: creatorDef, workspaceRootPath: workspace, autoExecuteTools: true, ...agy } })).createAgentRun;
      assert(created.success, created.message);
      const run = created.runId;
      const sendOver = async (node, runId, content, contextFilePaths = []) => {
        const socket = new WebSocket(ownerSocketUrl(`${node.baseUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`));
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        await sleep(300);
        socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: contextFilePaths, image_urls: [], agent_run_id: runId, content } }));
        await sleep(600);
        socket.close();
      };
      const conversationOf = async (node, runId) => JSON.stringify((await node.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
      const linkMessage = async (marker, links) => {
        await sendOver(epsilon, run, `ECHO_INPUT ${marker} ${links.map(([name, target]) => `[${name}](${target})`).join(' ')}`);
        await waitFor(`the echo of ${marker}`, async () => { const text = await conversationOf(epsilon, run); return text.includes('ECHO:') && text.includes(marker); }, 60_000);
      };
      await linkMessage('LINKS-ONE', [['post.md', file.post], ['chart.png', file.chart]]);
      await sendOver(epsilon, run, 'PATH-ATTACH-450 read the brief', [file.brief]);
      const delegated = await (async () => {
        const before = (await conversationOf(epsilon, run)).split('CALLED:').length;
        await sendOver(epsilon, run, `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { node: PEER, recipient_address: '/publisher', description: 'Publish the post. Marker REMOTE-450.' } })}`);
        let text = '';
        await waitFor('the delegation to zeta', async () => (text = await conversationOf(epsilon, run)).split('CALLED:').length > before, 60_000);
        return text.split('CALLED:').at(-1);
      })();
      const remoteRun = new RegExp('target_agent_run_id\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)').exec(delegated)?.[1];
      assert(remoteRun, 'the run on zeta', delegated);
      await sendOver(zeta, remoteRun, 'REMOTE-PATH-450 see the notes', [zetaNotes]);
      await waitFor('the path message on zeta', async () => (await conversationOf(zeta, remoteRun)).includes('REMOTE-PATH-450'), 60_000);
      evidence.fileOpen = { runs: { run, remoteRun } };

      // ---- the phone ----------------------------------------------------------------------------------------------------
      phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
      const settings = await epsilon.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
      assert(settings.status === 200, 'epsilon Phone Access on', settings);
      const pairing = await epsilon.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Epsilon Test Node', trustedPrivateHttpAcknowledged: true });
      assert(pairing.status === 201 && pairing.body.mobileUrl, 'epsilon pairing session', pairing.status);
      const context = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
      const page = await context.newPage();
      // MSP-89's missing video: the node answers 404 for it on purpose (AC-006). MSP-91 takes the phone offline mid-download
      // on purpose: the interrupted read and what the phone's open streams log while offline.
      const deliberate = [
        { test: (line, sourceUrl) => currentCase === 'MSP-89' && /: Failed to load resource: the server responded with a status of 40[04] \((Not Found|Bad Request)\)$/.test(line)
          && /gone-572(-out)?\.mp4|folder-572\.mp4/.test(decodeURIComponent(sourceUrl)), cause: 'MSP-89\'s missing videos and folder path (autobyteus-572 AC-006, D-7)' },
        { test: (line) => currentCase === 'MSP-91' && offlineWindow.on && /ERR_CONNECTION_(REFUSED|RESET|CLOSED)|ERR_EMPTY_RESPONSE|ERR_INCOMPLETE_CHUNKED_ENCODING|ERR_CONTENT_LENGTH_MISMATCH|network error|Failed to fetch|WebSocket connection to .* failed|Agent WebSocket error|\[FileExplorerStreaming\] WebSocket error/i.test(line),
          cause: 'MSP-91 stopped the node mid-download on purpose' },
      ];
      const offlineWindow = { on: false };
      watchBrowser(page, 'phone-epsilon', phoneOrigin, () => currentCase, {
        test: (line, sourceUrl) => deliberate.some((entry) => entry.test(line, sourceUrl)),
        get cause() { return deliberate.map((entry) => entry.cause).join(' / '); },
      });
      const net = [];
      context.on('request', (request) => { if (!request.url().startsWith(phoneOrigin)) return;
        net.push({ at: Date.now(), path: new URL(request.url()).pathname, type: request.resourceType(), navigation: request.isNavigationRequest(), mainFrame: request.frame() === page.mainFrame(), status: null,
          // autobyteus-572 AC-005: whether the phone's key went in the header, and whether any key went in the URL.
          keyInHeader: /^Bearer mra_/.test(request.headers().authorization ?? ''), keyInUrl: /mra_|[?&](token|access_token|key|credential)=/i.test(request.url()), request }); });
      context.on('response', (response) => { const entry = net.find(e => e.request === response.request()); if (entry) entry.status = response.status(); });
      const popups = [];
      context.on('page', other => { if (other !== page) popups.push(redact(other.url())); });
      const netSince = from => net.filter(e => e.at >= from).map(({ request: _r, ...rest }) => rest);
      await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
      await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
      const conv = page.locator('[data-testid="mobile-run-conversation"]');
      const viewer = page.locator('[data-testid="mobile-file-viewer"]');
      const openRun = async (key, marker) => {
        await waitFor(`row ${key}`, async () => (await page.locator(`[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-open"]`).count()) > 0, 30_000);
        await page.locator(`[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-open"]`).click();
        await waitFor(`the run screen of ${key}`, async () => (await page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000);
        await waitFor(`${marker} in the conversation`, async () => (await conv.innerText().catch(() => '')).includes(marker), 30_000);
      };
      const toList = async () => {
        for (let step = 0; step < 4 && !(await page.locator('[data-testid="mobile-run-tree"]:visible').count()); step += 1) {
          const back = page.locator('[data-testid="mobile-run-back"]:visible, [data-testid="mobile-screen-back"]:visible').first();
          if (await back.count()) await back.click(); else await page.goBack();
          await sleep(500);
        }
        await page.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 20_000 });
      };
      const conversationShown = async () => (await conv.count()) > 0 && await conv.isVisible() && (await viewer.count()) === 0;
      /** What the viewer shows: its title, its text, its image's natural size, its PDF canvases. */
      const viewerShows = async () => viewer.evaluate((el) => {
        const img = el.querySelector('img');
        return { title: el.querySelector('[data-testid="mobile-screen-title"]')?.textContent?.trim() ?? null, text: el.innerText.replace(/\s+/g, ' ').slice(0, 400),
          image: img ? { blob: img.src.startsWith('blob:'), width: img.naturalWidth, height: img.naturalHeight } : null, pdfCanvases: el.querySelectorAll('canvas').length,
          error: el.querySelector('[data-testid="mobile-file-preview-error"]')?.textContent?.trim() ?? null };
      });
      /** Taps a control, waits for the viewer to show `ready`, records it, then Back (the system back) to the conversation. */
      const openInViewer = async (label, control, ready) => {
        await control.scrollIntoViewIfNeeded();
        await control.tap();
        let shown = null;
        try { await waitFor(`${label} in the viewer`, async () => (await viewer.count()) > 0 && ready(shown = await viewerShows()), 20_000); } catch { shown = (await viewer.count()) ? await viewerShows() : null; }
        await shot(page, `${currentCase}-${label}`);
        await page.goBack();
        let backToConversation = false;
        try { await waitFor(`${label}: back to the conversation`, conversationShown, 10_000); backToConversation = true; } catch { /* recorded */ }
        return { shown, ready: Boolean(shown && ready(shown)), backToConversation };
      };
      const linkControl = target => conv.locator(`[data-event-monitor-file-action-control="true"][title="${target}"]`);
      await openRun(`agent:${run}`, 'PATH-ATTACH-450');

      await runCase('MSP-28', async () => {
        currentCase = 'MSP-28';
        const from = Date.now();
        const popupsBefore = popups.length;
        const dir = path.join(outputDir, 'msp-28-files');
        await fs.mkdir(dir, { recursive: true });
        const upload = { png: path.join(dir, 'photo-450.png'), pdf: path.join(dir, 'spec-450.pdf'), txt: path.join(dir, 'notes-450.txt') };
        await fs.writeFile(upload.png, png(4, 3));
        await fs.writeFile(upload.pdf, pdf('PDF-MARKER-450'));
        await fs.writeFile(upload.txt, 'TEXT-MARKER-450: the attached notes.\n');
        await conv.locator('input[type="file"]').first().setInputFiles([upload.png, upload.pdf, upload.txt]);
        // Drafts in the composer.
        const draftThumb = conv.locator('img.context-image-thumbnail');
        await waitFor('the draft thumbnail loaded', async () => (await draftThumb.count()) > 0 && await draftThumb.first().evaluate(img => img.complete && img.naturalWidth > 0), 30_000);
        const draftThumbnail = await draftThumb.first().evaluate(img => ({ blob: img.src.startsWith('blob:'), width: img.naturalWidth }));
        await waitFor('the draft uploads done', async () => (await conv.locator('.thumbnail-uploading').count()) === 0
          && (await conv.locator('button[title="spec-450.pdf"]').count()) > 0 && (await conv.locator('button[title="notes-450.txt"]').count()) > 0, 30_000);
        await conv.locator('.thumbnail-button').first().tap();
        const modalImage = page.locator('div.fixed.inset-0.z-50 img');
        let draftFullScreen = null;
        try { await waitFor('the draft image full screen', async () => (await modalImage.count()) > 0 && await modalImage.first().evaluate(img => img.complete && img.naturalWidth > 0), 15_000);
          draftFullScreen = await modalImage.first().evaluate(img => ({ blob: img.src.startsWith('blob:'), width: img.naturalWidth })); } catch { /* null */ }
        await shot(page, 'MSP-28-draft-image-full-screen');
        await page.keyboard.press('Escape');
        await page.locator('div.fixed.inset-0.z-50 button').first().click({ timeout: 2_000 }).catch(() => undefined);
        await waitFor('the full-screen view closed', async () => (await modalImage.count()) === 0, 10_000).catch(() => undefined);
        const draftPdf = await openInViewer('draft-pdf', conv.locator('button[title="spec-450.pdf"]').first(), s => s.pdfCanvases > 0);
        const draftText = await openInViewer('draft-text', conv.locator('button[title="notes-450.txt"]').first(), s => s.text.includes('TEXT-MARKER-450'));
        const draftsKept = (await conv.locator('button[title="spec-450.pdf"]').count()) > 0 && (await draftThumb.count()) > 0;
        // Send.
        await conv.locator('textarea').last().fill('SENT-ATTACH-450 three files');
        const send = conv.locator('button[aria-label="Send message"]').last();
        await waitFor('Send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 30_000);
        await send.click();
        const sentThumb = conv.locator('button.message-attachment-thumbnail-button img');
        await waitFor('the sent thumbnail loaded', async () => (await sentThumb.count()) > 0 && await sentThumb.last().evaluate(img => img.complete && img.naturalWidth > 0), 60_000);
        const sentThumbnail = await sentThumb.last().evaluate(img => ({ blob: img.src.startsWith('blob:'), width: img.naturalWidth }));
        await shot(page, 'MSP-28-sent-message');
        const sentPng = await openInViewer('sent-png', conv.locator('button.message-attachment-thumbnail-button').last(), s => s.image?.width === 4);
        const sentPdf = await openInViewer('sent-pdf', conv.locator('button.message-attachment-chip[title="Open spec-450.pdf"]').last(), s => s.pdfCanvases > 0);
        const sentText = await openInViewer('sent-text', conv.locator('button.message-attachment-chip[title="Open notes-450.txt"]').last(), s => s.text.includes('TEXT-MARKER-450'));
        const workspacePath = await openInViewer('workspace-path', conv.locator('button.message-attachment-chip[title="Open brief.txt"]').last(), s => s.text.includes('BRIEF-MARKER-450'));
        const requests = netSince(from);
        const details = { draftThumbnail, draftFullScreen, draftPdf, draftText, draftsKeptAfterViewer: draftsKept, sentThumbnail, sentPng, sentPdf, sentText, workspacePath,
          refused: requests.filter(e => e.status === 401 || e.status === 403).map(e => ({ path: e.path, status: e.status, type: e.type })),
          mainFrameNodeNavigations: requests.filter(e => e.navigation && e.mainFrame && /^\/(rest|graphql)/.test(e.path)).map(e => e.path),
          newWindows: popups.slice(popupsBefore), attachedFileReads: requests.filter(e => /context-files|\/rest\/drafts\//.test(e.path)).map(e => ({ path: e.path.replace(/[0-9a-f-]{20,}/g, '…'), status: e.status, type: e.type })) };
        for (const value of [details.draftPdf, details.draftText, details.sentPng, details.sentPdf, details.sentText, details.workspacePath]) if (value.shown) delete value.shown.text;
        assert(draftThumbnail.blob && draftThumbnail.width === 4 && sentThumbnail.blob && sentThumbnail.width === 4, 'the draft and the sent PNG are thumbnails loaded with the key (AC-001)', details);
        assert(draftFullScreen?.blob && draftFullScreen.width === 4, 'the draft image\'s full-screen view shows it (AC-001)', details);
        assert([draftPdf, draftText, sentPng, sentPdf, sentText, workspacePath].every(o => o.ready && o.backToConversation), 'every attachment opens in the phone viewer with its content and Back returns (AC-002)', details);
        assert(draftsKept, 'the drafts stay in the composer after the viewer', details);
        assert(details.refused.length === 0 && details.mainFrameNodeNavigations.length === 0 && details.newWindows.length === 0, 'no refusal, no main-frame node navigation, no new window (AC-001, AC-002)', details);
        return details;
      });

      await runCase('MSP-29', async () => {
        currentCase = 'MSP-29';
        const from = Date.now();
        await toList();
        const hostKey = `agent:${run}`;
        const remoteKey = `${hostKey}/peer_agent:${remoteRun}`; // SR-084: a peer run's tree row key
        const host = page.locator(`[data-testid="mobile-run-row-${hostKey}"]`);
        if ((await host.getAttribute('aria-expanded')) === 'false') await host.locator('[data-testid="mobile-run-toggle"]').click();
        await openRun(remoteKey, 'REMOTE-PATH-450');
        const chip = conv.locator('button.message-attachment-chip[title="Open zeta-notes.txt"], button.message-attachment-chip').filter({ hasText: 'zeta-notes.txt' }).last();
        await chip.scrollIntoViewIfNeeded();
        await chip.tap();
        let notice = false;
        try { await waitFor('the other-node notice', async () => (await page.locator('[data-testid="toast-container"]').innerText().catch(() => '')).includes(ON_OTHER_NODE_NOTICE), 10_000); notice = true; } catch { /* recorded */ }
        await shot(page, 'MSP-29-remote-path-notice');
        const requests = netSince(from);
        const details = { notice, toast: (await page.locator('[data-testid="toast-container"]').innerText().catch(() => '')).slice(0, 200), viewerOpened: (await viewer.count()) > 0, stillOnConversation: await conversationShown(),
          mainFrameNodeNavigations: requests.filter(e => e.navigation && e.mainFrame && /^\/(rest|graphql)/.test(e.path)).map(e => e.path), refused: requests.filter(e => e.status === 401 || e.status === 403).map(e => e.path) };
        assert(notice && !details.viewerOpened && details.stillOnConversation, 'a path on another node names the node it is on and opens nothing (AC-002, DEC-006; autobyteus-471 AC-003)', details);
        assert(details.mainFrameNodeNavigations.length === 0 && details.refused.length === 0, 'no navigation and no refusal', details);
        return details;
      });

      await runCase('MSP-30', async () => {
        currentCase = 'MSP-30';
        await toList();
        await openRun(`agent:${run}`, 'LINKS-ONE');
        const first = { post: await openInViewer('post-v1', linkControl(file.post).first(), s => s.text.includes('VERSION-ONE-1111')),
          chart: await openInViewer('chart-v1', linkControl(file.chart).first(), s => s.image?.width === 2) };
        await fs.writeFile(file.post, '# Post\n\nVERSION-TWO-2222 the rewritten post.\n');
        await fs.writeFile(file.chart, png(3, 1));
        await linkMessage('LINKS-TWO', [['post.md', file.post], ['chart.png', file.chart]]);
        await waitFor('the second links on the phone', async () => (await linkControl(file.post).count()) >= 2 && (await linkControl(file.chart).count()) >= 2, 30_000);
        const newLinks = { post: await openInViewer('post-new-link', linkControl(file.post).last(), s => s.text.includes('VERSION-TWO-2222')),
          chart: await openInViewer('chart-new-link', linkControl(file.chart).last(), s => s.image?.width === 3) };
        const oldLinks = { post: await openInViewer('post-old-link', linkControl(file.post).first(), s => s.text.includes('VERSION-TWO-2222')),
          chart: await openInViewer('chart-old-link', linkControl(file.chart).first(), s => s.image?.width === 3) };
        const brief = (o) => ({ ready: o.ready, backToConversation: o.backToConversation, title: o.shown?.title ?? null, image: o.shown?.image ?? null, version: (o.shown?.text.match(/VERSION-[A-Z]+-\d{4}/g) ?? []).join(',') || null });
        const details = { first: { post: brief(first.post), chart: brief(first.chart) }, newLinks: { post: brief(newLinks.post), chart: brief(newLinks.chart) }, oldLinks: { post: brief(oldLinks.post), chart: brief(oldLinks.chart) } };
        assert(first.post.ready && first.chart.ready, 'the first opens show VERSION-ONE and the 2×1 image', details);
        assert(newLinks.post.ready && newLinks.chart.ready && oldLinks.post.ready && oldLinks.chart.ready, 'after the rewrite every open, new link or old, shows VERSION-TWO and the 3×1 image (AC-004)', details);
        return details;
      });
      await runCase('MSP-89', async () => {
        currentCase = 'MSP-89';
        // Synthetic media in the run's folder and outside it; a relative link; a delegated run's conversation; two ~9.7 MB
        // videos on an 8 Mbit/s link; a missing video.
        const outside = path.join(epsilon.dataDir, '..', 'outside-media-572');
        const media = {
          insideVideo: path.join(workspace, 'media', 'clip-572.mp4'), outsideVideo: path.join(outside, 'clip-572-out.mp4'),
          insideAudio: path.join(workspace, 'media', 'tone-572.mp3'), outsideAudio: path.join(outside, 'tone-572-out.mp3'),
          relativeVideo: path.join(workspace, 'media', 'rel-572.mp4'),
          insideBig: path.join(workspace, 'media', 'big-572.mp4'), outsideBig: path.join(outside, 'big-572-out.mp4'),
        };
        const missing = path.join(workspace, 'media', 'gone-572.mp4');
        // Outside the folder (the node-file route, D-7): a video not there yet, and a folder whose name looks like a video.
        const outsideMissing = path.join(outside, 'gone-572-out.mp4');
        const outsideFolder = path.join(outside, 'folder-572.mp4');
        await fs.mkdir(outsideFolder, { recursive: true });
        await makeMedia('clip', media.insideVideo, media.outsideVideo, media.relativeVideo);
        await makeMedia('tone', media.insideAudio, media.outsideAudio);
        const bigSize = await makeMedia('big', media.insideBig, media.outsideBig);
        // A run delegated by the open run, on this node (the founder's case: a task agent's message with a video path).
        await def(epsilon, 'Producer');
        const before = (await conversationOf(epsilon, run)).split('CALLED:').length;
        await sendOver(epsilon, run, `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { recipient_address: '/producer', description: 'Make the clip. Marker DELEGATED-572.' } })}`);
        let delegatedText = '';
        await waitFor('the delegation on epsilon', async () => (delegatedText = await conversationOf(epsilon, run)).split('CALLED:').length > before, 60_000);
        const taskRun = new RegExp('target_agent_run_id\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)').exec(delegatedText.split('CALLED:').at(-1))?.[1];
        assert(taskRun, 'the delegated run on epsilon', delegatedText.split('CALLED:').at(-1));
        await sendOver(epsilon, taskRun, `ECHO_INPUT MEDIA-DELEGATED-572 [clip-572.mp4](${media.insideVideo}) [tone-572-out.mp3](${media.outsideAudio})`);
        await waitFor('the echo of MEDIA-DELEGATED-572', async () => { const text = await conversationOf(epsilon, taskRun); return text.includes('ECHO:') && text.includes('MEDIA-DELEGATED-572'); }, 60_000);
        await linkMessage('MEDIA-572', [['clip-572.mp4', media.insideVideo], ['tone-572.mp3', media.insideAudio], ['clip-572-out.mp4', media.outsideVideo],
          ['tone-572-out.mp3', media.outsideAudio], ['rel-572.mp4', 'media/rel-572.mp4'], ['big-572.mp4', media.insideBig], ['big-572-out.mp4', media.outsideBig],
          ['gone-572.mp4', missing], ['gone-572-out.mp4', outsideMissing], ['folder-572.mp4', outsideFolder]]);

        const from = Date.now();
        await toList();
        await openRun(`agent:${run}`, 'MEDIA-572');
        const cdp = await page.context().newCDPSession(page);
        const throttle = on => cdp.send('Network.emulateNetworkConditions', on
          ? { offline: false, latency: 80, downloadThroughput: 8000 * 1024 / 8, uploadThroughput: 8000 * 1024 / 8 }
          : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        /** Taps a media link and samples the viewer every 100 ms until the file plays or fails; then Back. */
        /** What the phone viewer shows now. */
        const viewerNow = () => page.evaluate(() => {
          const el = document.querySelector('[data-testid="mobile-file-viewer"]');
          if (!el) return { viewer: false };
          const element = el.querySelector('video, audio');
          return { viewer: true, text: el.innerText.replace(/\s+/g, ' ').slice(0, 200),
            // The player's loading view, or the phone viewer's (a node file; it keeps its own test id).
            loading: Boolean(el.querySelector('[data-testid="media-loading-state"], [role="status"][data-testid="mobile-file-preview-loading"]')),
            progress: el.querySelector('[data-testid="media-loading-progress"]')?.textContent?.trim() ?? null,
            alert: el.querySelector('[role="alert"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
            // The players' Retry and the phone viewer's own (autobyteus-572 D-7) share the class.
            retry: Boolean(el.querySelector('.retry-button')),
            media: element ? { tag: element.tagName.toLowerCase(), blob: element.src.startsWith('blob:'), readyState: element.readyState, error: element.error?.code ?? null,
              duration: Number.isFinite(element.duration) ? Math.round(element.duration * 10) / 10 : null } : null };
        });
        /**
         * Taps a media link and samples the viewer every 100 ms until the file plays or fails; `onSettled(state)` may act
         * on the viewer before Back (its result is returned as `after`).
         */
        const watchMedia = async (label, control, onSettled = null) => {
          const started = Date.now();
          await control.scrollIntoViewIfNeeded();
          await control.tap();
          const timeline = [];
          let last = '';
          let state = null;
          let loadingShot = false;
          while (Date.now() - started < 40_000) {
            state = await viewerNow();
            const signature = JSON.stringify(state);
            if (signature !== last) { timeline.push({ at: Date.now() - started, ...state }); last = signature; }
            if (!loadingShot && state.loading && state.progress && Date.now() - started > 3_000) { loadingShot = true; await shot(page, `MSP-89-${label}-loading`); }
            if ((state.media && state.media.readyState >= 1) || state.alert) break;
            await sleep(100);
          }
          await shot(page, `MSP-89-${label}`);
          const after = onSettled && state ? await onSettled(state) : null;
          await page.goBack();
          let backToConversation = false;
          try { await waitFor(`${label}: back to the conversation`, conversationShown, 15_000); backToConversation = true; } catch { /* recorded */ }
          const final = state ?? { viewer: false };
          return { final, after, backToConversation, seconds: Math.round((Date.now() - started) / 100) / 10,
            notAvailableShown: timeline.some(entry => /URL is not available/.test(entry.text ?? '')),
            progress: [...new Set(timeline.map(entry => entry.progress).filter(Boolean))], timeline };
        };
        const played = (result, tag, seconds) => Boolean(result.final.media?.tag === tag && result.final.media.blob && result.final.media.readyState >= 1
          && result.final.media.error === null && Math.abs((result.final.media.duration ?? 0) - seconds) < 1 && !result.notAvailableShown && result.backToConversation);
        const results = {};
        for (const key of ['insideVideo', 'insideAudio', 'outsideVideo', 'outsideAudio']) results[key] = await watchMedia(key, linkControl(media[key]).last());
        // A relative Markdown link is not a file link in a conversation (only absolute paths are; `absoluteFilePathAction.ts`):
        // recorded, not tapped. REQ-002 means absolute paths (autobyteus-572 SR-003, DEC-003); relative links are FU-003.
        const relativeLink = await conv.locator('a').filter({ hasText: /^rel-572\.mp4$/ }).last().evaluate(a => ({
          fileControl: a.getAttribute('data-event-monitor-file-action-control') === 'true', href: a.getAttribute('href') })).catch(() => null);
        await throttle(true);
        for (const key of ['insideBig', 'outsideBig']) results[key] = await watchMedia(key, linkControl(media[key]).last());
        await throttle(false);
        results.missing = await watchMedia('missing', linkControl(missing).last());
        // The video appears (an agent still rendering it), then Retry: it opens and plays.
        results.outsideMissing = await watchMedia('outsideMissing', linkControl(outsideMissing).last(), async (failedState) => {
          if (!failedState.retry) return null;
          await fs.copyFile(media.outsideVideo, outsideMissing);
          await page.locator('[data-testid="mobile-file-viewer"] .retry-button').first().tap();
          let now = null;
          await waitFor('the video after Retry', async () => { now = await viewerNow(); return Boolean((now.media && now.media.readyState >= 1) || (now.alert && !now.retry)); }, 30_000).catch(() => undefined);
          await shot(page, 'MSP-89-outsideMissing-after-retry');
          return now;
        });
        results.outsideFolder = await watchMedia('outsideFolder', linkControl(outsideFolder).last());
        // The delegated run, under the open run in the run list.
        await toList();
        const host = page.locator(`[data-testid="mobile-run-row-agent:${run}"]`);
        if ((await host.getAttribute('aria-expanded')) === 'false') await host.locator('[data-testid="mobile-run-toggle"]').click();
        const taskRow = page.locator(`[data-testid^="mobile-run-row-"][data-testid$="${taskRun}"]`).first();
        await taskRow.waitFor({ timeout: 30_000 });
        await openRun((await taskRow.getAttribute('data-testid')).replace('mobile-run-row-', ''), 'MEDIA-DELEGATED-572');
        results.delegatedVideo = await watchMedia('delegatedVideo', linkControl(media.insideVideo).last());
        results.delegatedAudio = await watchMedia('delegatedAudio', linkControl(media.outsideAudio).last());

        const mediaReads = net.filter(entry => entry.at >= from && /^\/rest\/(workspaces\/[^/]+\/content|node-files\/content)$/.test(entry.path));
        const requests = netSince(from);
        const bigProgress = key => results[key].progress.map(text => PROGRESS_TEXT.exec(text)).filter(Boolean).map(match => ({ loaded: Number(match[1]), total: `${match[2]} ${match[3]}` }));
        const details = {
          sizes: { bigBytes: bigSize, bigShownAs: `${(bigSize / 1e6).toFixed(1)} MB` },
          relativeLink,
          results: Object.fromEntries(Object.entries(results).map(([key, result]) => [key, { ...result, timeline: key.endsWith('Big') ? result.timeline.filter((_, index, all) => index < 3 || index > all.length - 3) : result.timeline }])),
          bigProgress: { insideBig: bigProgress('insideBig'), outsideBig: bigProgress('outsideBig') },
          mediaReads: { count: mediaReads.length, routes: [...new Set(mediaReads.map(entry => entry.path.replace(/workspaces\/[^/]+/, 'workspaces/…')))],
            keyInHeader: mediaReads.filter(entry => entry.keyInHeader).length, keyInUrl: requests.filter(entry => entry.keyInUrl).map(entry => entry.path) },
          refused: requests.filter(entry => entry.status === 401 || entry.status === 403).map(entry => `${entry.path} ${entry.status}`),
          mainFrameNodeNavigations: requests.filter(entry => entry.navigation && entry.mainFrame && /^\/(rest|graphql)/.test(entry.path)).map(entry => entry.path),
        };
        const failures = [
          [played(results.insideVideo, 'video', 3) && played(results.insideAudio, 'audio', 3), 'AC-003 a video and an audio file in the run\'s folder play'],
          [played(results.outsideVideo, 'video', 3) && played(results.outsideAudio, 'audio', 3), 'AC-003 a video and an audio file outside the folder play'],
          [played(results.delegatedVideo, 'video', 3) && played(results.delegatedAudio, 'audio', 3), 'AC-003 a delegated run\'s video and audio links play'],
          ...['insideBig', 'outsideBig'].map(key => {
            const samples = details.bigProgress[key];
            const rising = samples.length >= 10 && samples.every((sample, index) => index === 0 || sample.loaded >= samples[index - 1].loaded) && samples.at(-1).loaded > samples[0].loaded;
            return [played(results[key], 'video', 20) && rising && samples.every(sample => sample.total === details.sizes.bigShownAs),
              `AC-001, AC-002 the ~9.7 MB video (${key}) at 8 Mbit/s shows "Loading video…" with its progress rising toward ${details.sizes.bigShownAs}, never "not available", then plays`];
          }),
          [Boolean(results.missing.final.alert) && !INTERNAL_WORDS.test(results.missing.final.alert) && results.missing.final.retry && !results.missing.notAvailableShown,
            'AC-006 a missing video: a plain message with Retry'],
          [Boolean(results.outsideMissing.final.alert) && !INTERNAL_WORDS.test(results.outsideMissing.final.alert) && results.outsideMissing.final.retry
            && played({ ...results.outsideMissing, final: results.outsideMissing.after ?? {} }, 'video', 3),
            'AC-006, D-7 a missing video outside the folder: a plain message with Retry; once it exists, Retry opens it and it plays'],
          [/folder/i.test(results.outsideFolder.final.alert ?? '') && !results.outsideFolder.final.retry && results.outsideFolder.backToConversation,
            'AC-006, D-7 a folder outside the folder: its plain message, no Retry'],
          [mediaReads.length > 0 && details.mediaReads.keyInHeader === mediaReads.length && details.mediaReads.keyInUrl.length === 0,
            'AC-005 every media read carries the phone\'s key in its header; no URL carries a key'],
          [details.refused.length === 0 && details.mainFrameNodeNavigations.length === 0, 'no refusal and no main-frame node navigation'],
        ].filter(([ok]) => !ok).map(([, label]) => label);
        assert(failures.length === 0, failures.join('; '), details);
        return details;
      });

      // ---- MSP-91, MSP-92 (autobyteus-572, API/E2E) ------------------------------------------------------------------------
      const cdp = await page.context().newCDPSession(page);
      const network = (mode) => cdp.send('Network.emulateNetworkConditions', mode === 'slow'
        ? { offline: false, latency: 80, downloadThroughput: 8000 * 1024 / 8, uploadThroughput: 8000 * 1024 / 8 }
        : mode === 'offline' ? { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }
          : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      /** What a media viewer (`selector`) shows now. */
      const mediaState = (selector) => page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { viewer: false };
        const element = el.querySelector('video, audio');
        return { viewer: true, text: el.innerText.replace(/\s+/g, ' ').slice(0, 200),
          loading: Boolean(el.querySelector('[data-testid="media-loading-state"], [role="status"]')),
          progress: el.querySelector('[data-testid="media-loading-progress"]')?.textContent?.trim() ?? null,
          alert: el.querySelector('[role="alert"], [data-testid="mobile-file-preview-error"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
          retry: Boolean(el.querySelector('.retry-button')),
          media: element ? { tag: element.tagName.toLowerCase(), blob: element.src.startsWith('blob:'), readyState: element.readyState, error: element.error?.code ?? null,
            duration: Number.isFinite(element.duration) ? Math.round(element.duration * 10) / 10 : null } : null };
      }, selector);
      /** Samples the viewer every 100 ms until `done(state)` or the time is up; returns the timeline and the last state. */
      const sample = async (selector, done, ms = 60_000, onEach = async () => undefined) => {
        const started = Date.now(); const timeline = []; let last = ''; let state = null;
        while (Date.now() - started < ms) {
          state = await mediaState(selector);
          const signature = JSON.stringify(state);
          if (signature !== last) { timeline.push({ at: Date.now() - started, ...state }); last = signature; }
          await onEach(state, Date.now() - started);
          if (done(state)) break;
          await sleep(100);
        }
        return { state, timeline, notAvailableShown: timeline.some((entry) => /URL is not available|not available/i.test(entry.text ?? '')) };
      };
      const plays = (state, seconds) => Boolean(state?.media && state.media.blob && state.media.readyState >= 1 && state.media.error === null && Math.abs((state.media.duration ?? 0) - seconds) < 1);
      const VIEWER = '[data-testid="mobile-file-viewer"]';
      const backToConversation = async () => { await page.goBack(); await waitFor('back to the conversation', conversationShown, 15_000).catch(() => undefined); };

      await runCase('MSP-91', async () => {
        currentCase = 'MSP-91';
        const outside = path.join(epsilon.dataDir, '..', 'outside-media-572');
        const media = { inside: path.join(workspace, 'media', 'retry-572.mp4'), outside: path.join(outside, 'retry-572-out.mp4') };
        const size = await makeMedia('big', media.inside, media.outside);
        await linkMessage('RETRY-572', [['retry-572.mp4', media.inside], ['retry-572-out.mp4', media.outside]]);
        await toList();
        await openRun(`agent:${run}`, 'RETRY-572');
        const from = Date.now();

        /** A tap on a big video on the slow link; the node killed once it has loaded for 2.5 s, started again once the viewer failed. */
        const failMidway = async (label, control) => {
          await network('slow');
          await control.scrollIntoViewIfNeeded();
          await control.tap();
          let wentOffline = null;
          const run = await sample(VIEWER, (state) => Boolean(state.alert) || plays(state, 20), 60_000, async (state, at) => {
            if (wentOffline === null && state.loading && at > 2_500) {
              offlineWindow.on = true;
              epsilon.child.kill('SIGKILL');
              wentOffline = at;
              await shot(page, `MSP-91-${label}-node-stopped`);
            }
          });
          await shot(page, `MSP-91-${label}-failed`);
          await network('fast');
          await epsilon.start();
          // The user taps Retry once the node is back and serves the file again. Right after a restart the node answers
          // a read of the run's folder 404 ("non-existent workspace") until it has registered that folder again.
          const url = net.filter((entry) => /^\/rest\/(workspaces\/[^/]+\/content|node-files\/content)$/.test(entry.path)).at(-1)?.request.url() ?? null;
          const key = await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('autobyteus.remote_access.mobile_session') ?? 'null'); return s?.credential ?? s?.token ?? s?.accessToken ?? null; } catch { return null; } });
          const back = Date.now(); let servedAfterMs = null; const readsAfterRestart = [];
          while (url && key && Date.now() - back < 60_000) {
            const response = await fetch(url.replace(phoneOrigin, epsilon.baseUrl), { method: 'GET', headers: { authorization: `Bearer ${key}`, host: new URL(phoneOrigin).host } }).catch(() => null);
            const statusCode = response?.status ?? null; await response?.body?.cancel().catch(() => undefined);
            if (readsAfterRestart.at(-1)?.[1] !== statusCode) readsAfterRestart.push([Date.now() - back, statusCode]);
            if (statusCode === 200) { servedAfterMs = Date.now() - back; break; }
            await sleep(500);
          }
          return { ...run, wentOffline, servedAfterMs, readsAfterRestart, progressBeforeOffline: [...new Set(run.timeline.map((entry) => entry.progress).filter(Boolean))].slice(-3) };
        };

        // Inside the folder: the player's Retry.
        const inside = await failMidway('inside', linkControl(media.inside).last());
        let insideRetry = null;
        if (inside.state?.retry) {
          // Retry on the same slow link, so its loading view and progress show again.
          await network('slow');
          await page.locator(`${VIEWER} .retry-button`).first().click();
          insideRetry = await sample(VIEWER, (state) => plays(state, 20) || Boolean(state.alert), 60_000);
          await shot(page, 'MSP-91-inside-after-retry');
        }
        offlineWindow.on = false;
        await network('fast');
        await backToConversation();

        // Outside the folder: the node-file route; the phone viewer's own Retry (D-7), on the same slow link.
        const outsideRun = await failMidway('outside', linkControl(media.outside).last());
        let outsideAgain = null;
        if (outsideRun.state?.retry) {
          await network('slow');
          await page.locator(`${VIEWER} .retry-button`).first().click();
          outsideAgain = await sample(VIEWER, (state) => plays(state, 20) || Boolean(state.alert), 60_000);
          await shot(page, 'MSP-91-outside-after-retry');
        }
        offlineWindow.on = false;
        await network('fast');
        await backToConversation();

        // The node's gate and path rules on the media routes (the probe's own requests, as any client).
        const read = net.find((entry) => entry.at >= from && /^\/rest\/workspaces\/[^/]+\/content$/.test(entry.path))?.request.url() ?? null;
        const nodeRead = net.find((entry) => entry.at >= from && entry.path === '/rest/node-files/content')?.request.url() ?? null;
        const phoneKey = await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('autobyteus.remote_access.mobile_session') ?? 'null'); return s?.credential ?? s?.token ?? s?.accessToken ?? null; } catch { return null; } });
        const status = async (url, key) => { if (!url) return null; const response = await fetch(url.replace(phoneOrigin, epsilon.baseUrl), { headers: key ? { authorization: `Bearer ${key}`, host: new URL(phoneOrigin).host } : { host: new URL(phoneOrigin).host } }); const bytes = (await response.arrayBuffer()).byteLength; return { status: response.status, bytes, length: response.headers.get('content-length') }; };
        const climbing = read ? (() => { const u = new URL(read); u.searchParams.set('path', '../outside-media-572/retry-572-out.mp4'); return u.toString(); })() : null;
        const gate = {
          workspaceWithKey: await status(read, phoneKey), workspaceNoKey: await status(read, null), nodeFileNoKey: await status(nodeRead, null),
          climbingWithKey: await status(climbing, phoneKey), keyRead: Boolean(phoneKey),
        };

        // A phone in Chinese.
        const zhContext = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'zh-CN', timezoneId: 'UTC' });
        await zhContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
        const zh = await zhContext.newPage();
        watchBrowser(zh, 'phone-epsilon-zh', phoneOrigin, () => 'MSP-91');
        const zhPairing = await epsilon.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Epsilon Test Node', trustedPrivateHttpAcknowledged: true });
        assert(zhPairing.status === 201 && zhPairing.body.mobileUrl, 'a pairing session for the second phone', zhPairing.status);
        await zh.goto(zhPairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await zh.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
        await zh.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
        await zh.locator(`[data-testid="mobile-run-row-agent:${run}"] [data-testid="mobile-run-open"]`).click();
        const zhConv = zh.locator('[data-testid="mobile-run-conversation"]');
        await waitFor('RETRY-572 on the Chinese phone', async () => (await zhConv.innerText().catch(() => '')).includes('RETRY-572'), 30_000);
        const zhCdp = await zhContext.newCDPSession(zh);
        await zhCdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 8000 * 1024 / 8, uploadThroughput: 8000 * 1024 / 8 });
        const zhLink = zhConv.locator(`[data-event-monitor-file-action-control="true"][title="${media.inside}"]`).last();
        await zhLink.scrollIntoViewIfNeeded();
        await zhLink.tap();
        const zhStarted = Date.now(); const zhTimeline = []; let zhLast = ''; let zhState = null; let zhShot = false;
        while (Date.now() - zhStarted < 60_000) {
          zhState = await zh.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return { viewer: false }; const m = el.querySelector('video'); return { text: el.innerText.replace(/\s+/g, ' ').slice(0, 160),
            progress: el.querySelector('[data-testid="media-loading-progress"]')?.textContent?.trim() ?? null, readyState: m?.readyState ?? null, blob: m ? m.src.startsWith('blob:') : null,
            duration: m && Number.isFinite(m.duration) ? Math.round(m.duration * 10) / 10 : null }; }, VIEWER);
          const sig = JSON.stringify(zhState); if (sig !== zhLast) { zhTimeline.push({ at: Date.now() - zhStarted, ...zhState }); zhLast = sig; }
          if (!zhShot && zhState.progress && Date.now() - zhStarted > 3_000) { zhShot = true; await shot(zh, 'MSP-91-zh-CN-loading'); }
          if (zhState.readyState >= 1) break;
          await sleep(100);
        }
        await shot(zh, 'MSP-91-zh-CN-playing');
        await zhCdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        await zhContext.close();
        const zhProgress = [...new Set(zhTimeline.map((entry) => entry.progress).filter(Boolean))];
        const zhSamples = zhProgress.map((text) => /^(\d+(?:\.\d)?) \/ (\d+(?:\.\d)?) MB$/.exec(text)).filter(Boolean).map((m) => Number(m[1]));

        const trim = (r) => r && ({ ...r, timeline: r.timeline.filter((_, i, all) => i < 4 || i > all.length - 4) });
        const details = { size, inside: trim(inside), insideRetry: trim(insideRetry), outside: trim(outsideRun), outsideAgain: trim(outsideAgain), gate,
          zh: { loadingWords: zhTimeline.some((entry) => (entry.text ?? '').includes('正在加载视频…')), progress: zhProgress.slice(0, 3).concat(zhProgress.slice(-3)), samples: zhSamples.length,
            played: Boolean(zhState?.readyState >= 1 && zhState.blob && Math.abs((zhState.duration ?? 0) - 20) < 1), notAvailable: zhTimeline.some((entry) => /不可用|not available/i.test(entry.text ?? '')) } };
        const failures = [
          [inside.wentOffline !== null && Boolean(inside.state?.alert) && !INTERNAL_WORDS.test(inside.state.alert) && inside.state.retry && !inside.notAvailableShown,
            'AC-006 inside: the network lost mid-download shows a plain message with Retry, never "not available"'],
          [Boolean(insideRetry) && plays(insideRetry.state, 20) && insideRetry.timeline.some((entry) => entry.loading) && !insideRetry.notAvailableShown,
            'AC-001 inside: Retry shows the loading view again and the video plays'],
          [outsideRun.wentOffline !== null && Boolean(outsideRun.state?.alert) && !INTERNAL_WORDS.test(outsideRun.state.alert) && !outsideRun.notAvailableShown,
            'AC-006 outside: the network lost mid-download shows a plain message, never "not available"'],
          [Boolean(outsideRun.state?.retry), 'REQ-005, AC-006 outside: the failure offers Retry (a plain message with Retry)'],
          [Boolean(outsideAgain) && plays(outsideAgain.state, 20) && outsideAgain.timeline.some((entry) => entry.loading) && !outsideAgain.notAvailableShown,
            'outside: Retry shows the loading view again and the video plays'],
          [gate.keyRead && gate.workspaceWithKey?.status === 200 && gate.workspaceWithKey.length === String(size) && gate.workspaceNoKey?.status === 401 && gate.nodeFileNoKey?.status === 401,
            'AC-005 the media routes: the phone\'s key reads (Content-Length = the file\'s size); no key → 401 on the workspace and node-file routes'],
          [gate.climbingWithKey && gate.climbingWithKey.status >= 400 && gate.climbingWithKey.bytes < 1000, 'AC-005 the path rules: a path climbing out of the folder is refused, no file bytes'],
          [details.zh.loadingWords && zhSamples.length >= 5 && zhSamples.at(-1) > zhSamples[0] && details.zh.played && !details.zh.notAvailable,
            'zh-CN: "正在加载视频…" with "x / y MB" rising, then the video plays'],
        ].filter(([ok]) => !ok).map(([, label]) => label);
        assert(failures.length === 0, failures.join('; '), details);
        return details;
      });

      await runCase('MSP-92', async () => {
        currentCase = 'MSP-92';
        // A Team on epsilon whose lead sends its mate a message with a video as its reference.
        const leadDef = await def(epsilon, 'Ref Lead');
        const mateDef = await def(epsilon, 'Ref Mate');
        const teamDef = (await epsilon.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Clip Team', description: 'Clip Team (file open probe)',
          instructions: 'Work together.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: leadDef, refScope: 'SHARED' }, { memberName: 'mate', ref: mateDef, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
        const config = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
        const team = (await epsilon.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: teamDef,
          teamConfigs: [{ teamAddress: '/', ...config }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: leadDef, ...config }, { memberAddress: '/mate', agentDefinitionId: mateDef, ...config }] } })).createAgentTeamRun;
        assert(team.success, team.message);
        const tree = (await epsilon.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree;
        const lead = tree.root_team.members.find((m) => m.address === '/lead').agent_run_id;
        const clip = path.join(workspace, 'media', 'ref-572.mp4');
        const size = await makeMedia('big', clip);
        const leadProjection = async () => JSON.stringify((await epsilon.gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: team.teamRunId, a: lead })).getTeamMemberRunProjection?.conversation ?? []);
        const socket = new WebSocket(ownerSocketUrl(`${epsilon.baseUrl.replace(/^http/, 'ws')}/ws/agent-team/${team.teamRunId}`));
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        await sleep(1_000);
        socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: lead,
          content: `CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/mate', content: 'The cut is ready. Marker REF-572.', reference_files: [clip] } })}` } }));
        await waitFor('the lead\'s send_message_to', async () => (await leadProjection()).includes('CALLED:'), 60_000);
        socket.close();

        await toList();
        await page.locator(`[data-testid="mobile-run-row-team:${team.teamRunId}"] [data-testid="mobile-run-open"]`).click();
        await waitFor('the Team\'s run screen', async () => (await page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000);
        await page.locator('[data-testid="mobile-run-menu-button"]').click();
        await page.locator('[data-testid="mobile-run-menu-messages"]').click();
        await page.locator('[data-testid="mobile-messages"]').waitFor({ timeout: 20_000 });
        const reference = page.locator('[data-testid="mobile-team-reference-row"]').filter({ hasText: 'ref-572.mp4' }).first();
        await reference.waitFor({ timeout: 30_000 });
        await network('slow');
        await reference.click();
        const REF = '[data-testid="mobile-team-reference-viewer"]';
        let loadingShot = false;
        const run = await sample(REF, (state) => plays(state, 20) || Boolean(state.alert), 60_000, async (state, at) => {
          if (!loadingShot && at > 2_000 && !state.media) { loadingShot = true; await shot(page, 'MSP-92-reference-loading'); }
        });
        await network('fast');
        await shot(page, 'MSP-92-reference-playing');
        await page.locator(`${REF} [data-testid="mobile-screen-back"]`).click().catch(() => undefined);
        const loadingTexts = [...new Set(run.timeline.filter((entry) => !entry.media).map((entry) => entry.text))];
        const details = { size, teamRunId: team.teamRunId, loadingTexts, playersLoadingView: run.timeline.some((entry) => entry.progress), final: run.state, notAvailableShown: run.notAvailableShown,
          timeline: run.timeline.filter((_, i, all) => i < 4 || i > all.length - 4) };
        assert(plays(run.state, 20), 'the Team reference video plays', details);
        assert(!run.notAvailableShown && loadingTexts.some((text) => /Loading reference file/.test(text ?? '')), 'while it loads the reference viewer says so ("Loading reference file..."), never "not available"', details);
        return details;
      });
    } finally {
      if (phoneBrowser) await phoneBrowser.close().catch(() => undefined);
      await epsilon.stop();
      await zeta.stop();
    }
  }

  if (wants('MSP-31')) {
    const { browser, alpha, stack, desktopRunsView } = probe;
    await runCase('MSP-31', async () => {
      const target = path.join(stack.workspace, 'docs', 'reopen-450.md');
      await fs.writeFile(target, '# Reopen\n\nVERSION-ONE-1111 the first draft.\n');
      const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
      assert(created.success, created.message);
      const run = created.runId;
      const linkMessage = async (marker) => {
        await stack.agentSay(run, `ECHO_INPUT ${marker} Read [reopen-450.md](${target})`);
        await waitFor(`the echo of ${marker}`, async () => { const text = await stack.projection(run); return text.includes('ECHO:') && text.includes(marker); }, 60_000);
      };
      await linkMessage('REOPEN-ONE');
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
      await attachToBrowserContext(context);
      await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
      const page = await context.newPage();
      watchBrowser(page, 'desktop', stack.frontendUrl, () => 'MSP-31');
      try {
        await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
        await page.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
        await sleep(3_000);
        await page.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
        await desktopRunsView(page);
        const showOlder = page.locator('[data-test="run-list-show-older"]');
        if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
        await page.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
        const link = page.locator(`[data-event-monitor-file-action-control="true"][title="${target}"]`);
        await link.first().waitFor({ timeout: 60_000 });
        const viewerText = async () => (await page.locator('#contentViewer:visible').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
        const versionShown = async () => (( await viewerText()).match(/VERSION-[A-Z]+-\d{4}/g) ?? []).join(',') || 'none';
        const openAndRead = async (control, want) => { await control.scrollIntoViewIfNeeded(); await control.click();
          try { await waitFor(`${want} in the viewer`, async () => (await versionShown()).includes(want), 10_000); } catch { /* recorded */ } return versionShown(); };
        const first = await openAndRead(link.first(), 'VERSION-ONE');
        await fs.writeFile(target, '# Reopen\n\nVERSION-TWO-2222 the rewritten post.\n');
        await linkMessage('REOPEN-TWO');
        await waitFor('the second link on the desktop', async () => (await link.count()) >= 2, 30_000);
        const newLink = await openAndRead(link.last(), 'VERSION-TWO');
        const sameOldLink = await openAndRead(link.first(), 'VERSION-TWO');
        await page.screenshot({ path: path.join(outputDir, 'MSP-31-desktop-links.png') });
        // The Files tab of the run's workspace.
        await page.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click();
        const files = page.locator('[data-test="right-side-files-panel"]');
        // A tree row's visible name (a folder's row also holds its children and a hidden drag-preview copy of the name).
        const treeName = name => files.locator('.file-item span.select-none').filter({ hasText: new RegExp(`^${name.replace(/[.]/g, '\\.')}$`) }).first();
        await treeName('docs').waitFor({ timeout: 30_000 });
        if (!(await treeName('reopen-450.md').isVisible().catch(() => false))) await treeName('docs').click();
        await treeName('reopen-450.md').waitFor({ timeout: 30_000 });
        await treeName('reopen-450.md').click();
        try { await waitFor('VERSION-TWO from the Files tab', async () => (await versionShown()).includes('VERSION-TWO'), 10_000); } catch { /* recorded */ }
        const filesTab = await versionShown();
        await page.screenshot({ path: path.join(outputDir, 'MSP-31-desktop-files-tab.png') });
        // An unsaved edit in the editor survives another open of the same file.
        // The edit toggle of the open file's tab (FileExplorerTabs renders its tab bar twice; the one on screen is used).
        const editToggles = () => page.evaluate(() => [...document.querySelectorAll('[title="Edit Mode"]')].map((el) => {
          const r = el.getBoundingClientRect(); return { width: Math.round(r.width), height: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth };
        }));
        const clickEditMode = async () => {
          const toggles = await editToggles();
          const onScreen = toggles.find(t => t.inView);
          if (onScreen) await page.mouse.click(onScreen.x + onScreen.width / 2, onScreen.y + onScreen.height / 2);
          return toggles;
        };
        const togglesSeen = await clickEditMode();
        await sleep(800);
        const editor = page.locator('#contentViewer:visible .monaco-editor .view-lines').first();
        try { await editor.waitFor({ timeout: 30_000 }); } catch (error) {
          await page.screenshot({ path: path.join(outputDir, 'MSP-31-desktop-no-editor.png') });
          throw Object.assign(error, { details: { first, newLink, sameOldLink, filesTab, editToggles: togglesSeen } });
        }
        await editor.click();
        await page.keyboard.press('ControlOrMeta+End');
        await page.keyboard.type(' UNSAVED-EDIT-450');
        await sleep(500);
        const typed = (await editor.innerText()).replace(/\s+/g, ' ');
        await fs.writeFile(target, '# Reopen\n\nVERSION-THREE-3333 rewritten while an edit is open.\n');
        // Another open of the same file through its link (a link opens the tab read-only, in preview), then through the Files
        // tab (editable): the editor still holds the unsaved edit.
        await link.first().click();
        await sleep(2_500);
        const previewAfterLink = await versionShown();
        await treeName('reopen-450.md').click();
        await sleep(1_500);
        if (!(await page.locator('#contentViewer:visible .monaco-editor').count())) await clickEditMode();
        await editor.waitFor({ timeout: 30_000 });
        const afterReopen = (await editor.innerText()).replace(/\s+/g, ' ');
        await page.screenshot({ path: path.join(outputDir, 'MSP-31-desktop-unsaved-edit.png') });
        const details = { first, newLink, sameOldLink, filesTab, editToggles: togglesSeen, unsavedEdit: { typed: typed.includes('UNSAVED-EDIT-450'), previewAfterLink, keptAfterRewriteAndOpen: afterReopen.includes('UNSAVED-EDIT-450'), editorAfter: afterReopen.slice(0, 200) } };
        assert(first.includes('VERSION-ONE'), 'the first open shows VERSION-ONE', details);
        assert(newLink === 'VERSION-TWO-2222' && sameOldLink === 'VERSION-TWO-2222' && filesTab === 'VERSION-TWO-2222', 'the new link, the same old link and the Files tab each show VERSION-TWO (AC-003)', details);
        assert(details.unsavedEdit.typed && details.unsavedEdit.keptAfterRewriteAndOpen, 'an unsaved edit survives another open of the same file (AC-003)', details);
        return details;
      } finally {
        await context.close().catch(() => undefined);
      }
    });
  }

  if (wants('MSP-37')) {
    const { browser, alpha, stack, desktopRunsView } = probe;
    await runCase('MSP-37', async () => {
      // Files outside the run's folder, on the node's computer.
      const outsideDir = path.join(path.dirname(stack.workspace), 'outside-471');
      const notesPath = path.join(outsideDir, 'notes-471.md');
      const chartPath = path.join(outsideDir, 'chart-471.png');
      const missingPath = path.join(outsideDir, 'gone-471.md');
      const folderPath = path.join(outsideDir, 'reports-471.md');
      const notes = '# NOTES-471\n\nNODE-FILE-ON-DESKTOP-471 opened from outside the run folder.\n';
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(notesPath, notes);
      await fs.writeFile(chartPath, png(5, 2));
      const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
      assert(created.success, created.message);
      const run = created.runId;
      await stack.agentSay(run, `ECHO_INPUT NODE-FILES-471 [notes-471.md](${notesPath}) [chart-471.png](${chartPath}) [gone-471.md](${missingPath}) [reports-471.md](${folderPath})`);
      await waitFor('the echo of NODE-FILES-471', async () => { const text = await stack.projection(run); return text.includes('ECHO:') && text.includes('NODE-FILES-471'); }, 60_000);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
      await attachToBrowserContext(context);
      await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
      const page = await context.newPage();
      // The missing path (404 NODE_FILE_NOT_FOUND) and the folder (400 NODE_FILE_IS_FOLDER) are refused on purpose.
      watchBrowser(page, 'desktop', stack.frontendUrl, () => 'MSP-37', {
        test: (line, sourceUrl) => /: Failed to load resource: the server responded with a status of 40[04] \((Not Found|Bad Request)\)$/.test(line)
          && /\/rest\/node-files\/content\?path=.*(gone-471|reports-471)\.md$/.test(decodeURIComponent(sourceUrl)),
        cause: 'the refused node files of AC-002 (the missing path and the folder)',
      });
      const nodeFileRequests = [];
      page.on('response', response => {
        const url = new URL(response.url());
        if (url.pathname.endsWith('/rest/node-files/content')) nodeFileRequests.push({ path: url.searchParams.get('path'), status: response.status() });
      });
      try {
        await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
        // The first load lets the dev server finish its bundles (as MSP-31).
        await page.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
        await sleep(3_000);
        await page.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
        await desktopRunsView(page);
        const showOlder = page.locator('[data-test="run-list-show-older"]');
        if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
        await page.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
        const link = filePath => page.locator(`[data-event-monitor-file-action-control="true"][title="${filePath}"]`).last();
        await link(notesPath).waitFor({ timeout: 60_000 });
        const viewer = page.locator('#contentViewer:visible').first();
        const open = async (filePath, name, settled) => {
          await link(filePath).scrollIntoViewIfNeeded();
          await link(filePath).click();
          await waitFor(`${name} in the Files panel`, settled, 20_000).catch(() => undefined);
          await sleep(500);
          const facts = {
            text: (await viewer.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300),
            alert: (await viewer.locator('[role="alert"]').innerText().catch(() => '')).trim(),
            image: await viewer.locator('img[src^="blob:"]').count(),
            editControls: await viewer.getByRole('button', { name: /^(Edit|Save)$/ }).count() + await viewer.locator('[title="Edit Mode"]:visible').count(),
            status: (await page.locator('[data-testid="event-monitor-file-preview-status"]').innerText().catch(() => '')).trim(),
          };
          const body = viewer.locator('.monaco-editor, .markdown-body, [data-testid="markdown-preview"]').first();
          if (await body.count()) { await body.click({ position: { x: 40, y: 20 } }).catch(() => undefined); await page.keyboard.type('TYPED-471', { delay: 10 }).catch(() => undefined); await sleep(300); }
          facts.typedChanges = (await viewer.innerText().catch(() => '')).includes('TYPED-471');
          await shot(page, `MSP-37-${name}`);
          return facts;
        };
        const viewerHas = text => async () => (await viewer.innerText().catch(() => '')).includes(text);
        const markdown = await open(notesPath, 'markdown', viewerHas('NODE-FILE-ON-DESKTOP-471'));
        const image = await open(chartPath, 'image', async () => (await viewer.locator('img[src^="blob:"]').count()) > 0);
        const missing = await open(missingPath, 'missing', viewerHas('not found'));
        const folder = await open(folderPath, 'folder', viewerHas('is a folder'));
        const details = { markdown, image, missing, folder, nodeFileRequests: nodeFileRequests.map(r => ({ file: path.basename(r.path ?? ''), status: r.status })),
          hostWorkspaceText: (await page.locator('body').innerText()).includes('host workspace'),
          unchanged: (await fs.readFile(notesPath, 'utf8')) === notes };
        const readOnly = facts => facts.editControls === 0 && !facts.typedChanges && facts.status === '';
        assert(markdown.text.includes('NODE-FILE-ON-DESKTOP-471') && readOnly(markdown), 'AC-001 a Markdown file outside the run folder opens read-only in the Files panel', details);
        assert(image.image === 1 && readOnly(image), 'AC-001 a PNG outside the run folder shows in the Files panel', details);
        // The Files panel's alert is its "Error!" heading and the reason.
        assert(missing.alert.endsWith('This file was not found on the computer.'), 'AC-002 a missing path says so', details);
        assert(folder.alert.endsWith('This path is a folder, not a file.'), 'AC-002 a folder says so', details);
        assert(['notes-471.md', 'chart-471.png', 'gone-471.md', 'reports-471.md'].every(file => details.nodeFileRequests.some(r => r.file === file)), 'each opens through the node-file route', details);
        assert(!details.hostWorkspaceText && details.unchanged, 'no "host workspace" text; the file is unchanged', details);
        return details;
      } finally {
        await context.close().catch(() => undefined);
      }
    });
  }
  if (wants('MSP-90')) {
    const { browser, alpha, stack, desktopRunsView } = probe;
    await runCase('MSP-90', async () => {
      // autobyteus-572 AC-004: a desktop window (`nuxt dev` against alpha, the owner credential on its requests as the desktop
      // app attaches it) plays the same media links: in the run's folder (the player gets the node URL) and outside it (the
      // Files panel's node file).
      const outside = path.join(path.dirname(stack.workspace), 'outside-572');
      const media = { insideVideo: path.join(stack.workspace, 'media-572', 'clip-572.mp4'), insideAudio: path.join(stack.workspace, 'media-572', 'tone-572.mp3'),
        outsideVideo: path.join(outside, 'clip-572-out.mp4'), outsideAudio: path.join(outside, 'tone-572-out.mp3') };
      await makeMedia('clip', media.insideVideo, media.outsideVideo);
      await makeMedia('tone', media.insideAudio, media.outsideAudio);
      const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
      assert(created.success, created.message);
      const run = created.runId;
      await stack.agentSay(run, `ECHO_INPUT MEDIA-DESKTOP-572 ${Object.values(media).map(file => `[${path.basename(file)}](${file})`).join(' ')}`);
      await waitFor('the echo of MEDIA-DESKTOP-572', async () => { const text = await stack.projection(run); return text.includes('ECHO:') && text.includes('MEDIA-DESKTOP-572'); }, 60_000);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
      await attachToBrowserContext(context);
      await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
      const page = await context.newPage();
      watchBrowser(page, 'desktop', stack.frontendUrl, () => 'MSP-90');
      const mediaReads = [];
      page.on('response', response => {
        const url = new URL(response.url());
        if (/\/rest\/(workspaces\/[^/]+\/content|node-files\/content)$/.test(url.pathname)) mediaReads.push({ route: url.pathname.replace(/workspaces\/[^/]+/, 'workspaces/…'), file: path.basename(url.searchParams.get('path') ?? ''), status: response.status() });
      });
      try {
        await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
        await page.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
        await sleep(3_000);
        await page.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
        await desktopRunsView(page);
        const showOlder = page.locator('[data-test="run-list-show-older"]');
        if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
        await page.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
        const link = filePath => page.locator(`[data-event-monitor-file-action-control="true"][title="${filePath}"]`).last();
        await link(media.insideVideo).waitFor({ timeout: 60_000 });
        const viewer = page.locator('#contentViewer:visible').first();
        const facts = {};
        for (const [key, filePath] of Object.entries(media)) {
          const tag = key.endsWith('Video') ? 'video' : 'audio';
          await link(filePath).scrollIntoViewIfNeeded();
          await link(filePath).click();
          const element = () => viewer.locator(tag).first();
          let shown = null;
          await waitFor(`${key} plays in the Files panel`, async () => {
            if (!(await element().count())) return false;
            shown = await element().evaluate(el => ({ src: el.src.startsWith('blob:') ? 'blob' : el.src.startsWith('http') ? 'node URL' : el.src.split(':')[0], readyState: el.readyState,
              error: el.error?.code ?? null, duration: Number.isFinite(el.duration) ? Math.round(el.duration * 10) / 10 : null }));
            return shown.readyState >= 1 || shown.error !== null;
          }, 30_000).catch(() => undefined);
          facts[key] = { ...(shown ?? { readyState: null }), text: (await viewer.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160) };
          await shot(page, `MSP-90-${key}`);
        }
        const details = { media: facts, mediaReads };
        const plays = fact => fact.readyState >= 1 && fact.error === null && Math.abs((fact.duration ?? 0) - 3) < 1 && !/URL is not available|could not be played/.test(fact.text);
        assert(Object.values(facts).every(plays), 'AC-004 the desktop window plays video and audio links in the run\'s folder and outside it', details);
        assert(['clip-572-out.mp4', 'tone-572-out.mp3'].every(file => mediaReads.some(read => read.file === file && read.route === '/rest/node-files/content' && read.status === 200)),
          'the files outside the folder are read through the node-file route', details);
        return details;
      } finally {
        await context.close().catch(() => undefined);
      }
    });
  }
};
