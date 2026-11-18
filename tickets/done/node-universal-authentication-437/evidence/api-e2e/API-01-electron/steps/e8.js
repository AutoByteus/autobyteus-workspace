await app.getByText('Refresh catalog').click();
await app.waitForTimeout(5000);
const text = (await app.locator('main, body').first().innerText()).slice(-800);
return { text };
