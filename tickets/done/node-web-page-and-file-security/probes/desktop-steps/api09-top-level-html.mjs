// API-09 (AC-009; AC-007 in Electron): an HTML file and an SVG file served by F1 (GET /rest/workspaces/:id/content)
// opened top-level in the in-app browser. They display and their scripts run, in an opaque origin (self.origin
// "null", no storage); the page's own requests to the node are refused (REMOTE_ACCESS_ORIGIN_REFUSED origin null).
// args: <F1 html URL> <F1 svg URL>
export default async ({ args, openTab, shot, refusals, nodeLog, assert, waitFor, sleep }) => {
  const [htmlUrl, svgUrl] = args;
  const headers = {};
  for (const [k, u] of [['html', htmlUrl], ['svg', svgUrl]]) { const r = await fetch(u); headers[k] = { status: r.status, contentType: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), nosniff: r.headers.get('x-content-type-options') }; }
  const before = nodeLog().length;
  const { page } = await openTab(htmlUrl);
  await waitFor('the page script', async () => (await page.locator('#state').textContent()) === 'API09 SCRIPT RAN', 20_000);
  await sleep(5000);
  const html = await page.evaluate(() => ({ state: document.getElementById('state').textContent, ...document.body.dataset, href: location.href }));
  await shot(page, 'API-09-top-level-html');
  const { page: svgPage } = await openTab(svgUrl);
  await sleep(2500);
  const svg = await svgPage.evaluate(() => document.getElementById('t')?.textContent ?? null);
  await shot(svgPage, 'API-09-top-level-svg');
  const lines = refusals(nodeLog().slice(before));
  const fetchLine = lines.find(l => l.includes('f=api09-fetch'));
  const wsLine = lines.find(l => l.includes('f=api09-ws'));
  assert(headers.html.csp === 'sandbox allow-scripts' && headers.html.nosniff === 'nosniff' && headers.svg.csp === 'sandbox allow-scripts', 'user-file headers', headers);
  assert(html.state === 'API09 SCRIPT RAN' && html.selfOrigin === 'null', 'scripts run in an opaque origin', html);
  assert(fetchLine?.includes('REMOTE_ACCESS_ORIGIN_REFUSED') && /origin null\b/.test(fetchLine) && wsLine?.includes('REMOTE_ACCESS_ORIGIN_REFUSED'), 'its requests to the node are refused', lines);
  assert(!String(html.ws ?? '').startsWith('opened'), 'no WebSocket opened', html.ws);
  assert(svg === 'API09 SVG SCRIPT RAN null', 'the SVG displays, its script runs in an opaque origin', svg);
  return { headers, html, svg, refusalLines: lines };
};
