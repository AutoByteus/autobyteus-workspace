// Fenced code blocks in rendered Markdown wrap to their box; a table or display equation that cannot fit scrolls
// sideways inside its own box; the message or document is never wider than its column (autobyteus-23). Inline text
// wraps too: a path in inline code, a link, a bare URL, a long token or a heading word longer than the line breaks
// inside it, and no inline-code box hangs past the edge (autobyteus-24). Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after the heading-links cases
// (`--cases=MSP-50,MSP-51,MSP-52` runs only these).
//
// On alpha, with test data only:
//   - `code-wrap-23/code-wrap-23.md` in the probe workspace: a fence without a language (long prose line, a 4-space and a
//     tab-indented line, a blank line, a 260-character URL), a `python` fence with an indented long line, a fence whose
//     second line is the file's own absolute path, inline code with a long path, the user's long heading (autobyteus-24),
//     a long bare URL, a long token, a list item ending in short inline code, a narrow table and an 8-column table of
//     unbreakable cells, a long `$$` equation, a tall `\[…\]` equation, a long `math` fence and a Mermaid diagram;
//   - an agent run whose answer is that document (the scripted runtime's `REPLY_FILE:`), so the Event Monitor shows the
//     file-action link beside the path fence;
//   - a delegator (a Project Task Manager run) that sends its task agent the same document (`send_message_to`).
// Per surface and width, inside each rendered Markdown root: every `pre` has no horizontal overflow and wraps
// (`white-space: pre-wrap`), the URL line breaks inside the box, every original line starts on a new visual line with
// its indentation and the blank line kept, highlighting tokens are colored, nothing (inline code and links included)
// reaches past the root's right edge outside the scroll boxes, the root fits inside every ancestor's box, no host that
// scrolls sideways (the feed, the Files viewer) is wider than its box and the page has no horizontal scroll; the narrow
// table is full width and does not scroll, the wide one scrolls in its box (a real wheel or touch scroll) up to its last
// cell; no display equation is clipped vertically; the copied text of each block, of the inline path and of the bare
// URL equals its source (desktop: Ctrl+C and the clipboard; phone: the selection's text).
//
// Cases:
//   MSP-50 AC-001, AC-005…AC-009  The desktop window (`nuxt dev`) at 1280×900 and 700×900: the agent's answer in its
//                  conversation (with the Mermaid diagram and the file-action link beside the path fence, outside the
//                  copied code) and the same Markdown as an inter-agent message in the task agent's conversation.
//   MSP-51 AC-003, AC-005…AC-008  The desktop Files panel, the document opened from that file-action link: at 1280×900 in
//                  the viewer beside the file tree (narrow) and maximized (wide), and at 700×900 opened from the right
//                  strip's Files button.
//   MSP-52 AC-002, AC-004, AC-005…AC-008  The phone (production bundle at /mobile) at 390×844 and 360×800: the agent's
//                  answer, the inter-agent message, and the phone file viewer opened from the file-action link.
import fs from 'node:fs/promises';
import path from 'node:path';
import { attachToBrowserContext } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

