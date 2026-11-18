// Settings for every run the phone opens (autobyteus-522): decided by the run that holds the opened agent, not by its kind.
// Cases of `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` on its paired phone page, after
// 458's cases (`--cases=MSP-67,MSP-68,MSP-69,MSP-70,MSP-71,MSP-72` runs only these). Every run changed here is the cases'
// own, on alpha, on the scripted Antigravity runtime and the scripted Grok Build runtime (`grok-4.7`); MSP-72 only reads the
// stack's run on beta.
//
//   MSP-67 AC-001  The founder's case: a PTM run delegates a Team; the phone opens the task team's member, live: ⋮ has
//                  Settings; the stop icon stops the task team's run (the PTM run as it was); the rows open; Grok Build /
//                  grok-4.7 saved: back in the conversation; the node holds the member's new launch, the other member as it
//                  was; Settings again shows it; a message from the phone continues the task team.
//   MSP-68 AC-002  The PTM's task agent, live: the stop stops that agent run only; then stopped, Save changes that run only.
//   MSP-69 AC-003  A standalone Team's lead delegated a task agent, opened in the Team's tree, stopped: Settings shows the task
//                  agent's own saved runtime and model; Save changes the task agent run; the lead's launch as it was.
//   MSP-70 AC-004  An Org's planner delegated a task agent and a Team: Settings on the task agent and on the task team's
//                  member; each live run's stop stops that delegated run, not the Org; a Save changes that run (member) only.
//                  The task team is the Delivery Team: inside the Org, `/docs_review_team` is the Org's own squad and not an
//                  address the planner can delegate to ("not the address of an available agent or agent team"; U-002).
//   MSP-71 AC-005  An Org Team member (a Team inside the Org), stopped: Save changes that member in the Org run only.
//   MSP-72 AC-006  The PTM's task agent on beta: ⋮ has Settings; the run's name and status line and "This run is on
//                  beta-node. Its runtime and model can be changed only on that node."; no rows, no Save; back returns to
//                  the conversation.
import { randomUUID } from 'node:crypto';
import { readRunTree } from './fixtures/run-tree.mjs';

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `sel`, `toList`, `openRow`, `ensureUnfolded`,
 *   `rowsOf`, `menuOpen`, `runScreen`, `shot`, `sendOver`, `waitFor`, `sleep`, `assert`, `selected`.
 */
