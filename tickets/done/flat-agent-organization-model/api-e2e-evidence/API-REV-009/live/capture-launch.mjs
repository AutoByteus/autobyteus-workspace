import playwright from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
import fs from 'node:fs/promises';

const { chromium } = playwright;

const evidenceRoot = new URL('./', import.meta.url);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('127.0.0.1:3589/workspace'));
if (!page) throw new Error('API-REV-009 workspace page not found');

const preview = await page.evaluate(() => {
  const team = document.querySelector('#team-scope-research-team-panel');
  const analyst = [...(team?.querySelectorAll('[data-test="member-override-item"]') ?? [])]
    .find((item) => item.textContent?.includes('research-team / analyst'));
  return {
    url: location.href,
    capturedAt: new Date().toISOString(),
    rootRuntime: document.querySelector('select')?.value,
    rootWorkspace: [...document.querySelectorAll('p')]
      .find((node) => node.textContent?.includes('Workspace: Temp Workspace'))?.textContent?.trim(),
    teamWorkspace: [...(team?.querySelectorAll('p') ?? [])]
      .find((node) => node.textContent?.includes('Workspace: workspace-team'))?.textContent?.trim(),
    analystRuntime: analyst?.querySelector('select[id^="override-runtime"]')?.value,
    analystModel: [...(analyst?.querySelectorAll('button') ?? [])]
      .find((button) => button.textContent?.includes('deepseek-v4-flash'))?.textContent?.trim(),
    runDisabled: [...document.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Run Agent Org')?.disabled,
    focusQuery: new URL(location.href).searchParams.get('memberAddress'),
  };
});
await fs.writeFile(new URL('config-preview.json', evidenceRoot), JSON.stringify(preview, null, 2));

const requests = [];
const responses = [];
const onRequest = (request) => {
  if (!request.url().includes('/graphql')) return;
  requests.push({
    at: new Date().toISOString(),
    method: request.method(),
    url: request.url(),
    postData: request.postData(),
  });
};
const onResponse = async (response) => {
  if (!response.url().includes('/graphql')) return;
  let body = '<unreadable>';
  try { body = await response.text(); } catch (error) { body = `<${error}>`; }
  responses.push({ at: new Date().toISOString(), status: response.status(), url: response.url(), body });
};
page.on('request', onRequest);
page.on('response', onResponse);
await page.getByRole('button', { name: 'Run Agent Org', exact: true }).click();
await page.waitForURL((url) => url.searchParams.get('mode') === 'configuration' ? false : url.pathname.includes('/workspace'), { timeout: 60_000 });
await page.waitForTimeout(2_000);
page.off('request', onRequest);
page.off('response', onResponse);
await fs.writeFile(new URL('launch-graphql-requests.json', evidenceRoot), JSON.stringify(requests, null, 2));
await fs.writeFile(new URL('launch-graphql-responses.json', evidenceRoot), JSON.stringify(responses, null, 2));
await fs.writeFile(new URL('post-launch-dom.txt', evidenceRoot), await page.locator('body').innerText());
await page.screenshot({ path: new URL('screenshots/org-post-launch-unfocused.png', evidenceRoot).pathname, fullPage: true });
console.log(JSON.stringify({ preview, finalUrl: page.url(), requestCount: requests.length, responseCount: responses.length }, null, 2));
await browser.close();
