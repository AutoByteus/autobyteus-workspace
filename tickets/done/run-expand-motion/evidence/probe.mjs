import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage(); await p.goto('file://' + process.argv[2]);
await p.evaluate(() => window.toggle()); await p.waitForTimeout(300);
const samples = await p.evaluate(async () => {
  window.toggle(); const out = [];
  for (let k = 0; k < 4; k++) { await new Promise(r => requestAnimationFrame(r));
    const r = document.querySelector('[data-i="11"]'); out.push({ frame: k, transform: getComputedStyle(r).transform, top: Math.round(r.getBoundingClientRect().top), cls: r.className }); }
  return out; });
console.log(JSON.stringify(samples, null, 1)); await b.close();
