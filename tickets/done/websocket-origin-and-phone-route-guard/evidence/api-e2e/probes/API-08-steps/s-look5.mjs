export default async ({ page, shot }) => {
  await shot(page, 'API-08-06-run-view');
  return { url: page.url(), ids: await page.evaluate(() => [...document.querySelectorAll('[data-test],[data-testid]')].filter(e => e.offsetParent).map(e => e.getAttribute('data-test') || e.getAttribute('data-testid')).slice(0, 120)), inputs: await page.evaluate(() => [...document.querySelectorAll('textarea,[contenteditable="true"]')].map(e => ({ tag: e.tagName, test: e.getAttribute('data-test') || e.getAttribute('data-testid'), ph: e.getAttribute('placeholder'), vis: !!e.offsetParent }))) };
};
