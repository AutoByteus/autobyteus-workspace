// D-04/D-13: first send fails before promotion (PrepareAgentRun rejected once at the network boundary),
// the user lands on /chat?id=temp-*, resends, and the URL is replaced with the permanent id.
// Also: Ask first + an opened folder workspace are applied to the created run.
import fs from 'node:fs/promises';
const gql = async (query, variables = {}) => (await (await fetch('http://127.0.0.1:18731/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
export default async ({ page, front, out }) => {
  const r = { urls: [] };
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) r.urls.push(f.url()); });
  const folder = '/tmp/chat-entry-live-g5kZ/folder-ws' + Date.now();
  await fs.mkdir(folder, { recursive: true });
  let injected = 0;
  await page.route('**/graphql', async (route) => {
    const body = route.request().postData() ?? '';
    if (injected === 0 && /PrepareAgentRun|prepareAgentRun/.test(body)) {
      injected += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'Injected prepare failure (API/E2E)' }], data: null }) });
      return;
    }
    await route.continue();
  });
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  r.defaultModelFromLastUsed = await page.locator('[data-test="chat-model-trigger"]').innerText();
  await page.locator('[data-test="chat-model-trigger"]').click();
  await page.locator('[data-test="chat-runtime-codex_app_server"]').click();
  await page.locator('[data-test="chat-model-option-gpt-5.5"]').click();
  // folder workspace + Ask first
  await page.locator('[data-test="chat-workspace-trigger"]').click();
  await page.locator('[data-test="chat-workspace-open-folder"]').click();
  const form = page.locator('[data-test="chat-workspace-folder-form"]');
  await form.locator('input').fill(folder);
  await form.locator('input').press('Enter');
  await page.waitForTimeout(500);
  r.workspaceTrigger = await page.locator('[data-test="chat-workspace-trigger"]').innerText();
  r.hint = await page.locator('[data-test="chat-new-hint"]').innerText().catch(() => null);
  await page.locator('[data-test="chat-approval-toggle"]').click();
  r.approval = await page.locator('[data-test="chat-approval-toggle"]').innerText();
  const input = page.locator('[data-test="chat-message-input"] textarea, textarea[data-test="chat-message-input"]').first();
  await input.fill('Reply with exactly TEMP-RESEND-OK.');
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForURL(/\/chat\?id=temp-/, { timeout: 90000 });
  r.urlAfterFailedSend = page.url();
  await page.waitForTimeout(2000);
  r.viewAfterFail = (await page.locator('[data-test="chat-page"]').innerText()).slice(0, 800);
  r.injected = injected;
  await page.screenshot({ path: `${out}/temp-failed-send.png` });
  // resend on the temp chat
  const input2 = page.locator('[data-test="chat-composer"] textarea').first();
  r.inputAfterFail = await input2.inputValue();
  if (!r.inputAfterFail) await input2.fill('Reply with exactly TEMP-RESEND-OK.');
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 120000 });
  r.urlAfterResend = page.url();
  const runId = new URL(page.url()).searchParams.get('id');
  r.replyVisible = await page.waitForFunction(() => { const el = document.querySelector('[data-test="chat-run-view"]'); const t = el?.innerText ?? ''; return /DA\s*\n\s*Daily Assistant\s*\n+\s*TEMP-RESEND-OK/.test(t); }, null, { timeout: 60000 }).then(() => true).catch(() => false);
  r.statusAfterResend = await page.locator('[data-test="chat-run-status"]').innerText();
  r.viewTail = (await page.locator('[data-test="chat-page"]').innerText()).slice(-350);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 }); await page.waitForTimeout(4000);
  r.afterReloadTail = (await page.locator('[data-test="chat-page"]').innerText()).slice(-250);
  r.header = await page.locator('[data-test="chat-run-header"]').innerText();
  r.headerApproval = await page.locator('[data-test="chat-header-approval"]').innerText().catch(() => null);
  const cfg = await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){metadataConfig{workspaceRootPath autoExecuteTools runtimeKind llmModelIdentifier}}}', { runId });
  r.server = cfg.data?.getAgentRunResumeConfig?.metadataConfig;
  r.materializedInFolder = await fs.readdir(`${folder}/.codex/skills`).catch((e) => `ERR ${e.code}`);
  await page.screenshot({ path: `${out}/temp-resent.png` });
  return r;
};
