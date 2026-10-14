// Temporary API/E2E helper (output-tps-precision desktop journeys). Attaches to an isolated
// AutoByteus instance's control endpoint over CDP and runs one action against the renderer page:
//   node cdp.mjs <controlEndpoint> eval '<async js expression body>'
//   node cdp.mjs <controlEndpoint> shot <file.png>
//   node cdp.mjs <controlEndpoint> reload
// It never closes or restarts the app; disconnecting leaves the instance running.
import path from 'node:path';
import { createRequire } from 'node:module';
const web = '/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/autobyteus-web';
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const [endpoint, action, arg] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(endpoint);
try {
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes('renderer/index.html')) || context.pages()[0];
  if (action === 'eval') {
    const result = await page.evaluate(`(async () => { ${arg} })()`);
    console.log(JSON.stringify(result, null, 2));
  } else if (action === 'shot') {
    await page.screenshot({ path: arg, fullPage: false });
    console.log(JSON.stringify({ saved: arg, url: page.url() }));
  } else if (action === 'reload') {
    await page.reload(); await page.waitForLoadState('load');
    console.log(JSON.stringify({ reloaded: page.url() }));
  } else if (action === 'url') {
    console.log(page.url());
  }
} finally {
  // connectOverCDP: close() only disconnects this client; the app keeps running.
  await browser.close();
}
