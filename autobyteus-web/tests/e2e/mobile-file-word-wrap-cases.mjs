// Text and code files open with word wrap on (autobyteus-618): in the shared file viewer's editor (Monaco), a long line
// wraps at the editor's width, its wrapped rows keep its indentation, line numbers stay, nothing scrolls sideways; the
// editor's own "Toggle Word Wrap" turns wrap off (the line runs past the edge again) and on again. Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after the code-wrap cases
// (`--cases=MSP-108,MSP-109` runs only these).
//
// On alpha, with test data only: `word-wrap-618/` in the probe workspace holds a `pnpm-workspace.yaml`, a `tsconfig.json`
// and a `draft-v1.txt`, each with long lines, indented ones among them (the files of the founder's report, synthesized);
// an agent run in that workspace opens them.
//
// Cases:
//   MSP-108 AC-001, AC-002  The desktop window (`nuxt dev`) at 1440×900: each file opened from the Files tab's tree, in
//                  the editor beside the tree (narrow) and with the viewer maximized (wide). Then "Toggle Word Wrap" (the editor's context menu) on the long-line text
//                  file: its lines run past the editor's edge (the control: the measurement sees an unwrapped line), and
//                  toggled again they wrap.
//   MSP-109 AC-001  The phone (production bundle at /mobile) at 390×844: each file opened from the run's Files screen, in the
//                  phone file viewer (the same editor, read-only).
// Per file and surface: no row of text ends past the editor's right edge; at least one line wraps (rows without a line
// number); each wrapped row starts where its line's first non-space character does; line numbers are shown; the page
// does not scroll sideways.
import fs from 'node:fs/promises';
import path from 'node:path';
import { attachToBrowserContext } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const PHONE_HOST = '192.168.77.24';
const DIR = 'word-wrap-618';
const LONG_PATH = 'applications/brief-studio/backend-src/a-package-folder-with-a-long-name/that-keeps-going/past/any-narrow-panel/'
  + 'and-past-a-maximized-desktop-editor-too/because-the-wrap-check-needs-a-line-wider-than-any-window/with-more-folders/still-going/**';
const FILES = Object.freeze({
  'pnpm-workspace.yaml': [
    'packages:',
    `  - "${LONG_PATH}"`,
    '  - "autobyteus-web"',
    'catalog:',
    '  "@autobyteus/a-dependency-with-a-really-long-scoped-package-name-for-the-wrap-check": "^1.2.3-beta.4+build.5678-and-more-build-metadata-that-runs-on-past-the-edge-of-a-maximized-desktop-editor-as-well-so-it-wraps-there-too"',
    'onlyBuiltDependencies:',
    '  - esbuild',
    '',
  ].join('\n'),
  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'NodeNext', strict: true,
      paths: { '@autobyteus/application-sdk-contracts/*': ['../autobyteus-application-sdk-contracts/src/a-very-long-folder-name-that-does-not-fit/in-a-narrow-panel/nor-in-a-maximized-desktop-editor/because-it-keeps-going-with-more-and-more-folders/*.ts'] },
    },
    include: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/a-folder-with-a-long-name-for-generated-sources-that-run-past-the-edge/**/*.ts'],
  }, null, 2) + '\n',
  'draft-v1.txt': [
    'DRAFT-618 This first paragraph is one long line, as a draft written in a plain text editor often is: it goes on past the right edge of any phone and of a narrow panel, and even past the edge of a maximized desktop editor, because it keeps going with more and more words, so it must wrap to be read.',
    '',
    '    An indented line, four spaces in, that is also much longer than the editor is wide, even when the editor is maximized on a desktop window, so its wrapped rows show whether they keep its indentation of four spaces.',
    'A short line.',
    '',
  ].join('\n'),
});

