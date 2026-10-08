// One-off manual-session provisioning, using the existing Electron probe's CDP UI path.
// Run from worktree root: node <this file> inspect|settings|packages|import|teams
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const root = process.cwd();
const dir = path.join(root, 'tickets/in-progress/restore-team-group-icon/evidence/manual-electron');
const require = createRequire(path.join(root, 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
const started = JSON.parse(await fs.readFile(path.join(dir, 'start.json'), 'utf8'));
assert.equal(started.ok, true);
const instance = started.result;
assert(instance.executablePath.startsWith(path.join(root, 'autobyteus-web/electron-dist/')));
assert.equal(new URL(instance.controlEndpoint).hostname, '127.0.0.1');
const mode = process.argv[2] || 'inspect';
const result = { mode, instanceId: instance.instanceId, timestamp: new Date().toISOString(), requests: [], errors: [] };
const browser = await chromium.connectOverCDP(instance.controlEndpoint);
try {
  const pages = browser.contexts().flatMap(context => context.pages()).filter(page => page.url().includes('/renderer/index.html'));
  assert.equal(pages.length, 1, 'Expected exactly one owned main renderer');
  const page = pages[0]; page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('response', response => {
    if (response.url() === instance.graphqlUrl) {
      result.requests.push({ status: response.status(), operation: response.request().postDataJSON()?.operationName });
    }
  });
  if (mode === 'teams') {
    await page.getByTestId('settings-nav-back').click();
    await page.getByRole('button', { name: 'Agent Teams', exact: true }).click();
    await page.getByText('Software Engineering Team', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(dir, 'team-catalog-ready.png') });
  } else if (mode === 'settings') await page.getByRole('button', { name: 'Settings', exact: true }).click();
  else if (mode === 'packages') await page.getByTestId('settings-nav-agent-packages').click();
  else if (mode === 'import') {
    const source = 'https://github.com/AutoByteus/autobyteus-agents';
    assert.equal(await page.getByTestId('agent-package-row-github_repository').count(), 0, 'Refusing duplicate import');
    await page.getByTestId('agent-package-source-input').fill(source);
    await page.getByTestId('agent-package-import-button').click();
    await page.getByTestId('agent-packages-success').waitFor({ timeout: 120000 });
    result.success = await page.getByTestId('agent-packages-success').innerText();
    result.package = await page.getByTestId('agent-package-row-github_repository').innerText();
    assert(result.package.includes('AutoByteus/autobyteus-agents'));
    await page.screenshot({ path: path.join(dir, 'public-package-imported.png') });
  } else assert.equal(mode, 'inspect');
  await page.bringToFront();
  result.title = await page.title(); result.url = page.url();
  result.text = await page.locator('body').innerText();
  result.controls = await page.locator('button, a, input').evaluateAll(elements => elements.map(el => ({ tag: el.tagName,
    text: el.textContent?.trim(), label: el.getAttribute('aria-label'), testid: el.getAttribute('data-testid'), href: el.getAttribute('href') })));
  result.result = 'Pass';
} catch (error) { result.result = 'Fail'; result.error = error.stack; process.exitCode = 1; }
finally {
  // Installed Playwright's CDP close disconnects its client socket; it does not terminate Electron.
  await browser.close();
  await fs.writeFile(path.join(dir, `ui-${mode}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
