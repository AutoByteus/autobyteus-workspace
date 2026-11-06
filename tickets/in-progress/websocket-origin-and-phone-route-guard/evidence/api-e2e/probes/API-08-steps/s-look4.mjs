export default async ({ page, shot }) => {
  await page.reload(); await page.waitForTimeout(4000);
  await shot(page, 'API-08-03-after-seed');
  return { rows: await page.evaluate(() => [...document.querySelectorAll('[data-test="run-list-row"],[data-agent-run-id]')].map(e => ({ id: e.getAttribute('data-agent-run-id') || e.getAttribute('data-run-id'), text: e.innerText.slice(0, 80) }))), text: (await page.evaluate(() => document.body.innerText)).slice(0, 500) };
};