const PHONE_HOST = '192.168.77.23';
const DIR = 'code-wrap-23';
const FILE = 'code-wrap-23.md';
const MARKER = 'CODE-WRAP-23';
const URL_RUN = `https://example.com/${'a'.repeat(260)}`;
const PROSE = 'This matches what we found when designing agent responsibilities: some work is cooperative, some is independent, and the split runs through the whole cycle.';
const SPACES = '    An indented line with four leading spaces and enough words to wrap on a narrow phone screen as well, for sure.';
const TAB = '\tA tab-indented line & <angle brackets> "quotes" kept exactly as written, long enough to wrap on a phone.';
const NO_LANGUAGE = [PROSE, '', SPACES, TAB, URL_RUN].join('\n');
const PYTHON = ['def handler(event, context):', '    message = "a long string literal that keeps going so the line is wider than any narrow panel or phone screen"', '', '    return message'].join('\n');
// A fenced line that is a whole absolute path gets the Event Monitor's file-action link beside the block.
const pathFence = filePath => `Saved the reviewed draft, with every comment from the review folded in, to:\n${filePath}`;
const cell = 'autobyteus-web/components/conversation';
// autobyteus-24: inline text with runs longer than a narrow line.
const INLINE_PATH = '/home/autobyteus/workspace/autobyteus-marketing-workspace/linkedin/2026-11-12-review/draft-v2.md';
const HEADING = 'Draft v1 — LinkedIn reply to Shubham Saboo (Elephant/Goldfish Model)';
const BARE_URL = 'https://www.linkedin.com/feed/update/urn:li:activity:7392837465123456789?utm_source=share&utm_medium=member_desktop';
const LONG_TOKEN = 'Supercalifragilisticexpialidocious'.repeat(4);
const documentText = filePath => [
  '# Code wrap 23', '', `${MARKER} draft for review below.`, '',
  `# ${HEADING}`, '',
  '```', NO_LANGUAGE, '```', '',
  '```python', PYTHON, '```', '',
  'The draft, as a path in a block:', '',
  '```', pathFence(filePath), '```', '',
  `Inline path \`${INLINE_PATH}\` stays inline.`, '',
  `Bare URL ${BARE_URL} here.`, '',
  `Long token ${LONG_TOKEN} end.`, '',
  '- Source: `source-post.md`, builds on `precedent-review.md`', '',
  '| Name | Value |', '| --- | --- |', '| short | fits |', '',
  `| ${Array.from({ length: 8 }, (_, i) => `c${i + 1}`).join(' | ')} |`, `|${'---|'.repeat(8)}`, `| ${Array(8).fill(cell).join(' | ')} |`, '',
  '$$', `${Array.from({ length: 24 }, (_, i) => `a_{${i + 1}}`).join(' + ')} = b`, '$$', '',
  'Tall equation:', '',
  '\\[', '\\int_{0}^{\\infty} \\frac{\\sum_{k=1}^{n} \\sqrt{x^{2k}+1}}{\\prod_{j=1}^{m} \\left(1+\\frac{x}{j}\\right)} \\, dx', '\\]', '',
  'Math fence:', '',
  '```math', `\\left( ${Array.from({ length: 8 }, (_, i) => `\\frac{a_${i + 1}}{b_${i + 1}}`).join(' + ')} \\right)`, '```', '',
  '```mermaid', 'flowchart LR', '  A[Draft] --> B[Review] --> C[Publish]', '```', '',
  `End of ${MARKER}.`, '',
].join('\n');

/**
 * In the page: everything the cases assert about one rendered Markdown root (`.markdown-renderer-segments`).
 * `fences` are the code blocks' sources in document order.
 */
