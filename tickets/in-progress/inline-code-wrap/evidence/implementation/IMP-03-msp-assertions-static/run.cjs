// IMP-03 (autobyteus-24): runs the extended MSP-50…52 in-page assertions (`measureRoot` and `failuresOf`, taken
// unchanged from autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs) on the real useMarkdownSegments output of the
// cases' own document, laid out with the app's CSS (Tailwind from tailwind.config.js incl. typography, prism.css,
// katex.min.css, MarkdownRenderer.vue <style>) in the chat column (AIMessage.vue classes, file actions on) and the
// file preview (MarkdownPreviewer.vue classes), in headless Chromium. Static page: no running app, no Mermaid render.
//   NODE_PATH=<web node_modules> node run.cjs <web dir> <tailwind.config.js> <MarkdownRenderer.vue> <work dir> <out dir> <label>
// <work dir> holds meta.json (fences, INLINE_PATH, BARE_URL, the two functions' source) and rendered-{chat,file}.html.
const path = require('path'); const fs = require('fs');
const [WEB, CONFIG, VUE, WORK, OUT, LABEL] = process.argv.slice(2);
const NM = path.join(WEB, 'node_modules'); const req = (m) => require(path.join(NM, m));
const meta = JSON.parse(fs.readFileSync(path.join(WORK, 'meta.json'), 'utf8'));
const vue = fs.readFileSync(VUE, 'utf8'); const rendererCss = vue.slice(vue.indexOf('<style>') + 7, vue.indexOf('</style>'));
const prismCss = fs.readFileSync(path.join(NM, 'prismjs/themes/prism.css'), 'utf8');
const kd = path.join(NM, 'katex/dist'); const katexCss = fs.readFileSync(path.join(kd, 'katex.min.css'), 'utf8').replace(/url\(fonts\//g, `url(file://${kd}/fonts/`);
const root = (name) => `<div class="markdown-renderer-segments">${fs.readFileSync(path.join(WORK, `rendered-${name}.html`), 'utf8')}</div>`;
const hosts = {
  chat: (w) => `<div id="host" style="width:${w}px;height:900px;overflow:auto"><div class="flex items-start gap-3 pr-8"><div class="h-9 w-9 shrink-0 rounded-full bg-emerald-50"></div><div class="min-w-0 flex-1 pt-0.5">${root('chat')}</div></div></div>`,
  file: (w) => `<div id="host" style="width:${w}px;height:900px"><div class="h-full overflow-auto bg-white p-4">${root('file')}</div></div>`,
};
const config = require(path.resolve(CONFIG)); config.content = [{ raw: hosts.chat(1) + hosts.file(1) }];
// Host widths: the chat column 310 (390 phone) / 700 / 1280; the file viewer's content 167 (desktop default), 358, 668, 1248.
const widths = { chat: [354, 390, 744, 1280], file: [199, 390, 700, 1280] };
(async () => {
  const tw = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })).css;
  const { chromium } = req('playwright-core');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  let failing = 0;
  for (const [host, markup] of Object.entries(hosts)) {
    for (const w of widths[host]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${tw}\n${prismCss}\n${katexCss}\n${rendererCss}</style></head><body style="margin:0">${markup(w)}</body></html>`);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(({ meta, expectActionBeside }) => {
        const measureRoot = eval(`(${meta.measureRoot})`); const failuresOf = eval(`(${meta.failuresOf})`);
        const r = document.querySelector('.markdown-renderer-segments');
        const m = measureRoot(r, meta.fences);
        const failures = failuresOf(m, { fences: meta.fences, expectMermaid: false, expectActionBeside });
        const copyOf = (el) => { const range = document.createRange(); range.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(range); const t = s.toString(); s.removeAllRanges(); return { text: t, lines: new Set([...el.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size }; };
        const code = [...r.querySelectorAll('p code')].find(c => c.textContent === meta.INLINE_PATH);
        const link = [...r.querySelectorAll('p a')].find(a => a.textContent === meta.BARE_URL);
        const copies = [['inline path', code, meta.INLINE_PATH], ['bare URL', link, meta.BARE_URL]].map(([what, el, src]) => (el ? { what, equal: copyOf(el).text === src, visualLines: copyOf(el).lines } : { what, missing: true }));
        copies.forEach(c => { if (!c.equal) failures.push(`copy of ${c.what} differs`); });
        return { rootWidth: m.rootWidth, failures, past: m.past.slice(0, 6), hostsOverflowing: m.hostsOverflowing, pageOverflow: m.pageOverflow, copies };
      }, { meta, expectActionBeside: host === 'chat' });
      if (result.failures.length) failing += 1;
      console.log(`${result.failures.length ? 'FAIL' : 'PASS'} ${LABEL} ${host} host ${w} root ${result.rootWidth} ${JSON.stringify(result)}`);
      if (OUT) await page.screenshot({ path: path.join(OUT, `IMP-03-${LABEL}-${host}-${w}.png`), fullPage: true });
      await page.close();
    }
  }
  await browser.close();
  console.log(`${LABEL}: ${failing} of ${widths.chat.length + widths.file.length} measurements fail`);
})().catch((e) => { console.error(e); process.exit(1); });
