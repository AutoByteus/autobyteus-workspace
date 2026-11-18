export default async ({ page, shot }) => {
  await page.locator('[data-tab-name="vnc"]:visible').first().click({ timeout: 10000 });
  const tile = page.locator('.vnc-viewer [data-testid="node-desktop-tile"]').first();
  await tile.waitFor({ timeout: 20000 });
  const connect = tile.getByRole('button', { name: 'Connect', exact: true });
  if (await connect.count()) await connect.click();
  let status = '';
  for (let i = 0; i < 40; i += 1) { await page.waitForTimeout(750); status = (await tile.locator('[data-testid="node-desktop-status"]').innerText({ timeout: 1000 }).catch(() => '')).trim(); if (/connected/i.test(status) && !/not|dis/i.test(status)) break; }
  await page.waitForTimeout(2500);
  const canvas = await tile.locator('canvas').first().boundingBox().catch(() => null);
  await shot(page, 'API-08-docker-vnc');
  return { status, canvas, buttons: await tile.locator('button').allInnerTexts() };
};
