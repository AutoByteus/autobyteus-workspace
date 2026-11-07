export default async ({ page, shot }) => {
  await page.evaluate(() => { location.hash = '#/chat'; }); await page.waitForTimeout(1500);
  await page.getByText('Nodes', { exact: true }).first().click({ timeout: 10000 });
  await page.waitForTimeout(2500);
  await shot(page, 'API-08-30-nodes');
  const addVisible = await page.locator('[data-testid="add-node-address"]').count();
  if (!addVisible) { const b = page.getByRole('button', { name: /add/i }).first(); await b.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1000); }
  await page.locator('[data-testid="add-node-address"]').fill(`http://127.0.0.1:${process.env.DPORT}`);
  await page.locator('[data-testid="add-node-name"]').fill('abx403-docker');
  const collab = await page.locator('[data-testid="add-node-collaborate"]').getAttribute('aria-checked').catch(() => null);
  if (collab === 'true') await page.locator('[data-testid="add-node-collaborate"]').click();
  await page.locator('[data-testid="add-node-submit"]').click();
  await page.waitForTimeout(5000);
  await shot(page, 'API-08-31-node-added');
  return { text: (await page.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText)).replace(/\s+/g, ' ').slice(0, 900), buttons: await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent).map(e => `${e.getAttribute('data-testid') || ''}|${e.innerText.trim().slice(0, 30)}`).filter(t => /open|abx403|node/i.test(t))) };
};
