// Settings of the focused agent (ticket agent-settings-focused, autobyteus-366). Registered by delegated-launch-defaults-probe.mjs
// (same owned stack: real Chrome → Nuxt dev → built backend with the scripted AGY CLI, whose argv log shows each launch's
// `--model`; scripted Grok as a second runtime; owned temp data root and HOME; no credentials). Every run is started, focused,
// edited and saved through the UI; the server and the argv log are read back.
//
// Cases:
//   AFS-001 (AC-001, AC-003, AC-005; D-IMP-1, D-IMP-3) A hub with two Agent copies and a Team copy:
//           - running: a copy's card is locked with the stop hint; the header stops that copy only;
//           - stopped: the hub's card and the hint, no list; each copy's card; a Team copy's member with "Team settings";
//           - edit copy A, focus copy B: the save bar names A, B is unchanged; Save stores only A, and A's card shows it;
//           - edit B's runtime, Cancel: discarded; then Save it: B's next message runs on the other runtime; A's on its model;
//           - the selected run's row keeps Settings open, the back arrow leaves, another run opens at its chat.
//   AFS-002 (AC-002, AC-003, REQ-004; D-IMP-2) An Org with agents, a placed Team and a copy:
//           - running: each focused agent's card, no list, "Organization settings", locks and stops;
//           - stopped: a direct agent's edit with the others unchanged; the group view; a stopped Org's copy opens Settings
//             from a fresh page, has its "+", and its edit is stored; the agent's next message runs on the saved model.
//   AFS-003 (AC-004, AC-005) A stopped Team: edit one member and Save, the others unchanged; "Team settings": change the Team's
//           model and Save: a follower's next message runs on it, the customized member's on its own.
// Run alone: pnpm -C autobyteus-web test:e2e:agent-settings-focused --output-dir <fresh dir>
import { randomUUID } from 'node:crypto'

