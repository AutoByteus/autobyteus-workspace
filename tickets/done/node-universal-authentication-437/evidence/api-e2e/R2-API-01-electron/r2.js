await app.locator('.xterm').first().click();
await app.keyboard.type("echo R2-TERM-$((40+2)); env | grep -c -E 'own_|AUTOBYTEUS_LAUNCH|OWNER_CREDENTIAL'\n");
await app.waitForTimeout(3000);
const term = (await app.locator('.xterm-rows').first().innerText()).slice(-260);
const scan = { ownInDom: (await app.content()).includes('own_'), urls: await app.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /access_token|own_/.test(n)).length) };
await app.screenshot({ path: '/tmp/abtest437r2/R2-API-01-terminal.png' });
return { term, scan };
