await app.locator('[role="dialog"]').getByRole('button', { name: 'Turn on' }).click();
await app.waitForTimeout(12000);
const card = await app.getByTestId('node-list-card').innerText();
const dialogOpen = await app.locator('[role="dialog"]').count();
await app.screenshot({ path: '/tmp/abtest437/e16.png' });
return { card: card.slice(card.indexOf('loop-node')), dialogOpen, dialogText: dialogOpen ? (await app.locator('[role="dialog"]').innerText()).slice(0, 600) : null };
