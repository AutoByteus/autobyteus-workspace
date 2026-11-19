#!/usr/bin/env node
// The iOS demo crawl (autobyteus-279; the sweep's crawl.mjs): every run row, every ⋮ view of each run, the first file of
// Files and Artifacts, and the composer's upload button, at each size. Any error word, empty screen or error fails it.
import { openRunNamed, runDemoProbe, unfoldRunList } from './mobile-demo-probe-support.mjs';

await runDemoProbe('mobile-demo-crawl', async (tools) => {
  const { page, sleep, shot, check, record } = tools;
  await shot('run-list'); await check('run list');
  const rows = await unfoldRunList(tools);
  await shot('run-list-unfolded'); await check('run list, unfolded');
  record.log.push({ where: 'rows', count: rows.length, rows: rows.map((row) => `${row.depth}:${row.name}`) });
  tools.expect('rows', rows.length >= 20, 'at least 20 rows once unfolded');
  const back = async () => { await page.locator('[data-testid="mobile-screen-back"]').last().click(); await sleep(500); };
  for (const row of rows) {
    const open = page.locator(`[data-testid="${row.key}"] [data-testid="mobile-run-open"]`);
    if (!(await open.count())) continue;
    await open.click();
    await page.locator('[data-testid="mobile-run-conversation"]').waitFor({ timeout: 15_000 });
    await sleep(900); await shot(`run-${row.name}`); await check(`run ${row.depth}:${row.name}`);
    const more = page.getByRole('button', { name: 'More' });
    await more.first().click(); await sleep(300);
    const items = await page.getByRole('menuitem').evaluateAll((elements) => elements.map((element) => element.innerText.trim()));
    await page.keyboard.press('Escape'); await sleep(200);
    for (const item of items) {
      await more.first().click(); await sleep(250);
      await page.getByRole('menuitem', { name: item }).first().click(); await sleep(900);
      await shot(`run-${row.name}-${item}`); await check(`run ${row.name} › ${item}`);
      if (/Files|Artifacts/.test(item)) {
        const file = page.locator('[data-testid="mobile-files-row"], [data-testid="mobile-artifact-row"]').filter({ hasText: /\.(md|csv|png|ts)\b/ }).first();
        if (await file.count()) { await file.click(); await sleep(900); await shot(`run-${row.name}-${item}-file`); await check(`run ${row.name} › ${item} › first file`); await back(); }
      }
      await back();
    }
    // Back to the list, which stayed mounted: its folds are as they were.
    await page.getByRole('button', { name: 'Back to runs' }).click(); await sleep(400);
  }
});
