// Checks whether the locked thinking control is shown for a live persisted run opened fresh.
export default async ({ page, front, out }) => {
  const runId = process.env.RUN_ID;
  const r = {};
  const gql = async (query, variables = {}) => (await (await fetch('http://127.0.0.1:18731/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
  r.server = (await gql('query($runId:String!){getAgentRunResumeConfig(runId:$runId){isActive metadataConfig{llmModelIdentifier llmConfig runtimeKind}}}', { runId })).data.getAgentRunResumeConfig;
  // A: direct load of /chat?id=<live run>
  await page.goto(`${front}/chat?id=${runId}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(6000);
  r.A_status = await page.locator('[data-test="chat-run-status"]').innerText();
  r.A_footer = await page.locator('[data-test="chat-composer-footer"]').innerText();
  r.A_thinkingTrigger = await page.locator('[data-test="chat-thinking-trigger"]').count();
  await page.screenshot({ path: `${out}/live-reload-footer.png` });
  // B: open New chat first (loads default runtime catalog = AutoByteus), then open the run from the tree
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(2000);
  const row = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${runId}"]`);
  if (!(await row.isVisible().catch(() => false))) {
    await page.getByText('Temp Workspace', { exact: true }).first().click();
    const agentRow = page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="autobyteus-daily-assistant"]').first();
    await agentRow.waitFor();
    if (await agentRow.getAttribute('aria-expanded') !== 'true') await agentRow.click();
  }
  await row.first().click();
  await page.locator('[data-test="chat-run-view"]').waitFor();
  await page.waitForTimeout(5000);
  r.B_footer = await page.locator('[data-test="chat-composer-footer"]').innerText();
  r.B_thinkingTrigger = await page.locator('[data-test="chat-thinking-trigger"]').count();
  return r;
};
