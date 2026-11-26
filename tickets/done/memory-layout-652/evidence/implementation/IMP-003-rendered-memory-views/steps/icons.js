// AC-005: the file icons in the Files panel and on the Skills page (and a read-only tab's width is in semantic.js).
const sleep = h.sleep;
const iconRows = (scope) => page.locator(`${scope} .file-header`).evaluateAll((rows) => rows.map((row) => {
  const icon = row.querySelector('.icon');
  const svg = icon?.querySelector('svg');
  return { name: row.innerText.trim(), svg: !!svg, paths: svg ? svg.querySelectorAll('path, rect, polygon, circle').length : 0, w: svg ? Math.round(svg.getBoundingClientRect().width) : 0, fa: !!icon?.querySelector('i'), iconify: !!icon?.querySelector('[data-test="file-item-icon"]') };
}));
// The Files panel: the chat's tools panel on the run's workspace.
await page.goto(`${stack.frontendUrl}/chat`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('#__nuxt')?.__vue_app__ && !!document.querySelector('[data-test="start-surface-tools-toggle"], [data-test="right-side-tab-list"]'), null, { timeout: 120000 });
await sleep(1500);
await page.evaluate(async (root) => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const ws = pinia._s.get('workspace');
  const id = await ws.createWorkspace({ root_path: root });
  pinia._s.get('chatDraft').setWorkspace({ kind: 'existing', workspaceId: id });
}, stack.workspace);
await sleep(1000);
const vp = h.viewport;
await page.mouse.click(vp.width - 22, 21);
await sleep(1000);
await page.locator('[data-test="right-side-tab-list"] button', { hasText: 'Files' }).first().click();
await sleep(1500);
for (const folder of ['src', 'styles', 'scripts']) { await page.locator(`text="${folder}" >> visible=true`).first().click(); await sleep(600); }
const files = await iconRows('[data-test="right-side-files-panel"]');
await h.shot(`files-panel-icons`);
// The Files panel's tabs stay at 150 px (a long name truncates).
await page.locator('text="package.json" >> visible=true').first().click();
await sleep(1500);
const filesTab = await page.locator('[data-test="file-tab-name"]').first().evaluate((el) => ({ text: el.textContent.trim(), maxWidth: getComputedStyle(el).maxWidth, title: el.title }));
// The Skills page: the skill's folder.
await page.goto(`${stack.frontendUrl}/skills`, { waitUntil: 'domcontentloaded' });
await sleep(4000);
await page.locator('button', { hasText: 'View' }).first().click();
await sleep(3000);
for (const folder of ['src', 'styles', 'scripts']) { const f = page.locator(`.file-header >> text="${folder}"`).first(); if (await f.count()) { await f.click(); await sleep(600); } }
const skills = await iconRows('body');
await h.shot(`skills-icons`);
return { files, filesTab, skills };
