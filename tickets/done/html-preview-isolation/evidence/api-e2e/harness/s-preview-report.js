// args: [mode, outDir, caseId]  mode = files | artifacts
const [mode, outDir, caseId] = args;
const fs = require('node:fs');
if (mode === 'files') {
  if (!(await page.locator('.file-header:visible', { hasText: 'hostile.html' }).count())) await page.getByRole('button', { name: 'Files', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.locator('.file-header', { hasText: 'hostile.html' }).filter({ hasNotText: '.next' }).first().click();
} else {
  const tab = page.locator('button:visible, [role=tab]:visible').filter({ hasText: /^\s*Artifacts\s*$/ }).first();
  if (await tab.count()) { await tab.scrollIntoViewIfNeeded(); await tab.click(); } else { await page.getByRole('button', { name: 'Artifacts', exact: true }).click(); }
  await page.waitForTimeout(1000);
  const item = page.getByText('artifact.html', { exact: true }).first();
  if (await item.count()) await item.click().catch(() => {});
}
const want = mode === 'files' ? '/static/hostile.html' : 'blob:';
let frame = null; const deadline = Date.now() + 30000;
while (Date.now() < deadline) {
  frame = page.frames().find(f => f !== page.mainFrame() && f.url().includes(want));
  if (frame) { try { if (await frame.evaluate(() => window.__report && window.__report.done)) break; } catch {} }
  await page.waitForTimeout(300);
}
if (!frame) throw new Error('preview frame not found; frames=' + page.frames().map(f => f.url()).join(','));
await page.waitForTimeout(1500); // late async results (ws close, fetch)
const report = await frame.evaluate(() => window.__report);
const iframes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map(i => ({ src: i.getAttribute('src'), sandbox: i.getAttribute('sandbox'), title: i.getAttribute('title') })));
const appStorage = await page.evaluate(() => ({ origin: location.origin, protocol: location.protocol, localStorageKeys: Object.keys(localStorage).length, electronAPI: typeof window.electronAPI }));
await page.screenshot({ path: `${outDir}/${caseId}-desktop-${mode}-preview.png` });
const result = { caseId, mode, at: new Date().toISOString(), frameUrl: frame.url(), iframes, appWindow: appStorage, report };
fs.writeFileSync(`${outDir}/${caseId}-desktop-${mode}-preview-report.json`, JSON.stringify(result, null, 1) + '\n');
return result;
