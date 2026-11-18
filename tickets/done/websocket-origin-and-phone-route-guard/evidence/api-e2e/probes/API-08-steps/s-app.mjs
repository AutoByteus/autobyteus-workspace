export default async ({ page, shot }) => {
  await page.getByText('Applications', { exact: true }).first().click({ timeout: 10000 });
  await page.waitForTimeout(3000);
  await shot(page, 'API-08-20-applications');
  const cards = await page.evaluate(() => [...document.querySelectorAll('[data-test],[data-testid]')].filter(e => e.offsetParent).map(e => `${e.getAttribute('data-test') || e.getAttribute('data-testid')}: ${e.innerText.replace(/\s+/g, ' ').slice(0, 60)}`).filter(t => /app/i.test(t)).slice(0, 30));
  return { url: page.url(), cards };
};