/** In the page: what the cases assert about one Monaco editor (`.monaco-editor`). */
const measureEditor = (editor) => {
  const isSpace = ch => /[\s\u00a0]/.test(ch);
  const scrollable = editor.querySelector('.monaco-scrollable-element.editor-scrollable') ?? editor.querySelector('.monaco-scrollable-element');
  const box = scrollable.getBoundingClientRect();
  const verticalBar = scrollable.querySelector(':scope > .scrollbar.vertical');
  const contentRight = box.right - (verticalBar?.getBoundingClientRect().width ?? 0);
  /** The rects of each character of `el`'s text, in order. */
  const chars = (el) => {
    const out = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (let i = 0; i < node.nodeValue.length; i += 1) {
        const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
        const rect = [...range.getClientRects()].find(r => r.width > 0 || r.height > 0);
        if (rect) out.push({ ch: node.nodeValue[i], left: rect.left, right: rect.right });
      }
    }
    return out;
  };
  const numbers = [...editor.querySelectorAll('.margin .line-numbers')]
    .map(el => ({ text: el.textContent.trim(), top: Math.round(el.getBoundingClientRect().top) })).filter(n => n.text);
  const rows = [...editor.querySelectorAll('.view-lines .view-line')]
    .map((el) => {
      const top = Math.round(el.getBoundingClientRect().top);
      const text = chars(el);
      const firstText = text.find(c => !isSpace(c.ch));
      const indent = text.findIndex(c => !isSpace(c.ch));
      return { top, number: numbers.find(n => Math.abs(n.top - top) <= 2)?.text ?? null, chars: text.length, indent,
        lefts: text.map(c => Math.round(c.left)),
        firstTextLeft: firstText ? Math.round(firstText.left) : null, right: text.length ? Math.round(Math.max(...text.map(c => c.right))) : null,
        start: text.map(c => c.ch).join('').slice(0, 24) };
    })
    .sort((a, b) => a.top - b.top);
  // A row without a line number continues the line above it (a wrapped row).
  let line = null;
  const wrapped = [];
  for (const row of rows) {
    if (row.number) { line = row; continue; }
    if (!line || !row.chars || row.indent < 0) continue; // a row of spaces only: the line broke at spaces
    const at = row.indent >= line.indent ? row.lefts[line.indent] : row.lefts[0];
    wrapped.push({ line: line.number, lineTextLeft: line.firstTextLeft, rowTextLeft: at, start: row.start });
  }
  const de = document.documentElement;
  return {
    editorWidth: Math.round(box.width), contentRight: Math.round(contentRight),
    rows: rows.length, numberedRows: rows.filter(r => r.number).length, lineNumbers: numbers.map(n => n.text),
    past: rows.filter(r => r.right !== null && r.right > contentRight + 1).map(r => ({ number: r.number, right: r.right, start: r.start.replace(/\u00a0/g, ' ') })),
    wrapped: wrapped.map(w => ({ ...w, start: w.start.replace(/\u00a0/g, ' ') })), misindented: wrapped.filter(w => w.lineTextLeft === null || w.rowTextLeft === null || Math.abs(w.rowTextLeft - w.lineTextLeft) > 2),
    pageScrollsSideways: de.scrollWidth > de.clientWidth + 1,
  };
};

const failuresOf = (measured, expectWrapped) => {
  const failures = [];
  if (!measured.numberedRows) failures.push('no line numbers');
  if (measured.pageScrollsSideways) failures.push('the page scrolls sideways');
  if (expectWrapped) {
    if (measured.past.length) failures.push(`rows past the editor's edge: ${JSON.stringify(measured.past)}`);
    if (!measured.wrapped.length) failures.push('no line wraps');
    if (measured.misindented.length) failures.push(`wrapped rows not at their line's indentation: ${JSON.stringify(measured.misindented)}`);
  } else if (!measured.past.length) {
    failures.push('with wrap off, no line runs past the editor\'s edge');
  }
  return failures;
};

/**
 * @param probe `runCase`, `chromium`, `executablePath`, `outputDir`, `evidence`, `selected`, `sleep`, `waitFor`, `assert`,
 *   `redact`, `browser`, `alpha`, `stack`, `desktopRunsView`.
 */
