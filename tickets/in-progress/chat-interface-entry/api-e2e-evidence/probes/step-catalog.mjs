// REQ-017/AC-014: catalog Run form unchanged; the launched standalone draft opens in the chat view
// (/workspace redirect → /chat?id=temp-*), first send promotes and the URL follows (D-13).
// Also: tree + preset (AC-007) and deleting a stored chat (AC-013).
export default async ({ page, front, out }) => {
  const r = { urls: [] };
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) r.urls.push(f.url().replace(front, '')); });
  await page.goto(`${front}/agents`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Legacy Helper', { exact: true }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1000);
  const card = page.locator('div,article,li').filter({ has: page.getByText('Legacy Helper', { exact: true }) }).filter({ has: page.getByRole('button', { name: /^Run/ }) }).last();
  await card.getByRole('button', { name: /^Run/ }).first().click();
  await page.waitForTimeout(3000);
  r.afterRunClickUrl = page.url().replace(front, '');
  await page.screenshot({ path: `${out}/catalog-run-form.png` });
  r.formText = (await page.locator('main').innerText()).slice(0, 900);
  // configure Codex + gpt-5.5 in the unchanged form, launch
  await page.locator('main select').first().selectOption('codex_app_server');
  await page.waitForTimeout(1500);
  await page.getByText('Select a model', { exact: true }).first().click();
  await page.getByText(/^GPT-5\.5 \(default reasoning/).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Run Agent' }).click();
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 60000 });
  r.afterLaunchUrl = page.url().replace(front, '');
  await page.waitForTimeout(1500);
  r.draftFooter = await page.locator('[data-test="chat-composer-footer"]').innerText();
  r.draftHasWorkspaceControls = await page.locator('[data-test="chat-workspace-trigger"], [data-test="chat-approval-toggle"]').count();
  r.draftHeader = await page.locator('[data-test="chat-run-header"]').innerText();
  await page.screenshot({ path: `${out}/catalog-temp-chat.png` });
  const input = page.locator('[data-test="chat-composer"] textarea').first();
  await input.fill('Reply with exactly CATALOG-OK.');
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 120000 });
  r.afterPromotionUrl = page.url().replace(front, '');
  await page.waitForFunction(() => /CATALOG-OK[\s\S]*CATALOG-OK/.test(document.querySelector('[data-test="chat-page"]')?.innerText ?? ''), null, { timeout: 180000 }).catch(() => {});
  r.catalogReply = (await page.locator('[data-test="chat-page"]').innerText()).slice(-200);
  // tree + preset on the Legacy Helper agent row (workspace = temp)
  const plus = page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="legacy-helper"]').locator('xpath=..').locator('button').nth(1);
  await plus.click();
  await page.locator('[data-test="chat-new"]').waitFor();
  r.presetUrl = page.url().replace(front, '');
  r.presetChip = await page.locator('[data-test="chat-agent-chip"]').innerText().catch(() => null);
  r.presetWorkspace = await page.locator('[data-test="chat-workspace-trigger"]').innerText();
  await page.screenshot({ path: `${out}/tree-plus-preset.png` });
  return r;
};
