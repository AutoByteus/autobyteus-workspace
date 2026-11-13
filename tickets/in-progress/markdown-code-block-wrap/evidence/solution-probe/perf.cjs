// Measures layout time of a 60 KB unbroken run inside a fenced code block, with and without the wrap rules.
const path = require('path'); const fs = require('fs');
const [WT, NM, OUT, FIX] = process.argv.slice(2);
const req = (m) => require(path.join(NM, m));
const postcss = req('postcss'); const tailwind = req('tailwindcss');
const vue = fs.readFileSync(path.join(WT, 'autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue'), 'utf8');
const rendererCss = vue.slice(vue.indexOf('<style>') + 7, vue.indexOf('</style>'));
const prismCss = fs.readFileSync(path.join(NM, 'prismjs/themes/prism.css'), 'utf8');
const config = require(path.join(WT, 'autobyteus-web/tailwind.config.js'));
config.content = [{ raw: '<div class="markdown-body prose max-w-none p-4"></div>' }];
const appCss = '.long-unbroken-text{font-kerning:none;font-variant-ligatures:none;font-feature-settings:normal;text-rendering:optimizeSpeed}';
(async () => {
  const tw = (await postcss([tailwind(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined })).css;
  const run = Array.from({ length: 60000 }, (_, i) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[(i * 7919) % 64]).join('');
  const { chromium } = req('playwright-core');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  for (const [label, extra] of [['before', ''], ['fix', fs.readFileSync(FIX, 'utf8')]]) {
    for (const width of [390, 1280]) {
      const p = await browser.newPage({ viewport: { width, height: 900 } });
      await p.setContent(`<!doctype html><html><head><style>${tw}\n${prismCss}\n${rendererCss}\n${appCss}\n${extra}</style></head><body><div id="host" class="markdown-renderer-segments"></div></body></html>`);
      const times = await p.evaluate((text) => {
        const out = [];
        for (let i = 0; i < 3; i++) {
          const host = document.getElementById('host'); host.innerHTML = '';
          const div = document.createElement('div'); div.className = 'markdown-body prose max-w-none long-unbroken-text';
          const pre = document.createElement('pre'); const code = document.createElement('code'); code.textContent = text; pre.appendChild(code); div.appendChild(pre);
          const t0 = performance.now(); host.appendChild(div); void host.offsetHeight; out.push(Math.round(performance.now() - t0));
          // relayout after width change
          const t1 = performance.now(); host.style.width = (i % 2 ? '300px' : '320px'); void host.offsetHeight; out.push(Math.round(performance.now() - t1));
        }
        return out;
      }, run);
      console.log(label, width, 'ms [insert, relayout] x3 =', JSON.stringify(times));
      await p.close();
    }
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
