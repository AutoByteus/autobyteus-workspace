// API/E2E 652 round 2: the team page (Runs: filter + switch) and a run page (switch only) at this width.
const b = () => page.locator('[data-test="memory-page-header"]').evaluate((header) => { const h1 = [...header.querySelectorAll('h1, [data-test="memory-inspector-run-title"]')].map((e) => ({ text: e.textContent.trim().slice(0, 30), w: Math.round(e.getBoundingClientRect().width), needs: e.scrollWidth, srOnly: e.classList.contains('sr-only') })); const back = header.querySelector('[data-test="memory-page-back"]').getBoundingClientRect(); return { names: h1, backW: Math.round(back.width), rows: [...new Set([...header.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().height > 20 && e.children.length === 0).map((e) => Math.round(e.getBoundingClientRect().y / 10)))] }; });
const out = {};
await h.goto(`?view=home&section=browse&node=${encodeURIComponent('teams/team:software-engineering-team')}&pane=runs`);
await page.locator('[data-test="collaboration-run"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.teamRuns = await b();
await h.shot(`r2-team-runs-header-${h.viewport.width}`);
await page.locator('[data-test="collaboration-member"]').first().click();
await page.locator('[data-test="memory-inspector-run-title"], [data-test="memory-inspector-run-identity"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.run = await b();
await h.shot(`r2-run-header-${h.viewport.width}`);
return out;
