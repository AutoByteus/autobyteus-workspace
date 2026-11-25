// The desktop Files tab's layout, file-type highlighting and message references' media (autobyteus-642). Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after the word-wrap cases
// (`--cases=MSP-111,MSP-112,MSP-113,MSP-114` runs only these).
//
// On alpha, with test data only:
//   - `viewer-642/` in the probe workspace: a long-line text file, and a sample of each file type REQ-004 lists plus the
//     ones that must stay as they are (Python, TypeScript, JSON, Markdown);
//   - an agent run in that workspace, whose answer (the scripted runtime's `REPLY_FILE:`) is a Markdown document with one
//     fenced block per language;
//   - a Team whose lead sends its mate one message referencing a video, an audio file, a text file and a file deleted
//     after the message is stored.
//
// Cases:
//   MSP-111 AC-003  The desktop window (`nuxt dev`) at 1440×900 and 1280×800, the run's Files tab at the default panel
//                  width: the layout is stacked, the viewer at least 400 px wide, and the long line wraps with 40+
//                  characters per row. The panel widened to 700 px (its resize handle): split, the viewer at least 400 px;
//                  the tree divider dragged far right stops with the viewer at 400 px, far left with the tree at 150 px.
//   MSP-112 AC-004  The same window: each sample opened from the tree in the file viewer (Monaco; HTML in its Edit Mode, it
//                  opens as a preview) shows more than one token class (`mtk<N>`); Python, TypeScript and JSON too;
//                  Markdown opens as its preview, as before.
//   MSP-113 AC-004  The chat's code blocks by language name (DEC-008): the agent's answer in its conversation, in the same
//                  window and on the phone (production bundle at /mobile, 390×844); each fenced block of a listed name has
//                  Prism token spans: yaml/yml, toml, bash/sh/shell/zsh, go, rust/rs, java, xml, ini, dockerfile/docker, and
//                  Python, TypeScript and JSON as before.
//   MSP-114 AC-001  The same window: the Team's messages (its "Team" tab); the video reference plays in the panel's viewer and every
//                  request for it is a ranged one answered 206 at the reference route (no whole download first); the audio
//                  reference likewise; the text reference shows its text; the deleted one says it is unavailable.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { attachToBrowserContext, ownerSocketUrl } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const DIR = 'viewer-642';
const LONG = 'LAYOUT-642 This line is long enough to wrap in any viewer narrower than it, so the wrapped rows show how many characters fit across the file viewer, which the layout keeps at least four hundred pixels wide.';
// One sample per listed type (REQ-004) and the unchanged ones; each with enough structure for its grammar.
const SAMPLES = Object.freeze({
  'sample.yaml': 'name: viewer\nversion: 1.2\nitems:\n  - one # a comment\n  - "two"\n',
  'sample.yml': 'on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n',
  'sample.toml': '[package]\nname = "viewer"\nversion = "0.1.0"\n# a comment\n',
  'sample.sh': '#!/bin/sh\nfor f in *.txt; do\n  echo "$f"\ndone\n',
  'sample.bash': '#!/usr/bin/env bash\nset -euo pipefail\nname="${1:-world}"\necho "hello $name"\n',
  'sample.zsh': 'export PATH="$HOME/bin:$PATH"\nalias ll="ls -l"\n',
  'sample.go': 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hi", 42)\n}\n',
  'sample.rs': 'fn main() {\n    let n: u32 = 42;\n    println!("{}", n);\n}\n',
  'Sample.java': 'public class Sample {\n  public static void main(String[] args) {\n    System.out.println("hi" + 42);\n  }\n}\n',
  'sample.xml': '<?xml version="1.0"?>\n<root attr="1">\n  <item>text</item>\n</root>\n',
  'sample.ini': '[section]\nkey = value\n; a comment\nnumber = 42\n',
  Dockerfile: 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["node", "app.js"]\n',
  'sample.html': '<!doctype html>\n<html>\n  <body class="x"><p>Hello</p></body>\n</html>\n',
  'sample.vue': '<template>\n  <div class="x">{{ msg }}</div>\n</template>\n<script setup>\nconst msg = "hi";\n</script>\n',
  'sample.py': 'def main(n: int) -> int:\n    """Doc."""\n    return n * 2  # comment\n',
  'sample.ts': 'export const twice = (n: number): number => n * 2;\ninterface X { a: string }\n',
  'sample.json': '{\n  "name": "viewer",\n  "count": 42,\n  "ok": true\n}\n',
  'sample.md': '# Heading\n\nSome *text* with `code`.\n',
});
// The fenced blocks of the agent's answer: the names a person or an agent writes after the fence.
const FENCES = Object.freeze({
  yaml: 'name: viewer\nitems:\n  - one', yml: 'on: push', toml: '[package]\nname = "viewer"', bash: 'echo "$HOME" | wc -c', sh: 'for f in *; do echo "$f"; done', shell: 'ls -la | grep "x"',
  zsh: 'alias ll="ls -l"', go: 'func main() { fmt.Println(42) }', rust: 'fn main() { let n: u32 = 42; }', rs: 'let s = String::from("x");',
  java: 'public class A { int n = 42; }', xml: '<root attr="1"><item>x</item></root>', ini: '[section]\nkey = value', dockerfile: 'FROM node:22\nRUN npm ci',
  docker: 'COPY . .', python: 'def f(n): return n * 2', typescript: 'const n: number = 42;', json: '{ "a": 1, "b": true }',
});

