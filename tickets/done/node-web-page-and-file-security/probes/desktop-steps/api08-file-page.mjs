// API-08 (AC-010, AR-002, design D6 Entry-Form Table): a local HTML file opened in the in-app browser (file://) cannot
// reach the embedded node with the app's rights. The page, an about:blank iframe, a srcdoc iframe and an about:blank
// popup each send fetch POST, XHR POST, a /ws/terminal WebSocket and a /graphql WebSocket, tagged ?f=<form>-<kind>.
// Expected: the page loads and runs; the node logs REMOTE_ACCESS_ORIGIN_REFUSED … origin null for every tagged
// request; no WebSocket opens; then a GET navigation of the same tab to a node user-file URL (F1) displays (AR-002).
// args: <attack page path> <F1 text file URL> <F1 pdf URL>
const FORMS = ['top', 'blank', 'srcdoc', 'popup'];
const KINDS = ['fetch', 'xhr', 'ws', 'gqlws'];
export default async ({ args, instance, openTab, navigateTab, tabPage, allPages, shot, refusals, nodeLog, assert, waitFor, sleep }) => {
  const [attackPath, textUrl, pdfUrl] = args;
  const before = nodeLog().length;
  const url = `file://${attackPath}?node=${encodeURIComponent(instance.backendUrl)}`;
  // Load 1: the tab as openBrowserTab creates it. Load 2: the same tab reloaded through the app (navigateBrowserTab), as a
  // user or agent does once the tab shows in the browser panel. The in-app browser lets a page open a popup only when its tab
  // is attached to the app window (browser-tab-manager handlePopupRequest), so the about:blank popup form runs on load 2.
  const { tabId, page } = await openTab(url);
  await page.locator('#loaded').waitFor({ timeout: 20_000 });
  await sleep(9_000);
  const load1 = await page.evaluate(() => ({ title: document.title, loaded: document.getElementById('loaded')?.textContent, origin: String(self.origin), results: window.__api08 }));
  await shot(page, 'API-08-file-page-load1');
  await navigateTab(tabId, url);
  const page2 = await tabPage(u => u === url);
  await page2.locator('#loaded').waitFor({ timeout: 20_000 });
  await sleep(9_000);
  const inPage = await page2.evaluate(() => ({ title: document.title, loaded: document.getElementById('loaded')?.textContent, origin: String(self.origin), results: window.__api08 }));
  await shot(page2, 'API-08-file-page-load2');
  const popupPages = allPages().filter(p => p.url() === 'about:blank').length;
  const lines = refusals(nodeLog().slice(before));
  const matrix = {};
  for (const form of FORMS) for (const kind of KINDS) {
    const tag = `f=${form}-${kind}`;
    const hit = lines.filter(l => l.includes(tag));
    matrix[`${form}-${kind}`] = { lines: hit.length, refusedOriginNull: hit.length > 0 && hit.every(l => l.includes('REMOTE_ACCESS_ORIGIN_REFUSED') && /origin null\b/.test(l)), load1: load1.results?.[form]?.[kind] ?? null, load2: inPage.results?.[form]?.[kind] ?? null };
  }
  const missing = Object.entries(matrix).filter(([, v]) => !v.refusedOriginNull).map(([k]) => k);
  const opened = [load1, inPage].flatMap((load, i) => Object.entries(load.results ?? {}).flatMap(([form, r]) => Object.entries(r ?? {}).filter(([, v]) => typeof v === 'string' && v.startsWith('opened')).map(([k]) => `load${i + 1}:${form}-${k}`)));
  // AR-002: GET navigation of the same tab (address bar / agent navigate) to a node user file.
  const before2 = nodeLog().length;
  await navigateTab(tabId, textUrl);
  const textTab = await tabPage(u => u === textUrl);
  await waitFor('the text file displayed', async () => (await textTab.locator('body').innerText()).includes('API10 PLAIN TEXT LINE'), 20_000);
  const textShown = (await textTab.locator('body').innerText()).trim();
  await shot(textTab, 'API-08-AR002-text-file-after-file-page');
  await navigateTab(tabId, pdfUrl);
  const pdfTab = await tabPage(u => u === pdfUrl);
  await sleep(4000);
  const pdfDoc = await pdfTab.evaluate(() => ({ embeds: [...document.querySelectorAll('embed')].map(e => e.type), contentType: document.contentType }));
  await shot(pdfTab, 'API-08-AR002-pdf-after-file-page');
  const navRefusals = refusals(nodeLog().slice(before2));
  assert(load1.loaded === 'API08 LOCAL PAGE LOADED' && inPage.loaded === 'API08 LOCAL PAGE LOADED' && inPage.results?.popupOpened === true, 'the local page loads, its script runs, its popup opens', { load1, inPage });
  assert(missing.length === 0, 'every form and kind refused with Origin null', { missing, matrix, lines });
  assert(opened.length === 0, 'no WebSocket opened', opened);
  assert(navRefusals.length === 0 && textShown.includes('API10 PLAIN TEXT LINE'), 'a GET navigation to a node file displays', { textShown, navRefusals });
  return { url: url.replace(instance.backendUrl, '<node>'), load1: { loaded: load1.loaded, origin: load1.origin, popupOpened: load1.results?.popupOpened }, load2: { loaded: inPage.loaded, origin: inPage.origin, popupOpened: inPage.results?.popupOpened }, popupPages, matrix, refusalLines: lines, ar002: { textShown, pdfDoc, navRefusals } };
};
