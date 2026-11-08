const fs = await import('node:fs');
const code = fs.readFileSync('/tmp/abtest437/lan-node/code.txt', 'utf8').match(/Setup code: (\S+)/)[1];
const responses = [];
app.on('response', r => { const u = r.url(); if (u.includes(':59849')) responses.push(`${r.status()} ${r.request().method()} ${new URL(u).pathname}`); });
// wrong code first
const field = app.getByLabel('Setup code for loop-node');
await field.fill('abcd-wrong-code-0000');
await app.getByRole('button', { name: 'Connect' }).nth(1).click();
await app.waitForTimeout(3000);
const afterWrong = await app.getByTestId('node-list-card').innerText();
await field.fill(code);
await app.getByRole('button', { name: 'Connect' }).nth(1).click();
await app.waitForTimeout(6000);
const afterRight = await app.getByTestId('node-list-card').innerText();
await app.screenshot({ path: '/tmp/abtest437/e14.png' });
return { afterWrong: afterWrong.slice(afterWrong.indexOf('loop-node')), afterRight: afterRight.slice(afterRight.indexOf('loop-node')), responses: [...new Set(responses)] };
