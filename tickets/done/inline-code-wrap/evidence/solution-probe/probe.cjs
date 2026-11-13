// autobyteus-24 probe: measures which inline content (inline code, file-action links in code, bare URLs, headings)
// runs past the rendered markdown root, with the app's real CSS (tailwind typography config, prism, MarkdownRenderer <style>).
const path = require('path'); const fs = require('fs');
const [WT, NM, OUT, FIX] = process.argv.slice(2);
const req = (m) => require(path.join(NM, m));
const MarkdownIt = req('markdown-it'); const postcss = req('postcss'); const tailwind = req('tailwindcss');
const md = new MarkdownIt({ html: true, breaks: true, linkify: true, typographer: true });
const src = [
  '# Draft v1 — LinkedIn reply to Shubham Saboo (Elephant/Goldfish Model)', '',
  'Inline path `/home/autobyteus/workspace/autobyteus-marketing-workspace/linkedin/2026-11-12-review/draft-v2.md` stays inline.', '',
  'Action path ACTIONPATH in a sentence.', '',
  'Bare URL https://www.linkedin.com/feed/update/urn:li:activity:7392837465123456789?utm_source=share&utm_medium=member_desktop here.', '',
  'Long token aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa end.', '',
  '- Source: `source-post.md`, builds on `precedent-review.md`', '',
  '| c1 | c2 | c3 | c4 | c5 | c6 | c7 | c8 |', '|---|---|---|---|---|---|---|---|', '| ' + Array(8).fill('autobyteus-web/components/conversation').join(' | ') + ' |', '',
  '```', 'fenced ' + 'x'.repeat(200), '```',
].join('\n');
const PATH = '/home/autobyteus/workspace/autobyteus-marketing-workspace/linkedin/2026-11-12-review/draft-v2.md';
let html = md.render(src).replace('ACTIONPATH', `<code><a href="#" role="button" class="event-monitor-file-action-link">${PATH}</a></code>`)
  .split('<table>').join('<div class="markdown-table-scroll"><table>').split('</table>').join('</table></div>');
const vue = fs.readFileSync(path.join(WT, 'autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue'), 'utf8');
const rendererCss = vue.slice(vue.indexOf('<style>') + 7, vue.indexOf('</style>'));
const prismCss = fs.readFileSync(path.join(NM, 'prismjs/themes/prism.css'), 'utf8');
const config = require(path.join(WT, 'autobyteus-web/tailwind.config.js'));
config.content = [{ raw: '<div class="markdown-body prose dark:prose-invert prose-gray max-w-none"></div>' }];
const extra = FIX ? fs.readFileSync(FIX, 'utf8') : '';
(async () => {
  const tw = (await postcss([tailwind(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })).css;
  const { chromium } = req('playwright-core');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  for (const width of [167, 202, 262, 310, 1248]) {
    const page = `<!doctype html><html><head><style>${tw}\n${prismCss}\n${rendererCss}\n${extra}</style></head><body style="margin:0"><div id="host" style="width:${width}px;overflow:auto"><div class="markdown-renderer-segments"><div class="markdown-body prose dark:prose-invert prose-gray max-w-none">${html}</div></div></div></body></html>`;
    const p = await browser.newPage({ viewport: { width: Math.max(width + 40, 400), height: 1400 } });
    await p.setContent(page); fs.writeFileSync(path.join(OUT, `page-${width}.html`), page);
    const r = await p.evaluate(() => {
      const root = document.querySelector('.markdown-body'); const rb = root.getBoundingClientRect(); const host = document.getElementById('host');
      const past = (sel) => [...root.querySelectorAll(sel)].map((el) => Math.round(Math.max(...[...el.getClientRects()].map((c) => c.right)) - rb.right)).filter((d) => d > 0);
      const tables = [...root.querySelectorAll('.markdown-table-scroll')].map((b) => ({ scrolls: b.scrollWidth > b.clientWidth, table: b.querySelector('table').offsetWidth, box: b.clientWidth }));
      const sel = getSelection(); const c = root.querySelector('p code'); const rg = document.createRange(); rg.selectNodeContents(c); sel.removeAllRanges(); sel.addRange(rg);
      const textPast = {};
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || n.parentElement.closest('pre, .markdown-table-scroll')) continue;
        const rg2 = document.createRange(); rg2.selectNodeContents(n);
        const right = Math.max(...[...rg2.getClientRects()].map((c) => c.right));
        const d = Math.round(right - rb.right);
        if (d > 0) { const el = n.parentElement; const kind = el.closest('code') ? 'code' : el.closest('a') ? 'link' : el.closest('h1,h2,h3') ? 'heading' : 'prose'; textPast[kind] = Math.max(textPast[kind] || 0, d); }
      }
      return { textPast, hostOverflow: host.scrollWidth - host.clientWidth, inlineCode: past('p code, li code'), links: past('a'), headings: past('h1'), prose: past('p'), tables, preOverflow: [...root.querySelectorAll('pre')].map((x) => x.scrollWidth - x.clientWidth), copyEqual: sel.toString() === c.textContent && !sel.toString().includes('\n') };
    });
    console.log(width, JSON.stringify(r));
    await p.screenshot({ path: path.join(OUT, `shot-${width}.png`), fullPage: true }); await p.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
