// API/E2E 652: focus order on an owner page (Back → filter → switch → content) and Enter on Show / Go to line.
const out = {};
const id = () => page.evaluate(() => { const a = document.activeElement; return a ? (a.dataset.test || a.getAttribute('aria-label') || a.tagName + ':' + (a.textContent || '').trim().slice(0, 30)) : null; });
await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:project-task-manager')}`);
await page.locator('[data-test="agent-episode"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
await page.locator('[data-test="memory-page-back"]').focus();
const order = [await id()];
for (let i = 0; i < 5; i += 1) { await page.keyboard.press('Tab'); order.push(await id()); }
out.ownerOrder = order;
// Run two: Go to line (Enter) and Raw Traces Show (Enter).
await page.locator('[data-test="agent-episode"]').filter({ has: page.locator(`[title*="${stack.runTwo}"]`) }).first().click();
await page.locator('[data-test="work-journal-line"]').waitFor({ timeout: 60000 });
await h.sleep(1000);
await page.locator('[data-test="memory-page-back"]').focus();
const runOrder = [await id()];
for (let i = 0; i < 4; i += 1) { await page.keyboard.press('Tab'); runOrder.push(await id()); }
out.runOrder = runOrder;
await page.locator('[data-test="work-journal-line"]').fill('3');
await page.locator('[data-test="work-journal-line"]').press('Enter');
await h.sleep(800);
out.goToLine = await page.evaluate(() => ({ marked: [...document.querySelectorAll('[data-test="work-journal-lines"] [aria-current], [data-test="work-journal-lines"] .bg-yellow-50, [data-test="work-journal-lines"] [class*="ring"]')].map((e) => e.textContent.trim().slice(0, 40)).slice(0, 2) }));
await page.locator('[data-test="memory-inspector-tab-raw"]').click();
await page.locator('[data-test="raw-trace-limit"]').waitFor({ timeout: 30000 });
await h.sleep(1500);
const requests = [];
page.on('request', (r) => { if (r.url().includes('/graphql') && r.method() === 'POST') { try { const b = r.postDataJSON(); requests.push({ op: b.operationName, limit: b.variables?.limit ?? b.variables?.rawTraceLimit ?? null }); } catch {} } });
const limit = page.locator('[data-test="raw-trace-limit"]');
await limit.fill('2');
await limit.press('Enter');
await h.sleep(1500);
const afterEnter = requests.length;
await limit.press('Enter'); // unchanged value: nothing
await h.sleep(1200);
out.show = { requestsAfterEnter: requests.slice(0, afterEnter), requestsAfterSameEnter: requests.length - afterEnter, entries: await page.locator('[data-test="memory-inspector"] article, [data-test^="raw-trace-entry"]').count() };
return out;
