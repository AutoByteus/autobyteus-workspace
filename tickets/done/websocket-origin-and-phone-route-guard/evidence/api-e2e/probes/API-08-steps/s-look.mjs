export default async ({ pages, page, shot }) => {
  await shot(page, 'API-08-00-start');
  return { pages: pages.map(p => p.url()), title: await page.title(), testids: await page.evaluate(() => [...document.querySelectorAll('[data-test],[data-testid]')].filter(e => e.offsetParent).map(e => e.getAttribute('data-test') || e.getAttribute('data-testid')).slice(0, 80)), text: (await page.evaluate(() => document.body.innerText)).slice(0, 800) };
};