const PHONE_HOST = '192.168.77.26';

/** In the page: each fence name's block and its Prism token spans. */
const fenceFacts = (langs) => langs.map((lang) => {
  const pre = [...document.querySelectorAll('pre')].find(p => [...p.classList, ...(p.querySelector('code')?.classList ?? [])].includes(`language-${lang}`));
  return { lang, found: Boolean(pre), tokenSpans: pre ? pre.querySelectorAll('span.token').length : 0, tokenKinds: pre ? [...new Set([...pre.querySelectorAll('span.token')].map(s => [...s.classList].filter(c => c !== 'token').join('.')))].slice(0, 6) : [] };
});

/**
 * @param probe `runCase`, `chromium`, `executablePath`, `outputDir`, `evidence`, `selected`, `sleep`, `waitFor`, `assert`, `redact`, `browser`, `alpha`,
 *   `stack`, `desktopRunsView`.
 */
export const runFileViewerMediaCases = async (probe) => {
  const { runCase, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView } = probe;
  const ids = ['MSP-111', 'MSP-112', 'MSP-113', 'MSP-114'];
  if (selected && !ids.some(id => selected.has(id))) return;
  let currentCase = 'file-viewer-media-setup';
  const dir = path.join(stack.workspace, DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'long-642.txt'), `${LONG}\nA short line.\n`);
  for (const [name, text] of Object.entries(SAMPLES)) await fs.writeFile(path.join(dir, name), text);
  const fencesDoc = path.join(dir, 'fences-642.md');
  await fs.writeFile(fencesDoc, `# FENCES-642\n\n${Object.entries(FENCES).map(([lang, code]) => `${lang}:\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`).join('\n')}`);
  const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
  assert(created.success, created.message);
  const run = created.runId;
  await stack.agentSay(run, `Show the fences. REPLY_FILE:${fencesDoc}`);
  await waitFor('the run\'s answer', async () => (await stack.projection(run)).includes('FENCES-642'), 60_000);
  evidence.fileViewerMedia = { run, dir };

  const watch = (page, label, origin) => {
    const line = (text, sourceUrl = '') => {
      const redacted = redact(`${label} console: ${text}`);
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(redacted) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      // The deleted reference's probe answers 404 by design (MSP-114).
      const deleted = currentCase === 'MSP-114' && /status of 404/.test(redacted) && sourceUrl.includes('/references/');
      evidence.browserErrors.push({ case: currentCase, line: redacted, known: favicon || deleted, ...(favicon ? { cause: 'the browser\'s favicon request at the origin root (/favicon.ico)' } : {}),
        ...(deleted ? { cause: 'the deleted reference\'s probe (404, shown as "unavailable")' } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') line(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => line(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: currentCase, label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
  };
  const shot = async (page, name) => { await page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined); return `${name}.png`; };

  const deskContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  await attachToBrowserContext(deskContext);
  // Every frame runs it; the HTML previewer's sandboxed frame has no storage, so it is skipped there.
  await deskContext.addInitScript(() => { try { localStorage.setItem('autobyteus.localization.preference-mode', 'en'); } catch { /* a sandboxed frame */ } });
  const page = await deskContext.newPage();
  const files = page.locator('[data-test="right-side-files-panel"]');
  const treeName = name => files.locator('.file-item span.select-none').filter({ hasText: new RegExp(`^${name.replace(/[.]/g, '\\.')}$`) }).first();
  const layoutRoot = page.locator('[data-test="right-side-files-panel"] [data-layout]').first();
  /** The Files tab's layout, panel, tree and viewer widths (px). */
  const measure = () => layoutRoot.evaluate((root) => {
    const children = [...root.children];
    const viewer = children[children.length - 1];
    return { layout: root.getAttribute('data-layout'), panel: Math.round(root.getBoundingClientRect().width), tree: Math.round(children[0].getBoundingClientRect().width), viewer: Math.round(viewer.getBoundingClientRect().width) };
  });
  /** The longest visual row of the visible editor (characters), and its distinct Monaco token classes. */
  const editorFacts = () => page.locator('#contentViewer:visible .monaco-editor:visible').first().evaluate((editor) => ({
    longestRow: Math.max(0, ...[...editor.querySelectorAll('.view-lines .view-line')].map(row => row.textContent.replace(/ /g, ' ').length)),
    tokenClasses: [...new Set([...editor.querySelectorAll('.view-lines .view-line span[class*="mtk"]')].flatMap(el => [...el.classList].filter(c => /^mtk\d+$/.test(c))))].sort(),
  }));
  let opened = false;
  const openRunFiles = async () => {
    if (opened) return;
    await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
    await page.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(3_000);
    watch(page, 'desktop', stack.frontendUrl);
    await page.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(page);
    const showOlder = page.locator('[data-test="run-list-show-older"]');
    if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
    await page.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
    await page.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click();
    await treeName(DIR).waitFor({ timeout: 30_000 });
    if (!(await treeName('long-642.txt').isVisible().catch(() => false))) await treeName(DIR).click();
    opened = true;
  };
  /** Opens `name` from the tree; an HTML file opens as its preview, and its source (the editor) is one click away. */
  const openFile = async (name) => {
    await treeName(name).click();
    if (/\.html?$/.test(name)) {
      await sleep(1_200);
      if (!(await page.locator('#contentViewer:visible .monaco-editor:visible').count())) await page.locator('#contentViewer:visible [title="Edit Mode"]').first().click();
    }
    await page.locator('#contentViewer:visible .monaco-editor:visible, #contentViewer:visible .markdown-body').first().waitFor({ timeout: 30_000 });
    await sleep(900);
  };
  const dragBy = async (handle, dx) => {
    const box = await handle.boundingBox();
    assert(box, 'the handle is shown');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await sleep(600);
  };

  try {
    await runCase('MSP-111', async () => {
      currentCase = 'MSP-111';
      await openRunFiles();
      const results = [];
      for (const [width, height] of [[1440, 900], [1280, 800]]) {
        await page.setViewportSize({ width, height });
        await sleep(1_200);
        await openFile('long-642.txt');
        results.push({ label: `${width}x${height}-default`, ...(await measure()), ...(await editorFacts()), screenshot: await shot(page, `MSP-111-${width}x${height}-default`) });
      }
      // The panel widened to 700 px with its resize handle (the window at 1280×800).
      const handle = page.locator('[data-test="workspace-right-resize-handle"]').first();
      const before = await measure();
      await dragBy(handle, -(700 - before.panel));
      await waitFor('the panel at about 700 px', async () => Math.abs((await measure()).panel - 700) <= 6, 10_000).catch(() => undefined);
      results.push({ label: '1280x800-panel-700', ...(await measure()), ...(await editorFacts()), screenshot: await shot(page, 'MSP-111-1280x800-panel-700') });
      const divider = layoutRoot.locator(':scope > .cursor-col-resize').first();
      await dragBy(divider, 600);
      results.push({ label: '1280x800-panel-700-divider-far-right', ...(await measure()), screenshot: await shot(page, 'MSP-111-divider-far-right') });
      await dragBy(divider, -600);
      results.push({ label: '1280x800-panel-700-divider-far-left', ...(await measure()), screenshot: await shot(page, 'MSP-111-divider-far-left') });
      const at = label => results.find(r => r.label === label);
      const failures = [
        ...['1440x900-default', '1280x800-default'].flatMap(label => [
          [at(label).layout === 'stacked', `${label}: stacked`], [at(label).viewer >= 400, `${label}: the viewer is at least 400 px`], [at(label).longestRow >= 40, `${label}: a wrapped row shows 40+ characters`]]),
        [Math.abs(at('1280x800-panel-700').panel - 700) <= 6, 'the panel widened to about 700 px'],
        [at('1280x800-panel-700').layout === 'split' && at('1280x800-panel-700').viewer >= 400, 'at 700 px: split, the viewer at least 400 px'],
        [at('1280x800-panel-700-divider-far-right').viewer >= 399 && at('1280x800-panel-700-divider-far-right').viewer <= 402, 'the divider stops with the viewer at 400 px'],
        [at('1280x800-panel-700-divider-far-left').tree >= 149 && at('1280x800-panel-700-divider-far-left').tree <= 152, 'the divider stops with the tree at 150 px'],
      ].filter(([ok]) => !ok).map(([, label]) => label);
      assert(failures.length === 0, failures.join('; '), { results });
      return { results };
    });

    await runCase('MSP-112', async () => {
      currentCase = 'MSP-112';
      await openRunFiles();
      await page.setViewportSize({ width: 1440, height: 900 });
      const results = [];
      for (const name of Object.keys(SAMPLES)) {
        await openFile(name);
        const markdown = await page.locator('#contentViewer:visible .markdown-body').count();
        const facts = markdown ? { markdownPreview: true } : await editorFacts();
        results.push({ name, ...facts, screenshot: await shot(page, `MSP-112-${name}`) });
      }
      const failures = results.filter(r => !r.markdownPreview && (r.tokenClasses?.length ?? 0) < 2).map(r => `${r.name}: ${r.tokenClasses?.join(',') ?? 'no editor'}`);
      assert(failures.length === 0, `not highlighted: ${failures.join('; ')}`, { results });
      return { results };
    });

    await runCase('MSP-113', async () => {
      currentCase = 'MSP-113';
      await openRunFiles();
      await page.setViewportSize({ width: 1440, height: 900 });
      const blocks = page.locator('pre[class*="language-"]').filter({ has: page.locator('code') });
      await waitFor('the answer\'s fenced blocks', async () => (await blocks.count()) >= Object.keys(FENCES).length, 30_000).catch(() => undefined);
      const desktop = await page.evaluate(fenceFacts, Object.keys(FENCES));
      await page.locator('pre[class*="language-yaml"]').first().scrollIntoViewIfNeeded().catch(() => undefined);
      const desktopShot = await shot(page, 'MSP-113-desktop-fences');
      // The phone: the production bundle at /mobile, paired with alpha, the same run's conversation.
      const phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
      let phone = [];
      let phoneShot = null;
      try {
        const phoneOrigin = `http://${PHONE_HOST}:${alpha.port}`;
        const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
        assert(settings.status === 200, 'alpha Phone Access on', settings);
        const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Alpha Test Node', trustedPrivateHttpAcknowledged: true });
        assert(pairing.status === 201 && pairing.body.mobileUrl, 'alpha pairing session for the fences phone', pairing.status);
        const phoneContext = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
        const phonePage = await phoneContext.newPage();
        watch(phonePage, 'phone', phoneOrigin);
        await phonePage.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await phonePage.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
        await phonePage.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
        await phonePage.locator(`[data-testid="mobile-run-row-agent:${run}"] [data-testid="mobile-run-open"]`).first().click({ timeout: 60_000 });
        await waitFor('the phone\'s fenced blocks', async () => (await phonePage.locator('pre[class*="language-"]').count()) >= Object.keys(FENCES).length, 60_000).catch(() => undefined);
        phone = await phonePage.evaluate(fenceFacts, Object.keys(FENCES));
        await phonePage.locator('pre[class*="language-yaml"]').first().scrollIntoViewIfNeeded().catch(() => undefined);
        phoneShot = await shot(phonePage, 'MSP-113-phone-fences');
      } finally {
        await phoneBrowser.close().catch(() => undefined);
      }
      const failures = [...desktop.filter(r => r.tokenSpans === 0).map(r => `desktop ${r.lang}`), ...phone.filter(r => r.tokenSpans === 0).map(r => `phone ${r.lang}`)];
      if (phone.length === 0) failures.push('phone: no blocks read');
      const details = { desktop, phone, desktopShot, phoneShot };
      assert(failures.length === 0, `fences without Prism tokens: ${failures.join(', ')}`, details);
      return details;
    });

    await runCase('MSP-114', async () => {
      currentCase = 'MSP-114';
      // A Team whose lead references a video, an audio file, a text file and a file deleted after the message.
      const refs = path.join(stack.workspace, 'refs-642');
      await fs.mkdir(refs, { recursive: true });
      const media = { video: path.join(refs, 'desk-642.mp4'), audio: path.join(refs, 'desk-642.m4a'), text: path.join(refs, 'desk-642.md'), gone: path.join(refs, 'desk-gone-642.mp4') };
      const ffmpeg = process.env.FFMPEG || 'ffmpeg';
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30', '-t', '20', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '4M', '-movflags', '+faststart', media.video]);
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'aevalsrc=0.4*sin(2*PI*(220+4*t)*t):s=44100:d=60', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', media.audio]);
      await fs.writeFile(media.text, '# DESK-642 notes\n\nA reference text file.\n');
      await fs.copyFile(media.video, media.gone);
      const team = (await alpha.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Desk Refs 642', description: 'Desk references (autobyteus-642)',
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
        content: `CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/mate', content: 'The desk references. Marker DESK-642.', reference_files: Object.values(media) } })}` } }));
      await waitFor('the lead\'s send_message_to', async () => (await leadProjection()).includes('CALLED:'), 60_000);
      socket.close();
      await fs.rm(media.gone);

      await openRunFiles();
      await page.setViewportSize({ width: 1440, height: 900 });
      const requests = [];
      page.on('request', request => { if (request.url().includes('/references/')) requests.push({ at: Date.now(), url: request.url().replace(/.*\/messages\//, '…/'), range: request.headers().range ?? null, type: request.resourceType() }); });
      page.on('response', response => { const entry = [...requests].reverse().find(r => response.url().endsWith(r.url.slice(1)) && r.status === undefined); if (entry) entry.status = response.status(); });
      const showOlder = page.locator('[data-test="run-list-show-older"]');
      if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
      const teamRow = page.locator(`[data-test="workspace-team-row-${teamRun.teamRunId}"]`).first();
      await teamRow.waitFor({ timeout: 60_000 });
      await teamRow.click();
      // A Team's messages are its "Team" tab (a standalone run's is "Messages").
      const tab = page.getByRole('tab', { name: 'Team', exact: true }).first();
      await tab.waitFor({ timeout: 60_000 });
      await waitFor('the Team tab selected', async () => { if (await tab.getAttribute('aria-selected') === 'true') return true; await tab.click(); await sleep(500); return false; }, 30_000);
      const reference = name => page.locator('[data-test="team-communication-reference-row"]').filter({ hasText: name }).first();
      const viewer = page.locator('[data-test="team-reference-viewer-shell"]').first();
      const play = async (name, selector) => {
        const start = requests.length;
        await reference(name).waitFor({ timeout: 60_000 });
        await reference(name).click();
        const element = viewer.locator(selector).first();
        await element.waitFor({ timeout: 30_000 });
        await element.evaluate(el => { el.muted = true; return el.play().catch(() => undefined); });
        await waitFor(`${name} plays`, async () => (await element.evaluate(el => el.currentTime)) > 1, 30_000).catch(() => undefined);
        const state = await element.evaluate(el => ({ currentTime: el.currentTime, readyState: el.readyState, src: el.currentSrc.startsWith('blob:') ? 'blob' : el.currentSrc.replace(/.*\/messages\//, '…/'), error: el.error?.code ?? null }));
        return { name, state, requests: requests.slice(start), screenshot: await shot(page, `MSP-114-${name}`) };
      };
      const video = await play('desk-642.mp4', 'video');
      const audio = await play('desk-642.m4a', 'audio');
      await reference('desk-642.md').click();
      await waitFor('the text reference', async () => (await viewer.innerText().catch(() => '')).includes('DESK-642 notes'), 30_000).catch(() => undefined);
      const text = { shown: (await viewer.innerText().catch(() => '')).includes('DESK-642 notes'), screenshot: await shot(page, 'MSP-114-desk-642.md') };
      await reference('desk-gone-642.mp4').click();
      await waitFor('the deleted reference', async () => /unavailable|not found/i.test(await viewer.innerText().catch(() => '')), 30_000).catch(() => undefined);
      const goneText = (await viewer.innerText().catch(() => '')).replace(/\s+/g, ' ');
      const gone = { unavailable: /unavailable/i.test(goneText), message: goneText.replace(/^.*?(Reference file)/, '$1').slice(0, 160), screenshot: await shot(page, 'MSP-114-desk-gone-642.mp4') };
      const mediaOk = (run) => run.state.currentTime > 1 && run.state.src !== 'blob' && run.requests.filter(r => r.type === 'media').length > 0
        && run.requests.filter(r => r.type === 'media').every(r => r.range && r.status === 206);
      const failures = [
        [mediaOk(video), 'the video reference plays from the route by ranged requests (206), no blob'],
        [mediaOk(audio), 'the audio reference plays from the route by ranged requests (206), no blob'],
        [text.shown, 'the text reference shows its text'],
        [gone.unavailable, 'the deleted reference says it is unavailable'],
      ].filter(([ok]) => !ok).map(([, label]) => label);
      const details = { teamRunId: teamRun.teamRunId, video, audio, text, gone };
      assert(failures.length === 0, failures.join('; '), details);
      return details;
    });
  } finally {
    await deskContext.close().catch(() => undefined);
  }
};