export const runEveryRunSettingsCases = async (probe) => {
  const { runCase, page, stack, alpha, sel, toList, openRow, ensureUnfolded, rowsOf, menuOpen, runScreen, shot, sendOver, waitFor, sleep, assert } = probe;
  const ids = ['MSP-67', 'MSP-68', 'MSP-69', 'MSP-70', 'MSP-71', 'MSP-72'];
  if (probe.selected && !ids.some((id) => probe.selected.has(id))) return;

  const gql = (query, variables) => alpha.gql(query, variables);
  const grok = (runtime) => runtime?.runtimeKind === 'grok_build' && runtime?.model === 'grok-4.7';
  const pickId = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1] ?? null;

  // The node's view of each kind of run.
  const agentRun = async (id) => {
    const r = (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive metadataConfig{runtimeKind llmModelIdentifier}}}', { id })).getAgentRunResumeConfig;
    return { isActive: r.isActive, runtimeKind: r.metadataConfig.runtimeKind, model: r.metadataConfig.llmModelIdentifier };
  };
  const teamRun = async (id) => {
    const r = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive executionTree}}', { id })).getTeamRunResumeConfig;
    return { isActive: r.isActive, members: Object.fromEntries((r.executionTree.root_team?.members ?? []).map((m) => [m.address,
      { agentRunId: m.agent_run_id, runtimeKind: m.launch_configuration?.runtime_kind, model: m.launch_configuration?.llm_model_identifier }])) };
  };
  const orgRun = async (id) => {
    const r = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){isActive executionTree}}', { id })).getAgentOrgRunConfig;
    const members = {};
    for (const node of r.executionTree.rootOrg.members) {
      if (node.agentRunId) members[node.address] = { agentRunId: node.agentRunId, runtimeKind: node.launchConfiguration?.runtimeKind, model: node.launchConfiguration?.llmModelIdentifier };
      for (const member of node.members ?? []) members[member.address] = { agentRunId: member.agentRunId, runtimeKind: member.launchConfiguration?.runtimeKind, model: member.launchConfiguration?.llmModelIdentifier };
    }
    return { isActive: r.isActive, members };
  };
  const createAgentRun = async (agentDefinitionId) => {
    const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId, ...stack.runConfig } })).createAgentRun;
    assert(r.success, r.message);
    return r.runId;
  };
  const createOrgRun = async () => {
    const r = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
      { i: { agentOrgDefinitionId: stack.ids.org, rootConfiguration: stack.runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    assert(r.success, r.message);
    return r.agentOrgRunId;
  };
  const terminate = {
    agent: (id) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id }),
    team: (id) => gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id }),
    org: (id) => gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id }),
  };
  /** A delegate_task call by an Org's planner (the Org run's stream), as the probe stack's Org calls tools. */
  const orgCall = (orgRunId, planner, args) => sendOver(stack.wsUrl(`agent-org/${orgRunId}`), { root_subject_kind: 'agent_org', root_run_id: orgRunId,
    target_agent_run_id: planner, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(),
    content: `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: args })}`, context_file_paths: [], image_urls: [] });

  // The phone.
  const settings = page.locator(sel('mobile-run-settings'));
  const settingsState = () => page.evaluate(() => {
    const root = document.querySelector('[data-testid="mobile-run-settings"]');
    const text = (id) => root?.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
    return {
      open: Boolean(root), subject: text('mobile-run-settings-subject'), status: text('mobile-run-settings-status'),
      runtime: text('mobile-run-runtime-select-value'), model: text('mobile-run-model-select-value'),
      rows: Boolean(root?.querySelector('[data-testid="mobile-run-runtime-select-toggle"]')),
      runtimeDisabled: root?.querySelector('[data-testid="mobile-run-runtime-select-toggle"]')?.disabled ?? null,
      save: Boolean(root?.querySelector('[data-testid="mobile-run-settings-save"]')),
      saveDisabled: root?.querySelector('[data-testid="mobile-run-settings-save"]')?.disabled ?? null,
      stop: Boolean(root?.querySelector('[data-testid="mobile-run-settings-stop"]')),
      remote: text('mobile-run-settings-remote'), error: text('mobile-run-settings-error'),
    };
  });
  /** The rows under `parentKey` in list order (deeper than it, until the next row at its depth or above). */
  const rowsUnder = (rows, parentKey) => {
    const start = rows.findIndex((row) => row.key === parentKey);
    if (start < 0) return [];
    const under = [];
    for (let index = start + 1; index < rows.length && rows[index].depth > rows[start].depth; index += 1) under.push(rows[index]);
    return under;
  };
  /** The run list, then the row reached by `path`: each step a name pattern among the rows under the previous one. */
  const openPath = async (rootKey, path) => {
    await toList(page);
    // An older run is under "Show older" (the list shows the newest five).
    await waitFor(`${rootKey} on the phone`, async () => {
      if (await page.locator(sel(`mobile-run-row-${rootKey}`)).count()) return true;
      const fold = page.locator(sel('mobile-run-list-show-older'));
      if ((await fold.count()) && (await fold.innerText()).startsWith('Show older')) await fold.click();
      return false;
    }, 30_000);
    let parent = rootKey;
    for (const [index, step] of path.entries()) {
      await ensureUnfolded(page, parent);
      let key = null;
      await waitFor(`${step} under ${parent}`, async () => Boolean(key = rowsUnder(await rowsOf(page), parent).find((row) => step.test(row.name))?.key), 30_000).catch(() => undefined);
      assert(key, `the row ${step} under ${parent}`, rowsUnder(await rowsOf(page), rootKey).map((row) => ({ key: row.key, name: row.name, depth: row.depth })));
      if (index === path.length - 1) { await openRow(page, key); break; }
      parent = key;
    }
    await page.locator(sel('mobile-run-conversation')).waitFor({ timeout: 30_000 }).catch(() => undefined);
  };
  const menuEntries = async () => {
    await menuOpen(page);
    const entries = await page.locator(`${sel('mobile-run-menu')} [role="menuitem"]`).evaluateAll((items) => items.map((item) => item.getAttribute('data-testid')?.replace('mobile-run-menu-', '')));
    await page.keyboard.press('Escape');
    if (await page.locator(sel('mobile-run-menu')).count()) await page.mouse.click(5, 400);
    return entries;
  };
  /** ⋮ → Settings; without the entry the menu is closed again and the case fails here (no Settings on this run). */
  const openSettings = async () => {
    await menuOpen(page);
    const entry = page.locator(sel('mobile-run-menu-settings'));
    if (!(await entry.count())) {
      await page.keyboard.press('Escape');
      if (await page.locator(sel('mobile-run-menu')).count()) await page.mouse.click(5, 400);
      throw new Error('no Settings in the ⋮ menu of this run');
    }
    await entry.click();
    await settings.waitFor({ timeout: 20_000 });
    await waitFor('the run\'s settings', async () => { const s = await settingsState(); return Boolean(s.remote) || (Boolean(s.model) && s.runtime !== 'Choose'); }, 30_000).catch(() => undefined);
  };
  const choose = async (row, pattern) => {
    await page.locator(sel(`mobile-run-${row}-select-toggle`)).click();
    const sheet = page.locator(sel(`mobile-run-${row}-select-sheet`));
    await sheet.waitFor({ timeout: 10_000 });
    const option = sheet.locator(sel(`mobile-run-${row}-select-option`)).filter({ hasText: pattern }).first();
    await option.waitFor({ timeout: 20_000 });
    await option.click();
    await sheet.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
  };
  /** Settings open on a live run: one tap on the stop icon; `stopped` says when the node let the run go. */
  const stopFromSettings = async (stopped) => {
    await waitFor('the stop icon', async () => (await settingsState()).stop, 30_000).catch(() => undefined);
    const live = await settingsState();
    if (live.stop) await page.locator(sel('mobile-run-settings-stop')).click();
    await waitFor('the run stopped on the node', stopped, 60_000).catch(() => undefined);
    await waitFor('the rows open', async () => { const s = await settingsState(); return !s.stop && s.runtimeDisabled === false; }, 30_000).catch(() => undefined);
    return { live, stopped: await settingsState() };
  };
  /** Runtime → Grok Build, Model → grok-4.7, Save: back in the conversation. */
  const saveGrok = async () => {
    await choose('runtime', /Grok/i);
    await choose('model', /grok/i);
    const chosen = await settingsState();
    if (!chosen.saveDisabled) await page.locator(sel('mobile-run-settings-save')).click();
    await waitFor('back in the conversation', async () => (await settings.count()) === 0 && (await runScreen(page)).state === 'open', 30_000).catch(() => undefined);
    return { chosen, back: (await settings.count()) === 0 };
  };
  const reopened = async () => {
    await openSettings();
    const state = await settingsState();
    await page.goBack();
    await waitFor('the conversation', async () => (await settings.count()) === 0, 10_000).catch(() => undefined);
    return state;
  };

  // The PTM run of MSP-67 and MSP-68 (the stack's PTM serves later cases): it delegates a Team and a task agent.
  let ptm = null;
  const ptmRun = async () => {
    if (ptm) return ptm;
    const runId = await createAgentRun(stack.ids.ptm);
    const team = pickId(await stack.agentCall(runId, 'delegate_task', { recipient_address: '/docs_review_team', description: 'Review the docs. Marker 522-TASK-TEAM.' }), 'target_team_run_id');
    const agent = pickId(await stack.agentCall(runId, 'delegate_task', { recipient_address: '/release_notes_writer', description: 'Write the notes. Marker 522-TASK-AGENT.' }), 'target_agent_run_id');
    assert(team && agent, 'the PTM delegated a Team and a task agent', { team, agent });
    ptm = { runId, key: `agent:${runId}`, team, agent };
    return ptm;
  };

  await runCase('MSP-67', async () => {
    const { runId, key, team } = await ptmRun();
    await waitFor('the task team live on the node', async () => (await teamRun(team)).isActive === true, 60_000).catch(() => undefined);
    const before = { ptm: await agentRun(runId), team: await teamRun(team) };
    await openPath(key, [/docs review team/i, /^reviewer$/i]);
    const entries = await menuEntries();
    await openSettings();
    await shot(page, 'MSP-67-task-team-member-live');
    const stop = await stopFromSettings(async () => (await teamRun(team)).isActive === false);
    const afterStop = { ptm: await agentRun(runId), team: (await teamRun(team)).isActive };
    const saved = await saveGrok();
    const after = await teamRun(team);
    const again = await reopened();
    await shot(page, 'MSP-67-task-team-member-saved');
    const composer = page.locator(`${sel('mobile-run-conversation')} textarea`).first();
    await composer.fill('continue 522-CONTINUE');
    await composer.press('Enter');
    await waitFor('the task team continues', async () => (await teamRun(team)).isActive === true, 60_000).catch(() => undefined);
    const continued = await teamRun(team);
    await terminate.team(team).catch(() => undefined);
    const details = { entries, stop, before, afterStop, saved, after: after.members, again, continued: { isActive: continued.isActive, reviewer: continued.members['/reviewer'] } };
    assert(entries.at(-1) === 'settings', 'REQ-001 ⋮ → Settings, the last entry (autobyteus-534), on a task team\'s member', details);
    assert(stop.live.stop && /^reviewer/.test(stop.live.subject ?? ''), 'REQ-003 the live member: the stop icon', details);
    assert(afterStop.team === false && afterStop.ptm.isActive === before.ptm.isActive, 'REQ-003 the stop stops the task team\'s run; the PTM run as it was', details);
    assert(stop.stopped.runtimeDisabled === false, 'REQ-003 then the rows open', details);
    assert(saved.back && grok(after.members['/reviewer']) && !grok(after.members['/editor']) && after.members['/editor']?.runtimeKind === before.team.members['/editor']?.runtimeKind,
      'REQ-002 Save: back in the conversation; the member\'s new launch on the node, the other member as it was', details);
    assert(/Grok/i.test(again.runtime ?? '') && /grok/i.test(again.model ?? ''), 'REQ-002 Settings again shows it', details);
    assert(continued.isActive && grok(continued.members['/reviewer']), 'AC-001 a message continues the task team on it', details);
    return details;
  });

  await runCase('MSP-68', async () => {
    const { runId, key, agent } = await ptmRun();
    await stack.agentSay(agent, 'Another round. Marker 522-AGENT-LIVE.');
    await waitFor('the task agent live on the node', async () => (await agentRun(agent)).isActive === true, 60_000).catch(() => undefined);
    const before = { ptm: await agentRun(runId), agent: await agentRun(agent) };
    await openPath(key, [/release notes writer/i]);
    const entries = await menuEntries();
    await openSettings();
    const stop = await stopFromSettings(async () => (await agentRun(agent)).isActive === false);
    const afterStop = { ptm: await agentRun(runId), agent: await agentRun(agent) };
    const saved = await saveGrok();
    const after = { ptm: await agentRun(runId), agent: await agentRun(agent) };
    await shot(page, 'MSP-68-task-agent-saved');
    const details = { entries, stop, before, afterStop, saved, after };
    assert(entries.includes('settings'), 'REQ-001 ⋮ → Settings on the PTM\'s task agent', details);
    assert(stop.live.stop && afterStop.agent.isActive === false && afterStop.ptm.isActive === before.ptm.isActive, 'REQ-003 the stop stops that agent run only', details);
    assert(saved.back && grok(after.agent) && after.ptm.runtimeKind === before.ptm.runtimeKind && after.ptm.model === before.ptm.model, 'REQ-002 Save changes that agent run only', details);
    return details;
  });

  await runCase('MSP-69', async () => {
    // The case's own Delivery Team run; its lead delegates a task agent.
    const created = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
      teamDefinitionId: stack.ids.delivery, teamConfigs: [{ teamAddress: '/', ...stack.runConfig }],
      memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: stack.ids.checker, ...stack.runConfig },
        { memberAddress: '/mate', agentDefinitionId: stack.ids.writer, ...stack.runConfig }] } })).createAgentTeamRun;
    assert(created.success, created.message);
    const teamRunId = created.teamRunId;
    const lead = (await teamRun(teamRunId)).members['/lead'].agentRunId;
    const leadProjection = async () => JSON.stringify((await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
      { id: teamRunId, a: lead })).getTeamMemberRunProjection?.conversation ?? []);
    await sendOver(stack.wsUrl(`agent-team/${teamRunId}`), { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [],
      agent_run_id: lead, content: `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { recipient_address: '/changelog_helper', description: 'Draft the changelog. Marker 522-LEAD-TASK.' } })}` });
    let helper = null;
    await waitFor('the lead\'s task agent', async () => Boolean(helper = pickId((await leadProjection()).split('CALLED:').slice(1).join(''), 'target_agent_run_id')), 60_000).catch(() => undefined);
    assert(helper, 'the lead delegated a task agent');
    await sleep(2_000);
    await terminate.team(teamRunId).catch(() => undefined);
    await terminate.agent(helper).catch(() => undefined);
    await waitFor('both stopped', async () => !(await teamRun(teamRunId)).isActive && !(await agentRun(helper)).isActive, 30_000).catch(() => undefined);
    const before = { lead: (await teamRun(teamRunId)).members['/lead'], helper: await agentRun(helper) };
    await openPath(`team:${teamRunId}`, [/^lead$/i, /changelog helper/i]);
    const screen = await runScreen(page);
    await openSettings();
    const opened = await settingsState();
    await shot(page, 'MSP-69-team-member-task-agent');
    const saved = await saveGrok();
    const after = { lead: (await teamRun(teamRunId)).members['/lead'], helper: await agentRun(helper) };
    const details = { screen: { name: screen.name, subtitle: screen.subtitle }, before, opened, saved, after };
    assert(/changelog helper/i.test(opened.subject ?? '') && opened.runtime === 'Antigravity CLI' && !opened.stop, 'REQ-005 Settings shows the task agent\'s own saved runtime and model', details);
    assert(saved.back && grok(after.helper), 'REQ-005 Save changes the task agent run', details);
    assert(after.lead.runtimeKind === before.lead.runtimeKind && after.lead.model === before.lead.model, 'REQ-005 the Team member\'s launch as it was', details);
    return details;
  });

  // The case's own Org run: its planner delegates a task agent and a Team (the Delivery Team, U-002).
  let org = null;
  await runCase('MSP-70', async () => {
    const orgRunId = await createOrgRun();
    const planner = (await orgRun(orgRunId)).members['/planner'].agentRunId;
    const delegated = async () => (await readRunTree(gql, 'agent_org', orgRunId)).rows ?? [];
    await orgCall(orgRunId, planner, { recipient_address: '/changelog_helper', description: 'Org task agent. Marker 522-ORG-TASK-AGENT.' });
    let rows = [];
    await waitFor('the Org\'s task agent', async () => (rows = await delegated()).some((row) => row.kind === 'agent' && row.parentKey), 60_000).catch(() => undefined);
    for (let attempt = 0; attempt < 3 && !rows.some((row) => row.kind === 'team' && row.parentKey); attempt += 1) {
      await sleep(2_000);
      await orgCall(orgRunId, planner, { recipient_address: '/delivery_team', description: `Org task team ${attempt}. Marker 522-ORG-TASK-TEAM.` });
      await waitFor('the Org\'s task team', async () => (rows = await delegated()).some((row) => row.kind === 'team' && row.parentKey), 60_000).catch(() => undefined);
    }
    const taskAgent = rows.find((row) => row.kind === 'agent' && row.parentKey)?.openTarget?.agentRunId ?? null;
    const taskTeam = rows.find((row) => row.kind === 'team' && row.parentKey)?.openTarget?.runId ?? null;
    // U-002: what the planner's delegate_task calls answered, when a delegated run did not come.
    const plannerProjection = async () => JSON.stringify((await gql('query($o:String!,$m:String!,$a:String!){getAgentOrgMemberRunProjection(orgRunId:$o,memberAddress:$m,agentRunId:$a){conversation}}',
      { o: orgRunId, m: '/planner', a: planner })).getAgentOrgMemberRunProjection?.conversation ?? []);
    const plannerCalls = taskAgent && taskTeam ? null : (await plannerProjection().catch((error) => `read failed: ${error.message}`)).split('CALLED:').slice(1).map((entry) => entry.slice(0, 400));
    assert(taskAgent && taskTeam, 'the Org\'s planner delegated a task agent and a Team',
      { rows: rows.map((row) => `${row.kind}:${row.name}:${row.parentKey ? 'child' : 'own'}`), plannerCalls });
    org = { orgRunId, planner };
    const orgKey = `org:${orgRunId}`;
    await waitFor('the Org and its delegated runs live', async () => (await orgRun(orgRunId)).isActive && (await agentRun(taskAgent)).isActive && (await teamRun(taskTeam)).isActive, 60_000).catch(() => undefined);
    const before = { org: await orgRun(orgRunId), agent: await agentRun(taskAgent), team: await teamRun(taskTeam) };

    // The task agent.
    await openPath(orgKey, [/planner/i, /changelog helper/i]);
    const agentEntries = await menuEntries();
    await openSettings();
    const agentStop = await stopFromSettings(async () => (await agentRun(taskAgent)).isActive === false);
    const orgAfterAgentStop = (await orgRun(orgRunId)).isActive;
    const agentSaved = await saveGrok();
    const afterAgent = { org: await orgRun(orgRunId), agent: await agentRun(taskAgent) };

    // The task team's coordinator.
    await openPath(orgKey, [/planner/i, /delivery team/i, /^lead$/i]);
    const memberEntries = await menuEntries();
    await openSettings();
    const memberStop = await stopFromSettings(async () => (await teamRun(taskTeam)).isActive === false);
    const orgAfterTeamStop = (await orgRun(orgRunId)).isActive;
    const memberSaved = await saveGrok();
    const after = { org: await orgRun(orgRunId), team: await teamRun(taskTeam) };
    await shot(page, 'MSP-70-org-task-team-member-saved');
    const details = { taskAgent, taskTeam, agentEntries, agentStop, orgAfterAgentStop, agentSaved, afterAgent, memberEntries, memberStop, orgAfterTeamStop, memberSaved,
      before: { org: before.org.members, team: before.team.members }, after: { org: after.org.members, team: after.team.members } };
    assert(agentEntries.includes('settings') && memberEntries.includes('settings'), 'REQ-001 ⋮ → Settings on an Org\'s task agent and task team member', details);
    assert(agentStop.live.stop && !(await agentRun(taskAgent)).isActive && orgAfterAgentStop === true, 'REQ-003 the task agent\'s stop stops that run, not the Org', details);
    assert(memberStop.live.stop && orgAfterTeamStop === true, 'REQ-003 the task team member\'s stop stops the task team, not the Org', details);
    assert(agentSaved.back && grok(afterAgent.agent) && !grok(afterAgent.org.members['/planner']), 'REQ-002 a Save on the Org\'s task agent changes that run only', details);
    assert(memberSaved.back && grok(after.team.members['/lead']) && !grok(after.team.members['/mate'])
      && Object.entries(after.org.members).every(([address, member]) => !grok(member) || grok(before.org.members[address])), 'REQ-002 a Save on the task team\'s member changes that member only', details);
    await terminate.org(orgRunId).catch(() => undefined);
    return details;
  });

  await runCase('MSP-71', async () => {
    // A stopped Org's own Team member (the squad's reviewer).
    const orgRunId = org?.orgRunId ?? await createOrgRun();
    await terminate.org(orgRunId).catch(() => undefined);
    await waitFor('the Org stopped', async () => (await orgRun(orgRunId)).isActive === false, 30_000).catch(() => undefined);
    const before = await orgRun(orgRunId);
    const squadReviewer = Object.keys(before.members).find((address) => /\/reviewer$/.test(address) && address !== '/reviewer');
    await openPath(`org:${orgRunId}`, [/squad/i, /^reviewer$/i]);
    await openSettings();
    const opened = await settingsState();
    const saved = await saveGrok();
    const after = await orgRun(orgRunId);
    const details = { squadReviewer, opened, saved, before: before.members, after: after.members };
    assert(/in (squad|docs review team|Delivery Org)/i.test(opened.status ?? '') && !opened.stop, 'the stopped Org Team member\'s Settings', details);
    assert(saved.back && squadReviewer && grok(after.members[squadReviewer])
      && Object.entries(after.members).filter(([address]) => address !== squadReviewer).every(([address, member]) => grok(member) === grok(before.members[address])),
    'AC-005 Save changes that member in the Org run only', details);
    return details;
  });

  await runCase('MSP-72', async () => {
    await openPath(`agent:${stack.ptm}`, [/publisher/i]);
    const screen = await runScreen(page);
    const entries = await menuEntries();
    await openSettings();
    const remote = await settingsState();
    await shot(page, 'MSP-72-peer-run-settings');
    await page.goBack();
    await waitFor('back in the conversation', async () => (await settings.count()) === 0 && (await runScreen(page)).state === 'open', 10_000).catch(() => undefined);
    const back = { settings: await settings.count(), screen: (await runScreen(page)).state };
    const details = { screen: { name: screen.name, subtitle: screen.subtitle, chip: screen.chip }, entries, remote, back };
    assert(entries.includes('settings'), 'REQ-001 ⋮ → Settings on a run on another node', details);
    assert(/publisher/i.test(remote.subject ?? '') && Boolean(remote.status), 'REQ-004 the run\'s name and status line', details);
    assert(remote.remote === 'This run is on beta-node. Its runtime and model can be changed only on that node.', 'REQ-004 the sentence naming the node', details);
    assert(!remote.rows && !remote.save && !remote.stop, 'REQ-004 no rows, no Save, no stop', details);
    assert(back.settings === 0 && back.screen === 'open', 'back returns to the conversation', details);
    return details;
  });
};