export const runFileWordWrapCases = async (probe) => {
  const { runCase, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView } = probe;
  const ids = ['MSP-108', 'MSP-109'];
  if (selected && !ids.some(id => selected.has(id))) return;
  let currentCase = 'word-wrap-setup';
  const dir = path.join(stack.workspace, DIR);
  await fs.mkdir(dir, { recursive: true });
  for (const [name, text] of Object.entries(FILES)) await fs.writeFile(path.join(dir, name), text);
  const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
  assert(created.success, created.message);
  const run = created.runId;
  await stack.agentSay(run, 'ECHO_INPUT WORD-WRAP-618 the files are in word-wrap-618.');
  await waitFor('the run\'s answer', async () => (await stack.projection(run)).includes('WORD-WRAP-618'), 60_000);
  evidence.fileWordWrap = { run, dir };

  const watch = (page, label, origin) => {
    const line = (text, sourceUrl = '') => {
      const redacted = redact(`${label} console: ${text}`);
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(redacted) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      evidence.browserErrors.push({ case: currentCase, line: redacted, known: favicon, ...(favicon ? { cause: 'the browser\'s favicon request at the origin root (/favicon.ico)' } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') line(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => line(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: currentCase, label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
  };
  const shot = async (page, name) => { await page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined); return `${name}.png`; };
  /** Waits for the editor showing `marker`'s file in `scope`, measures it, and screenshots the page. */
  const check = async (page, scope, name, marker, expectWrapped = true) => {
    // The visible one: each open file keeps its own tab and editor.
    const editor = scope.locator('.monaco-editor:visible').first();
    await editor.waitFor({ timeout: 30_000 });
    // A wrapped row splits a word: the text is compared without whitespace.
    const shown = async () => (await editor.innerText().catch(() => '')).replace(/[\s\u00a0]+/g, '');
    await waitFor(`${name}: the file in the editor`, async () => (await shown()).includes(marker.replace(/\s+/g, '')), 30_000)
      .catch(async (error) => { await shot(page, `${name}-not-shown`); error.details = { editorText: (await shown()).slice(0, 400) }; throw error; });
    await sleep(600);
    const measured = await editor.evaluate(measureEditor);
    const viewport = page.viewportSize();
    return { name, viewport: `${viewport.width}x${viewport.height}`, failures: failuresOf(measured, expectWrapped), measured, screenshot: await shot(page, name) };
  };
  // The first words each file shows (Monaco renders spaces as no-break spaces; the check normalizes them).
  const markers = { 'pnpm-workspace.yaml': 'packages:', 'tsconfig.json': '"compilerOptions"', 'draft-v1.txt': 'DRAFT-618' };

  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  await attachToBrowserContext(deskContext);
  await deskContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const deskPage = await deskContext.newPage();
  const phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const phoneOrigin = `http://${PHONE_HOST}:${alpha.port}`;
  let phoneContext = null;
  try {
    await runCase('MSP-108', async () => {
      currentCase = 'MSP-108';
      await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
      // The first load lets a cold `nuxt dev` finish its bundles (TESTING.md § Browser probes); browser lines count after it.
      await deskPage.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
      await sleep(3_000);
      watch(deskPage, 'desktop', stack.frontendUrl);
      await deskPage.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
      await desktopRunsView(deskPage);
      const showOlder = deskPage.locator('[data-test="run-list-show-older"]');
      if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
      await deskPage.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
      await deskPage.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click();
      const files = deskPage.locator('[data-test="right-side-files-panel"]');
      // A tree row's visible name (a folder's row also holds its children and a hidden drag-preview copy of the name).
      const treeName = name => files.locator('.file-item span.select-none').filter({ hasText: new RegExp(`^${name.replace(/[.]/g, '\\.')}$`) }).first();
      await treeName(DIR).waitFor({ timeout: 30_000 });
      if (!(await treeName('draft-v1.txt').isVisible().catch(() => false))) await treeName(DIR).click();
      const viewer = deskPage.locator('#contentViewer:visible').first();
      const results = [];
      for (const name of Object.keys(FILES)) {
        await treeName(name).waitFor({ timeout: 30_000 });
        await treeName(name).click();
        await sleep(800);
        // A text file opens in the editor; should it open in preview, the tab's Edit Mode shows the editor.
        if (!(await viewer.locator('.monaco-editor:visible').count())) await viewer.locator('[title="Edit Mode"]:visible').first().click().catch(() => undefined);
        results.push(await check(deskPage, viewer, `MSP-108-desktop-1440-panel-${name}`, markers[name]));
        // The viewer maximized: the editor at the window's width.
        await viewer.locator('button[title="Maximize view"]').first().click();
        await sleep(800);
        results.push(await check(deskPage, viewer, `MSP-108-desktop-1440-maximized-${name}`, markers[name]));
        if (name !== 'draft-v1.txt') {
          await deskPage.locator('#contentViewer:visible button[title="Restore view"], #contentViewer:visible button[title="Exit full view"]').first().click();
          await sleep(800);
        }
      }
      // AC-002: "Toggle Word Wrap" in the editor's context menu, on the open text file (maximized): off (the control),
      // then on again.
      const toggle = async () => {
        await viewer.locator('.monaco-editor:visible .view-lines').first().click({ button: 'right', position: { x: 60, y: 12 } });
        const item = deskPage.locator('.monaco-menu .action-label', { hasText: 'Toggle Word Wrap' }).first();
        await item.hover({ timeout: 10_000 });
        await deskPage.keyboard.press('Enter');
        await sleep(600);
      };
      await toggle();
      const off = await check(deskPage, viewer, 'MSP-108-desktop-1440-maximized-draft-v1.txt-wrap-off', markers['draft-v1.txt'], false);
      await toggle();
      const onAgain = await check(deskPage, viewer, 'MSP-108-desktop-1440-maximized-draft-v1.txt-wrap-on-again', markers['draft-v1.txt']);
      const all = [...results, off, onAgain];
      const details = { summary: all.map(r => ({ name: r.name, failures: r.failures, editorWidth: r.measured.editorWidth, rows: r.measured.rows, numberedRows: r.measured.numberedRows, wrapped: r.measured.wrapped.length, past: r.measured.past.length })), results: all };
      assert(all.every(r => r.failures.length === 0), 'desktop: each file wraps at the editor\'s width with its indentation and line numbers, nothing past the edge; Toggle Word Wrap turns it off (lines past the edge) and on again (AC-001, AC-002)', details);
      return details;
    });

    await runCase('MSP-109', async () => {
      currentCase = 'MSP-109';
      const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
      assert(settings.status === 200, 'alpha Phone Access on', settings);
      const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Alpha Test Node', trustedPrivateHttpAcknowledged: true });
      assert(pairing.status === 201 && pairing.body.mobileUrl, 'alpha pairing session for the word-wrap phone', pairing.status);
      phoneContext = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
      const phone = await phoneContext.newPage();
      watch(phone, 'phone', phoneOrigin);
      await phone.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await phone.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
      await phone.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
      const home = phone.url();
      const results = [];
      for (const name of Object.keys(FILES)) {
        await phone.goto(home, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await phone.locator(`[data-testid="mobile-run-row-agent:${run}"] [data-testid="mobile-run-open"]`).first().click({ timeout: 60_000 });
        await phone.locator('[data-testid="mobile-run-menu-button"]').click();
        await phone.locator('[data-testid="mobile-run-menu-files"]').click();
        await phone.locator('[data-testid="mobile-files-list"]').waitFor({ timeout: 30_000 });
        await phone.locator('[data-testid="mobile-files-row"]').filter({ hasText: DIR }).first().click();
        await waitFor(`the ${DIR} folder`, async () => (await phone.locator('[data-testid="mobile-files-path"]').innerText().catch(() => '')).includes(DIR), 15_000);
        await phone.locator('[data-testid="mobile-files-row"]').filter({ hasText: name }).first().click();
        const viewer = phone.locator('[data-testid="mobile-file-viewer"]');
        await viewer.waitFor({ timeout: 20_000 });
        results.push(await check(phone, viewer, `MSP-109-phone-390-${name}`, markers[name]));
      }
      const details = { summary: results.map(r => ({ name: r.name, failures: r.failures, editorWidth: r.measured.editorWidth, rows: r.measured.rows, numberedRows: r.measured.numberedRows, wrapped: r.measured.wrapped.length, past: r.measured.past.length })), results };
      assert(results.every(r => r.failures.length === 0), 'phone: each file wraps at the editor\'s width with its indentation and line numbers, nothing past the edge, the page does not scroll sideways (AC-001)', details);
      return details;
    });
  } finally {
    if (phoneContext) await phoneContext.close().catch(() => undefined);
    await deskContext.close().catch(() => undefined);
    await phoneBrowser.close().catch(() => undefined);
  }
};
