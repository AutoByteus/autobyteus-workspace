const main = pages.find(p => p.url().includes('renderer/index.html'));
await main.getByRole('button', { name: 'Pair again' }).click();
await main.waitForTimeout(2000);
let dlg = null;
if (await main.locator('[role="dialog"]').count()) { dlg = (await main.locator('[role="dialog"]').innerText()).slice(0, 700); await main.locator('[role="dialog"] button').last().click(); }
await main.waitForTimeout(10000);
const dlg2 = await main.locator('[role="dialog"]').count() ? (await main.locator('[role="dialog"]').innerText()).slice(0, 700) : null;
const card = await main.getByTestId('node-list-card').innerText();
await main.screenshot({ path: '/tmp/abtest437/e24.png' });
return { dlg, dlg2, loop: card.slice(card.indexOf('loop-node')) };
