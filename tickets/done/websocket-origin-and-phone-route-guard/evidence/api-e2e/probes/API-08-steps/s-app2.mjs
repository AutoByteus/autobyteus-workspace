export default async ({ page, shot }) => {
  await page.getByRole('button', { name: 'Enter application' }).click({ timeout: 10000 });
  let frames = [];
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(1500);
    frames = page.frames().filter(f => f !== page.mainFrame()).map(f => f.url());
    const ready = await Promise.all(page.frames().filter(f => f !== page.mainFrame()).map(f => f.evaluate(() => document.body?.innerText?.length ?? 0).catch(() => 0)));
    if (ready.some(n => n > 50) && i > 6) break;
  }
  await page.waitForTimeout(3000);
  await shot(page, 'API-08-21-brief-studio-open');
  const frameTexts = await Promise.all(page.frames().filter(f => f !== page.mainFrame()).map(async f => ({ url: f.url().split('?')[0], origin: await f.evaluate(() => location.origin).catch(() => null), text: (await f.evaluate(() => document.body?.innerText ?? '').catch(() => '')).replace(/\s+/g, ' ').slice(0, 300) })));
  const hostText = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 400);
  return { frames: frameTexts, hostText };
};
