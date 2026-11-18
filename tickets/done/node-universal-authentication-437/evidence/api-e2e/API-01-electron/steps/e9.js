const r = await app.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:59229/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'mutation($i:ImportApplicationPackageInput!){importApplicationPackage(input:$i){packageId}}', variables: { i: { sourceKind: 'LOCAL_PATH', source: '/tmp/abtest437/apps/brief-studio-package' } } }) });
  return { status: res.status, body: (await res.text()).slice(0, 400) };
});
await app.reload(); await app.waitForTimeout(3000);
await app.evaluate(() => { location.hash = '#/applications'; });
await app.waitForTimeout(4000);
return { r, text: (await app.locator('body').innerText()).slice(-600) };
