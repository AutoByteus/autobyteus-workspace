import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const require = createRequire(pathToFileURL(path.join(root, 'autobyteus-web/package.json')));
const { chromium } = require('playwright-core');
const outputRoot = path.resolve(
  'tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-001/live/browser',
);
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleMessages = [];
  page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => consoleMessages.push({ type: 'pageerror', text: error.message }));
  await page.goto('http://127.0.0.1:31418/workspace', { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(5_000);
  await page.getByRole('button', { name: 'Agent Teams', exact: true }).click();
  await page.waitForTimeout(2_000);
  await page.getByPlaceholder('Search teams by name').fill('Classroom Simulation Team');
  const classroomCard = page.getByRole('heading', { name: 'Classroom Simulation Team', exact: true })
    .locator('xpath=../../..');
  await classroomCard.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForTimeout(4_000);
  await page.locator('select').first().selectOption({ label: 'Codex App Server' });
  await page.waitForTimeout(4_000);
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  await page.waitForTimeout(2_000);
  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    text: document.body.innerText,
    dataTests: [...document.querySelectorAll('[data-test]')].map((element) => ({
      test: element.getAttribute('data-test'),
      text: element.textContent?.trim().slice(0, 300),
      tag: element.tagName,
    })),
    buttons: [...document.querySelectorAll('button')].map((element) => ({
      text: element.textContent?.trim(),
      aria: element.getAttribute('aria-label'),
      title: element.getAttribute('title'),
      disabled: element.disabled,
    })),
    inputs: [...document.querySelectorAll('input,textarea,select')].map((element) => ({
      tag: element.tagName,
      type: element.getAttribute('type'),
      placeholder: element.getAttribute('placeholder'),
      aria: element.getAttribute('aria-label'),
      value: element.value,
      options: element.tagName === 'SELECT'
        ? [...element.options].map((option) => ({ value: option.value, text: option.textContent }))
        : undefined,
    })),
  }));
  await fs.writeFile(path.join(outputRoot, 'workspace-initial-dom.json'), `${JSON.stringify({ state, consoleMessages }, null, 2)}\n`);
  await page.screenshot({ path: path.join(outputRoot, 'workspace-initial.png'), fullPage: true });
  console.log(JSON.stringify({
    text: state.text.slice(0, 4_000),
    buttonCount: state.buttons.length,
    buttons: state.buttons.slice(0, 80),
    inputs: state.inputs,
    consoleMessages,
  }, null, 2));
} finally {
  await browser.close();
}