export function registerAgentSettingsFocusedCases(h) {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, newChatFor, chooseModel, typeAndSend, callFromComposer,
    conversationText, openSettings, backToConversation, openSidebarAgent, openTeamRun, expandWorkspaces, saveSettings, saveBarText,
    agentTree, teamTree, teamRunIds, objectsIn, pick, agyLaunchesOf, offerAgyModels,
    AGY, GROK, GROK_MODEL, MODEL, ALT, RETIRING, MODEL_LABEL, ALT_LABEL, RETIRING_LABEL, env } = h

  const tag = () => randomUUID().slice(0, 4)
  /** A case keeps what it recorded (`keep(r)`) when it fails: the probe stores error.details. */
  let kept = null
  const keep = (r) => { kept = r; return r }
  const defineRecordedCase = (id, title, fn) => defineCase(id, title, async (page, context) => {
    kept = null
    try { return await fn(page, context) } catch (error) {
      error.details = { recorded: kept, ...(error.details !== undefined ? { assertion: error.details } : {}) }
      throw error
    }
  })
  const segmentOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const launch = { runtimeKind: AGY, llmModelIdentifier: MODEL }
  const createAgent = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: launch } })).createAgentDefinition.id
  const createTeam = async (name, nodes, coordinator) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Work together.', coordinatorMemberName: coordinator, handoffs: [], defaultLaunchConfig: launch,
    nodes: Object.entries(nodes).map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
  const createOrg = async (name, members) => (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Plan.', handoffs: [], members, defaultLaunchConfig: launch } })).createAgentOrgDefinition.id

  /** What Settings show for the focused agent, read from the DOM. */
  const facts = (page) => page.evaluate(() => {
    const q = (s) => document.querySelector(`[data-test="${s}"]`)
    const text = (s) => q(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null
    const card = q('existing-run-subject-card')
    return { open: Boolean(q('existing-run-settings')), name: text('run-subject-name'), status: q('run-subject-status')?.getAttribute('data-status') ?? null,
      group: text('run-subject-group'), switchLabel: text('run-settings-switch-group'), switchPressed: q('run-settings-switch-group')?.getAttribute('aria-pressed') ?? null,
      card: Boolean(card), rootCard: Boolean(q('existing-run-root-card')), hint: Boolean(q('existing-run-copies-hint')),
      list: document.querySelectorAll('[data-test="run-delegated-launches"]').length,
      memberRows: document.querySelectorAll('[data-test="existing-run-settings"] [data-test^="run-member-/"]').length,
      model: (card ?? q('existing-run-root-card'))?.querySelector('[data-test="run-setting-model"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      modelLocked: Boolean((card ?? q('existing-run-root-card'))?.querySelector('[data-test="run-setting-model"] [data-test="run-setting-locked"]')),
      stopHint: text('run-member-stop-hint'), copyStop: Boolean(q('run-member-stop')), runStop: Boolean(q('existing-run-stop')),
      saveText: text('existing-run-save-text'), state: q('existing-run-settings')?.getAttribute('data-state') ?? null }
  })
  const subjectCard = (page) => page.locator(sel('existing-run-subject-card'))
  const waitSubject = (page, label, name) => waitFor(label, async () => { const f = await facts(page); return f.name?.toLowerCase().includes(name.toLowerCase()) ? f : null }, 30000, 300)
  const assertOneCard = (f, label) => assert(f.open && f.card && !f.rootCard && f.list === 0 && f.memberRows === 0, `${label}: one card, no list`, f)
  const waitSaved = (page) => waitFor('saved', async () => /^\s*Saved\./.test(await saveBarText(page)), 60000, 500)
  const launchesOf = agyLaunchesOf
  const stored = (tree, agentRunId) => objectsIn(tree).find((record) => pick(record, 'agentRunId') === agentRunId && pick(record, 'startedAt'))

  /** A chat on the agent, started from the Agents page; returns its run ID. */
  const startChat = async (page, name, firstMessage) => {
    await newChatFor(page, '/agents', name)
    await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
    await typeAndSend(page, firstMessage)
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    const runId = new URL(page.url(), 'http://probe.local').searchParams.get('id')
    await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 1500)
    return runId
  }
  const runRow = (page, runId) => page.locator(`${sel('workspace-agent-run-row')}[data-run-id="${runId}"]`)

  defineRecordedCase('AFS-001', 'AC-001, AC-003, AC-005, D-IMP-1, D-IMP-3: a hub and its copies each show one card; a running copy is locked and stops alone; edits across focus name their agent; Save and Cancel; the next message uses the saved model and runtime', async (page) => {
    const t = tag(), r = keep({ names: { hub: `AFS Hub ${t}`, a: `AFS Alpha ${t}`, b: `AFS Beta ${t}`, other: `AFS Other ${t}`, pair: `AFS Pair ${t}` } })
    const ids = { hub: await createAgent(r.names.hub), a: await createAgent(r.names.a), b: await createAgent(r.names.b), other: await createAgent(r.names.other),
      lead: await createAgent(`AFS lead ${t}`), engineer: await createAgent(`AFS engineer ${t}`) }
    await createTeam(r.names.pair, { lead: ids.lead, engineer: ids.engineer }, 'lead')
    r.otherRunId = await startChat(page, r.names.other, 'Hello other.')
    r.hubRunId = await startChat(page, r.names.hub, 'Hello hub.')
    const delegate = async (label, name) => {
      const called = await callFromComposer(page, label, 'delegate_task', { recipient_address: `/${segmentOf(name)}`, description: `Work for ${label}.` })
      assert(called.includes('"delegated":true'), `${label} delegated`, called)
      return called
    }
    r.a = /"target_agent_run_id":"([^"]+)"/.exec(await delegate('copy A', r.names.a))?.[1]
    r.b = /"target_agent_run_id":"([^"]+)"/.exec(await delegate('copy B', r.names.b))?.[1]
    const pairCall = await delegate('Team copy', r.names.pair)
    r.pairCoordinator = /"target_team_coordinator_agent_run_id":"([^"]+)"/.exec(pairCall)?.[1] ?? null
    assert(r.a && r.b && r.pairCoordinator, 'copy run IDs', pairCall)
    await waitFor('copies started', async () => (await launchesOf(r.a)).length > 0 && (await launchesOf(r.b)).length > 0, 60000)

    // Running: the hub's card and hint; a copy locked with the stop hint; the header stops that copy only.
    await runRow(page, r.hubRunId).click(); await settle(page, 1500)
    await openSettings(page)
    r.hubRunning = await waitFor('hub card', async () => { const f = await facts(page); return f.rootCard ? f : null }, 30000, 300)
    assert(r.hubRunning.hint && r.hubRunning.list === 0 && r.hubRunning.memberRows === 0 && r.hubRunning.runStop && r.hubRunning.status === 'active', 'running hub: its card, the hint, its stop, no list', r.hubRunning)
    await openSidebarAgent(page, r.a)
    r.aRunning = await waitSubject(page, 'copy A card', 'Alpha')
    assertOneCard(r.aRunning, 'running copy')
    assert(r.aRunning.modelLocked && /Stop this copy to change its model/.test(r.aRunning.stopHint ?? '') && r.aRunning.copyStop && r.aRunning.status === 'active', 'running copy: locked, hint, its own stop', r.aRunning)
    await shot(page, 'AFS-001-running-copy')
    await page.locator(sel('run-member-stop')).click()
    await waitFor('copy A stopped', async () => { const f = await facts(page); return f.status === 'stopped' && !f.modelLocked && !f.copyStop }, 60000, 500)
    r.bAfterAStop = await (async () => { await openSidebarAgent(page, r.b); return waitSubject(page, 'copy B card', 'Beta') })()
    assert(r.bAfterAStop.status === 'active' && r.bAfterAStop.modelLocked, 'stopping A leaves B running', r.bAfterAStop)

    // A Team copy's member: its card, "Team settings", and its group's rows.
    await openSidebarAgent(page, r.pairCoordinator)
    r.lead = await waitSubject(page, 'Team copy member card', 'lead')
    assertOneCard(r.lead, 'Team copy member')
    assert(r.lead.switchLabel === 'Team settings' && r.lead.switchPressed === 'false' && /AFS Pair/i.test(r.lead.group ?? ''), 'Team copy member: switch and group line', r.lead)
    await page.locator(sel('run-settings-switch-group')).click(); await settle(page, 500)
    r.leadGroup = await facts(page)
    assert(r.leadGroup.memberRows >= 2 && r.leadGroup.switchPressed === 'true', 'the Team copy group view lists its members', r.leadGroup)
    await shot(page, 'AFS-001-team-copy-group-view')
    await openSidebarAgent(page, r.b)
    r.afterGroup = await waitSubject(page, 'copy B again', 'Beta')
    assertOneCard(r.afterGroup, 'a focus change returns from the group view')

    // Stop the hub; every copy is editable. Hub: card and hint, nothing else.
    await runRow(page, r.hubRunId).click(); await settle(page, 1500)
    r.stayedOpen = (await facts(page)).open
    assert(r.stayedOpen, 'focusing the hub inside the same run keeps Settings open', r.stayedOpen)
    await waitFor('hub card again', async () => (await facts(page)).rootCard, 30000, 300)
    await page.locator(sel('existing-run-stop')).click()
    await waitFor('hub stopped', async () => (await facts(page)).state !== 'active', 90000, 500)
    r.hubStopped = await facts(page)
    assert(r.hubStopped.rootCard && r.hubStopped.hint && r.hubStopped.list === 0 && r.hubStopped.memberRows === 0, 'stopped hub: its card and the hint', r.hubStopped)
    await shot(page, 'AFS-001-stopped-hub')

    // Edit A; focus B: the bar names A, B is unchanged; come back; Save stores only A, and A's card shows it (D-IMP-3).
    await openSidebarAgent(page, r.a); await waitSubject(page, 'A', 'Alpha')
    await chooseModel(page, subjectCard(page), AGY, ALT)
    r.aEdited = await facts(page)
    assert(r.aEdited.model?.includes(ALT_LABEL) && new RegExp(`Unsaved changes: .*Alpha`, 'i').test(r.aEdited.saveText ?? ''), 'the bar names A', r.aEdited)
    await openSidebarAgent(page, r.b)
    r.bWhileAPending = await waitSubject(page, 'B', 'Beta')
    assert(r.bWhileAPending.open && r.bWhileAPending.model?.includes(MODEL_LABEL) && /Alpha/i.test(r.bWhileAPending.saveText ?? '') && !/Beta/i.test(r.bWhileAPending.saveText ?? ''), 'on B: B unchanged, the bar still names only A', r.bWhileAPending)
    await shot(page, 'AFS-001-pending-edit-named')
    await openSidebarAgent(page, r.a)
    r.aBack = await waitSubject(page, 'A again', 'Alpha')
    assert(r.aBack.model?.includes(ALT_LABEL), 'A\'s edit stayed pending', r.aBack)
    await saveSettings(page); await waitSaved(page)
    r.aSaved = await facts(page)
    assert(r.aSaved.model?.includes(ALT_LABEL), 'A\'s card shows the saved model (D-IMP-3)', r.aSaved)
    const treeAfterSave = await agentTree(r.hubRunId)
    r.aStored = pick(stored(treeAfterSave, r.a), 'userLaunchSelection') ?? null
    r.bStored = pick(stored(treeAfterSave, r.b), 'userLaunchSelection') ?? null
    assert(r.aStored?.llmModelIdentifier === ALT && !r.bStored, 'Save stored exactly A', { a: r.aStored, b: r.bStored })
    await shot(page, 'AFS-001-saved-card')

    // Cancel discards: B edited, then cancelled.
    await openSidebarAgent(page, r.b); await waitSubject(page, 'B to cancel', 'Beta')
    await chooseModel(page, subjectCard(page), AGY, ALT)
    await waitFor('B dirty', async () => /Beta/i.test((await facts(page)).saveText ?? ''), 15000, 300)
    await page.locator(sel('existing-run-cancel')).click(); await settle(page, 800)
    r.bCancelled = await facts(page)
    assert(r.bCancelled.model?.includes(MODEL_LABEL) && !r.bCancelled.saveText?.includes('Unsaved'), 'Cancel discards B\'s edit', r.bCancelled)
    assert(!pick(stored(await agentTree(r.hubRunId), r.b), 'userLaunchSelection'), 'nothing stored for B', null)

    // B's runtime changes to Grok, saved.
    await chooseModel(page, subjectCard(page), GROK, GROK_MODEL)
    await saveSettings(page); await waitSaved(page)
    r.bRuntimeStored = pick(stored(await agentTree(r.hubRunId), r.b), 'userLaunchSelection') ?? null
    assert(r.bRuntimeStored?.runtimeKind === GROK && r.bRuntimeStored?.llmModelIdentifier === GROK_MODEL, 'B\'s runtime is stored', r.bRuntimeStored)

    // D-IMP-1: the selected run's row keeps Settings; the back arrow leaves; another run opens at its chat.
    await runRow(page, r.hubRunId).click(); await settle(page, 1200)
    assert((await facts(page)).open, 'the selected run\'s row keeps Settings open', null)
    await waitFor('the other run\'s row', async () => {
      if (await runRow(page, r.otherRunId).isVisible().catch(() => false)) return true
      await page.getByText(r.names.other, { exact: true }).first().click().catch(() => {})
      return false
    }, 30000, 800)
    await runRow(page, r.otherRunId).click(); await settle(page, 2000)
    r.otherRun = await facts(page)
    assert(!r.otherRun.open, 'another run opens at its chat', r.otherRun)
    await runRow(page, r.hubRunId).click(); await settle(page, 2000)
    await openSettings(page)
    await backToConversation(page)
    assert(!(await facts(page)).open, 'the back arrow leaves Settings', null)

    // The next messages: A on its saved model, B on its saved runtime.
    const aBefore = (await launchesOf(r.a)).length, bBefore = (await launchesOf(r.b)).length
    await openSidebarAgent(page, r.a)
    await backToConversation(page)
    await typeAndSend(page, 'Next message for A.')
    await waitFor('A resumed', async () => (await launchesOf(r.a)).length > aBefore, 90000, 1000)
    r.aResumed = (await launchesOf(r.a)).slice(aBefore)
    assert(r.aResumed.every((model) => model === ALT), 'A\'s next message runs on the saved model', r.aResumed)
    await openSidebarAgent(page, r.b)
    await backToConversation(page)
    await typeAndSend(page, 'Next message for B.')
    // The scripted Grok's recorded reply names alpha.txt; the scripted AGY answers OK.
    await waitFor('B answered on Grok', async () => /alpha\.txt/.test(await conversationText(page)), 90000, 1000)
    r.bResumedAgyLaunches = (await launchesOf(r.b)).slice(bBefore)
    assert(r.bResumedAgyLaunches.length === 0, 'B\'s next message did not launch AGY', r.bResumedAgyLaunches)
    await shot(page, 'AFS-001-next-message')
    return r
  })

  defineRecordedCase('AFS-002', 'AC-002, AC-003, REQ-004, D-IMP-2: an Org\'s direct agent, placed Team member and copy each show one card; "Organization settings"; a stopped Org\'s member and copy edit and save; the next message uses the saved model', async (page, context) => {
    const t = tag(), r = keep({ names: { org: `AFS Org ${t}`, helper: `AFS Helper ${t}` } })
    const ids = { manager: await createAgent(`AFSO manager ${t}`), writer: await createAgent(`AFSO writer ${t}`), analyst: await createAgent(`AFSO analyst ${t}`),
      lead: await createAgent(`AFSO lead ${t}`), engineer: await createAgent(`AFSO engineer ${t}`), helper: await createAgent(r.names.helper) }
    ids.pair = await createTeam(`AFSO Pair ${t}`, { lead: ids.lead, engineer: ids.engineer }, 'lead')
    r.orgDefinitionId = await createOrg(r.names.org, [
      { memberName: 'manager', ref: ids.manager, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'writer', ref: ids.writer, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'analyst', ref: ids.analyst, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'pair', ref: ids.pair, refType: 'AGENT_TEAM', refScope: 'SHARED' },
    ])
    await page.goto(`${env().frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
    await page.locator(sel(`org-card-${r.orgDefinitionId}`)).getByRole('button', { name: 'Run', exact: true }).click()
    await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
    await page.locator(sel('org-launch-run')).click()
    await page.waitForURL(/mode=active/, { timeout: 180000 }); await settle(page, 2500)
    const params = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams
    r.orgRunId = params.get('runId') ?? params.get('rootRunId') ?? params.get('orgRunId')
    const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.orgRunId })).getAgentOrgRunConfig.executionTree
    const members = objectsIn(tree).filter((o) => pick(o, 'agentRunId') && typeof o.address === 'string')
    const idOf = (address) => pick(members.find((m) => m.address === address), 'agentRunId')
    r.ids = { manager: idOf('/manager'), writer: idOf('/writer'), analyst: idOf('/analyst'), lead: idOf('/pair/lead'), engineer: idOf('/pair/engineer') }
    assert(Object.values(r.ids).every(Boolean), 'Org members', members.map((m) => m.address))
    r.settingsClosedBy = []
    /** An Org's Settings have their own back button. */
    const orgBack = async (p) => { const back = p.locator(sel('agent-org-config-back-to-events')); if (await back.isVisible().catch(() => false)) { await back.click(); await settle(p, 1000) } }
    const memberButton = (p, id) => p.locator(sel(`agent-org-agent-row-${id}`)).first()
    const copyButton = (p, id) => p.locator(sel(`agent-org-task-agent-row-${id}`)).first()
    const expandTeamRows = async (p) => {
      for (const team of await p.locator('[data-test^="agent-org-team-row-"]').all()) {
        if (await team.getAttribute('aria-expanded').catch(() => null) === 'false') await team.click().catch(() => {})
      }
    }
    /** Clicks a row in the Org's tree, opening the run and its placed team when they are closed. */
    const focusRow = async (p, row, label) => {
      await waitFor(`${label} row`, async () => {
        if (await row.isVisible().catch(() => false)) return true
        for (const name of [`agent-org-run-disclosure-${r.orgRunId}`]) {
          const d = p.locator(sel(name)).first()
          if (await d.isVisible().catch(() => false) && await d.getAttribute('aria-expanded') === 'false') await d.click()
        }
        await expandTeamRows(p)
        return false
      }, 30000, 800)
      const wasOpen = (await facts(p)).open
      await row.click(); await settle(p, 1500)
      // Settings stay open across focus changes inside the run (D-IMP-1, AC-005). Recorded and asserted at the end, so one
      // run shows every row that closes them; reopened here so the rest of the journey still runs.
      if (wasOpen && !(await facts(p)).open) { r.settingsClosedBy.push(label); await openSettings(p) }
    }
    await focusRow(page, memberButton(page, r.ids.manager), 'manager')
    await callFromComposer(page, 'manager → writer', 'send_message_to', { recipient_address: '/writer', content: `Org note LRL ${t}` })
    const copyCall = await callFromComposer(page, 'manager delegates a copy', 'delegate_task', { recipient_address: `/${segmentOf(r.names.helper)}`, description: 'Org copy work.' })
    r.copy = /"target_agent_run_id":"([^"]+)"/.exec(copyCall)?.[1]
    assert(copyCall.includes('"delegated":true') && r.copy, 'Org copy delegated', copyCall)
    await waitFor('Org copy started', async () => (await launchesOf(r.copy)).length > 0, 60000)

    // Running: one card per focused agent; Settings stay open across focus changes.
    await openSettings(page)
    r.managerRunning = await waitSubject(page, 'manager card', 'manager')
    assertOneCard(r.managerRunning, 'running Org: direct agent')
    assert(r.managerRunning.switchLabel === 'Organization settings' && r.managerRunning.modelLocked && r.managerRunning.runStop, 'running Org member: switch, lock, the Org\'s stop', r.managerRunning)
    // A placed Team's row is the way to its members: another focus inside the run.
    await focusRow(page, page.locator('[data-test^="agent-org-team-row-"]').first(), 'placed Team row')
    await focusRow(page, memberButton(page, r.ids.engineer), 'placed Team member')
    r.engineerRunning = await waitSubject(page, 'placed Team member card', 'engineer')
    assertOneCard(r.engineerRunning, 'running Org: placed Team member')
    assert(r.engineerRunning.switchLabel === 'Organization settings', 'placed Team member: switch', r.engineerRunning)
    await focusRow(page, copyButton(page, r.copy), 'Org copy')
    r.copyRunning = await waitSubject(page, 'Org copy card', 'Helper')
    assertOneCard(r.copyRunning, 'running Org: copy')
    assert(r.copyRunning.modelLocked && /Stop this copy/.test(r.copyRunning.stopHint ?? '') && r.copyRunning.copyStop, 'running Org copy: locked with its own stop', r.copyRunning)
    await shot(page, 'AFS-002-running-org-copy')
    // The group view: the root card and the Org's members, no copy.
    await focusRow(page, memberButton(page, r.ids.manager), 'manager')
    await waitSubject(page, 'manager card', 'manager')
    await page.locator(sel('run-settings-switch-group')).click(); await settle(page, 500)
    r.groupRunning = await facts(page)
    assert(r.groupRunning.rootCard && !r.groupRunning.card && r.groupRunning.memberRows >= 3 && r.groupRunning.list === 0, 'the Org group view', r.groupRunning)
    r.groupRowsHaveNoCopy = (await page.locator(`${sel('existing-run-settings')} [data-test^="run-member-/"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test')))).every((x) => !x.includes(segmentOf(r.names.helper)))
    assert(r.groupRowsHaveNoCopy, 'the group view lists no copy', null)
    await shot(page, 'AFS-002-org-group-view')

    // Stop the Org. In a fresh page: a direct agent's edit, Save, others unchanged; the copy's own Settings.
    const stop = (await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: r.orgRunId })).terminateAgentOrgRun
    assert(stop.success, 'Org stopped', stop)
    await waitFor('Org inactive', async () => (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){is_active}}', { id: r.orgRunId })).getAgentOrgRootHistory?.is_active === false, 60000, 1000)
    const cold = await context.newPage()
    try {
      await cold.goto(`${env().frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(cold, 2500)
      const open = cold.locator(sel(`agent-org-run-open-${r.orgRunId}`))
      await waitFor('Org run row', async () => {
        if (await open.isVisible().catch(() => false)) return true
        await expandWorkspaces(cold)
        const group = cold.locator(sel(`agent-org-definition-${r.orgDefinitionId}`)).first()
        if (await group.isVisible().catch(() => false) && await group.getAttribute('aria-expanded') !== 'true') await group.click()
        return false
      }, 60000, 1500)
      await open.click(); await settle(cold, 2000)
      await focusRow(cold, memberButton(cold, r.ids.writer), 'writer')
      await openSettings(cold)
      r.writerStopped = await waitSubject(cold, 'writer card', 'writer')
      assertOneCard(r.writerStopped, 'stopped Org: direct agent')
      assert(r.writerStopped.switchLabel === 'Organization settings' && !r.writerStopped.modelLocked, 'stopped Org member: editable', r.writerStopped)
      await chooseModel(cold, subjectCard(cold), AGY, ALT)
      r.writerEdited = await facts(cold)
      assert(/Unsaved changes: .*writer/i.test(r.writerEdited.saveText ?? ''), 'the bar names the writer', r.writerEdited)
      // Edit A, focus B: A's edit stays pending and named (AC-005). Recorded and asserted at the end; if it is lost, it is
      // made again so the Save journey still runs.
      await focusRow(cold, memberButton(cold, r.ids.analyst), 'analyst, with the writer\'s edit pending')
      r.analystWhilePending = await waitSubject(cold, 'analyst card', 'analyst')
      r.pendingEditKept = /writer/i.test(r.analystWhilePending.saveText ?? '')
      assert(r.analystWhilePending.model?.includes(MODEL_LABEL), 'the analyst is unchanged', r.analystWhilePending)
      if (!r.pendingEditKept) {
        await focusRow(cold, memberButton(cold, r.ids.writer), 'writer, to edit again')
        await waitSubject(cold, 'writer', 'writer')
        await chooseModel(cold, subjectCard(cold), AGY, ALT)
      }
      await saveSettings(cold); await waitSaved(cold)
      await focusRow(cold, memberButton(cold, r.ids.writer), 'writer')
      r.writerSaved = await waitSubject(cold, 'writer again', 'writer')
      assert(r.writerSaved.model?.includes(ALT_LABEL), 'the writer shows its saved model', r.writerSaved)
      await focusRow(cold, memberButton(cold, r.ids.analyst), 'analyst')
      r.analystSaved = await waitSubject(cold, 'analyst again', 'analyst')
      assert(r.analystSaved.model?.includes(MODEL_LABEL), 'the analyst is unchanged', r.analystSaved)

      // D-IMP-2: a stopped Org's copy, from a fresh selection: Settings, "+", and an edit that is stored.
      await orgBack(cold)
      await focusRow(cold, copyButton(cold, r.copy), 'stopped Org copy')
      r.copyHeaderActions = { gear: await cold.locator(sel('workspace-header-edit-config')).isVisible().catch(() => false),
        plus: await cold.locator('[data-test="workspace-header-new-run"], [data-test="workspace-header-new-agent-run"]').first().isVisible().catch(() => false) }
      assert(r.copyHeaderActions.gear, 'a stopped Org\'s copy has its Settings entry', r.copyHeaderActions)
      await openSettings(cold)
      r.copyStopped = await waitSubject(cold, 'stopped Org copy card', 'Helper')
      assertOneCard(r.copyStopped, 'stopped Org: copy')
      assert(!r.copyStopped.modelLocked, 'a stopped Org\'s copy is editable', r.copyStopped)
      await chooseModel(cold, subjectCard(cold), AGY, ALT)
      r.copyEdited = await facts(cold)
      await saveSettings(cold)
      // Recorded and asserted at the end, so the rest of the journey still runs: the note's Refresh is what a user would press.
      await waitSaved(cold).catch(async () => {
        r.copySaveFailed = { ...(await facts(cold)), note: await cold.locator(sel('existing-run-note')).innerText().catch(() => null) }
        await shot(cold, 'AFS-002-org-copy-save-failed')
        await cold.locator(sel('existing-run-refresh')).click().catch(() => {}); await settle(cold, 2500)
      })
      r.copySaved = await facts(cold)
      r.copyStored = pick(objectsIn((await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: r.orgRunId })).getAgentOrgRootHistory.org)
        .find((x) => pick(x, 'agentRunId') === r.copy && pick(x, 'startedAt')), 'userLaunchSelection') ?? null
      assert(r.copyStored?.llmModelIdentifier === ALT, 'the Org copy\'s choice is stored', r.copyStored)
      await shot(cold, 'AFS-002-stopped-org-copy-saved')

      // The next message: the writer runs on its saved model.
      await orgBack(cold)
      await focusRow(cold, memberButton(cold, r.ids.writer), 'writer')
      const before = (await launchesOf(r.ids.writer)).length
      await typeAndSend(cold, 'Next message for the writer.')
      await waitFor('the writer resumed', async () => (await launchesOf(r.ids.writer)).length > before, 90000, 1000)
      r.writerResumed = (await launchesOf(r.ids.writer)).slice(before)
      assert(r.writerResumed.every((model) => model === ALT), 'the writer\'s next message runs on the saved model', r.writerResumed)
    } finally { await cold.close() }
    await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: r.orgRunId }).catch(() => {})
    assert(!r.copySaveFailed, 'a stopped Org copy\'s Save ends "Saved", not "could not be refreshed"', r.copySaveFailed)
    assert(r.copySaved.model?.includes(ALT_LABEL), 'the Org copy\'s card shows its saved model', r.copySaved)
    assert(r.settingsClosedBy.length === 0, 'Settings stay open across focus changes inside an Org (D-IMP-1)', r.settingsClosedBy)
    assert(r.pendingEditKept, 'an edit stays pending and named across a focus change inside an Org (AC-005)', r.analystWhilePending)
    return r
  })

  defineRecordedCase('AFS-003', 'AC-004, AC-005 (Team): one member\'s edit leaves the others; a Team-wide model change reaches followers, and the customized member keeps its own; next messages run on those models', async (page) => {
    const t = tag(), r = keep({ names: { team: `AFS Team ${t}` } })
    const ids = { lead: await createAgent(`AFST lead ${t}`), follower: await createAgent(`AFST follower ${t}`), pinned: await createAgent(`AFST pinned ${t}`) }
    r.teamDefinitionId = await createTeam(r.names.team, ids, 'lead')
    await offerAgyModels([MODEL, ALT, RETIRING])
    try {
      await newChatFor(page, '/agent-teams', r.names.team)
      await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
      const before = new Set(await teamRunIds(r.teamDefinitionId))
      await typeAndSend(page, 'Hello team.')
      await page.waitForURL(/\/workspace/, { timeout: 180000 })
      r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(r.teamDefinitionId)).find((id) => !before.has(id)), 60000)
      const treeMembers = pick(await teamTree(r.teamRunId), 'rootTeam')?.members ?? []
      r.members = Object.fromEntries(treeMembers.map((m) => [String(m.address).split('/').pop(), pick(m, 'agentRunId')]))
      assert(r.members.lead && r.members.follower && r.members.pinned, 'three members', r.members)
      const memberRow = (name) => page.locator(`[data-team-run-id="${r.teamRunId}"][data-test^="workspace-team-member-"][data-member-address$="${name}"]`).first()
      const focus = async (name) => {
        await memberRow(name).click(); await settle(page, 1500)
        // A click on the agent already focused is no focus change: the group view stays until the switch is used.
        if ((await facts(page)).switchPressed === 'true') { await page.locator(sel('run-settings-switch-agent')).click(); await settle(page, 400) }
        return waitSubject(page, `${name} card`, name)
      }
      const stop = (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: r.teamRunId })).terminateAgentTeamRun
      assert(stop.success, 'Team stopped', stop)
      await delay(2000)
      await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
      await openSettings(page)

      // One member's edit: the others unchanged.
      r.pinnedCard = await focus('pinned')
      assertOneCard(r.pinnedCard, 'stopped Team member')
      assert(r.pinnedCard.switchLabel === 'Team settings', 'the member\'s switch', r.pinnedCard)
      await chooseModel(page, subjectCard(page), AGY, RETIRING)
      await saveSettings(page); await waitSaved(page)
      r.pinnedSaved = await facts(page)
      assert(r.pinnedSaved.model?.includes(RETIRING_LABEL), 'the member shows its saved model', r.pinnedSaved)
      r.followerAfterMemberSave = await focus('follower')
      assert(r.followerAfterMemberSave.model?.includes(MODEL_LABEL), 'the other member is unchanged', r.followerAfterMemberSave)

      // The Team-wide change, one switch away.
      await page.locator(sel('run-settings-switch-group')).click(); await settle(page, 600)
      r.group = await facts(page)
      assert(r.group.rootCard && r.group.memberRows >= 3, 'the Team group view', r.group)
      await chooseModel(page, page.locator(sel('existing-run-root-card')), AGY, ALT)
      await saveSettings(page); await waitSaved(page)
      await shot(page, 'AFS-003-team-wide-saved')
      r.followerAfterTeamSave = await focus('follower')
      assert(r.followerAfterTeamSave.model?.includes(ALT_LABEL), 'a follower shows the Team\'s new model', r.followerAfterTeamSave)
      r.pinnedAfterTeamSave = await focus('pinned')
      assert(r.pinnedAfterTeamSave.model?.includes(RETIRING_LABEL), 'the customized member keeps its own', r.pinnedAfterTeamSave)

      // The next messages use them.
      await backToConversation(page)
      const next = async (name, expected) => {
        await memberRow(name).click(); await settle(page, 1500)
        const count = (await launchesOf(r.members[name])).length
        await typeAndSend(page, `Next message for ${name}.`)
        await waitFor(`${name} resumed`, async () => (await launchesOf(r.members[name])).length > count, 90000, 1000)
        const models = (await launchesOf(r.members[name])).slice(count)
        assert(models.every((model) => model === expected), `${name}'s next message runs on ${expected}`, models)
        return models
      }
      r.followerResumed = await next('follower', ALT)
      r.pinnedResumed = await next('pinned', RETIRING)
      await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: r.teamRunId }).catch(() => {})
    } finally { await offerAgyModels([MODEL, ALT]) }
    return r
  })
}
