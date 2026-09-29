// AC-007 (@agent, scoped /, ×, tree +) and AC-008/AC-011 (team quick path with an attachment).
import fs from 'node:fs/promises';
const gql = async (query, variables = {}) => (await (await fetch('http://127.0.0.1:18731/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const input = (page) => page.locator('[data-test="chat-composer"] textarea').first();
export default async ({ page, front, out }) => {
  const r = {};
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  // @agent
  await input(page).click();
  await input(page).type('@probe');
  await page.locator('[data-test="chat-target-option-probe-bundle-owner"]').click();
  r.agentChip = await page.locator('[data-test="chat-agent-chip"]').innerText();
  r.subtitle = await page.locator('[data-test="chat-new-subtitle"]').innerText().catch(() => null);
  await input(page).type('/');
  await page.locator('[data-test="chat-skill-menu"]').waitFor();
  r.scopedSlash = await page.locator('[data-test^="chat-skill-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-skill-option-', '')));
  await page.screenshot({ path: `${out}/at-agent-scoped-slash.png` });
  await page.keyboard.press('Escape');
  await input(page).fill('');
  // × returns to Daily Assistant
  await page.locator('[data-test="chat-agent-chip"] button').first().click();
  r.agentChipAfterX = await page.locator('[data-test="chat-agent-chip"]').count();
  r.subtitleAfterX = await page.locator('[data-test="chat-new-subtitle"]').innerText().catch(() => null);
  // @team + attachment
  await input(page).type('@Probe');
  await page.locator('[data-test="chat-target-option-probe-team"]').click();
  r.teamChip = await page.locator('[data-test="chat-team-chip"]').innerText();
  r.teamNote = await page.locator('[data-test="chat-team-note"]').innerText().catch(() => null);
  r.slashForTeam = await (async () => { await input(page).type('/'); await page.waitForTimeout(400); const c = await page.locator('[data-test="chat-skill-menu"]').count(); await input(page).fill(''); return c; })();
  const attachment = '/tmp/chat-entry-live-g5kZ/attach-note.txt';
  await fs.writeFile(attachment, 'ATTACHMENT-MARKER-7431\n');
  const fileInput = page.locator('[data-test="context-files"] input[type="file"], [data-test="chat-composer"] input[type="file"]').first();
  await fileInput.setInputFiles(attachment);
  await page.waitForFunction(() => /Context Files \(1\)/.test(document.querySelector('[data-test="chat-composer"]')?.innerText ?? ''), null, { timeout: 30000 });
  r.contextFiles = (await page.locator('[data-test="chat-composer"]').innerText()).slice(0, 300);
  await input(page).fill('Read the attached file and reply with its marker only.');
  await page.screenshot({ path: `${out}/team-draft.png` });
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForURL(/\/workspace/, { timeout: 120000 });
  r.teamUrl = page.url();
  await page.waitForTimeout(5000);
  r.teamViewText = (await page.locator('main').innerText()).slice(0, 1200);
  r.teamBoxHasChatFooter = await page.locator('[data-test="chat-composer-footer"]').count();
  r.teamBoxContextFiles = await page.locator('text=Context Files').count();
  await page.screenshot({ path: `${out}/team-view.png` });
  // server: team run with uniform config, coordinator got the message + file
  const hist = await gql('{ listWorkspaceRunHistory(limitPerAgent: 6) { teamDefinitions { teamDefinitionId runs { teamRunId coordinatorAddress summary } } } }');
  const teamRun = hist.data.listWorkspaceRunHistory.flatMap((w) => w.teamDefinitions).find((t) => t.teamDefinitionId === 'probe-team')?.runs?.[0];
  r.teamRun = teamRun;
  if (teamRun) {
    const cfg = await gql('query($teamRunId:String!){getTeamRunResumeConfig(teamRunId:$teamRunId){executionTree}}', { teamRunId: teamRun.teamRunId });
    const tree = cfg.data.getTeamRunResumeConfig.executionTree;
    const members = [];
    const visit = (x) => { if (!x || typeof x !== 'object') return; if (typeof x.agent_run_id === 'string' || typeof x.agentRunId === 'string') members.push(x); for (const v of Object.values(x)) if (v && typeof v === 'object') Array.isArray(v) ? v.forEach(visit) : visit(v); };
    visit(tree);
    r.treeSample = JSON.stringify(tree).slice(0, 1500);
    r.memberCount = members.length;
  }
  return r;
};
