// RSK-005 + AC-010/AC-013: org route selection never redirects; stale standalone selection does not
// redirect on /workspace mount; tree click on a standalone run while on /workspace goes to /chat?id=;
// missing id state; chat tool strip collapsed by default and opens on click.
export default async ({ page, front, out }) => {
  const r = { urls: [] };
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) r.urls.push(f.url().replace(front, '')); });
  const chatRun = process.env.RUN_ID;
  const orgRun = process.env.ORG_RUN_ID;
  const push = (to) => page.evaluate((p) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(p), to);
  // 1. open a standalone chat (selection = standalone), then in-app navigate to /workspace
  await page.goto(`${front}/chat?id=${chatRun}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(2000);
  r.stripCollapsedDefault = { shell: await page.locator('[data-test="chat-tool-shell"]').count(), rightTabsVisible: await page.locator('text=Terminal').first().isVisible().catch(() => false) };
  await page.screenshot({ path: `${out}/chat-strip-collapsed.png` });
  await push('/workspace');
  await page.waitForTimeout(3000);
  r.staleSelectionUrl = page.url().replace(front, '');
  // 2. org route: open org run in tree and click a member row
  const orgGroup = page.locator('[data-test="agent-org-definition-probe-org"]');
  await orgGroup.waitFor({ timeout: 30000 });
  if (await orgGroup.getAttribute('aria-expanded') !== 'true') await orgGroup.click();
  const orgRow = page.locator(`[data-test="agent-org-run-open-${orgRun}"]`);
  await orgRow.waitFor({ timeout: 30000 });
  await orgRow.click();
  await page.waitForTimeout(3000);
  r.orgRouteUrl = page.url().replace(front, '');
  const memberRows = page.locator('[data-test^="agent-org-agent-row-"]');
  r.orgMemberRowCount = await memberRows.count();
  if (r.orgMemberRowCount > 0) {
    await memberRows.first().click();
    await page.waitForTimeout(3000);
    r.afterOrgMemberClickUrl = page.url().replace(front, '');
  }
  await page.screenshot({ path: `${out}/org-member-selected.png` });
  // 3. tree click on standalone run while on /workspace → /chat?id=
  const row = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${chatRun}"]`);
  if (!(await row.isVisible().catch(() => false))) {
    const agentRow = page.locator('[data-test="workspace-agent-row"][data-agent-definition-id="autobyteus-daily-assistant"]').first();
    if (await agentRow.getAttribute('aria-expanded') !== 'true') await agentRow.click();
  }
  await row.first().click();
  await page.waitForURL(/\/chat\?id=/, { timeout: 30000 });
  r.afterStandaloneClickUrl = page.url().replace(front, '');
  // 4. open the tool strip: click the first strip button inside the chat tool shell
  const stripButtons = page.locator('[data-test="chat-tool-shell"] button[title], [data-test="chat-tool-shell"] [role="tab"]');
  r.stripButtonTitles = await stripButtons.evaluateAll((els) => els.slice(0, 10).map((e) => e.getAttribute('title') || e.innerText));
  // 5. missing id
  await push('/chat?id=no_such_run_123');
  await page.locator('[data-test="chat-missing"]').waitFor({ timeout: 30000 });
  r.missingText = await page.locator('[data-test="chat-missing"]').innerText();
  await page.locator('[data-test="chat-missing-new-chat"]').click();
  await page.locator('[data-test="chat-new"]').waitFor();
  r.afterMissingNewChat = page.url().replace(front, '');
  // 6. unregistered temp id → /chat
  await push('/chat?id=temp-chat-0000-9');
  await page.waitForTimeout(1500);
  r.afterUnknownTemp = page.url().replace(front, '');
  return r;
};
