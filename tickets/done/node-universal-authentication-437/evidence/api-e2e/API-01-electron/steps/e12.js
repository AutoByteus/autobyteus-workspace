await app.evaluate(() => { location.hash = '#/nodes'; });
await app.waitForTimeout(3000);
const buttons = await app.locator('button:visible').allInnerTexts();
const tests = await app.locator('[data-testid]:visible').evaluateAll(els => els.map(e => e.getAttribute('data-testid')).slice(0, 60));
await app.screenshot({ path: '/tmp/abtest437/e12.png' });
return { buttons: buttons.filter(Boolean).slice(0, 40), tests, text: (await app.locator('body').innerText()).slice(-900) };
