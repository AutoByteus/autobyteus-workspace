// Negative control for the AC-107 assertion: measureRoot from the cases module on a static page.
const fs = require('fs');
const { chromium } = require(process.argv[2] + '/playwright-core');
const src = fs.readFileSync(process.argv[3], 'utf8');
const fn = src.slice(src.indexOf('const measureRoot = '), src.indexOf('/** The failures of one measurement'));
const body = `<h1>Draft v1 — LinkedIn reply to Shubham Saboo (Elephant/Goldfish Model)</h1>
<p>This matches what we found when designing agent responsibilities: some work is cooperative, some is independent, and the split runs through the whole cycle with tab-indented and well-known hyphenated words.</p>
<p>Inline path <code>/home/autobyteus/workspace/autobyteus-marketing-workspace/linkedin/2026-11-12-review/draft-v2.md</code> stays inline.</p>
<p>Long token ${'Supercalifragilisticexpialidocious'.repeat(4)} end.</p>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  for (const [label, css] of [['break-word (the change)', 'overflow-wrap: break-word'], ['word-break: break-all (control)', 'overflow-wrap: break-word; word-break: break-all']]) {
    for (const w of [167, 390]) {
      const p = await b.newPage({ viewport: { width: w + 40, height: 900 } });
      await p.setContent(`<style>body{font:16px sans-serif;margin:0;padding:20px} .markdown-body{${css}} code{font-family:monospace;padding:0 .25em;background:#eee}</style><div style="width:${w}px"><div class="markdown-renderer-segments"><div class="markdown-body">${body}</div></div></div>`);
      const r = await p.evaluate(`(${fn.replace(/^const measureRoot = /, '').replace(/;\s*$/, '')})(document.querySelector('.markdown-renderer-segments'), [])`);
      console.log(label, w, 'midWordBreaks', r.midWordBreaks.length, JSON.stringify(r.midWordBreaks.slice(0, 3)));
      await p.close();
    }
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
