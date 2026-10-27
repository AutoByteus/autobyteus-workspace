import { createRequire } from 'node:module';
import path from 'node:path';
const [webDir, out] = process.argv.slice(2);
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const b = await chromium.launch({ headless: true });
for (const [w, h, name] of [[1440, 900, 'IMP-05-13-configuration-sized-1440'], [390, 844, 'IMP-05-14-configuration-sized-390']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://127.0.0.1:3000/settings?section=model-routing&tab=setup', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /claude-opus/.test(document.querySelector('[data-testid="model-routing-router-row"]')?.innerText ?? ''), null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const box = await p.locator('[data-testid="model-routing-router-row"]').boundingBox();
  console.log(name, JSON.stringify(box));
  await p.screenshot({ path: path.join(out, `${name}.png`) });
}
await b.close();
