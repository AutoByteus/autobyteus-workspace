import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage(); await p.goto('file://' + process.argv[2]);
const out = await p.evaluate(async () => { window.removeRow(); const o = [];
  for (let k = 0; k < 16; k++) { await new Promise(r => requestAnimationFrame(r)); o.push(Math.round(document.getElementById('next').getBoundingClientRect().top)); } return o; });
console.log(JSON.stringify(out)); await b.close();