const measureRoot = (root, fences) => {
  const ov = el => el.scrollWidth - el.clientWidth;
  const rootBox = root.getBoundingClientRect();
  const rootRight = rootBox.right + 0.5;
  /** The client rect of the character at `offset` of `el`'s text. */
  const charRect = (el, offset) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let seen = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const length = node.nodeValue.length;
      if (offset < seen + length) {
        const range = document.createRange();
        range.setStart(node, offset - seen); range.setEnd(node, offset - seen + 1);
        const rects = [...range.getClientRects()].filter(r => r.width > 0 || r.height > 0);
        return rects[0] ?? range.getBoundingClientRect();
      }
      seen += length;
    }
    return null;
  };
  const visualLines = (el, start, end) => {
    const tops = new Set();
    for (let i = start; i < end; i += 1) { const r = charRect(el, i); if (r && r.height) tops.add(Math.round(r.top)); }
    return tops.size;
  };
  const pres = [...root.querySelectorAll('pre')].map((pre, index) => {
    const code = pre.querySelector('code') ?? pre;
    const source = fences[index] ?? '';
    const text = code.textContent;
    const codeBox = code.getBoundingClientRect();
    // Each original line: where it starts (a new visual line, at its indentation) and how many visual lines it takes.
    const lines = [];
    let offset = 0;
    let prevLast = null;
    for (const line of source.split('\n')) {
      const entry = { chars: line.length };
      if (line.length) {
        const first = charRect(code, offset);
        const indent = line.length - line.replace(/^[ \t]+/, '').length;
        const firstVisible = charRect(code, offset + indent);
        const last = charRect(code, offset + line.length - 1);
        entry.startsNewLine = !prevLast || first.top >= prevLast.bottom - 1;
        entry.afterBlank = prevLast ? Math.round(first.top - prevLast.bottom) : null;
        entry.indentPx = Math.round(firstVisible.left - codeBox.left);
        entry.visualLines = line.length > 400 ? null : visualLines(code, offset, offset + line.length);
        entry.lastInsideBox = last.right <= pre.getBoundingClientRect().right + 0.5;
        prevLast = last;
      }
      lines.push(entry);
      offset += line.length + 1;
    }
    const tokens = [...code.querySelectorAll('.token')];
    const codeColor = getComputedStyle(code).color;
    return {
      inInterAgentMessage: Boolean(pre.closest('.inter-agent-content')),
      cls: pre.className, ws: getComputedStyle(code).whiteSpace, preWs: getComputedStyle(pre).whiteSpace, overflow: ov(pre), width: Math.round(pre.clientWidth),
      textEqualsSource: text.replace(/\n$/, '') === source, lines,
      tokens: tokens.length, coloredTokens: tokens.filter(t => getComputedStyle(t).color !== codeColor).length,
      // A file-action link that sits inside the copied code would change the copied text.
      actionLinkInside: Boolean(pre.querySelector('[data-event-monitor-file-action-control]')),
      actionLinkBeside: Boolean(pre.nextElementSibling?.matches('.event-monitor-file-action-links') && pre.nextElementSibling.querySelector('[data-event-monitor-file-action-control]')),
    };
  });
  const tables = [...root.querySelectorAll('.markdown-table-scroll')].map((box) => {
    const table = box.querySelector('table');
    return { overflowX: getComputedStyle(box).overflowX, scrolls: ov(box) > 0, tableWidth: Math.round(table.getBoundingClientRect().width), boxWidth: box.clientWidth, scrollWidth: box.scrollWidth };
  });
  const katex = [...root.querySelectorAll('.katex-display')].map(el => ({ scrolls: ov(el) > 0, clippedY: el.scrollHeight - el.clientHeight, boxWidth: el.clientWidth, errors: el.querySelectorAll('.katex-error').length }));
  // Elements past the root's right edge outside the boxes that scroll on purpose; inline code, links and headings count
  // like everything else (autobyteus-24). An inline element's rects are its line fragments, so each one is checked.
  // Text runs past its element's box without widening it (a long word in a paragraph), so text nodes are checked too.
  const outside = el => !el.closest('.markdown-table-scroll, .katex-display');
  const pastBy = rects => Math.round(Math.max(...rects.filter(r => r.width > 0).map(r => r.right)) - rootBox.right);
  const textRects = (node) => { const range = document.createRange(); range.selectNodeContents(node); return [...range.getClientRects()]; };
  const texts = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.nodeValue.trim() && outside(node.parentElement)) texts.push(node);
  const past = [
    ...[...root.querySelectorAll('*')].filter(el => outside(el) && [...el.getClientRects()].some(r => r.width > 0 && r.right > rootRight))
      .map(el => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} +${pastBy([...el.getClientRects()])}px "${el.textContent.slice(0, 24)}"`),
    ...texts.filter(node => textRects(node).some(r => r.width > 0 && r.right > rootRight))
      .map(node => `#text in ${node.parentElement.tagName.toLowerCase()} +${pastBy(textRects(node))}px "${node.nodeValue.trim().slice(0, 24)}"`),
  ];
  // RSK-001: the root fits inside every ancestor's box (nothing of it cut off or pushing a host wider).
  const cutBy = [];
  for (let el = root.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    const box = el.getBoundingClientRect();
    const innerRight = box.left + el.clientLeft + (el.clientWidth || box.width);
    if (rootBox.right > innerRight + 1 || rootBox.left < box.left - 1) cutBy.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), right: Math.round(innerRight), rootRight: Math.round(rootBox.right) });
  }
  const hostsOverflowing = [];
  for (let el = root.parentElement; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) hostsOverflowing.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), by: el.scrollWidth - el.clientWidth, overflowX: getComputedStyle(el).overflowX });
  }
  const de = document.documentElement;
  return {
    rootWidth: Math.round(rootBox.width), rootOverflow: ov(root), pres, tables, katex, past, cutBy, hostsOverflowing,
    pageOverflow: de.scrollWidth - de.clientWidth, windowScrollX: window.scrollX,
    mermaidSvgs: root.querySelectorAll('.mermaid-segment-container svg').length,
  };
};

