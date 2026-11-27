// VIS-009/010/011: the team page, Members and Runs; a member chip opens its run titled by the team run's summary (DEC-002).
const vp = h.viewport; const tag = `${vp.width}x${vp.height}`;
const node = 'teams/team:software-engineering-team';
await h.goto(`?view=home&section=browse&node=${encodeURIComponent(node)}`);
await page.locator('[data-test="group-member"]').first().waitFor({ timeout: 60000 });
await h.sleep(500);
const members = {
  header: await h.box('[data-test="memory-page-header"]'),
  headerText: await page.locator('[data-test="memory-page-header"]').innerText(),
  h1Tooltip: await page.locator('[data-test="memory-page-header"] h1').getAttribute('title'),
  firstCard: await h.box('[data-test="group-member"]'),
  cards: await page.locator('[data-test="group-member"]').evaluateAll((els) => els.map((el) => ({ text: el.innerText.replace(/\s+/g, ' ').trim(), tooltip: el.querySelector('h2')?.title }))),
};
await h.shot(`team-members-${tag}`);
await page.locator('[data-test="group-memory-tab-runs"]').click();
await page.locator('[data-test="collaboration-run"]').first().waitFor({ timeout: 60000 });
await h.sleep(500);
const runs = {
  headerText: await page.locator('[data-test="memory-page-header"]').innerText(),
  filterInHeader: await page.locator('[data-test="memory-page-header"] [data-test="group-runs-filter"]').count(),
  firstRun: await h.box('[data-test="collaboration-run"]'),
  run: await page.locator('[data-test="collaboration-run"]').first().evaluate((el) => ({ title: el.querySelector('h3')?.textContent?.trim(), tooltip: el.querySelector('h3')?.title, text: el.innerText.replace(/\s+/g, ' ').trim() })),
  chips: await page.locator('[data-test="collaboration-member"]').evaluateAll((els) => els.map((el) => ({ text: el.innerText.trim(), tooltip: el.title }))),
};
await h.shot(`team-runs-${tag}`);
// The filter: 300 ms after typing.
await page.locator('[data-test="group-runs-filter"]').fill('nothing-matches-this');
await h.sleep(1200);
runs.filtered = await page.locator('[data-test="collaboration-run"]').count();
await page.locator('[data-test="group-runs-filter"]').fill('');
await h.sleep(1200);
await page.locator('[data-test="collaboration-member"]').first().click();
await page.locator('[data-test="memory-page-header"]').waitFor({ timeout: 60000 });
await h.sleep(1500);
const memberRun = {
  url: page.url().replace(/^.*\?/, '?'),
  headerText: await page.locator('[data-test="memory-page-header"]').innerText(),
  title: await page.locator('[data-test="memory-inspector-run-title"], [data-test="memory-inspector-run-identity"]').first().evaluate((el) => ({ test: el.dataset.test, text: el.textContent.trim(), tooltip: el.title })),
};
await h.shot(`team-member-run-${tag}`);
await page.locator('[data-test="memory-page-back"]').click();
await page.locator('[data-test="collaboration-run"]').first().waitFor({ timeout: 60000 });
memberRun.backTo = page.url().replace(/^.*\?/, '?');
return { viewport: vp, members, runs, memberRun };
