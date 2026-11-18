const out = { pages: pages.map(p => p.url()) };
await app.waitForTimeout(3000);
out.title = await app.title();
out.text = (await app.locator('body').innerText()).slice(0, 800);
out.ownInDom = (await app.content()).includes('own_');
out.resources = await app.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('127.0.0.1')).slice(0, 15));
out.storageHasOwn = await app.evaluate(() => JSON.stringify({ ...localStorage }).includes('own_') || JSON.stringify({ ...sessionStorage }).includes('own_'));
return out;
