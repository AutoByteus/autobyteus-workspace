const card = app.getByTestId('node-list-card');
await card.getByRole('button', { name: 'Turn on' }).last().click();
await app.waitForTimeout(2000);
const dialog = (await app.locator('[role="dialog"]').innerText().catch(() => '')).slice(0, 900);
await app.screenshot({ path: '/tmp/abtest437/e15a.png' });
const btns = await app.locator('[role="dialog"] button').allInnerTexts();
return { dialog, btns };