/** The failures of one measurement (empty when it passes). */
const failuresOf = (m, { fences, expectMermaid, expectActionBeside }) => {
  const out = [];
  if (m.pres.length !== fences.length) out.push(`${m.pres.length} code blocks, expected ${fences.length}`);
  m.pres.forEach((p, i) => {
    if (p.overflow > 0) out.push(`pre ${i} overflows by ${p.overflow}px`);
    if (p.ws !== 'pre-wrap' || p.preWs !== 'pre-wrap') out.push(`pre ${i} white-space ${p.preWs}/${p.ws}`);
    if (!p.textEqualsSource) out.push(`pre ${i} text differs from its source`);
    if (p.actionLinkInside) out.push(`pre ${i} holds a file-action link`);
    p.lines.forEach((line, j) => {
      if (!line.chars) return;
      if (!line.startsNewLine) out.push(`pre ${i} line ${j} does not start a new visual line`);
      if (!line.lastInsideBox) out.push(`pre ${i} line ${j} ends past the box`);
    });
  });
  const [prose, python, pathBlock] = m.pres;
  if (prose) {
    // Lines: 0 prose, 1 blank, 2 four spaces, 3 tab, 4 URL.
    // The gap above the line after the blank line is a whole line larger than the gap between two adjacent lines.
    if (!(prose.lines[2].afterBlank > prose.lines[3].afterBlank + 10)) out.push(`the blank line is not kept (gaps ${prose.lines[2].afterBlank}/${prose.lines[3].afterBlank}px)`);
    if (!(prose.lines[2].indentPx > 8)) out.push(`the 4-space indentation is not kept (${prose.lines[2].indentPx}px)`);
    if (!(prose.lines[3].indentPx > 8)) out.push(`the tab indentation is not kept (${prose.lines[3].indentPx}px)`);
    if (prose.lines[0].indentPx > 2) out.push('the unindented line is indented');
    if (!(prose.lines[4].visualLines >= 2)) out.push(`the 260-character URL takes ${prose.lines[4].visualLines} visual line(s)`);
  }
  if (python) {
    if (!/language-python/.test(python.cls) || python.coloredTokens < 3) out.push(`python highlighting: ${python.cls}, ${python.coloredTokens}/${python.tokens} colored tokens`);
    if (!(python.lines[1].indentPx > 8)) out.push('python indentation is not kept');
    if (!(python.lines[2].chars === 0 && python.lines[3].afterBlank > python.lines[1].afterBlank + 10)) out.push(`python blank line is not kept (gaps ${python.lines[3].afterBlank}/${python.lines[1].afterBlank}px)`);
  }
  if (expectActionBeside && !(pathBlock?.actionLinkBeside)) out.push('no file-action link beside the path block');
  if (m.past.length) out.push(`past the right edge: ${m.past.join(', ')}`);
  if (m.cutBy.length) out.push(`the root does not fit its hosts: ${JSON.stringify(m.cutBy)}`);
  // A host the user can scroll sideways (the feed, the Files viewer) must not be wider than its box (autobyteus-24 AC-101).
  const scrollingHosts = m.hostsOverflowing.filter(h => h.overflowX === 'auto' || h.overflowX === 'scroll');
  if (scrollingHosts.length) out.push(`a host scrolls sideways: ${JSON.stringify(scrollingHosts)}`);
  if (m.pageOverflow > 0) out.push(`the page scrolls sideways by ${m.pageOverflow}px`);
  if (m.windowScrollX !== 0) out.push(`the window is scrolled sideways (${m.windowScrollX})`);
  if (m.tables.length !== 2) out.push(`${m.tables.length} table boxes`);
  else {
    if (m.tables[0].scrolls || Math.abs(m.tables[0].tableWidth - m.tables[0].boxWidth) > 1) out.push(`the narrow table: ${JSON.stringify(m.tables[0])}`);
    if (!m.tables[1].scrolls || m.tables[1].overflowX !== 'auto') out.push(`the wide table does not scroll in its box: ${JSON.stringify(m.tables[1])}`);
  }
  if (m.katex.length !== 3) out.push(`${m.katex.length} display equations`);
  m.katex.forEach((k, i) => { if (k.clippedY > 0) out.push(`equation ${i} clipped by ${k.clippedY}px`); if (k.errors) out.push(`equation ${i} renders a KaTeX error`); });
  if (expectMermaid && m.mermaidSvgs < 1) out.push('no Mermaid diagram');
  return out;
};

/**
 * @param probe the probe's helpers: `runCase`, `chromium`, `executablePath`, `outputDir`, `evidence`, `selected`, `sleep`,
 *   `waitFor`, `assert`, `redact`, `browser`, `alpha`, `stack`, `desktopRunsView`.
 */
