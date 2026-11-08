const add = async (url, name) => {
  await app.getByTestId('add-node-address').fill(url);
  await app.getByTestId('add-node-name').fill(name);
  await app.getByTestId('add-node-submit').click();
  await app.waitForTimeout(6000);
};
await add('http://192.168.2.158:59849', 'lan-node');
const t1 = (await app.getByTestId('node-list-card').innerText());
await app.screenshot({ path: '/tmp/abtest437/e13a.png' });
await add('http://127.0.0.1:59849', 'loop-node');
await app.waitForTimeout(3000);
const t2 = (await app.getByTestId('node-list-card').innerText());
await app.screenshot({ path: '/tmp/abtest437/e13b.png' });
return { t1, t2 };
