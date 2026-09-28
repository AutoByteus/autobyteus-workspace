const gql = async (query, variables = {}) => (await (await fetch('http://127.0.0.1:18731/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const cfgQ = 'query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{llmModelIdentifier llmConfig runtimeKind autoExecuteTools workspaceRootPath} modelConfigEditability{editable reason}}}';
export default async ({ page, front, out }) => {
  const runId = process.env.RUN_ID;
  const r = { runId };
  await page.goto(`${front}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(2500);
  r.statusLive = await page.locator('[data-test="chat-run-status"]').innerText();
  const trig = page.locator('[data-test="chat-model-trigger"]');
  r.liveTrigger = { ariaDisabled: await trig.getAttribute('aria-disabled'), disabled: await trig.isDisabled(), title: await trig.getAttribute('title') };
  await trig.click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  r.liveMenuOpened = await page.locator('[data-test="chat-model-menu"]').count();
  r.workspaceControlsInRunView = await page.locator('[data-test="chat-workspace-trigger"], [data-test="chat-approval-toggle"]').count();
  await page.screenshot({ path: `${out}/d08-live-locked.png` });
  r.serverBefore = (await gql(cfgQ, { runId })).data.getAgentRunResumeConfig;
  // terminate via tree
  const term = page.locator(`[data-test="terminate-agent-run"][data-run-id="${runId}"]`);
  await term.click();
  await page.waitForFunction(() => /Offline/.test(document.querySelector('[data-test="chat-run-status"]')?.innerText ?? ''), null, { timeout: 60000 });
  r.statusAfterTerminate = await page.locator('[data-test="chat-run-status"]').innerText();
  await page.waitForTimeout(1500);
  await trig.click();
  await page.locator('[data-test="chat-model-menu"]').waitFor();
  r.fixedNote = await page.locator('[data-test="chat-runtime-fixed-note"]').innerText().catch(() => null);
  r.offlineMenu = (await page.locator('[data-test="chat-model-menu"]').innerText()).slice(0, 500);
  await page.screenshot({ path: `${out}/d08-offline-menu.png` });
  await page.locator('[data-test="chat-model-option-gpt-5.6-luna"]').click();
  await page.waitForTimeout(2500);
  r.triggerAfterPick = await trig.innerText();
  r.serverAfterPick1 = (await gql(cfgQ, { runId })).data.getAgentRunResumeConfig;
  // reload: reopened Offline run (isLocked false) must still use the persisted mode
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(3000);
  r.statusAfterReload = await page.locator('[data-test="chat-run-status"]').innerText();
  r.triggerAfterReload = await trig.innerText();
  r.titleAfterReload = await page.locator('[data-test="chat-title"]').innerText();
  await trig.click();
  await page.locator('[data-test="chat-model-menu"]').waitFor();
  r.fixedNoteAfterReload = await page.locator('[data-test="chat-runtime-fixed-note"]').innerText().catch(() => null);
  r.runtimeRowsAfterReload = await page.locator('[data-test^="chat-runtime-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test')));
  await page.locator('[data-test="chat-model-option-gpt-5.6-sol"]').click();
  await page.waitForTimeout(1500);
  if (await page.locator('[data-test="chat-thinking-trigger"]').count()) {
    await page.locator('[data-test="chat-thinking-trigger"]').click();
    await page.locator('[data-test="chat-thinking-option-reasoning_effort-low"]').click();
    await page.waitForTimeout(2000);
  }
  r.serverAfterPick2 = (await gql(cfgQ, { runId })).data.getAgentRunResumeConfig;
  // resume with a new message
  const input = page.locator('[data-test="chat-message-input"] textarea, textarea[data-test="chat-message-input"], [data-test="chat-composer"] textarea').first();
  await input.fill('Reply with exactly RESUMED-OK.');
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForFunction(() => /RESUMED-OK[\s\S]*RESUMED-OK/.test(document.querySelector('[data-test="chat-page"]')?.innerText ?? ''), null, { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(2000);
  r.statusAfterResume = await page.locator('[data-test="chat-run-status"]').innerText();
  r.lockedAfterResume = { ariaDisabled: await trig.getAttribute('aria-disabled'), disabled: await trig.isDisabled() };
  r.serverAfterResume = (await gql(cfgQ, { runId })).data.getAgentRunResumeConfig;
  r.tail = (await page.locator('[data-test="chat-page"]').innerText()).slice(-400);
  await page.screenshot({ path: `${out}/d08-resumed.png` });
  return r;
};
