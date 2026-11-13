// Reproduction probe for autobyteus-23: renders fenced code blocks with the app's real CSS
// (tailwind typography config + prism.css + MarkdownRenderer.vue style block) and measures overflow.
const path = require('path'); const fs = require('fs');
const WT = process.argv[2]; const NM = process.argv[3]; const OUT = process.argv[4]; const extraCss = process.argv[5] ? fs.readFileSync(process.argv[5],'utf8') : '';
const req = (m) => require(path.join(NM, m));
const MarkdownIt = req('markdown-it'); const postcss = req('postcss'); const tailwind = req('tailwindcss');
const md = new MarkdownIt({ html: true, breaks: true, linkify: true, typographer: true });
const long = 'This matches what we found when designing agent responsibilities: some work is cooperative, some is independent, and the split runs through the whole cycle.';
const src = [
  'Prose before.', '', '```', long, '', '• Solution Designer is the elephant. It works through requirements and design with you, then writes files.', '```', '',
  '```python', 'def f():', '    return "' + 'x'.repeat(40) + ' a very long line of real source code that keeps going past the edge of any narrow panel"', '```', '',
  '`/home/autobyteus/workspace/autobyteus-marketing-workspace/linkedin/2026-11-12-shubham-saboo-elephant-goldfish-review/draft-v2.md`', '',
  '| a | b |', '|---|---|', '| ' + long + ' | ' + long + ' |', '', '| c1 | c2 | c3 | c4 | c5 | c6 | c7 | c8 |', '|---|---|---|---|---|---|---|---|', '| ' + Array(8).fill('autobyteus-web/components/conversation').join(' | ') + ' |', '', '```', 'https://example.com/' + 'a'.repeat(260), '\tindented with tab then a long line ' + 'word '.repeat(60), '```', '', '$$', 'a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9 + a_{10} + a_{11} + a_{12} + a_{13} + a_{14} + a_{15} + a_{16} + a_{17} + a_{18} + a_{19} + a_{20} = b', '$$',
].join('\n');
let html = md.render(src);
// emulate markdownItPrism output for a language fence (class on pre and code)
if (process.env.WRAPTABLE) html = html.split('<table>').join('<div class="markdown-table-scroll"><table>').split('</table>').join('</table></div>');
html = html.replace('<pre><code class="language-python">', '<pre class="language-python"><code class="language-python">');
const vue = fs.readFileSync(path.join(WT, 'autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue'), 'utf8');
const rendererCss = vue.slice(vue.indexOf('<style>') + 7, vue.indexOf('</style>'));
const prismCss = fs.readFileSync(path.join(NM, 'prismjs/themes/prism.css'), 'utf8');
const config = require(path.join(WT, 'autobyteus-web/tailwind.config.js'));
config.content = [{ raw: '<div class="markdown-body prose dark:prose-invert prose-gray max-w-none h-full overflow-auto p-4 min-w-0"></div>' }];
(async () => {
  const twCss = (await postcss([tailwind(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })).css;
  for (const width of [390, 700, 1280]) {
    const page = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${twCss}\n${prismCss}\n${rendererCss}\n${extraCss}</style></head><body><div style="width:${width}px" class="p-4"><div class="markdown-renderer-segments"><div class="markdown-body prose dark:prose-invert prose-gray max-w-none">${html}</div></div></div></body></html>`;
    fs.writeFileSync(path.join(OUT, `page-${width}.html`), page);
  }
  const { chromium } = req('playwright-core');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  for (const width of [390, 700, 1280]) {
    const p = await browser.newPage({ viewport: { width: width + 40, height: 900 } });
    await p.goto('file://' + path.join(OUT, `page-${width}.html`));
    const r = await p.evaluate(() => [...document.querySelectorAll('pre, table, .markdown-table-scroll, .katex-display, .markdown-body')].map((el) => ({ tag: el.tagName, cls: el.className, ws: getComputedStyle(el.tagName==='PRE'?el.querySelector('code'):el).whiteSpace, preWs: getComputedStyle(el).whiteSpace, overflowX: getComputedStyle(el).overflowX, client: el.clientWidth, scroll: el.scrollWidth, horizontalOverflow: el.scrollWidth > el.clientWidth })));
    console.log(width, JSON.stringify(r));
    const copy = await p.evaluate(() => { const c = document.querySelector('pre code'); const r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString(); });
    const expected = md.parse(src, {}).find((t) => t.type === 'fence').content.replace(/\n$/, '');
    console.log(width, 'copy-equals-source', copy.replace(/\n$/, '') === expected);
    await p.screenshot({ path: path.join(OUT, `shot-${width}.png`), fullPage: true });
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
