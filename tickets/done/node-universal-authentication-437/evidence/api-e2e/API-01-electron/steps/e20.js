const all = browser.contexts().flatMap(c => c.pages());
const win = all.find(p => p !== app && p.url().includes('renderer/index.html'));
await win.screenshot({ path: '/tmp/abtest437/e20.png' });
const tabs = await win.locator('[data-test="right-side-tab-list"]').count();
const btns = (await win.locator('button:visible').evaluateAll(els => els.map(e => e.innerText.trim() || e.getAttribute('aria-label') || e.getAttribute('title')))).filter(Boolean);
return { tabs, btns: btns.slice(0, 40) };
