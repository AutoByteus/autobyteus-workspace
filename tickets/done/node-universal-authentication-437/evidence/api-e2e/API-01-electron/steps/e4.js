await app.locator('text=preview-437.html >> visible=true').first().click();
await app.waitForTimeout(5000);
const frames = app.frames().map(f => f.url());
const pf = app.frames().find(f => f !== app.mainFrame());
let inner = null;
if (pf) inner = await pf.evaluate(() => document.body.innerText).catch(e => 'ERR ' + e.message);
await app.screenshot({ path: '/tmp/abtest437/e4.png' });
const iframeSrc = await app.locator('iframe').evaluateAll(els => els.map(e => ({ src: e.getAttribute('src'), sandbox: e.getAttribute('sandbox') })));
return { frames, inner, iframeSrc };
