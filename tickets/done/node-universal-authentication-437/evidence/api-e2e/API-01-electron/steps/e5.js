await app.locator('[data-test="right-side-tab-list"]').getByText('Browser', { exact: true }).click();
await app.waitForTimeout(1500);
const addr = app.getByPlaceholder('Enter URL and press Enter');
const results = {};
for (const route of ['/rest/health', '/rest/remote-access/status', '/graphql?query=%7B__typename%7D', '/rest/workspaces/temp_ws_default/static/preview-437.html']) {
  const url = 'http://127.0.0.1:59229' + route;
  await addr.fill(url);
  await app.locator('button[title="Open new tab"]').click();
  await app.waitForTimeout(2500);
  const pg = browser.contexts().flatMap(c => c.pages()).find(p => p.url() === url);
  results[route] = pg ? (await pg.evaluate(() => document.body.innerText)).slice(0, 200) : 'no target';
}
await app.screenshot({ path: '/tmp/abtest437/e5.png' });
return results;
