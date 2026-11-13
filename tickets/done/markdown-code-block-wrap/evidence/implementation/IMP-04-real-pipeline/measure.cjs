// IMP-04 step 2 (autobyteus-23): lays out rendered.html (the real useMarkdownSegments output) with the app's CSS
// (Tailwind from autobyteus-web/tailwind.config.js incl. typography, prism.css, katex.min.css, MarkdownRenderer.vue <style>)
// inside the host containers of the chat (AIMessage.vue content column) and the file preview (MarkdownPreviewer.vue),
// in headless Chromium at 390/700/1280 px, and measures overflow, scroll boxes, KaTeX clipping and selection copy.
//   node measure.cjs <worktree> <this folder>
const path = require('path'); const fs = require('fs');
const WT = process.argv[2]; const DIR = process.argv[3];
const NM = path.join(WT, 'autobyteus-web/node_modules');
const req = (m) => require(path.join(NM, m));
const postcss = req('postcss'); const tailwind = req('tailwindcss');
const html = fs.readFileSync(path.join(DIR, 'rendered.html'), 'utf8');
const fences = JSON.parse(fs.readFileSync(path.join(DIR, 'fence-sources.json'), 'utf8')).filter((f) => f.info !== 'math');
const vue = fs.readFileSync(path.join(WT, 'autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue'), 'utf8');
const rendererCss = vue.slice(vue.indexOf('<style>') + 7, vue.indexOf('</style>'));
const prismCss = fs.readFileSync(path.join(NM, 'prismjs/themes/prism.css'), 'utf8');
const katexDir = path.join(NM, 'katex/dist');
const katexCss = fs.readFileSync(path.join(katexDir, 'katex.min.css'), 'utf8').replace(/url\(fonts\//g, `url(file://${katexDir}/fonts/`);
const body = `<div class="markdown-renderer-segments"><div class="markdown-body prose dark:prose-invert prose-gray max-w-none">${html}</div></div>`;
const hosts = {
  // AIMessage.vue:3,15 (avatar + min-w-0 flex-1 content column)
  chat: `<div class="flex items-start gap-3 pr-8"><div class="h-9 w-9 shrink-0 rounded-full bg-emerald-50"></div><div class="min-w-0 flex-1 pt-0.5">${body}</div></div>`,
  // MarkdownPreviewer.vue:2
  file: `<div class="h-full overflow-auto bg-white p-4">${body}</div>`,
};
const config = require(path.join(WT, 'autobyteus-web/tailwind.config.js'));
config.content = [{ raw: Object.values(hosts).join('') }];
(async () => {
  const twCss = (await postcss([tailwind(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })).css;
  const { chromium } = req('playwright-core');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  let failures = 0;
  for (const [host, markup] of Object.entries(hosts)) {
    for (const width of [390, 700, 1280]) {
      const file = path.join(DIR, `page-${host}-${width}.html`);
      fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${twCss}\n${prismCss}\n${katexCss}\n${rendererCss}</style></head><body><div id="host" style="width:${width}px;height:auto">${markup}</div></body></html>`);
      const p = await browser.newPage({ viewport: { width, height: 900 } });
      await p.goto('file://' + file);
      await p.evaluate(() => document.fonts.ready);
      const r = await p.evaluate((sources) => {
        const ov = (el) => el.scrollWidth - el.clientWidth;
        const md = document.querySelector('.markdown-body');
        const pres = [...md.querySelectorAll('pre')].map((el) => ({ cls: el.className, ws: getComputedStyle(el.querySelector('code')).whiteSpace, overflow: ov(el) }));
        const tables = [...md.querySelectorAll('.markdown-table-scroll')].map((el) => ({ overflowX: getComputedStyle(el).overflowX, scrolls: ov(el) > 0, tableWidth: el.querySelector('table').offsetWidth, boxWidth: el.clientWidth }));
        // clippedY > 0: content reaches past the box's clip edge vertically (overflow-y: hidden would cut it; RSK-002).
        const katex = [...md.querySelectorAll('.katex-display')].map((el) => ({ scrolls: ov(el) > 0, clippedY: el.scrollHeight - el.clientHeight, boxWidth: el.clientWidth }));
        const copies = [...md.querySelectorAll('pre > code')].map((code, i) => {
          const range = document.createRange(); range.selectNodeContents(code);
          const s = getSelection(); s.removeAllRanges(); s.addRange(range);
          const text = s.toString(); s.removeAllRanges();
          return text.replace(/\n$/, '') === sources[i].content.replace(/\n$/, '');
        });
        // Elements past the body's right edge, outside the scroll boxes. Inline code (`p > code`) is reported on its own:
        // its wrapping is preserved behavior this change does not touch (BEH-003; follow-up FU-002).
        const right = md.getBoundingClientRect().right + 0.5;
        const past = [...md.querySelectorAll('*')].filter((el) => !el.closest('.markdown-table-scroll, .katex-display')
          && el.getBoundingClientRect().right > right);
        const inlineCodePast = past.filter((el) => el.closest('code') && !el.closest('pre')).length;
        const otherPast = past.filter((el) => !(el.closest('code') && !el.closest('pre'))).map((el) => el.tagName);
        return { bodyOverflow: ov(md), inlineCodePast, otherPast, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, pres, tables, katex, copies };
      }, fences);
      const ok = r.otherPast.length === 0 && (r.bodyOverflow <= 0 || r.inlineCodePast > 0) && r.pageOverflow <= 0 && r.pres.every((x) => x.overflow <= 0 && x.ws === 'pre-wrap')
        && r.tables.length === 2 && !r.tables[0].scrolls && r.tables[0].tableWidth === r.tables[0].boxWidth && r.tables[1].scrolls
        && r.katex.length === 3 && r.katex.every((k) => k.clippedY <= 0) && r.copies.length === fences.length && r.copies.every(Boolean);
      if (!ok) failures++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${host} ${width} ${JSON.stringify(r)}`);
      await p.screenshot({ path: path.join(DIR, `IMP-04-${host}-${width}.png`), fullPage: true });
      await p.close();
      fs.unlinkSync(file);
    }
  }
  await browser.close();
  console.log(failures ? `FAILED ${failures}` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
