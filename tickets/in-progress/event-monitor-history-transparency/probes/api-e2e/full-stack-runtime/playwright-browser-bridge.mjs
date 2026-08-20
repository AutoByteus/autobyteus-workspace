import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../../../../autobyteus-web/package.json', import.meta.url));
const { chromium } = require('playwright-core');

const port = 54589;
const token = 'api-e2e-browser-bridge-token';
const outputDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const tabs = new Map();
const requests = [];

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
};
const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
};
const persist = async () => {
  await fs.writeFile(path.join(outputDir, 'browser-bridge-requests.json'), `${JSON.stringify(requests, null, 2)}\n`);
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.headers['x-autobyteus-browser-token'] !== token) {
      json(response, 401, { ok: false, error: { code: 'browser_bridge_unavailable', message: 'Unauthorized' } });
      return;
    }
    if (request.method === 'GET' && request.url === '/health') {
      json(response, 200, { ok: true, result: { status: 'ok' } });
      return;
    }
    const body = await readBody(request);
    requests.push({ at: new Date().toISOString(), path: request.url, body });
    if (request.method === 'POST' && request.url === '/browser/open') {
      const page = await context.newPage();
      const tabId = `api-e2e-tab-${tabs.size + 1}`;
      tabs.set(tabId, page);
      await page.goto(body.url, { waitUntil: body.wait_until ?? 'domcontentloaded', timeout: 90000 });
      await page.screenshot({ path: path.join(outputDir, `${tabId}.png`), fullPage: true });
      await persist();
      json(response, 200, { ok: true, result: { tab_id: tabId, status: 'opened', url: page.url(), title: await page.title() } });
      return;
    }
    if (request.method === 'POST' && request.url === '/browser/list') {
      const summaries = [];
      for (const [tabId, page] of tabs) summaries.push({ tab_id: tabId, title: await page.title(), url: page.url() });
      await persist();
      json(response, 200, { ok: true, result: { tabs: summaries } });
      return;
    }
    json(response, 404, { ok: false, error: { code: 'browser_bridge_unavailable', message: `Unsupported ${request.url}` } });
  } catch (error) {
    requests.push({ at: new Date().toISOString(), path: request.url, error: String(error) });
    await persist();
    json(response, 400, { ok: false, error: { code: 'browser_navigation_failed', message: String(error) } });
  }
});

const close = async () => {
  await persist();
  await new Promise((resolve) => server.close(resolve));
  await browser.close();
  process.exit(0);
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
server.listen(port, '127.0.0.1', () => console.log(`browser bridge http://127.0.0.1:${port}`));