export const runCodeWrapCases = async (probe) => {
  const { runCase, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView } = probe;
  const ids = ['MSP-50', 'MSP-51', 'MSP-52'];
  if (selected && !ids.some(id => selected.has(id))) return;
  let currentCase = 'code-wrap-setup';
  const filePath = path.join(stack.workspace, DIR, FILE);
  const text = documentText(filePath);
  const fences = [NO_LANGUAGE, PYTHON, pathFence(filePath)];
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text);

  // The agent's answer is the document (REPLY_FILE: answers with the file's text as it is).
  const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
  assert(created.success, created.message);
  const replyRun = created.runId;
  await stack.agentSay(replyRun, `Review the draft. REPLY_FILE:${filePath}`);
  await waitFor('the Markdown answer', async () => (await stack.projection(replyRun)).includes(`End of ${MARKER}.`), 60_000);
  // Another agent's message with the same Markdown, in a task agent's conversation.
  const host = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: stack.ids.ptm, ...stack.runConfig } })).createAgentRun;
  assert(host.success, host.message);
  const delegated = await stack.agentCall(host.runId, 'delegate_task', { recipient_address: '/release_notes_writer', description: 'Read the 23 draft. Marker TASK-23.' });
  const talkRun = /target_agent_run_id\W+(\w+)/.exec(JSON.stringify(delegated))?.[1];
  assert(talkRun, 'the task agent of the Markdown message', { delegated });
  await stack.agentCall(host.runId, 'send_message_to', { target_agent_run_id: talkRun, content: text });
  const taskAgentConversation = async () => JSON.stringify((await alpha.gql('query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}', { h: host.runId, m: '/release_notes_writer', a: talkRun })).agentRunCollaborationMemberProjection?.conversation ?? []);
  await waitFor('the Markdown message in the task agent\'s conversation', async () => (await taskAgentConversation()).includes(`End of ${MARKER}.`), 60_000);
  evidence.codeWrap = { replyRun, host: host.runId, talkRun, file: filePath };

  const surfaces = [];
  const surfaceOf = (page, label, origin) => {
    const surface = { label, page };
    const browserLine = (line, sourceUrl = '') => {
      const redacted = redact(`${label} console: ${line}`);
      const favicon = /: Failed to load resource: the server responded with a status of 40[14] \((Unauthorized|Not Found)\)$/.test(redacted) && sourceUrl.startsWith(origin) && new URL(sourceUrl).pathname === '/favicon.ico';
      evidence.browserErrors.push({ case: currentCase, line: redacted, known: favicon, ...(favicon ? { cause: 'the browser\'s favicon request at the origin root (/favicon.ico)' } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') browserLine(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => browserLine(`pageerror ${error.message}`));
    page.on('requestfailed', request => evidence.failedRequests.push({ case: currentCase, label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
    surfaces.push(surface);
    return surface;
  };
  const shot = async (target, name) => { await target.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined); return `${name}.png`; };

  /** Selects all of `target`'s text and copies it: Ctrl+C and the clipboard (desktop), or the selection's text (phone). */
  const copyOf = async (page, target, viaClipboard) => {
    await target.scrollIntoViewIfNeeded();
    // How many visual lines the text takes where it is copied from (an inline element's rects are its line fragments).
    const { selected, visualLines } = await target.evaluate((el) => {
      const range = document.createRange(); range.selectNodeContents(el);
      const s = getSelection(); s.removeAllRanges(); s.addRange(range);
      return { selected: s.toString(), visualLines: new Set([...el.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size };
    });
    let copied = selected;
    if (viaClipboard) {
      await page.evaluate(() => navigator.clipboard.writeText('')).catch(() => undefined);
      await page.keyboard.press('Control+C');
      await sleep(150);
      copied = await page.evaluate(() => navigator.clipboard.readText());
    }
    await page.evaluate(() => getSelection().removeAllRanges());
    return { copied, visualLines };
  };
  /** The copied text of each code block, of the inline path and of the bare URL, against its source. */
  const copies = async (page, root, viaClipboard) => {
    const via = viaClipboard ? 'Ctrl+C + clipboard' : 'selection';
    const count = await root.locator('pre > code').count();
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const { copied } = await copyOf(page, root.locator('pre > code').nth(i), viaClipboard);
      out.push({ what: `code block ${i}`, via, equal: copied.replace(/\n$/, '') === fences[i], length: copied.length, sourceLength: fences[i]?.length ?? null });
    }
    // autobyteus-24 AC-106: inline text that wraps copies as written.
    for (const [what, target, source] of [
      ['inline path', root.locator('p code').filter({ hasText: INLINE_PATH }), INLINE_PATH],
      ['bare URL', root.locator('p a').filter({ hasText: BARE_URL }), BARE_URL],
    ]) {
      if (!(await target.count())) { out.push({ what, via, equal: false, missing: true }); continue; }
      const { copied, visualLines } = await copyOf(page, target.first(), viaClipboard);
      out.push({ what, via, equal: copied === source, length: copied.length, sourceLength: source.length, visualLines });
    }
    return out;
  };
  /** Scrolls the wide table's box the way the user does (wheel on desktop, a touch swipe on the phone). */
  const scrollWideTable = async (surface, root) => {
    const box = root.locator('.markdown-table-scroll').nth(1);
    await box.scrollIntoViewIfNeeded();
    await box.evaluate((el) => { el.scrollLeft = 0; });
    const b = await box.boundingBox();
    const x = b.x + b.width / 2; const y = b.y + Math.min(b.height / 2, 20);
    if (surface.label.startsWith('phone')) {
      // A finger swipe to the left across the box (touch events; Chromium scrolls the box under the finger).
      const cdp = await surface.page.context().newCDPSession(surface.page);
      const from = Math.round(b.x + b.width * 0.85); const distance = Math.round(b.width * 0.7); const at = px => [{ x: px, y: Math.round(y) }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(from) });
      for (let step = 1; step <= 10; step += 1) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(from - Math.round(distance * step / 10)) }); await sleep(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach().catch(() => undefined);
    } else {
      await surface.page.mouse.move(x, y);
      await surface.page.mouse.wheel(Math.round(b.width * 0.8), 0);
    }
    await sleep(500);
    const byUser = await box.evaluate(el => el.scrollLeft);
    const end = await box.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
      const last = el.querySelector('tr:last-child td:last-child, tr:last-child th:last-child').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      // Scrolled to the end, the table's right edge (its last cell's) is inside the box: nothing is cut off.
      const reachable = last.right <= r.right + 1;
      el.scrollLeft = 0;
      return { reachable };
    });
    const windowScrollX = await surface.page.evaluate(() => window.scrollX);
    return { scrolledByUser: byUser, lastCellReachable: end.reachable, windowScrollX };
  };
  /** One surface at one size: measure, copy, scroll, screenshots. */
  const check = async (surface, rootLocator, name, { viaClipboard, expectMermaid, expectActionBeside }) => {
    const root = rootLocator.first();
    await root.waitFor({ timeout: 60_000 });
    await sleep(800);
    if (expectMermaid) await waitFor('the Mermaid diagram', async () => (await root.locator('.mermaid-segment-container svg').count()) > 0, 30_000).catch(() => undefined);
    await root.evaluate(el => el.scrollIntoView({ block: 'start' }));
    await sleep(300);
    const measured = await root.evaluate(measureRoot, fences);
    const copied = await copies(surface.page, root, viaClipboard);
    const scroll = await scrollWideTable(surface, root);
    // Viewport screenshots of each part (an element screenshot of a long message in a scrolling feed is covered by
    // the composer): the code blocks, the tables, the equations.
    const files = [];
    for (const [part, selector] of [['code', 'pre'], ['python', 'pre.language-python'], ['tables', '.markdown-table-scroll'], ['math', '.katex-display']]) {
      await root.locator(selector).first().evaluate(el => el.scrollIntoView({ block: 'start' }));
      await sleep(250);
      files.push(await shot(surface.page, `${name}-${part}`));
    }
    const failures = failuresOf(measured, { fences, expectMermaid, expectActionBeside });
    if (!copied.length || !copied.every(c => c.equal)) failures.push(`copied text differs: ${JSON.stringify(copied)}`);
    if (!(scroll.scrolledByUser > 0) || !scroll.lastCellReachable || scroll.windowScrollX !== 0) failures.push(`wide table scroll: ${JSON.stringify(scroll)}`);
    const viewport = surface.page.viewportSize();
    return { name, viewport: `${viewport.width}x${viewport.height}`, failures, measured: { ...measured, pres: measured.pres.map(({ lines, ...rest }) => ({ ...rest, lines: lines.map(l => (l.chars ? `${l.chars}ch indent ${l.indentPx}px ${l.visualLines ?? '-'} line(s)${l.afterBlank === null ? '' : ` gap ${l.afterBlank}px`}` : 'blank')) })) }, copied, scroll, screenshots: files };
  };
  const passAll = list => list.every(entry => entry.failures.length === 0);
  const summary = list => list.map(entry => ({ name: entry.name, viewport: entry.viewport, rootWidth: entry.measured.rootWidth, failures: entry.failures, past: entry.measured.past }));

  // ---- the desktop window ---------------------------------------------------------------------------------------------
  const deskContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'UTC', permissions: ['clipboard-read', 'clipboard-write'] });
  await attachToBrowserContext(deskContext);
  await deskContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const deskPage = await deskContext.newPage();
  let desk = null;
  // ---- the phone ------------------------------------------------------------------------------------------------------
  const phoneBrowser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const phoneOrigin = `http://${PHONE_HOST}:${alpha.port}`;
  let phoneContext = null;
  try {
    await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
    await deskPage.goto(stack.frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(3_000);
    // Browser lines count from here: a cold `nuxt dev` re-optimizes dependencies and reloads during the warm-up above
    // (TESTING.md § Browser probes), which is the harness, not the product.
    desk = surfaceOf(deskPage, 'desktop', stack.frontendUrl);
    const openDesktopRun = async (run) => {
      await deskPage.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
      await desktopRunsView(deskPage);
      const showOlder = deskPage.locator('[data-test="run-list-show-older"]');
      if (await showOlder.count() && (await showOlder.innerText()).startsWith('Show older')) await showOlder.click();
      await deskPage.locator(`[data-test="run-list-row"][data-run-id="${run}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
    };
    const openDesktopTaskAgent = async (hostRun, run) => {
      await openDesktopRun(hostRun);
      const row = deskPage.locator(`[data-transient-kind="task_agent"][data-agent-run-id="${run}"]:visible`).first();
      for (let round = 0; round < 5 && !(await row.count()); round += 1) {
        await deskPage.locator(`[data-test="run-list-row"][data-run-id="${hostRun}"] [data-test="run-list-disclosure"]`).first().click().catch(() => undefined);
        await sleep(800);
      }
      await row.click({ timeout: 30_000 });
    };
    // The answering run's conversation holds no inter-agent message: its only rendered Markdown with the marker is the answer.
    const answerRoot = page => page.locator('.markdown-renderer-segments:visible').filter({ hasText: `${MARKER} draft for review` });
    const messageRoot = page => page.locator('.inter-agent-content .markdown-renderer-segments:visible').filter({ hasText: `${MARKER} draft for review` });
    const fileAction = scope => scope.locator(`[data-event-monitor-file-action-control="true"][title="${filePath}"]`).last();

    await runCase('MSP-50', async () => {
      currentCase = 'MSP-50';
      const results = [];
      await openDesktopRun(replyRun);
      for (const [width, height] of [[1280, 900], [700, 900]]) {
        await deskPage.setViewportSize({ width, height });
        await sleep(800);
        results.push(await check(desk, answerRoot(deskPage), `MSP-50-desktop-answer-${width}`, { viaClipboard: true, expectMermaid: true, expectActionBeside: true }));
      }
      await deskPage.setViewportSize({ width: 1280, height: 900 });
      await openDesktopTaskAgent(host.runId, talkRun);
      for (const [width, height] of [[1280, 900], [700, 900]]) {
        await deskPage.setViewportSize({ width, height });
        await sleep(800);
        results.push(await check(desk, messageRoot(deskPage), `MSP-50-desktop-message-${width}`, { viaClipboard: true, expectMermaid: true, expectActionBeside: false }));
      }
      await deskPage.setViewportSize({ width: 1280, height: 900 });
      const details = { summary: summary(results), results };
      assert(passAll(results), 'desktop conversation: every code block wraps inside its box with its lines and indentation, copies its source; tables and equations scroll in their own box; no text, inline code or link past the edge, no host scrolls sideways, inline path and URL copy as written (AC-001, AC-005…AC-008; autobyteus-24 AC-102, AC-105, AC-106)', details);
      return details;
    });

    await runCase('MSP-51', async () => {
      currentCase = 'MSP-51';
      const results = [];
      await deskPage.setViewportSize({ width: 1280, height: 900 });
      await openDesktopRun(replyRun);
      const link = fileAction(answerRoot(deskPage).first());
      await link.waitFor({ timeout: 60_000 });
      await link.click();
      const viewer = deskPage.locator('#contentViewer:visible').first();
      const fileRoot = () => deskPage.locator('#contentViewer:visible .markdown-renderer-segments').filter({ hasText: `${MARKER} draft for review` });
      await waitFor('the document in the Files panel', async () => (await fileRoot().count()) > 0, 30_000);
      // 1280: the viewer beside the file tree (its default, narrow), then "Maximize view" (wide), then restored.
      results.push(await check(desk, fileRoot(), 'MSP-51-desktop-file-1280-panel', { viaClipboard: true, expectMermaid: true, expectActionBeside: false }));
      await viewer.locator('button[title="Maximize view"]').click();
      await sleep(800);
      results.push(await check(desk, fileRoot(), 'MSP-51-desktop-file-1280-maximized', { viaClipboard: true, expectMermaid: true, expectActionBeside: false }));
      await deskPage.locator('#contentViewer:visible button[title="Restore view"], #contentViewer:visible button[title="Exit full view"]').first().click();
      await sleep(800);
      // 700: the right tools fold into the strip; its Files button opens the panel with the open file.
      await deskPage.setViewportSize({ width: 700, height: 900 });
      await sleep(800);
      if (!(await fileRoot().count())) {
        await deskPage.locator('[data-test="workspace-right-tool-strip"] button[data-tab-name="files"]').click();
        await sleep(800);
      }
      await waitFor('the document in the Files panel at 700', async () => (await fileRoot().count()) > 0, 30_000).catch(() => undefined);
      if (await fileRoot().count()) results.push(await check(desk, fileRoot(), 'MSP-51-desktop-file-700', { viaClipboard: true, expectMermaid: true, expectActionBeside: false }));
      else results.push({ name: 'MSP-51-desktop-file-700', viewport: '700x900', failures: ['the Files panel does not show the document at this size'], measured: { rootWidth: 0, past: [] }, screenshots: [await shot(deskPage, 'MSP-51-desktop-file-700-viewport')] });
      await deskPage.setViewportSize({ width: 1280, height: 900 });
      const details = { summary: summary(results), results };
      assert(passAll(results), 'desktop Files panel: every code block wraps inside its box with its lines and indentation, copies its source; tables and equations scroll in their own box; no text, inline code or link past the edge, the viewer does not scroll sideways, inline path and URL copy as written (AC-003, AC-005…AC-008; autobyteus-24 AC-101, AC-105, AC-106)', details);
      return details;
    });

    await runCase('MSP-52', async () => {
      currentCase = 'MSP-52';
      const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
      assert(settings.status === 200, 'alpha Phone Access on', settings);
      const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Alpha Test Node', trustedPrivateHttpAcknowledged: true });
      assert(pairing.status === 201 && pairing.body.mobileUrl, 'alpha pairing session for the code-wrap phone', pairing.status);
      phoneContext = await phoneBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
      const phonePage = await phoneContext.newPage();
      const phone = surfaceOf(phonePage, 'phone', phoneOrigin);
      await phonePage.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await phonePage.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
      await phonePage.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
      const phoneHome = phonePage.url();
      const openPhoneRun = async (run, hostRun = null) => {
        await phonePage.goto(phoneHome, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        const open = hostRun
          ? phonePage.locator(`[data-testid^="mobile-run-row-agent:${hostRun}/"][data-testid*="${run}"] [data-testid="mobile-run-open"]`)
          : phonePage.locator(`[data-testid="mobile-run-row-agent:${run}"] [data-testid="mobile-run-open"]`);
        for (let round = 0; hostRun && round < 5 && !(await open.count()); round += 1) {
          await phonePage.locator(`[data-testid="mobile-run-row-agent:${hostRun}"]`).first().waitFor({ timeout: 60_000 });
          for (const toggle of await phonePage.locator(`[data-test="mobile-run-row"][data-testid^="mobile-run-row-agent:${hostRun}"][aria-expanded="false"] [data-testid="mobile-run-toggle"]`).all()) await toggle.click({ timeout: 1_500 }).catch(() => undefined);
          await sleep(600);
        }
        await open.first().click({ timeout: 60_000 });
        return phonePage.locator('[data-testid="mobile-run-conversation"]');
      };
      const sizes = [[390, 844], [360, 800]];
      const results = [];
      let conversation = await openPhoneRun(replyRun);
      for (const [width, height] of sizes) {
        await phonePage.setViewportSize({ width, height });
        await sleep(800);
        results.push(await check(phone, conversation.locator('.markdown-renderer-segments:visible').filter({ hasText: `${MARKER} draft for review` }), `MSP-52-phone-answer-${width}`, { viaClipboard: false, expectMermaid: true, expectActionBeside: true }));
      }
      // The file viewer, opened from the file-action link beside the path block.
      await phonePage.setViewportSize({ width: 390, height: 844 });
      await sleep(500);
      const link = fileAction(conversation);
      await link.scrollIntoViewIfNeeded();
      await link.tap();
      const viewer = phonePage.locator('[data-testid="mobile-file-viewer"]');
      await waitFor('the document in the phone viewer', async () => (await viewer.locator('.markdown-renderer-segments').filter({ hasText: `${MARKER} draft for review` }).count()) > 0, 30_000);
      for (const [width, height] of sizes) {
        await phonePage.setViewportSize({ width, height });
        await sleep(800);
        results.push(await check(phone, viewer.locator('.markdown-renderer-segments').filter({ hasText: `${MARKER} draft for review` }), `MSP-52-phone-file-${width}`, { viaClipboard: false, expectMermaid: true, expectActionBeside: false }));
      }
      await phonePage.setViewportSize({ width: 390, height: 844 });
      conversation = await openPhoneRun(talkRun, host.runId);
      for (const [width, height] of sizes) {
        await phonePage.setViewportSize({ width, height });
        await sleep(800);
        results.push(await check(phone, conversation.locator('.inter-agent-content .markdown-renderer-segments:visible').filter({ hasText: `${MARKER} draft for review` }), `MSP-52-phone-message-${width}`, { viaClipboard: false, expectMermaid: true, expectActionBeside: false }));
      }
      const details = { summary: summary(results), results };
      assert(passAll(results), 'phone conversation and file viewer: every code block wraps inside its box with its lines and indentation, copies its source; tables and equations scroll in their own box; no text, inline code or link past the edge, no host scrolls sideways, inline path and URL copy as written (AC-002, AC-004, AC-005…AC-008; autobyteus-24 AC-103, AC-105, AC-106)', details);
      return details;
    });
  } finally {
    if (phoneContext) await phoneContext.close().catch(() => undefined);
    await deskContext.close().catch(() => undefined);
    await phoneBrowser.close().catch(() => undefined);
  }
};
