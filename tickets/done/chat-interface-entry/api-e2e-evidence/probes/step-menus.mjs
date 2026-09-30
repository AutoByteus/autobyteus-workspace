export default async ({ page, front, out }) => {
  const r = {};
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  // Model menu
  await page.locator('[data-test="chat-model-trigger"]').click();
  const menu = page.locator('[data-test="chat-model-menu"]');
  await menu.waitFor();
  r.menuText = (await menu.innerText()).slice(0, 600);
  r.menuWidth = (await menu.boundingBox())?.width;
  r.runtimeRows = await page.locator('[data-test^="chat-runtime-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test')));
  await page.locator('[data-test="chat-runtime-codex_app_server"]').hover();
  await page.locator('[data-test="chat-runtime-codex_app_server"]').click();
  const sub = page.locator('[data-test="chat-model-submenu"]');
  await sub.waitFor();
  r.loadingSeen = await page.locator('[data-test="chat-model-loading"]').count();
  await page.locator('[data-test^="chat-model-option-"]').first().waitFor({ timeout: 60000 });
  r.codexModels = await page.locator('[data-test^="chat-model-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')));
  await page.screenshot({ path: `${out}/model-submenu.png` });
  // Search
  await page.locator('[data-test="chat-model-search"]').fill('sonnet');
  await page.waitForTimeout(500);
  r.searchingText = (await menu.innerText()).slice(0, 300);
  await page.locator('[data-test^="chat-model-search-option-"]').first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  r.searchResults = (await menu.innerText()).slice(0, 800);
  await page.screenshot({ path: `${out}/model-search.png` });
  await page.locator('[data-test="chat-model-search"]').fill('zzzz-nothing');
  await page.waitForTimeout(400);
  r.noMatch = await page.locator('[data-test="chat-model-search-empty"]').count() ? await page.locator('[data-test="chat-model-search-empty"]').innerText() : null;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  r.menuClosedByEsc = (await menu.count()) === 0 || !(await menu.isVisible());
  // Pick Codex gpt-5.5 if present else first
  await page.locator('[data-test="chat-model-trigger"]').click();
  await page.locator('[data-test="chat-runtime-codex_app_server"]').click();
  const preferred = r.codexModels.find((m) => /gpt-5\.5$|gpt-5\.5\b/.test(m)) ?? r.codexModels[0];
  r.picked = preferred;
  await page.locator(`[data-test="chat-model-option-${preferred}"]`).click();
  await page.waitForTimeout(500);
  r.modelTriggerAfter = await page.locator('[data-test="chat-model-trigger"]').innerText();
  r.thinkingTrigger = await page.locator('[data-test="chat-thinking-trigger"]').count() ? await page.locator('[data-test="chat-thinking-trigger"]').innerText() : null;
  if (r.thinkingTrigger !== null) {
    await page.locator('[data-test="chat-thinking-trigger"]').click();
    await page.locator('[data-test="chat-thinking-menu"]').waitFor();
    r.thinkingOptions = await page.locator('[data-test^="chat-thinking-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test')));
    await page.screenshot({ path: `${out}/thinking-menu.png` });
    await page.keyboard.press('Escape');
  }
  // Slash menu
  const input = page.locator('[data-test="chat-message-input"] textarea, textarea[data-test="chat-message-input"]').first();
  await input.click();
  await input.type('/');
  await page.locator('[data-test="chat-skill-menu"]').waitFor();
  r.slashAll = await page.locator('[data-test^="chat-skill-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-skill-option-', '')));
  await page.screenshot({ path: `${out}/slash-menu.png` });
  await input.type('zzz');
  await page.waitForTimeout(300);
  r.slashEmpty = await page.locator('[data-test="chat-skill-menu-empty"]').count() ? await page.locator('[data-test="chat-skill-menu-empty"]').innerText() : null;
  await input.fill('');
  // @ menu
  await input.type('@');
  await page.locator('[data-test="chat-target-menu"]').waitFor();
  r.atMenu = (await page.locator('[data-test="chat-target-menu"]').innerText()).slice(0, 600);
  r.atOptions = await page.locator('[data-test^="chat-target-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test')));
  await page.keyboard.press('Escape');
  await input.fill('');
  // Workspace menu + folder validation
  await page.locator('[data-test="chat-workspace-trigger"]').click();
  await page.locator('[data-test="chat-workspace-menu"]').waitFor();
  r.workspaceMenu = (await page.locator('[data-test="chat-workspace-menu"]').innerText()).slice(0, 400);
  await page.locator('[data-test="chat-workspace-open-folder"]').click();
  const form = page.locator('[data-test="chat-workspace-folder-form"]');
  await form.waitFor();
  await form.locator('input').fill('relative/path');
  await form.locator('input').press('Enter');
  await page.waitForTimeout(300);
  r.relativeError = await page.locator('[data-test="chat-workspace-path-error"]').count() ? await page.locator('[data-test="chat-workspace-path-error"]').innerText() : null;
  await form.locator('input').fill('~/x');
  await form.locator('input').press('Enter');
  await page.waitForTimeout(300);
  r.tildeError = await page.locator('[data-test="chat-workspace-path-error"]').count() ? await page.locator('[data-test="chat-workspace-path-error"]').innerText() : null;
  await page.screenshot({ path: `${out}/workspace-menu.png` });
  return r;
};
