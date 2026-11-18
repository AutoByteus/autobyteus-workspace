const r = await app.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:59229/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'mutation{setApplicationsEnabled(enabled:true){enabled}}' }) });
  return { status: res.status, body: await res.text() };
});
await app.reload(); await app.waitForTimeout(4000);
await app.evaluate(() => { location.hash = '#/applications'; });
await app.waitForTimeout(4000);
const text = (await app.locator('body').innerText()).slice(0, 1500);
return { r, url: app.url(), text };
