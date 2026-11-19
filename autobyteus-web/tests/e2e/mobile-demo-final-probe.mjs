#!/usr/bin/env node
// The iOS demo's last checks (autobyteus-279; the sweep's final.mjs): a live run's Settings are locked until Stop; after
// Stop a change Saves and reopening shows it; the demo sheet's Leave demo asks the app to leave (the app then shows its
// first screen and forgets the demo: XCUITests). A new demo is a new page: it starts as the first did.
import { backToRuns, openRunNamed, runDemoProbe } from './mobile-demo-probe-support.mjs';

await runDemoProbe('mobile-demo-final', async (tools) => {
  const { page, sleep, shot, check, expect, record } = tools;
  const settings = async () => { await page.getByRole('button', { name: 'More' }).click(); await page.getByRole('menuitem', { name: 'Settings' }).click(); await sleep(1200); };
  const pick = async (row, option) => {
    await page.locator(`[data-testid="mobile-run-${row}-select-toggle"]`).click();
    const sheet = page.locator(`[data-testid="mobile-run-${row}-select-sheet"]`); await sheet.waitFor();
    await sheet.locator(`[data-testid="mobile-run-${row}-select-option"]`).filter({ hasText: option }).first().click(); await sleep(400);
  };
  await openRunNamed(tools, 'Daily Assistant');
  await settings();
  expect('live settings', await page.locator('[data-testid="mobile-run-settings-stop"]').count() === 1, 'a live run shows Stop');
  await page.locator('[data-testid="mobile-run-settings-stop"]').click(); await sleep(2000);
  await pick('model', 'demo/sample-reasoning-model');
  expect('save after stop', !(await page.locator('[data-testid="mobile-run-settings-save"]').isDisabled()), 'Save enabled once stopped');
  await page.locator('[data-testid="mobile-run-settings-save"]').click(); await sleep(1200);
  await settings();
  const reopened = (await page.locator('[data-testid="mobile-run-settings"]').innerText()).replace(/\s+/g, ' ');
  expect('reopened', reopened.includes('demo/sample-reasoning-model'), 'reopening shows the saved model');
  await shot('settings-reopened'); await check('settings reopened');
  await page.locator('[data-testid="mobile-screen-back"]').last().click(); await sleep(400);
  await backToRuns(tools);
  // Leave demo (UIS-004): the node button names the demo; its sheet's Leave demo ends it, and the next demo is fresh.
  await page.getByRole('button', { name: /^Demo, sample data/ }).click(); await sleep(400);
  await shot('demo-sheet'); await check('demo sheet');
  await page.getByRole('button', { name: /Leave demo/ }).click(); await sleep(500);
  const messages = await page.evaluate(() => window.__shellMessages.map((message) => message.type));
  expect('leave demo', messages.includes('leaveDemo'), `the page posts leaveDemo to the app (posted: ${messages.join(', ')})`);
  // A new demo (the app opens a new web view with new storage): fresh world, the welcome card again, the old model gone.
  await page.goto(page.url(), { waitUntil: 'networkidle' });
  await page.locator('[data-testid="mobile-run-list"]').waitFor({ timeout: 30_000 });
  record.log.push({ where: 'new demo', head: (await tools.text()).slice(0, 120) });
  await openRunNamed(tools, 'Daily Assistant');
  await settings();
  const fresh = (await page.locator('[data-testid="mobile-run-settings"]').innerText()).replace(/\s+/g, ' ');
  expect('new demo forgets', fresh.includes('demo/sample-model') && !fresh.includes('demo/sample-reasoning-model'), 'a new demo has the sample model again');
}, undefined, { shell: true });
