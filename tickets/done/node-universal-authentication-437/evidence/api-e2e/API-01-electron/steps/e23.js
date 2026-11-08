const main = pages.find(p => p.url().includes('renderer/index.html'));
await main.waitForTimeout(3000);
await main.evaluate(() => { location.hash = '#/nodes'; });
await main.waitForTimeout(6000);
const card = await main.getByTestId('node-list-card').innerText();
await main.screenshot({ path: '/tmp/abtest437/e23.png' });
const btns = await main.getByTestId('node-list-card').locator('button:visible').allInnerTexts();
return { card: card.slice(card.indexOf('lan-node')), btns: btns.filter(Boolean) };
