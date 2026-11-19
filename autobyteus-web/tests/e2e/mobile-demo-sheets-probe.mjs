#!/usr/bin/env node
// The iOS demo's runtime and model sheets (autobyteus-279; the sweep's sheets.mjs): on New run and in a stopped run's
// Settings, every runtime's models are sample models, each can be picked, Refresh models answers, and Save is enabled.
import { openRunNamed, runDemoProbe } from './mobile-demo-probe-support.mjs';

const SAMPLE = /^demo\/sample-|^Sample /;

await runDemoProbe('mobile-demo-sheets', async (tools) => {
  const { page, sleep, shot, check, record, expect } = tools;
  const sheet = (row) => page.locator(`[data-testid="mobile-run-${row}-select-sheet"]`);
  const options = (row) => sheet(row).locator(`[data-testid="mobile-run-${row}-select-option"]`);
  const open = async (row) => { await page.locator(`[data-testid="mobile-run-${row}-select-toggle"]`).click(); await sheet(row).waitFor({ timeout: 8000 }); await sleep(250); };
  const close = async (row) => { await page.keyboard.press('Escape'); await sleep(250); if (await sheet(row).count()) await page.mouse.click(5, 100); await sleep(200); };
  const sweep = async (place) => {
    await open('runtime');
    const runtimes = (await options('runtime').allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());
    await close('runtime');
    expect(`${place} runtimes`, runtimes.length === 3, 'three runtimes (AutoByteus, Codex, Claude)');
    for (let index = 0; index < runtimes.length; index += 1) {
      await open('runtime'); await options('runtime').nth(index).click(); await sleep(500);
      await open('model');
      const models = (await options('model').allInnerTexts()).map((text) => text.split('\n')[0].trim());
      const refresh = sheet('model').getByText(/Refresh models/i);
      if (await refresh.count()) { await refresh.first().click(); await sleep(800); }
      await shot(`${place}-${runtimes[index]}-models`); await check(`${place} › ${runtimes[index]} models`);
      await close('model');
      for (let model = 0; model < models.length; model += 1) { if (!(await sheet('model').count())) await open('model'); await options('model').nth(model).click(); await sleep(300); }
      expect(`${place} › ${runtimes[index]}`, models.length > 0 && models.every((name) => SAMPLE.test(name)), `sample models only, got ${models.join(', ')}`);
      record.log.push({ where: `${place} › ${runtimes[index]}`, models });
    }
  };
  await page.getByRole('button', { name: 'New run' }).click(); await sleep(1000);
  await sweep('new-run');
  await page.getByRole('button', { name: 'Close' }).first().click(); await sleep(500);
  await openRunNamed(tools, 'Codex');
  await page.getByRole('button', { name: 'More' }).click(); await page.getByRole('menuitem', { name: 'Settings' }).click(); await sleep(1200);
  await sweep('settings-stopped-run');
  expect('settings save', !(await page.locator('[data-testid="mobile-run-settings-save"]').isDisabled()), 'Save enabled for a stopped run');
});
