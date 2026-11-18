// autobyteus-522 reproduction (TEMPORARY, Solution Designer investigation; not committed): which runs the phone offers
// Settings for, and what the node answers for each delegated run's saved settings. Run by `mobile-shell-probe.mjs` with
// `--cases=MSP-R522`. Every run is the probe stack's own (alpha, scripted Antigravity runtime; beta as the peer).
//
//   MSP-R522  For each kind of run the phone opens (a standalone agent, a Team member, an Org member, a task agent and a
//             task team's member of a standalone agent (the founder's case: the PTM's delegated team), a Team member's own
//             task agent, an Org's task agent and task team member, a run on the peer node): the ⋮ menu's entries; when
//             Settings is offered, the run its screen shows. Node side for each delegated run: its saved settings read
//             (isActive, editability), its model options, then after a stop the same read and a stopped-run save.
import { randomUUID } from 'node:crypto';
import { readRunTree } from './fixtures/run-tree.mjs';

export const runSettingsEveryRunRepro = async (probe) => {
  const { runCase, page, stack, alpha, sel, toList, openRow, ensureUnfolded, rowsOf, menuOpen, runScreen, shot, sendOver, waitFor, sleep, assert } = probe;
  if (probe.selected && !probe.selected.has('MSP-R522') && !probe.selected.has('MSP-R522B')) return;
  const gql = (query, variables) => alpha.gql(query, variables);
  const safe = async (fn) => { try { return await fn(); } catch (error) { return { error: String(error.message ?? error).slice(0, 300) }; } };

  const agentRead = (id) => safe(async () => (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive modelConfigEditability{editable reason} metadataConfig{runtimeKind llmModelIdentifier}}}', { id })).getAgentRunResumeConfig);
  const teamRead = (id) => safe(async () => {
    const r = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive modelConfigEditability{editable reason} executionTree}}', { id })).getTeamRunResumeConfig;
    return { isActive: r.isActive, editability: r.modelConfigEditability, members: (r.executionTree.root_team?.members ?? []).map((m) => ({ address: m.address, runtime: m.launch_configuration?.runtime_kind, model: m.launch_configuration?.llm_model_identifier })) };
  });
  const agentOptions = (id) => safe(async () => {
    const r = (await gql('query($id:String!){agentRunModelOptions(agentRunId:$id){currentModelIdentifier modelListReadable unavailableReason replacements{llmModelIdentifier}}}', { id })).agentRunModelOptions;
    return { current: r.currentModelIdentifier, readable: r.modelListReadable, replacements: r.replacements.length };
  });
  const teamOptions = (id) => safe(async () => (await gql('query($id:String!){teamRunModelOptions(teamRunId:$id){scopeAddress currentModelIdentifier modelListReadable}}', { id })).teamRunModelOptions);
  const terminateAgent = (id) => safe(async () => (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun);
  const terminateTeam = (id) => safe(async () => (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id })).terminateAgentTeamRun);
  const grok = { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4.7', llmConfig: null };
  const saveAgent = (agentRunId) => safe(async () => (await gql('mutation($i:UpdateStoppedAgentRunSelectionInput!){updateStoppedAgentRunSelection(input:$i){success outcome message isActive editability{editable reason}}}',
    { i: { agentRunId, ...grok } })).updateStoppedAgentRunSelection);
  const saveTeamMember = (teamRunId, scopeAddress) => safe(async () => (await gql('mutation($i:UpdateStoppedTeamRunSelectionsInput!){updateStoppedTeamRunSelections(input:$i){success outcome message isActive editability{editable reason}}}',
    { i: { teamRunId, selectionPatches: [{ scopeKind: 'CONFIGURED_AGENT', scopeAddress, ...grok }] } })).updateStoppedTeamRunSelections);

  /** The ⋮ menu's entries on the open run screen; with Settings, its subject and rows. */
  const menuOf = async (label) => {
    await menuOpen(page);
    const entries = await page.locator(`${sel('mobile-run-menu')} [role="menuitem"]`).evaluateAll((items) => items.map((item) => item.getAttribute('data-testid')?.replace('mobile-run-menu-', '')));
    await shot(page, `MSP-R522-${label}-menu`);
    let settings = null;
    if (entries.includes('settings')) {
      await page.locator(sel('mobile-run-menu-settings')).click();
      await page.locator(sel('mobile-run-settings')).waitFor({ timeout: 10_000 });
      await sleep(2_500);
      settings = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="mobile-run-settings"]');
        return { subject: root?.querySelector('[data-testid="mobile-run-settings-subject"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
          body: root?.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) ?? null };
      });
      await shot(page, `MSP-R522-${label}-settings`);
      await page.goBack();
      await sleep(800);
    } else {
      await page.keyboard.press('Escape');
      if (await page.locator(sel('mobile-run-menu')).count()) await page.mouse.click(5, 400);
    }
    return { screen: await runScreen(page).then((s) => ({ name: s.name, subtitle: s.subtitle, chip: s.chip })), entries, settings };
  };
  /** Opens the row whose name matches under `parentKey` (any depth below it). */
  const openUnder = async (parentKey, name, unfold = []) => {
    await toList(page);
    await waitFor(`${parentKey} on the phone`, async () => (await page.locator(sel(`mobile-run-row-${parentKey}`)).count()) > 0, 30_000);
    await ensureUnfolded(page, parentKey);
    for (const step of unfold) {
      let key = null;
      await waitFor(`row ${step}`, async () => Boolean(key = (await rowsOf(page)).find((row) => row.key.startsWith(parentKey) && step.test(row.name))?.key), 20_000).catch(() => undefined);
      if (key) { const row = page.locator(`[data-testid="mobile-run-row-${key}"]`); if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator(sel('mobile-run-toggle')).click(); await sleep(800); }
    }
    let key = null;
    await waitFor(`row ${name}`, async () => Boolean(key = (await rowsOf(page)).filter((row) => row.key.startsWith(parentKey) && row.key !== parentKey).find((row) => name.test(row.name))?.key), 20_000).catch(() => undefined);
    assert(key, `row ${name} under ${parentKey}`, await rowsOf(page));
    await openRow(page, key);
    await page.locator(sel('mobile-run-conversation')).waitFor({ timeout: 30_000 }).catch(() => undefined);
    return key;
  };

  await runCase('MSP-R522', async () => {
    const facts = { phone: {}, node: {} };
    // The Org's planner delegates a task agent and a task team (the Org's delegated runs).
    const orgWs = stack.wsUrl(`agent-org/${stack.org}`);
    const orgCall = (args) => sendOver(orgWs, { root_subject_kind: 'agent_org', root_run_id: stack.org, target_agent_run_id: stack.orgPlanner,
      command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content: `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: args })}`, context_file_paths: [], image_urls: [] });
    await orgCall({ recipient_address: '/changelog_helper', description: 'Org task agent. Marker ORG-TASK-AGENT.' });
    await sleep(3_000);
    await orgCall({ recipient_address: '/docs_review_team', description: 'Org task team. Marker ORG-TASK-TEAM.' });
    let orgRows = [];
    await waitFor('the Org\'s delegated rows', async () => {
      orgRows = (await readRunTree(gql, 'agent_org', stack.org)).rows ?? [];
      return orgRows.some((row) => row.kind === 'agent' && row.parentKey) && orgRows.some((row) => row.kind === 'team' && row.parentKey);
    }, 90_000).catch(() => undefined);
    const orgTaskAgent = orgRows.find((row) => row.kind === 'agent' && row.parentKey)?.openTarget?.agentRunId ?? null;
    const orgTaskTeam = orgRows.find((row) => row.kind === 'team' && row.parentKey)?.openTarget?.runId ?? null;
    facts.orgDelegated = { orgTaskAgent, orgTaskTeam, rows: orgRows.map((row) => ({ kind: row.kind, name: row.name, address: row.address, parent: Boolean(row.parentKey) })) };

    // Node side while live (as the founder's: running).
    const delegatedAgents = { ptmTaskAgent: stack.writerRun, teamMemberTaskAgent: stack.leadDelegated, orgTaskAgent };
    const delegatedTeams = { ptmTaskTeam: stack.squadRun, orgTaskTeam };
    for (const [label, id] of Object.entries(delegatedAgents)) if (id) facts.node[label] = { live: await agentRead(id), options: await agentOptions(id) };
    for (const [label, id] of Object.entries(delegatedTeams)) if (id) facts.node[label] = { live: await teamRead(id), options: await teamOptions(id) };

    // Phone side.
    const ptmKey = `agent:${stack.ptm}`;
    facts.phone.standaloneAgent = await (async () => { await toList(page); await openRow(page, ptmKey); return menuOf('standalone-agent'); })();
    await openUnder(ptmKey, /release notes writer/i);
    facts.phone.ptmTaskAgent = await menuOf('ptm-task-agent');
    await openUnder(ptmKey, /reviewer/i, [/docs review team/i]);
    facts.phone.ptmTaskTeamMember = await menuOf('ptm-task-team-member');
    await openUnder(ptmKey, /publisher/i);
    facts.phone.peerAgent = await menuOf('peer-agent');
    const teamKey = `team:${stack.delivery}`;
    await openUnder(teamKey, /^lead$/i);
    facts.phone.teamMember = await menuOf('team-member');
    await openUnder(teamKey, /changelog helper/i, [/^lead$/i]);
    facts.phone.teamMemberTaskAgent = await menuOf('team-member-task-agent');

    // Node side after a stop, then a stopped-run save of each delegated run.
    for (const [label, id] of Object.entries(delegatedAgents)) if (id) {
      facts.node[label].stop = await terminateAgent(id);
      await sleep(1_500);
      facts.node[label].stopped = await agentRead(id);
      facts.node[label].save = await saveAgent(id);
      facts.node[label].after = await agentRead(id);
    }
    for (const [label, id] of Object.entries(delegatedTeams)) if (id) {
      facts.node[label].stop = await terminateTeam(id);
      await sleep(1_500);
      const stopped = await teamRead(id);
      facts.node[label].stopped = stopped;
      const member = stopped.members?.find((m) => /reviewer/.test(m.address))?.address ?? '/reviewer';
      facts.node[label].save = await saveTeamMember(id, member);
      facts.node[label].after = await teamRead(id);
    }
    facts.phone.ptmTaskTeamMemberStopped = await (async () => { await openUnder(ptmKey, /reviewer/i, [/docs review team/i]); return menuOf('ptm-task-team-member-stopped'); })();
    return facts;
  });

  // MSP-R522B: (a) a Team member's own task agent: Settings opened on it, a stopped Save: which run's launch changes on the
  // node (the task agent's own, or the Team member's that delegated it). (b) an Org's task team (retry). (c) the phone's
  // ⋮ menu on an Org's task agent.
  await runCase('MSP-R522B', async () => {
    const facts = {};
    const teamKey = `team:${stack.delivery}`;
    const teamLead = async () => (await teamRead(stack.delivery)).members?.find((m) => m.address === '/lead') ?? null;
    await terminateTeam(stack.delivery);
    await terminateAgent(stack.leadDelegated);
    await sleep(2_000);
    facts.before = { lead: await teamLead(), helper: (await agentRead(stack.leadDelegated)).metadataConfig };
    await openUnder(teamKey, /changelog helper/i, [/^lead$/i]);
    facts.screen = await runScreen(page).then((s) => ({ name: s.name, subtitle: s.subtitle }));
    await menuOpen(page, 'settings');
    await page.locator(sel('mobile-run-settings')).waitFor({ timeout: 20_000 });
    await sleep(3_000);
    const state = () => page.evaluate(() => {
      const root = document.querySelector('[data-testid="mobile-run-settings"]');
      const text = (id) => root?.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
      return { subject: text('mobile-run-settings-subject'), runtime: text('mobile-run-runtime-select-value'), model: text('mobile-run-model-select-value'),
        saveDisabled: root?.querySelector('[data-testid="mobile-run-settings-save"]')?.disabled ?? null, stop: Boolean(root?.querySelector('[data-testid="mobile-run-settings-stop"]')),
        error: text('mobile-run-settings-error') };
    });
    facts.opened = await state();
    const choose = async (row, pattern) => {
      await page.locator(sel(`mobile-run-${row}-select-toggle`)).click();
      const sheet = page.locator(sel(`mobile-run-${row}-select-sheet`));
      await sheet.waitFor({ timeout: 10_000 });
      await sheet.locator(sel(`mobile-run-${row}-select-option`)).filter({ hasText: pattern }).first().click();
      await sheet.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
      await sleep(500);
    };
    await choose('runtime', /Grok/i);
    await choose('model', /grok/i);
    facts.changed = await state();
    await shot(page, 'MSP-R522B-helper-settings-changed');
    await page.locator(sel('mobile-run-settings-save')).click();
    await sleep(4_000);
    facts.afterSaveScreen = await state();
    facts.after = { lead: await teamLead(), helper: (await agentRead(stack.leadDelegated)).metadataConfig };

    // (b) the Org's task team.
    const orgWs = stack.wsUrl(`agent-org/${stack.org}`);
    let orgRows = (await readRunTree(gql, 'agent_org', stack.org)).rows ?? [];
    for (let attempt = 0; attempt < 3 && !orgRows.some((row) => row.kind === 'team' && row.parentKey); attempt += 1) {
      await sendOver(orgWs, { root_subject_kind: 'agent_org', root_run_id: stack.org, target_agent_run_id: stack.orgPlanner, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(),
        content: `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { recipient_address: '/docs_review_team', description: `Org task team ${attempt}. Marker ORG-TASK-TEAM.` } })}`, context_file_paths: [], image_urls: [] });
      await waitFor('the Org\'s task team', async () => { orgRows = (await readRunTree(gql, 'agent_org', stack.org)).rows ?? []; return orgRows.some((row) => row.kind === 'team' && row.parentKey); }, 60_000).catch(() => undefined);
    }
    const orgTaskTeam = orgRows.find((row) => row.kind === 'team' && row.parentKey)?.openTarget?.runId ?? null;
    facts.orgTaskTeam = { id: orgTaskTeam, rows: orgRows.map((row) => `${row.kind}:${row.name}:${row.parentKey ? 'child' : 'own'}`) };
    if (orgTaskTeam) {
      facts.orgTaskTeam.live = await teamRead(orgTaskTeam);
      facts.orgTaskTeam.stop = await terminateTeam(orgTaskTeam);
      await sleep(1_500);
      facts.orgTaskTeam.save = await saveTeamMember(orgTaskTeam, '/reviewer');
      facts.orgTaskTeam.after = await teamRead(orgTaskTeam);
    }

    // (c) the phone's menu on the Org's delegated rows.
    await toList(page);
    const all = await rowsOf(page);
    facts.orgListRows = all.filter((row) => row.key.includes(stack.org)).map((row) => ({ key: row.key.replace(stack.org, 'ORG'), name: row.name, depth: row.depth }));
    const orgKey = all.find((row) => row.depth === 0 && row.key.includes(stack.org))?.key;
    if (orgKey) {
      await openUnder(orgKey, /changelog helper/i, [/planner/i]).catch((error) => { facts.orgOpenError = String(error.message).slice(0, 200); });
      if (!facts.orgOpenError) facts.orgTaskAgentMenu = await menuOf('org-task-agent');
      if (orgTaskTeam) {
        await openUnder(orgKey, /^reviewer$/i, [/planner/i, /docs review team/i]).catch((error) => { facts.orgTeamOpenError = String(error.message).slice(0, 200); });
        if (!facts.orgTeamOpenError) facts.orgTaskTeamMemberMenu = await menuOf('org-task-team-member');
      }
    }
    return facts;
  });
};
