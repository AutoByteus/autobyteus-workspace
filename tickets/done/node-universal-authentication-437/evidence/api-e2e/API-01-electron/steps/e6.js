await app.evaluate(() => { location.hash = '#/applications'; });
await app.waitForTimeout(3000);
const text = (await app.locator('body').innerText()).slice(0, 1200);
await app.screenshot({ path: '/tmp/abtest437/e6.png' });
return { url: app.url(), text };
