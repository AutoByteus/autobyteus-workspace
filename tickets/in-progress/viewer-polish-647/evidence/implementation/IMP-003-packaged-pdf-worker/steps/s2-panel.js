const sleep = ms => new Promise(r => setTimeout(r, ms));
const vp = await win.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
const btn = await win.evaluate(() => { const e = document.elementFromPoint(innerWidth - 22, 21); const b = e?.closest('button'); return b ? { label: b.getAttribute('aria-label'), title: b.title, test: b.dataset.test } : e?.outerHTML?.slice(0, 120); });
await win.mouse.click(vp.w - 22, 21);
await sleep(1200);
const tabs = await win.evaluate(() => [...document.querySelectorAll('[data-test="right-side-tab-list"] [role="tab"], [data-test="right-side-tab-list"] button')].map(b => (b.textContent || '').trim() + '|' + (b.getAttribute('data-test') || '')));
await win.screenshot({ path: '<tmp>/cdp/s2.png' });
return { vp, btn, tabs };
