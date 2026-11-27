// API/E2E 652 AC-005: the file icons in the Files panel (a chat's workspace) and on the Skills page; the Files panel's tabs at 150 px.
const iconRows = (scope) => page.locator(`${scope} .file-header`).evaluateAll((rows) => rows.map((row) => {
  const icon = row.querySelector('.icon'); const svg = icon?.querySelector('svg');
  return { name: row.innerText.trim(), svg: !!svg, shapes: svg ? svg.querySelectorAll('path, rect, polygon, circle, polyline, line, ellipse').length : 0, w: svg ? Math.round(svg.getBoundingClientRect().width) : 0, fontIcon: !!icon?.querySelector('i') };
}));
await page.goto(`${stack.frontendUrl}/chat`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('#__nuxt')?.__vue_app__, null, { timeout: 120000 });
await h.sleep(2500);
await page.evaluate(async (root) => { const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia; const ws = pinia._s.get('workspace'); const id = await ws.createWorkspace({ root_path: root }); pinia._s.get('chatDraft').setWorkspace({ kind: 'existing', workspaceId: id }); }, stack.workspace);
await h.sleep(1200);
if (!(await page.locator('[data-test="right-side-tab-list"]').count())) { await page.mouse.click(h.viewport.width - 22, 21); await h.sleep(1200); }
await page.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click();
await h.sleep(1500);
for (const folder of ['src', 'styles']) { await page.locator(`[data-test="right-side-files-panel"] .file-header`, { hasText: folder }).first().click(); await h.sleep(600); }
const files = await iconRows('[data-test="right-side-files-panel"]');
await h.shot('files-panel-icons-1440x900');
await page.locator('[data-test="right-side-files-panel"] .file-header', { hasText: 'package.json' }).first().click();
await h.sleep(1500);
const filesTab = await page.locator('[data-test="file-tab-name"]').first().evaluate((el) => ({ text: el.textContent.trim(), maxWidth: getComputedStyle(el).maxWidth, title: el.getAttribute('title') }));
await page.goto(`${stack.frontendUrl}/skills`, { waitUntil: 'domcontentloaded' });
await h.sleep(4000);
await page.locator('button', { hasText: 'View' }).first().click();
await h.sleep(3000);
for (const folder of ['src', 'styles']) { const f = page.locator('.file-header', { hasText: folder }).first(); if (await f.count()) { await f.click(); await h.sleep(600); } }
const skills = await iconRows('body');
await h.shot('skills-icons-1440x900');
return { files, filesTab, skills };
