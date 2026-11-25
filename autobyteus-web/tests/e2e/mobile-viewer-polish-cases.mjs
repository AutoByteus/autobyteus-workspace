// The file viewers' polish (autobyteus-647): an empty media reference, one pdf.js worker for every PDF, and the run view's
// file status line. Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after the
// file-viewer media cases (`--cases=MSP-115,MSP-116,MSP-117,MSP-118` runs only these). The editor without line numbers
// (AC-001) is measured by the word-wrap cases (MSP-108, MSP-109, MSP-110).
//
// On alpha, with test data only:
//   - `viewer-polish-647/` in the probe workspace: three PDFs, alpha (3 pages), beta (2) and gamma (4);
//   - two agent runs in the workspace: one whose answer links a file out of the run's folder (`../outside-647.md`), one
//     whose Files tab opens the PDFs;
//   - a Team whose lead sends its mate one message referencing a zero-byte video and a video deleted after the message.
//
// Cases:
//   MSP-115 AC-002  The empty video reference (zero bytes; the node answers its probe 416 `bytes */0`): on the desktop
//                  window (`nuxt dev`, 1440×900, the Team's "Team" tab) and on the phone (production bundle at /mobile,
//                  390×844, the Team's Messages screen), it opens as an empty file: the viewer shows its video player
//                  and no error. The deleted reference still says it is unavailable.
//   MSP-116 AC-005  The desktop window: alpha, beta and gamma opened one after another from the Files tab's tree, all files
//                  closed before each round ("Close all files"), five rounds; then switches between the open tabs. Each
//                  PDF draws all its pages, with no load error; one worker for the session (a `nuxt dev` window loads the
//                  worker by URL, so its blob count is recorded, not asserted).
//   MSP-117 AC-005  The phone: alpha, beta and gamma opened one after another from the run's Files screen, back to the list
//                  between them, three rounds, in one page session. Each PDF draws all its pages, with no load error; one
//                  worker and at most one `text/javascript` blob URL for the session (`URL.createObjectURL` and `Worker`
//                  instrumented before the page's first script).
//   MSP-118 AC-006  The desktop window: in the first run the out-of-folder link shows the status line ("could not be
//                  opened"); the second run selected, the line is gone; the first run again, still gone.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { attachToBrowserContext, ownerSocketUrl } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';
import { multiPagePdf } from './mobile-file-zoom-cases.mjs';

const DIR = 'viewer-polish-647';
const PHONE_HOST = '192.168.77.27';
const PDFS = Object.freeze({ 'alpha-647.pdf': 3, 'beta-647.pdf': 2, 'gamma-647.pdf': 4 });
const FAILED = 'The file preview could not be opened.';

/**
 * Before the page's first script, in every frame: counts `URL.createObjectURL` by the blob's type and each `Worker` made
 * (its URL's scheme and type), and worker errors (the method of autobyteus-471). A sandboxed frame may refuse; it is skipped.
 */
const instrument = () => {
  try {
    if (window.__viewerPolish647) return;
    const record = { blobs: [], workers: [], workerErrors: 0 };
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object) => { const url = create(object); record.blobs.push({ type: object?.type ?? typeof object, size: object?.size ?? null }); return url; };
    const NativeWorker = window.Worker;
    if (NativeWorker) {
      const CountedWorker = function (url, options) {
        const worker = new NativeWorker(url, options);
        record.workers.push({ scheme: String(url).split(':')[0], type: options?.type ?? 'classic' });
        worker.addEventListener('error', () => { record.workerErrors += 1; });
        return worker;
      };
      CountedWorker.prototype = NativeWorker.prototype;
      window.Worker = CountedWorker;
    }
    window.__viewerPolish647 = record;
  } catch { /* a sandboxed frame */ }
};

/** In the page: the instrumentation's counts. */
const counts = () => {
  const record = window.__viewerPolish647;
  if (!record) return null;
  return { workers: record.workers, workerErrors: record.workerErrors, jsBlobs: record.blobs.filter(b => /javascript/.test(b.type)).length,
    blobTypes: record.blobs.map(b => b.type), globalWorkerOptions: { workerPort: Boolean(globalThis.pdfjsLib?.GlobalWorkerOptions?.workerPort), workerSrc: globalThis.pdfjsLib?.GlobalWorkerOptions?.workerSrc ?? null } };
};

