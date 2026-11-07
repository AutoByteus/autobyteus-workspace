export default async ({ page, shot }) => {
  await page.getByText('desk-ws', { exact: true }).first().click();
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-agent-run-id],[data-run-id]')].filter(e => e.offsetParent).map(e => ({ id: e.getAttribute('data-agent-run-id') || e.getAttribute('data-run-id'), text: e.innerText.replace(/\s+/g, ' ').slice(0, 80) })));
  await shot(page, 'API-08-04-workspace-expanded');
  return { rows, ids: await page.evaluate(() => [...document.querySelectorAll('[data-test],[data-testid]')].filter(e => e.offsetParent).map(e => e.getAttribute('data-test') || e.getAttribute('data-testid')).filter(t => /run|workspace|history/.test(t)).slice(0, 40)) };
};
