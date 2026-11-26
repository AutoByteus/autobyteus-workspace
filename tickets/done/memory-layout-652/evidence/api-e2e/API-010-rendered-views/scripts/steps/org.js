// API/E2E 652: the org page (Members, Runs) and an org member's run title (REQ-005: the org run's summary); Back.
const out = {};
await h.goto('?view=home&section=browse&node=orgs');
await page.locator('[data-test="memory-owner-card"]', { hasText: 'Launch Org' }).first().waitFor({ timeout: 60000 });
out.card = (await page.locator('[data-test="memory-owner-card"]', { hasText: 'Launch Org' }).first().innerText()).replace(/\s+/g, ' ');
await page.locator('[data-test="memory-owner-card"]', { hasText: 'Launch Org' }).first().click();
await page.locator('[data-test="group-memory-page"]').waitFor({ timeout: 60000 });
await h.sleep(1000);
out.header = (await page.locator('[data-test="memory-page-header"]').innerText()).replace(/\s+/g, ' ');
out.nameTooltip = await page.locator('[data-test="memory-page-header"] h1').first().getAttribute('title');
out.members = (await page.locator('[data-test="group-member"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
await h.shot('org-members-1440x900');
await page.locator('[data-test="group-memory-tab-runs"]').click();
await page.locator('[data-test="collaboration-run"]').first().waitFor({ timeout: 60000 });
await h.sleep(1000);
out.runCard = (await page.locator('[data-test="collaboration-run"]').first().innerText()).replace(/\s+/g, ' ');
out.chips = await page.locator('[data-test="collaboration-member"]').evaluateAll((els) => els.map((e) => ({ text: e.innerText.trim(), tooltip: e.title })));
await h.shot('org-runs-1440x900');
await page.locator('[data-test="collaboration-member"]', { hasText: /Research Assistant|planner/ }).first().click();
await page.locator('[data-test="memory-inspector-run-title"], [data-test="memory-inspector-run-identity"]').first().waitFor({ timeout: 60000 });
await h.sleep(1200);
out.memberRun = { header: (await page.locator('[data-test="memory-page-header"]').innerText()).replace(/\s+/g, ' '),
  title: await page.locator('[data-test="memory-inspector-run-title"], [data-test="memory-inspector-run-identity"]').first().evaluate((el) => ({ test: el.dataset.test, text: el.textContent.trim(), tooltip: el.title, font: getComputedStyle(el).fontFamily.slice(0, 40) })),
  url: decodeURIComponent(page.url()).replace(/^https?:\/\/[^/]+/, '') };
await h.shot('org-member-run-1440x900');
await page.locator('[data-test="memory-page-back"]').click();
await page.locator('[data-test="group-memory-page"]').waitFor({ timeout: 60000 });
out.backTo = { url: decodeURIComponent(page.url()).replace(/^https?:\/\/[^/]+/, ''), runsSelected: await page.locator('[data-test="group-memory-tab-runs"]').getAttribute('aria-selected') };
return out;