/** In the page: the drawn pages of the PDF viewer inside `scope`, and its error, if any. */
const pdfState = (scope) => {
  const canvases = [...scope.querySelectorAll('.vue-pdf-embed__page canvas')].filter(c => c.width > 0 && c.getBoundingClientRect().width > 0);
  const alert = scope.querySelector('[data-testid="pdf-viewer-scroller"] [role="alert"]');
  return { pages: canvases.length, error: alert ? alert.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null };
};

/**
 * @param probe `runCase`, `chromium`, `executablePath`, `outputDir`, `evidence`, `selected`, `sleep`, `waitFor`, `assert`, `redact`, `browser`, `alpha`,
 *   `stack`, `desktopRunsView`.
 */
export const runViewerPolishCases = async (probe) => {
  const { runCase, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView } = probe;
  const ids = ['MSP-115', 'MSP-116', 'MSP-117', 'MSP-118'];
  if (selected && !ids.some(id => selected.has(id))) return;
  let currentCase = 'viewer-polish-setup';
  const dir = path.join(stack.workspace, DIR);
  await fs.mkdir(dir, { recursive: true });
  for (const [name, pages] of Object.entries(PDFS)) await fs.writeFile(path.join(dir, name), multiPagePdf(pages, name.replace(/\.pdf$/, '').toUpperCase()));
  const newRun = async () => {
    const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
    assert(created.success, created.message);
    return created.runId;
  };
  // The first run's answer links a file out of the run's folder: opening it fails and says so on the status line.
  const statusRun = await newRun();
  await stack.agentSay(statusRun, 'ECHO_INPUT STATUS-647 [outside](../outside-647.md)');
  await waitFor('the status run\'s answer', async () => { const text = await stack.projection(statusRun); return text.includes('ECHO:') && text.includes('STATUS-647'); }, 60_000);
  const pdfRun = await newRun();
  await stack.agentSay(pdfRun, 'ECHO_INPUT PDF-647 the PDFs are in viewer-polish-647.');
  await waitFor('the PDF run\'s answer', async () => (await stack.projection(pdfRun)).includes('PDF-647'), 60_000);
  evidence.viewerPolish = { statusRun, pdfRun, dir };

  const watch = (page, label, origin) => {
    const line = (text, sourceUrl = '') => {
      const redacted = redact(`${label} console: ${text}`);
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(redacted) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      // By design: the deleted reference's probe answers 404 (shown as "unavailable"), the empty one's 416 (an empty file).
      const reference = currentCase === 'MSP-115' && /status of (404|416)/.test(redacted) && sourceUrl.includes('/references/');
      evidence.browserErrors.push({ case: currentCase, line: redacted, known: favicon || reference, ...(favicon ? { cause: 'the browser\'s favicon request at the origin root (/favicon.ico)' } : {}),
        ...(reference ? { cause: 'a reference probe answered as designed: 404 for the deleted file, 416 bytes */0 for the empty one' } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') line(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => line(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: currentCase, label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
  };
  /** The reference route's requests and answers (status, Content-Range), per page. */
  const referenceLog = (page) => {
    const log = [];
    page.on('response', (response) => {
      if (!response.url().includes('/references/')) return;
      log.push({ case: currentCase, url: response.url().replace(/.*\/messages\//, '…/'), range: response.request().headers().range ?? null, status: response.status(), contentRange: response.headers()['content-range'] ?? null });
    });
    return log;
  };
  const shot = async (page, name) => { await page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined); return `${name}.png`; };
  /** A PDF console line names a load error (vue-pdf-embed's `loading-failed`, pdf.js's worker). */
  const pdfErrorLines = page => evidence.browserErrors.filter(e => e.case === currentCase && e.line.startsWith(page) && /PDF|pdf\.js|PDFWorker|workerSrc/i.test(e.line));

  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  await attachToBrowserContext(deskContext);
  await deskContext.addInitScript(() => { try { localStorage.setItem('autobyteus.localization.preference-mode', 'en'); } catch { /* a sandboxed frame */ } });
  await deskContext.addInitScript(instrument);
  const deskPage = await deskContext.newPage();
  const deskReferences = referenceLog(deskPage);
  const phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const phoneOrigin = `http://${PHONE_HOST}:${alpha.port}`;
  let phone = null;
  let phoneHome = null;
  let phoneReferences = [];
  const files = deskPage.locator('[data-test="right-side-files-panel"]');
  const treeName = name => files.locator('.file-item span.select-none').filter({ hasText: new RegExp(`^${name.replace(/[.]/g, '\\.')}$`) }).first();
  const runRow = run => deskPage.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first();
  let deskReady = false;
  const openDesktop = async () => {
    if (deskReady) return;
    await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
    await deskPage.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(3_000);
    watch(deskPage, 'desktop', stack.frontendUrl);
    await deskPage.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(deskPage);
    const showOlder = deskPage.locator('[data-test="run-list-show-older"]');
    if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
    deskReady = true;
  };
  /** The phone, paired with alpha (once), on its run list; the page is never reloaded after (one session). */
  const openPhone = async () => {
    if (phone) return;
    const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'alpha Phone Access on', settings);
    const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Alpha Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'alpha pairing session for the viewer-polish phone', pairing.status);
    const context = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
    await context.addInitScript(instrument);
    phone = await context.newPage();
    watch(phone, 'phone', phoneOrigin);
    phoneReferences = referenceLog(phone);
    await phone.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await phone.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await phone.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    phoneHome = phone.url();
  };
  /** Back on the phone (the visible screen's Back), until `done`. */
  const phoneBackUntil = async (label, done) => {
    for (let step = 0; step < 4 && !(await done()); step += 1) {
      const back = phone.locator('[data-testid="mobile-screen-back"]:visible').last();
      if (await back.count()) await back.click(); else await phone.goBack();
      await sleep(700);
    }
    assert(await done(), `phone: back to ${label}`);
  };

  try {
    await runCase('MSP-115', async () => {
      currentCase = 'MSP-115';
      // A Team whose lead references a zero-byte video and a video deleted after the message.
      const refs = path.join(stack.workspace, 'refs-647');
      await fs.mkdir(refs, { recursive: true });
      const empty = path.join(refs, 'empty-647.mp4');
      const gone = path.join(refs, 'gone-647.mp4');
      await fs.writeFile(empty, Buffer.alloc(0));
      await fs.writeFile(gone, Buffer.from('a video deleted after the message'));
      const team = (await alpha.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Empty Refs 647', description: 'Empty media reference (autobyteus-647)',
        instructions: 'Work together.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: stack.ids.checker, refScope: 'SHARED' }, { memberName: 'mate', ref: stack.ids.writer, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
      const teamRun = (await alpha.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: team,
        teamConfigs: [{ teamAddress: '/', ...stack.runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: stack.ids.checker, ...stack.runConfig }, { memberAddress: '/mate', agentDefinitionId: stack.ids.writer, ...stack.runConfig }] } })).createAgentTeamRun;
      assert(teamRun.success, teamRun.message);
      const tree = (await alpha.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRun.teamRunId })).getTeamRunResumeConfig.executionTree;
      const lead = tree.root_team.members.find(m => m.address === '/lead').agent_run_id;
      const leadProjection = async () => JSON.stringify((await alpha.gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: teamRun.teamRunId, a: lead })).getTeamMemberRunProjection?.conversation ?? []);
      const socket = new WebSocket(ownerSocketUrl(`${alpha.baseUrl.replace(/^http/, 'ws')}/ws/agent-team/${teamRun.teamRunId}`));
      await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
      await sleep(800);
      socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: lead,
        content: `CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/mate', content: 'The empty cut. Marker EMPTY-647.', reference_files: [empty, gone] } })}` } }));
      await waitFor('the lead\'s send_message_to', async () => (await leadProjection()).includes('CALLED:'), 60_000);
      socket.close();
      await fs.rm(gone);
      const ERROR = /Failed to fetch reference content|could not be (loaded|opened)/i;
      /** What a reference viewer shows: its media player, its text, an error, "unavailable". */
      const viewerFacts = viewer => viewer.evaluate((el) => {
        const video = el.querySelector('video');
        return { video: Boolean(video), videoError: video?.error?.code ?? null, src: video ? (video.currentSrc || video.src || '').replace(/.*\/messages\//, '…/').replace(/^blob:.*/, 'blob') : null,
          alerts: [...el.querySelectorAll('[role="alert"]')].map(a => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
          text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 240) };
      });

      // The desktop window: the Team's "Team" tab.
      await openDesktop();
      const teamRow = deskPage.locator(`[data-test="workspace-team-row-${teamRun.teamRunId}"]`).first();
      await teamRow.waitFor({ timeout: 60_000 });
      await teamRow.click();
      const tab = deskPage.getByRole('tab', { name: 'Team', exact: true }).first();
      await tab.waitFor({ timeout: 60_000 });
      await waitFor('the Team tab selected', async () => { if (await tab.getAttribute('aria-selected') === 'true') return true; await tab.click(); await sleep(500); return false; }, 30_000);
      const deskReference = name => deskPage.locator('[data-test="team-communication-reference-row"]').filter({ hasText: name }).first();
      const deskViewer = deskPage.locator('[data-test="team-reference-viewer-shell"]').first();
      await deskReference('empty-647.mp4').waitFor({ timeout: 60_000 });
      await deskReference('empty-647.mp4').click();
      await waitFor('desktop: the empty reference\'s player', async () => (await deskViewer.locator('video').count()) > 0, 30_000).catch(() => undefined);
      await sleep(1_500);
      const deskEmpty = { ...(await viewerFacts(deskViewer)), screenshot: await shot(deskPage, 'MSP-115-desktop-empty-647.mp4') };
      await deskReference('gone-647.mp4').click();
      await waitFor('desktop: the deleted reference', async () => /unavailable|not found/i.test(await deskViewer.innerText().catch(() => '')), 30_000).catch(() => undefined);
      const deskGone = { ...(await viewerFacts(deskViewer)), screenshot: await shot(deskPage, 'MSP-115-desktop-gone-647.mp4') };

      // The phone: the Team's Messages screen.
      await openPhone();
      await phone.locator(`[data-testid="mobile-run-row-team:${teamRun.teamRunId}"] [data-testid="mobile-run-open"]`).first().click({ timeout: 60_000 });
      await phone.locator('[data-testid="mobile-run-menu-button"]').click();
      await phone.locator('[data-testid="mobile-run-menu-messages"]').click();
      await phone.locator('[data-testid="mobile-messages"]').waitFor({ timeout: 20_000 });
      const phoneReference = name => phone.locator('[data-testid="mobile-team-reference-row"]').filter({ hasText: name }).first();
      const phoneViewer = phone.locator('[data-testid="mobile-team-reference-viewer"]');
      await phoneReference('empty-647.mp4').waitFor({ timeout: 30_000 });
      await phoneReference('empty-647.mp4').click();
      await waitFor('phone: the empty reference\'s player', async () => (await phoneViewer.locator('video').count()) > 0, 30_000).catch(() => undefined);
      await sleep(1_500);
      const phoneEmpty = { ...(await viewerFacts(phoneViewer)), screenshot: await shot(phone, 'MSP-115-phone-empty-647.mp4') };
      await phoneBackUntil('the Messages screen', async () => (await phoneViewer.count()) === 0);
      await phoneReference('gone-647.mp4').click();
      await waitFor('phone: the deleted reference', async () => /unavailable|not found/i.test(await phoneViewer.innerText().catch(() => '')), 30_000).catch(() => undefined);
      const phoneGone = { ...(await viewerFacts(phoneViewer)), screenshot: await shot(phone, 'MSP-115-phone-gone-647.mp4') };
      await phoneBackUntil('the Messages screen', async () => (await phoneViewer.count()) === 0);
      await phone.goto(phoneHome, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await phone.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });

      const emptyProbe = log => log.filter(r => r.case === 'MSP-115');
      const opensEmpty = facts => facts.video && facts.alerts.length === 0 && !ERROR.test(facts.text) && !/unavailable/i.test(facts.text);
      const details = { teamRunId: teamRun.teamRunId, desktop: { empty: deskEmpty, gone: deskGone }, phone: { empty: phoneEmpty, gone: phoneGone },
        referenceAnswers: { desktop: emptyProbe(deskReferences), phone: emptyProbe(phoneReferences) } };
      const failures = [
        [opensEmpty(deskEmpty), 'desktop: the empty video reference opens as an empty file (its player, no error)'],
        [opensEmpty(phoneEmpty), 'phone: the empty video reference opens as an empty file (its player, no error)'],
        [/unavailable|not found/i.test(deskGone.text) && !deskGone.video, 'desktop: the deleted reference still says it is unavailable'],
        [/unavailable|not found/i.test(phoneGone.text) && !phoneGone.video, 'phone: the deleted reference still says it is unavailable'],
        [[...deskReferences, ...phoneReferences].some(r => r.status === 416 && /^bytes \*\/0$/.test(r.contentRange ?? '')), 'the node answered the empty file\'s probe 416 bytes */0 (the case reaches D-2\'s path)'],
      ].filter(([ok]) => !ok).map(([, label]) => label);
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    });

    await runCase('MSP-116', async () => {
      currentCase = 'MSP-116';
      await openDesktop();
      await runRow(pdfRun).click({ timeout: 60_000 });
      await deskPage.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click();
      await treeName(DIR).waitFor({ timeout: 30_000 });
      if (!(await treeName('alpha-647.pdf').isVisible().catch(() => false))) await treeName(DIR).click();
      const viewer = deskPage.locator('#contentViewer:visible').first();
      const open = async (name) => {
        await treeName(name).click();
        let state = { pages: 0, error: null };
        await waitFor(`${name} drawn`, async () => { state = await viewer.evaluate(pdfState); return state.pages >= PDFS[name] || Boolean(state.error); }, 30_000).catch(() => undefined);
        await sleep(800);
        state = await viewer.evaluate(pdfState);
        return { name, pages: state.pages, expected: PDFS[name], error: state.error };
      };
      const closeAll = async () => {
        const button = deskPage.locator('button[title="Close all files"]:visible').first();
        if (await button.count()) { await button.click(); await sleep(1_000); }
      };
      const rounds = [];
      for (let round = 0; round < 5; round += 1) {
        await closeAll();
        const opened = [];
        for (const name of Object.keys(PDFS)) opened.push(await open(name));
        rounds.push(opened);
        if (round === 0) await shot(deskPage, 'MSP-116-desktop-gamma-after-alpha-beta');
      }
      const switches = [];
      for (const name of ['alpha-647.pdf', 'beta-647.pdf', 'alpha-647.pdf', 'gamma-647.pdf', 'beta-647.pdf']) switches.push(await open(name));
      const session = await deskPage.evaluate(counts);
      const all = [...rounds.flat(), ...switches];
      const details = { rounds: rounds.map(r => r.map(o => `${o.name}:${o.pages}/${o.expected}${o.error ? ':ERROR' : ''}`).join(' ')), switches: switches.map(o => `${o.name}:${o.pages}/${o.expected}${o.error ? ':ERROR' : ''}`).join(' '),
        errors: all.filter(o => o.error), session, pdfConsoleErrors: pdfErrorLines('desktop').map(e => e.line), screenshot: 'MSP-116-desktop-gamma-after-alpha-beta.png' };
      const failures = [
        [all.every(o => o.pages === o.expected && !o.error), 'every PDF draws all its pages, with no load error'],
        [session && session.workers.length === 1 && session.workerErrors === 0, 'one worker for the session, no worker error'],
        [details.pdfConsoleErrors.length === 0, 'no PDF error in the console'],
      ].filter(([ok]) => !ok).map(([, label]) => label);
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    });

    await runCase('MSP-117', async () => {
      currentCase = 'MSP-117';
      await openPhone();
      const viewer = phone.locator('[data-testid="mobile-file-viewer"]');
      const list = phone.locator('[data-testid="mobile-files-list"]');
      // The list in the PDFs' folder, the viewer gone (the list stays under the viewer while it shows).
      const inFolder = async () => (await viewer.count()) === 0 && (await list.isVisible().catch(() => false))
        && (await phone.locator('[data-testid="mobile-files-path"]').innerText().catch(() => '')).includes(DIR);
      // The run's Files screen, in the PDFs' folder (from the run list, once).
      await phone.locator(`[data-testid="mobile-run-row-agent:${pdfRun}"] [data-testid="mobile-run-open"]`).first().click({ timeout: 60_000 });
      await phone.locator('[data-testid="mobile-run-menu-button"]').click();
      await phone.locator('[data-testid="mobile-run-menu-files"]').click();
      await list.waitFor({ timeout: 30_000 });
      await phone.locator('[data-testid="mobile-files-row"]').filter({ hasText: DIR }).first().click();
      await waitFor(`the ${DIR} folder`, inFolder, 15_000);
      const open = async (name) => {
        await phone.locator('[data-testid="mobile-files-row"]').filter({ hasText: name }).first().click();
        await viewer.waitFor({ timeout: 20_000 });
        let state = { pages: 0, error: null };
        await waitFor(`${name} drawn`, async () => { state = await viewer.evaluate(pdfState); return state.pages >= PDFS[name] || Boolean(state.error); }, 30_000).catch(() => undefined);
        await sleep(800);
        state = await viewer.evaluate(pdfState);
        return { name, pages: state.pages, expected: PDFS[name], error: state.error };
      };
      const rounds = [];
      for (let round = 0; round < 3; round += 1) {
        const opened = [];
        for (const name of Object.keys(PDFS)) {
          opened.push(await open(name));
          if (round === 0 && name === 'gamma-647.pdf') await shot(phone, 'MSP-117-phone-gamma-after-alpha-beta');
          await phoneBackUntil('the Files list', inFolder);
        }
        rounds.push(opened);
      }
      const session = await phone.evaluate(counts);
      const all = rounds.flat();
      const details = { rounds: rounds.map(r => r.map(o => `${o.name}:${o.pages}/${o.expected}${o.error ? ':ERROR' : ''}`).join(' ')), errors: all.filter(o => o.error), session,
        pdfConsoleErrors: pdfErrorLines('phone').map(e => e.line), screenshot: 'MSP-117-phone-gamma-after-alpha-beta.png' };
      const failures = [
        [all.every(o => o.pages === o.expected && !o.error), 'every PDF draws all its pages, with no load error'],
        [session && session.workers.length === 1 && session.workerErrors === 0, 'one worker for the session, no worker error'],
        [session && session.jsBlobs <= 1, 'at most one text/javascript blob URL for the session (AC-005)'],
        [details.pdfConsoleErrors.length === 0, 'no PDF error in the console'],
      ].filter(([ok]) => !ok).map(([, label]) => label);
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    });

    await runCase('MSP-118', async () => {
      currentCase = 'MSP-118';
      await openDesktop();
      const status = deskPage.locator('[data-testid="event-monitor-file-preview-status"]');
      const statusText = async () => ((await status.count()) ? (await status.first().innerText().catch(() => '')).trim() : '');
      const select = async (run, marker) => {
        await runRow(run).click({ timeout: 60_000 });
        await waitFor(`the run with ${marker}`, async () => (await deskPage.locator('body').innerText()).includes(marker), 30_000);
        await sleep(1_000);
      };
      await select(statusRun, 'STATUS-647');
      const link = deskPage.locator('a[href="../outside-647.md"]').last();
      await link.waitFor({ timeout: 30_000 });
      await link.click();
      await waitFor('the status line', async () => (await statusText()).includes(FAILED), 15_000).catch(() => undefined);
      const shown = { status: await statusText(), screenshot: await shot(deskPage, 'MSP-118-desktop-status-in-run-a') };
      await select(pdfRun, 'PDF-647');
      const otherRun = { status: await statusText(), statusElements: await status.count(), screenshot: await shot(deskPage, 'MSP-118-desktop-run-b') };
      await select(statusRun, 'STATUS-647');
      const backAgain = { status: await statusText(), statusElements: await status.count(), screenshot: await shot(deskPage, 'MSP-118-desktop-run-a-again') };
      const details = { shown, otherRun, backAgain };
      const failures = [
        [shown.status.includes(FAILED), 'the out-of-folder link shows the status line in the first run (the precondition)'],
        [otherRun.statusElements === 0, 'the second run selected: the status line is gone'],
        [backAgain.statusElements === 0, 'the first run again: the status line stays gone'],
      ].filter(([ok]) => !ok).map(([, label]) => label);
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    });
  } finally {
    await deskContext.close().catch(() => undefined);
    await phoneBrowser.close().catch(() => undefined);
  }
};
