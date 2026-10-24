// Delegated copies restore from their own file (ticket delegated-copy-restore-from-own-file, autobyteus-197).
// Registered by delegated-launch-defaults-probe.mjs (same owned stack: real Chrome → Nuxt dev → built backend with the
// scripted AGY CLI, whose argv log shows the `--model` and `--conversation` of every launch; Grok replay; no credentials).
// Each case seeds its own definitions through GraphQL and drives the runs through the UI.
//
// Cases:
//   DCR-001 (AC-001..AC-004, Team root) A catalog copy in a Team run delegates to the configured member `/worker` (CM-1:
//           the root's own members cannot). The copy's own file holds the full snapshot with the `configured` launch
//           source and no `origin`; Settings shows "As configured in this run"; its sidebar name is the address basename
//           (D-7). The Team run is stopped and `/worker` is set to another model in Settings. The copy restores on its
//           started model and its own runtime conversation (not the slot's); a new delegation starts on the edited
//           model; the Team context of each copy (what its conversation and composer run with) holds its own model and
//           the slot's its edit, all named "worker"; the run view of the copy shows its own conversation.
//   DCR-002 (AC-001..AC-004, Org root) A direct agent `/writer` and a mounted Team `/pair` are delegated to (agent copy
//           and Team copy of configured placements). Own files, Settings rows. The Org is stopped, `/writer` and `/pair`
//           are set to another model; the copies restore on their started values (the agent copy on its own runtime
//           conversation); new delegations start on the edited slots.
//   DCR-003 (AC-011(a), AC-002) On the Org launch page a mounted Grok Team's lead gets its own auto-approve and keeps the
//           Team's model: its copy records `followsTeam: true` with that approval kept, and false for the member on its own
//           agent default. A Team-level model choice on a stopped copy of a mounted AGY Team reaches its following lead,
//           which resumes its own conversation on that model. (Antigravity locks auto-approve on, and the Grok replay
//           offers one model, hence the two Teams.)
// Run alone: pnpm -C autobyteus-web test:e2e:delegated-copy-own-file --output-dir <fresh dir>
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export function registerDelegatedCopyOwnFileCases(h) {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, callTool, objectsIn, pick,
    newChatFor, chooseModel, typeAndSend, callFromComposer, conversationText, openSidebarAgent, openTeamRun, openSettings,
    backToConversation, delegatedRows, rowsAt, openDrawer, closeDrawer, openMember, memberRow, saveSettings, saveBarText,
    agyLaunchDetailsOf, teamTree, teamRunIds, AGY, GROK, MODEL, ALT, GROK_MODEL, MODEL_LABEL, ALT_LABEL, env } = h

  // -------------------------------------------------------------------------------------------
  // Fixtures (GraphQL, the product's API) and readback
  const tag = () => randomUUID().slice(0, 4)
  const createAgent = async (name, defaultLaunchConfig = null) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Follow the request.', toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
  const createTeam = async (name, nodes, coordinator, defaultLaunchConfig = null) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Work together.', coordinatorMemberName: coordinator, handoffs: [],
    ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}),
    nodes: Object.entries(nodes).map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
  const createOrg = async (name, members, defaultLaunchConfig) => (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Plan.', handoffs: [], members, defaultLaunchConfig } })).createAgentOrgDefinition.id
  const segmentOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const orgConfigTree = async (orgRunId) => (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRunId })).getAgentOrgRunConfig.executionTree
  const orgRunIdFromUrl = (page) => {
    const params = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams
    return params.get('runId') ?? params.get('rootRunId') ?? params.get('orgRunId')
  }
  const memberProjection = async (teamRunId, agentRunId) => (await gql('query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){agentRunId conversation}}', { t: teamRunId, a: agentRunId })).getTeamMemberRunProjection
  /** A copy's record in a tree DTO, by run ID (copies carry `source`). */
  const recordOf = (tree, runId) => objectsIn(tree).find((r) => (pick(r, 'agentRunId') === runId || pick(r, 'teamRunId') === runId) && pick(r, 'source'))
  /** A configured placement (slot) by address: only the root's `members` tree is searched, never task executions. */
  const configuredAt = (tree, address) => {
    const root = pick(tree, 'rootOrg') ?? pick(tree, 'rootTeam') ?? tree
    const visit = (node) => {
      for (const member of node?.members ?? []) {
        if (member.address === address) return member
        const inner = visit(member)
        if (inner) return inner
      }
      return null
    }
    return visit(root)
  }
  const modelOf = (launch) => pick(launch, 'llmModelIdentifier')
  const delegatedId = (call) => /"target_agent_run_id":"([^"]+)"/.exec(call)?.[1] ?? /"target_team_run_id":"([^"]+)"/.exec(call)?.[1] ?? null
  const coordinatorRunIdOf = (call) => /"target_team_coordinator_agent_run_id":"([^"]+)"/.exec(call)?.[1] ?? null

  /** A copy's own file in the owned data root (`memory/agents/<id>/run_metadata.json`, `memory/agent_teams/<id>/team_run_execution_tree.json`). */
  const ownFile = async (runId, fileName) => {
    const { dataRoot } = env()
    const found = []
    const visit = async (dir, depth) => {
      if (depth > 6) return
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        if (!entry.isDirectory() || ['db', 'agy-project', '.agents', 'node_modules'].includes(entry.name)) continue
        const sub = path.join(dir, entry.name)
        if (entry.name === runId) {
          const file = path.join(sub, fileName)
          if (await fs.stat(file).then((s) => s.isFile()).catch(() => false)) found.push(file)
        }
        await visit(sub, depth + 1)
      }
    }
    await visit(dataRoot, 0)
    assert(found.length === 1, `own file ${fileName} of ${runId}`, found)
    return { path: path.relative(dataRoot, found[0]), json: JSON.parse(await fs.readFile(found[0], 'utf8')) }
  }
  const LAUNCH_KEYS = ['agentDefinitionId', 'runtimeKind', 'llmModelIdentifier', 'llmConfig', 'autoExecuteTools', 'workspaceRootPath']
  /** AC-002: an agent copy's own file holds its full started launch, the `configured` launch source and no `origin`. */
  const assertAgentOwnFile = (file, { address, model }, label) => {
    const j = file.json
    const missing = LAUNCH_KEYS.filter((k) => !(k in j))
    assert(missing.length === 0 && j.runtimeKind === AGY && j.llmModelIdentifier === model && typeof j.autoExecuteTools === 'boolean', `${label}: own file holds the full started launch`, { missing, file })
    assert(j.taskAgent?.address === address && j.taskAgent?.launchSource?.origin === 'configured', `${label}: own file records the configured launch source`, file)
    assert(!('origin' in j.taskAgent), `${label}: own file has no taskAgent.origin`, file)
  }
  /** The runtime session a Team copy's member recorded (its own tree, by member run ID). */
  const leadSession = (teamRunId, agentRunId) => waitFor('Team copy member session recorded', async () => {
    const tree = (await ownFile(teamRunId, 'team_run_execution_tree.json')).json
    return objectsIn(tree).find((x) => x.agentRunId === agentRunId && x.platformAgentRunId)?.platformAgentRunId ?? null
  }, 60000, 1000)
  /** The scripted AGY launches of one run: `[--model, --conversation]` (a fresh launch has no conversation). */
  const launches = async (runId) => (await agyLaunchDetailsOf(runId))
  const waitLaunches = (label, runId, count) => waitFor(label, async () => { const l = await launches(runId); return l.length >= count ? l : null }, 90000, 1000)

  // Settings helpers
  const rowKey = (address, runId) => `${address}@${runId}`
  const delegatedRow = (page, key) => page.locator(sel('run-delegated-launches')).locator(sel(`run-member-${key}`)).first()
  /** Any model menu (runtime locked or not): search the model and pick it. */
  const chooseAnyModel = async (page, scope, model) => {
    await scope.locator(sel('chat-model-trigger')).first().click()
    const menu = page.locator(sel('chat-model-menu')).first(); await menu.waitFor()
    await menu.locator(sel('chat-model-search')).first().fill(model)
    const option = page.locator(sel(`chat-model-search-option-${model}`)).first()
    await option.waitFor({ timeout: 60000 }); await option.click()
    await page.keyboard.press('Escape').catch(() => {}); await delay(400)
  }
  const settingsView = async (page) => {
    const view = page.locator(sel('existing-run-settings'))
    return await view.isVisible().catch(() => false) ? view : openSettings(page)
  }
  const stopRootFromSettings = async (page) => {
    const view = await settingsView(page)
    await view.locator(sel('existing-run-stop')).click()
    await waitFor('root stopped', async () => await page.locator(sel('existing-run-settings')).getAttribute('data-state') === 'stopped', 120000, 1000)
    await settle(page, 1500)
  }
  const saved = (page) => waitFor('saved', async () => /^\s*Saved\./.test(await saveBarText(page)), 60000, 1000)
  const summaryOf = async (row) => (await row.locator(sel('run-member-summary')).first().innerText()).replace(/\s+/g, ' ').trim()
  /** The app's own context of one agent (Pinia, as the conversation and composer read it): its model and name. */
  const contextFacts = (ctx) => ctx ? { model: ctx.config?.llmModelIdentifier ?? null, conversationModel: ctx.state?.conversation?.llmModelIdentifier ?? null,
    name: ctx.state?.conversation?.agentName ?? null } : null
  const teamContext = (page, teamRunId, agentRunId) => page.evaluate(([t, a]) => {
    const stores = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s
    const ctx = stores.get('agentTeamContexts')?.teams.get(t)?.view.getAgentContext(a)
    return ctx ? { config: { llmModelIdentifier: ctx.config.llmModelIdentifier }, state: { conversation: { llmModelIdentifier: ctx.state.conversation.llmModelIdentifier, agentName: ctx.state.conversation.agentName } } } : null
  }, [teamRunId, agentRunId]).then(contextFacts)
  const orgContext = (page, orgRunId, agentRunId) => page.evaluate(([o, a]) => {
    const stores = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s
    const ctx = stores.get('agentOrgContexts')?.contextFor(o)?.getAgentContext(a)
    return ctx ? { config: { llmModelIdentifier: ctx.config.llmModelIdentifier }, state: { conversation: { llmModelIdentifier: ctx.state.conversation.llmModelIdentifier, agentName: ctx.state.conversation.agentName } } } : null
  }, [orgRunId, agentRunId]).then(contextFacts)
  const CONFIGURED_LABEL = 'As configured in this run'
  const configuredRows = (rows, address) => rowsAt(rows, address).filter((r) => !r.member && r.source === 'configured' && r.launch.includes(CONFIGURED_LABEL))

  // -------------------------------------------------------------------------------------------
  defineCase('DCR-001', 'AC-001..AC-004 (Team root): a copy of the configured member /worker records its own snapshot; after /worker is edited in the stopped run, it restores on its started model and own conversation, and a new copy starts on the edit', async (page) => {
    const r = {}
    const t = tag()
    r.names = { team: `Slot Team ${t}`, writer: `Scribe ${t}` }
    const managerId = await createAgent(`Slot Manager ${t}`)
    const workerId = await createAgent(`Slot Worker ${t}`)
    const writerId = await createAgent(r.names.writer, { runtimeKind: AGY, llmModelIdentifier: ALT })
    r.teamDefinitionId = await createTeam(r.names.team, { manager: managerId, worker: workerId }, 'manager')
    const writerAddress = `/${segmentOf(r.names.writer)}`

    // A Team run on MODEL; the coordinator delegates a catalog copy W of the Scribe.
    await newChatFor(page, '/agent-teams', r.names.team)
    await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
    const before = new Set(await teamRunIds(r.teamDefinitionId))
    await typeAndSend(page, callTool('delegate_task', { recipient_address: writerAddress, description: 'Scribe work DCR-001.' }))
    await page.waitForURL(/\/workspace/, { timeout: 180000 })
    r.teamRunId = await waitFor('new team run', async () => (await teamRunIds(r.teamDefinitionId)).find((id) => !before.has(id)), 60000)
    const w = await waitFor('catalog copy W', async () => objectsIn(await teamTree(r.teamRunId)).find((x) => x.address === writerAddress && pick(x, 'agentRunId') && pick(x, 'source')), 120000, 1500)
    r.writerCopy = pick(w, 'agentRunId')
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    await page.locator(sel(`workspace-team-member-${r.teamRunId}-/manager`)).click(); await settle(page, 1500)
    // The slot works too: it gets its own runtime conversation.
    r.slotCall = await callFromComposer(page, 'manager → /worker', 'send_message_to', { recipient_address: '/worker', content: 'Slot work SLOT-MARKER-DCR1.' })
    assert(r.slotCall.includes('"accepted":true'), 'message to the configured worker not accepted', r.slotCall)
    const slotTree = await teamTree(r.teamRunId)
    r.slotRunId = pick(configuredAt(slotTree, '/worker'), 'agentRunId')
    await waitLaunches('slot started', r.slotRunId, 1)

    // From W: delegate to the configured member /worker → copy C1 (CM-1 lets a copy do it).
    await openSidebarAgent(page, r.writerCopy)
    r.c1Call = await callFromComposer(page, 'W → delegate /worker', 'delegate_task', { recipient_address: '/worker', description: 'Copy work COPY1-MARKER-DCR1.' })
    r.c1 = delegatedId(r.c1Call)
    assert(r.c1Call.includes('"delegated":true') && r.c1, 'copy of /worker not delegated', r.c1Call)
    r.c1Launches = await waitLaunches('C1 started', r.c1, 1)
    assert(r.c1Launches[0][0] === MODEL, 'C1 did not start on the slot\'s model', r.c1Launches)

    // AC-002: the own file and the tree record.
    r.c1OwnFile = await waitFor('C1 own file with a session', async () => { const f = await ownFile(r.c1, 'run_metadata.json'); return f.json.platformAgentRunId ? f : null }, 60000, 1000)
    assertAgentOwnFile(r.c1OwnFile, { address: '/worker', model: MODEL }, 'C1')
    const c1Record = recordOf(await teamTree(r.teamRunId), r.c1)
    r.c1RecordSource = pick(c1Record, 'source')
    assert(modelOf(pick(r.c1RecordSource, 'launchConfiguration')) === MODEL && pick(pick(r.c1RecordSource, 'launchSource'), 'origin') === 'configured', 'C1 tree record source', c1Record)
    r.slotSession = pick(configuredAt(await teamTree(r.teamRunId), '/worker'), 'platformAgentRunId')
    r.c1Session = r.c1OwnFile.json.platformAgentRunId
    assert(r.slotSession && r.c1Session && r.slotSession !== r.c1Session, 'slot and copy should have their own sessions', { slot: r.slotSession, c1: r.c1Session })

    // AC-004: Settings row and the sidebar name (D-7: the copy keeps the address basename; W reads as a spaced name).
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    // The row's display name (the span after the avatar initials).
    r.sidebar = await page.locator(`${sel('workspace-team-transient-execution-row')}[data-agent-run-id]`).evaluateAll((els) => els.map((el) => ({
      id: el.dataset.agentRunId, name: el.querySelector('span.block.truncate')?.textContent?.trim() ?? null, text: el.innerText.replace(/\s+/g, ' ').trim() })))
    const c1Side = r.sidebar.find((x) => x.id === r.c1)
    const wSide = r.sidebar.find((x) => x.id === r.writerCopy)
    assert(c1Side?.name === 'worker' && wSide?.name === `scribe ${t}`, 'sidebar names: the copy of /worker reads "worker", the catalog copy a spaced name', r.sidebar)
    await settingsView(page)
    r.rowsRunning = await delegatedRows(page)
    assert(configuredRows(r.rowsRunning, '/worker').length === 1 && configuredRows(r.rowsRunning, '/worker')[0].launch.includes(MODEL_LABEL), 'Settings: C1 row reads "As configured in this run" on the started model', r.rowsRunning)
    await shot(page, 'DCR-001-settings-configured-copy-running-1280', 1280)

    // SCN-003: stop the Team run and set /worker to ALT in its Settings.
    await stopRootFromSettings(page)
    const workerRow = await openMember(page.locator(sel('existing-run-settings')), '/worker')
    await chooseAnyModel(page, workerRow, ALT)
    await saveSettings(page); await saved(page)
    const editedTree = await teamTree(r.teamRunId)
    r.slotAfterEdit = modelOf(pick(configuredAt(editedTree, '/worker'), 'launchConfiguration'))
    r.c1AfterEdit = modelOf(pick(pick(recordOf(editedTree, r.c1), 'source'), 'launchConfiguration'))
    assert(r.slotAfterEdit === ALT && r.c1AfterEdit === MODEL, 'slot edited; C1 keeps its snapshot', r)
    r.rowsStopped = await delegatedRows(page)
    r.workerSlotSummary = await summaryOf(memberRow(page.locator(sel('existing-run-settings')), '/worker'))
    assert(r.workerSlotSummary.includes(ALT_LABEL) && configuredRows(r.rowsStopped, '/worker')[0]?.launch.includes(MODEL_LABEL), 'Settings after the edit: slot on ALT, C1 still on its started model', { slot: r.workerSlotSummary, rows: r.rowsStopped })
    await shot(page, 'DCR-001-settings-stopped-slot-edited-1280', 1280)

    // AC-001: restore C1 (the next message reopens the run) → its started model and its own conversation.
    await backToConversation(page)
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    await page.locator(sel(`workspace-team-member-${r.teamRunId}-/manager`)).click(); await settle(page, 1500)
    const c1From = (await launches(r.c1)).length
    r.resumeCall = await callFromComposer(page, 'manager → C1 by run id', 'send_message_to', { target_agent_run_id: r.c1, content: 'Continue COPY1-RESUME-DCR1.' })
    assert(r.resumeCall.includes('"accepted":true'), 'message to the stopped copy not accepted', r.resumeCall)
    await waitLaunches('C1 restored', r.c1, c1From + 1)
    r.c1Resumed = (await launches(r.c1)).slice(c1From)
    assert(r.c1Resumed.every(([model, conversation]) => model === MODEL && conversation === r.c1Session), 'C1 must restore on its started model and its own conversation', { resumed: r.c1Resumed, c1Session: r.c1Session, slotSession: r.slotSession })

    // AC-003: a new delegation to /worker (from W, which restores on its own Scribe value) starts on the edited model.
    await openSidebarAgent(page, r.writerCopy)
    r.c2Call = await callFromComposer(page, 'W → delegate /worker again', 'delegate_task', { recipient_address: '/worker', description: 'Copy work COPY2-MARKER-DCR1.' })
    r.c2 = delegatedId(r.c2Call)
    assert(r.c2Call.includes('"delegated":true') && r.c2 && r.c2 !== r.c1, 'second copy of /worker not delegated', r.c2Call)
    r.c2Launches = await waitLaunches('C2 started', r.c2, 1)
    assert(r.c2Launches[0][0] === ALT, 'C2 should start on the edited slot model', r.c2Launches)
    r.c2OwnFile = await ownFile(r.c2, 'run_metadata.json')
    assertAgentOwnFile(r.c2OwnFile, { address: '/worker', model: ALT }, 'C2')

    // AC-004: the Team context of each agent (what its conversation runs with), Settings rows, the run view.
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    await openSidebarAgent(page, r.c1)
    await openSidebarAgent(page, r.c2)
    r.contexts = { c1: await teamContext(page, r.teamRunId, r.c1), c2: await teamContext(page, r.teamRunId, r.c2), slot: await teamContext(page, r.teamRunId, r.slotRunId) }
    assert(r.contexts.c1?.model === MODEL && r.contexts.c2?.model === ALT && r.contexts.slot?.model === ALT
      && [r.contexts.c1, r.contexts.c2, r.contexts.slot].every((c) => c.name === 'worker'), 'Team contexts: each copy on its own model, the slot on its edit; all named "worker"', r.contexts)
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    await settingsView(page)
    r.rowsFinal = await delegatedRows(page)
    const finalRows = configuredRows(r.rowsFinal, '/worker')
    assert(finalRows.length === 2 && finalRows.some((x) => x.launch.includes(MODEL_LABEL)) && finalRows.some((x) => x.launch.includes(ALT_LABEL)), 'Settings: one row per copy, each on its own model, both "As configured in this run"', r.rowsFinal)
    await shot(page, 'DCR-001-settings-two-copies-1280', 1280)
    await page.locator(sel('run-delegated-launches')).screenshot({ path: path.join(env().outDir, 'DCR-001-delegated-rows.png') }).catch(() => {})
    const c1View = JSON.stringify(await memberProjection(r.teamRunId, r.c1))
    const slotView = JSON.stringify(await memberProjection(r.teamRunId, r.slotRunId))
    r.runView = { c1HasOwn: c1View.includes('COPY1-MARKER-DCR1') && c1View.includes('COPY1-RESUME-DCR1'), c1HasSlot: c1View.includes('SLOT-MARKER-DCR1'), slotHasOwn: slotView.includes('SLOT-MARKER-DCR1') }
    assert(r.runView.c1HasOwn && !r.runView.c1HasSlot && r.runView.slotHasOwn, 'run view: the copy shows its own conversation', r.runView)
    await backToConversation(page)
    return r
  })

  // -------------------------------------------------------------------------------------------
  /** Org: manager, writer (ALT default), pair (mounted Team: lead + Grok engineer, Team default ALT); Org default MODEL. */
  const seedOrg = async (t) => {
    const n = { org: `Slot Org ${t}`, pair: `Slot Pair ${t}` }
    const manager = await createAgent(`Org Manager ${t}`)
    const writer = await createAgent(`Org Writer ${t}`, { runtimeKind: AGY, llmModelIdentifier: ALT })
    const lead = await createAgent(`Pair Lead ${t}`)
    const engineer = await createAgent(`Pair Engineer ${t}`, { runtimeKind: GROK, llmModelIdentifier: GROK_MODEL })
    const pair = await createTeam(n.pair, { lead, engineer }, 'lead', { runtimeKind: AGY, llmModelIdentifier: ALT })
    n.orgId = await createOrg(n.org, [
      { memberName: 'manager', ref: manager, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'writer', ref: writer, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'pair', ref: pair, refType: 'AGENT_TEAM', refScope: 'SHARED' },
    ], { runtimeKind: AGY, llmModelIdentifier: MODEL })
    return n
  }
  const launchOrg = async (page, n, beforeRun = async () => {}) => {
    await page.goto(`${env().frontUrl}/agent-orgs`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
    await page.locator(sel(`org-card-${n.orgId}`)).getByRole('button', { name: 'Run', exact: true }).click()
    await page.locator(sel('org-launch-page')).waitFor({ timeout: 120000 }); await settle(page, 2500)
    await beforeRun()
    await page.locator(sel('org-launch-run')).click()
    await page.waitForURL(/mode=active/, { timeout: 180000 }); await settle(page, 2500)
    return orgRunIdFromUrl(page)
  }
  const selectOrgManager = async (page) => {
    await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /manager/i }).first().click(); await settle(page, 2000)
  }

  defineCase('DCR-002', 'AC-001..AC-004 (Org root): copies of the direct agent /writer and the mounted Team /pair record their snapshots; after both slots are edited in the stopped Org, the copies restore on their started values and new copies start on the edits', async (page) => {
    const r = {}
    const n = await seedOrg(tag())
    r.orgRunId = await launchOrg(page, n)
    await selectOrgManager(page)
    r.slotCall = await callFromComposer(page, 'manager → /writer', 'send_message_to', { recipient_address: '/writer', content: 'Slot work SLOT-MARKER-DCR2.' })
    assert(r.slotCall.includes('"accepted":true'), 'message to the configured writer not accepted', r.slotCall)
    r.slotWriter = pick(configuredAt(await orgConfigTree(r.orgRunId), '/writer'), 'agentRunId')
    await waitLaunches('writer slot started', r.slotWriter, 1)

    r.cwCall = await callFromComposer(page, 'manager → delegate /writer', 'delegate_task', { recipient_address: '/writer', description: 'Writer copy work CW-MARKER-DCR2.' })
    r.cw = delegatedId(r.cwCall)
    assert(r.cwCall.includes('"delegated":true') && r.cw, 'copy of /writer not delegated', r.cwCall)
    r.cpCall = await callFromComposer(page, 'manager → delegate /pair', 'delegate_task', { recipient_address: '/pair', description: 'Pair copy work CP-MARKER-DCR2.' })
    r.cp = delegatedId(r.cpCall); r.cpLead = coordinatorRunIdOf(r.cpCall)
    assert(r.cpCall.includes('"delegated":true') && r.cp, 'copy of /pair not delegated', r.cpCall)
    r.cwLaunches = await waitLaunches('CW started', r.cw, 1)
    assert(r.cwLaunches[0][0] === ALT, 'CW should start on the writer slot (ALT)', r.cwLaunches)

    // AC-002: own files.
    r.cwOwnFile = await waitFor('CW own file with a session', async () => { const f = await ownFile(r.cw, 'run_metadata.json'); return f.json.platformAgentRunId ? f : null }, 60000, 1000)
    assertAgentOwnFile(r.cwOwnFile, { address: '/writer', model: ALT }, 'CW')
    r.cpOwnFile = await ownFile(r.cp, 'team_run_execution_tree.json')
    const cpTree = r.cpOwnFile.json
    r.cpLead = r.cpLead ?? objectsIn(cpTree).find((x) => x.address === '/pair/lead' && pick(x, 'agentRunId'))?.agentRunId
    r.cpLeadLaunches = await waitLaunches('CP lead started', r.cpLead, 1)
    assert(r.cpLeadLaunches[0][0] === ALT, 'CP lead should start on the Team slot (ALT)', r.cpLeadLaunches)
    r.cpLeadSession = await leadSession(r.cp, r.cpLead)
    const cpMembers = objectsIn(cpTree).filter((x) => typeof x.address === 'string' && x.address.startsWith('/pair/') && 'followsTeam' in x)
    r.cpMemberFacts = cpMembers.map((m) => ({ address: m.address, model: modelOf(m.launchConfiguration), followsTeam: m.followsTeam, keys: Object.keys(m.launchConfiguration ?? {}).sort() }))
    assert(cpMembers.length === 2 && cpMembers.every((m) => m.launchConfiguration && typeof m.followsTeam === 'boolean'), 'CP own tree: every member has its launch and followsTeam', { cpMemberFacts: r.cpMemberFacts, cpTree })
    assert(cpTree.taskAgent && !('origin' in cpTree.taskAgent) && cpTree.taskAgent.launchSource?.origin === 'configured', 'CP own tree: configured launch source, no taskAgent.origin', cpTree.taskAgent)
    r.cpOwnTreeExcerpt = { path: r.cpOwnFile.path, taskAgent: cpTree.taskAgent, members: r.cpMemberFacts, handoffs: objectsIn(cpTree).find((x) => Array.isArray(x.handoffs))?.handoffs ?? null }

    // AC-004: Settings rows.
    await settingsView(page)
    r.rowsRunning = await delegatedRows(page)
    assert(configuredRows(r.rowsRunning, '/writer').length === 1 && configuredRows(r.rowsRunning, '/pair').length === 1, 'Settings: CW and CP read "As configured in this run"', r.rowsRunning)
    await shot(page, 'DCR-002-org-settings-configured-copies-1280', 1280)

    // SCN-003: stop the Org; set /writer and the /pair Team to MODEL.
    await stopRootFromSettings(page)
    const view = page.locator(sel('existing-run-settings'))
    await chooseAnyModel(page, await openMember(view, '/writer'), MODEL)
    await chooseAnyModel(page, await openMember(view, '/pair'), MODEL)
    await saveSettings(page); await saved(page)
    const edited = await orgConfigTree(r.orgRunId)
    r.slotsAfterEdit = { writer: modelOf(pick(configuredAt(edited, '/writer'), 'launchConfiguration')), pair: modelOf(pick(configuredAt(edited, '/pair'), 'defaultLaunchConfiguration')),
      pairLead: modelOf(pick(configuredAt(edited, '/pair/lead'), 'launchConfiguration')) }
    r.copiesAfterEdit = { cw: modelOf(pick(pick(recordOf(edited, r.cw), 'source'), 'launchConfiguration')), cp: modelOf(pick(pick(recordOf(edited, r.cp), 'source'), 'defaultLaunchConfiguration')) }
    assert(r.slotsAfterEdit.writer === MODEL && r.slotsAfterEdit.pair === MODEL && r.copiesAfterEdit.cw === ALT && r.copiesAfterEdit.cp === ALT, 'slots edited; copies keep their snapshots', r)
    r.rowsStopped = await delegatedRows(page)
    assert(configuredRows(r.rowsStopped, '/writer')[0]?.launch.includes(ALT_LABEL) && configuredRows(r.rowsStopped, '/pair')[0]?.launch.includes(ALT_LABEL), 'Settings after the edit: copies still on ALT', r.rowsStopped)
    await shot(page, 'DCR-002-org-settings-stopped-slots-edited-1280', 1280)

    // AC-001: restore by run ID from the manager.
    await backToConversation(page)
    await selectOrgManager(page)
    const cwFrom = (await launches(r.cw)).length
    const leadFrom = (await launches(r.cpLead)).length
    r.cwResumeCall = await callFromComposer(page, 'manager → CW by run id', 'send_message_to', { target_agent_run_id: r.cw, content: 'Continue CW-RESUME-DCR2.' })
    assert(r.cwResumeCall.includes('"accepted":true'), 'message to CW not accepted', r.cwResumeCall)
    r.cpResumeCall = await callFromComposer(page, 'manager → CP lead by run id', 'send_message_to', { target_agent_run_id: r.cpLead, content: 'Continue CP-RESUME-DCR2.' })
    assert(r.cpResumeCall.includes('"accepted":true'), 'message to CP lead not accepted', r.cpResumeCall)
    await waitLaunches('CW restored', r.cw, cwFrom + 1)
    await waitLaunches('CP lead restored', r.cpLead, leadFrom + 1)
    r.cwResumed = (await launches(r.cw)).slice(cwFrom)
    r.cpLeadResumed = (await launches(r.cpLead)).slice(leadFrom)
    r.writerSlotSession = pick(configuredAt(await orgConfigTree(r.orgRunId), '/writer'), 'platformAgentRunId')
    assert(r.cwResumed.every(([model, conversation]) => model === ALT && conversation === r.cwOwnFile.json.platformAgentRunId) && r.writerSlotSession !== r.cwOwnFile.json.platformAgentRunId,
      'CW must restore on ALT and its own conversation', { resumed: r.cwResumed, own: r.cwOwnFile.json.platformAgentRunId, slot: r.writerSlotSession })
    assert(r.cpLeadResumed.every(([model, conversation]) => model === ALT && conversation === r.cpLeadSession), 'CP lead must restore on ALT and its own conversation', { resumed: r.cpLeadResumed, own: r.cpLeadSession })

    // AC-003: new copies start from the edited slots.
    r.cw2Call = await callFromComposer(page, 'manager → delegate /writer again', 'delegate_task', { recipient_address: '/writer', description: 'Writer copy work CW2-MARKER-DCR2.' })
    r.cw2 = delegatedId(r.cw2Call)
    r.cp2Call = await callFromComposer(page, 'manager → delegate /pair again', 'delegate_task', { recipient_address: '/pair', description: 'Pair copy work CP2-MARKER-DCR2.' })
    r.cp2 = delegatedId(r.cp2Call)
    assert(r.cw2 && r.cp2 && r.cw2 !== r.cw && r.cp2 !== r.cp, 'second copies not delegated', { cw2: r.cw2Call, cp2: r.cp2Call })
    r.cw2Launches = await waitLaunches('CW2 started', r.cw2, 1)
    assert(r.cw2Launches[0][0] === MODEL, 'CW2 should start on the edited writer slot', r.cw2Launches)
    assertAgentOwnFile(await ownFile(r.cw2, 'run_metadata.json'), { address: '/writer', model: MODEL }, 'CW2')
    const cp2Tree = (await ownFile(r.cp2, 'team_run_execution_tree.json')).json
    r.cp2Facts = { default: modelOf(objectsIn(cp2Tree).find((x) => x.defaultLaunchConfiguration)?.defaultLaunchConfiguration),
      lead: objectsIn(cp2Tree).filter((x) => x.address === '/pair/lead' && x.launchConfiguration).map((x) => ({ model: modelOf(x.launchConfiguration), followsTeam: x.followsTeam })) }
    r.cp2Lead = coordinatorRunIdOf(r.cp2Call) ?? objectsIn(cp2Tree).find((x) => x.address === '/pair/lead' && pick(x, 'agentRunId'))?.agentRunId
    r.cp2LeadLaunches = await waitLaunches('CP2 lead started', r.cp2Lead, 1)
    assert(r.cp2Facts.default === MODEL && r.cp2Facts.lead[0]?.model === r.slotsAfterEdit.pairLead && r.cp2LeadLaunches[0][0] === r.slotsAfterEdit.pairLead, 'CP2 should start from the edited Team slot', r)

    await settingsView(page)
    r.rowsFinal = await delegatedRows(page)
    const writerRows = configuredRows(r.rowsFinal, '/writer')
    const pairRows = configuredRows(r.rowsFinal, '/pair')
    assert(writerRows.length === 2 && writerRows.some((x) => x.launch.includes(ALT_LABEL)) && writerRows.some((x) => x.launch.includes(MODEL_LABEL))
      && pairRows.length === 2 && pairRows.some((x) => x.launch.includes(ALT_LABEL)) && pairRows.some((x) => x.launch.includes(MODEL_LABEL)), 'Settings: each copy on its own values, all "As configured in this run"', r.rowsFinal)
    await shot(page, 'DCR-002-org-settings-four-copies-1280', 1280)
    await backToConversation(page)
    // AC-004: the Org context of each agent copy (opened from its sidebar row) and of the slot.
    for (const id of [r.cw, r.cw2]) {
      const row = page.locator(sel(`agent-org-task-agent-row-${id}`)).first()
      await waitFor(`Org sidebar row ${id}`, async () => row.isVisible().catch(() => false), 60000, 1000)
      await row.click(); await settle(page, 1500)
    }
    r.contexts = { cw: await orgContext(page, r.orgRunId, r.cw), cw2: await orgContext(page, r.orgRunId, r.cw2), slot: await orgContext(page, r.orgRunId, r.slotWriter) }
    assert(r.contexts.cw?.model === ALT && r.contexts.cw2?.model === MODEL && r.contexts.slot?.model === MODEL
      && r.contexts.cw.name === r.contexts.slot.name && r.contexts.cw2.name === r.contexts.slot.name, 'Org contexts: each copy on its own model, the slot on its edit; names as the slot\'s', r.contexts)
    return r
  })

  defineCase('DCR-003', 'AC-011(a): a mounted Team member with its own auto-approve but the Team\'s model is recorded as following the Team in its copy (Grok); a Team-level model choice on a stopped configured-place Team copy reaches its following lead (AGY)', async (page) => {
    const r = {}
    const t = tag()
    // Two mounted Teams: `gpair` (Grok Team default; its lead gets its own auto-approve) and `pair` (AGY, Team default ALT).
    // Antigravity always runs with auto-approve (its toggle is locked), so the own auto-approve needs a runtime that offers
    // the toggle (Grok); the Grok replay offers one model, so the Team-level model choice is observed on the AGY Team.
    // Restore decides following only from the recorded `followsTeam` (D-5), so (1) + (2) cover AC-011(a).
    const manager = await createAgent(`Org3 Manager ${t}`)
    const lead = await createAgent(`Org3 Lead ${t}`)
    const engineer = await createAgent(`Org3 Engineer ${t}`, { runtimeKind: GROK, llmModelIdentifier: GROK_MODEL })
    const helper = await createAgent(`Org3 Helper ${t}`, { runtimeKind: AGY, llmModelIdentifier: ALT })
    const pair = await createTeam(`Org3 Pair ${t}`, { lead, engineer }, 'lead', { runtimeKind: AGY, llmModelIdentifier: ALT })
    const gpair = await createTeam(`Org3 Grok Pair ${t}`, { lead, helper }, 'lead', { runtimeKind: GROK, llmModelIdentifier: GROK_MODEL })
    const n = { orgId: await createOrg(`Slot Org3 ${t}`, [
      { memberName: 'manager', ref: manager, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'pair', ref: pair, refType: 'AGENT_TEAM', refScope: 'SHARED' },
      { memberName: 'gpair', ref: gpair, refType: 'AGENT_TEAM', refScope: 'SHARED' },
    ], { runtimeKind: AGY, llmModelIdentifier: MODEL }) }
    r.orgRunId = await launchOrg(page, n, async () => {
      const drawer = await openDrawer(page)
      for (const team of ['/pair', '/gpair']) {
        const toggle = memberRow(drawer, team).locator(sel('run-member-toggle')).first()
        if (await toggle.getAttribute('aria-expanded') !== 'true') { await toggle.click(); await delay(600) }
      }
      const grokLead = await openMember(drawer, '/gpair/lead')
      const approval = grokLead.locator(sel('chat-approval-toggle')).first()
      r.grokLeadApprovalBefore = await approval.getAttribute('aria-pressed')
      await approval.click(); await delay(400)
      r.grokLeadApprovalAfter = await approval.getAttribute('aria-pressed')
      r.drawer = { grokLead: await summaryOf(memberRow(drawer, '/gpair/lead')), agyLead: await summaryOf(memberRow(drawer, '/pair/lead')) }
      await shot(page, 'DCR-003-org-launch-member-overrides-1280', 1280)
      await closeDrawer(drawer)
    })
    const config = await orgConfigTree(r.orgRunId)
    const launchAt = (address, key = 'launchConfiguration') => {
      const l = pick(configuredAt(config, address), key)
      return { runtime: pick(l, 'runtimeKind'), model: modelOf(l), auto: pick(l, 'autoExecuteTools'), workspace: pick(l, 'workspaceRootPath') }
    }
    r.slots = { gpair: launchAt('/gpair', 'defaultLaunchConfiguration'), gpairLead: launchAt('/gpair/lead'), pair: launchAt('/pair', 'defaultLaunchConfiguration'), pairLead: launchAt('/pair/lead') }
    assert(r.slots.gpairLead.runtime === GROK && r.slots.gpairLead.model === r.slots.gpair.model && r.slots.gpairLead.auto !== r.slots.gpair.auto,
      'slot: the Grok lead has its own auto-approve and the Team\'s model', r.slots)
    assert(r.slots.pairLead.model === r.slots.pair.model, 'slot: the AGY lead runs on the Team\'s model', r.slots)

    await selectOrgManager(page)
    const factsOf = async (teamRunId) => Object.fromEntries(objectsIn((await ownFile(teamRunId, 'team_run_execution_tree.json')).json)
      .filter((x) => typeof x.address === 'string' && 'followsTeam' in x)
      .map((m) => [m.address, { runtime: m.launchConfiguration.runtimeKind, model: modelOf(m.launchConfiguration), auto: m.launchConfiguration.autoExecuteTools,
        workspace: m.launchConfiguration.workspaceRootPath, followsTeam: m.followsTeam }]))
    // (a) with auto-approve: the Grok Team copy.
    r.gcpCall = await callFromComposer(page, 'manager → delegate /gpair', 'delegate_task', { recipient_address: '/gpair', description: 'Grok pair copy work GCP-MARKER-DCR3.' })
    r.gcp = delegatedId(r.gcpCall)
    assert(r.gcpCall.includes('"delegated":true') && r.gcp, 'copy of /gpair not delegated', r.gcpCall)
    r.gcpFacts = await factsOf(r.gcp)
    assert(r.gcpFacts['/gpair/lead']?.followsTeam === true && r.gcpFacts['/gpair/lead'].auto === r.slots.gpairLead.auto && r.gcpFacts['/gpair/lead'].model === r.slots.gpair.model
      && r.gcpFacts['/gpair/helper']?.followsTeam === false, 'Grok copy: the lead with its own auto-approve follows the Team (its approval kept); the AGY helper does not', r.gcpFacts)
    // (a) the Team-level choice reaching such a member: the AGY Team copy.
    r.cpCall = await callFromComposer(page, 'manager → delegate /pair', 'delegate_task', { recipient_address: '/pair', description: 'Pair copy work CP-MARKER-DCR3.' })
    r.cp = delegatedId(r.cpCall); r.cpLead = coordinatorRunIdOf(r.cpCall)
    assert(r.cpCall.includes('"delegated":true') && r.cp && r.cpLead, 'copy of /pair not delegated', r.cpCall)
    r.cpFacts = await factsOf(r.cp)
    assert(r.cpFacts['/pair/lead']?.followsTeam === true && r.cpFacts['/pair/engineer']?.followsTeam === false,
      'AGY copy: the lead (Team model) follows the Team; the Grok engineer (own default) does not', r.cpFacts)
    r.leadFirst = await waitLaunches('CP lead started', r.cpLead, 1)
    assert(r.leadFirst[0][0] === ALT, 'CP lead should start on the Team model', r.leadFirst)
    r.leadSession = await leadSession(r.cp, r.cpLead)

    // A Team-level model choice on the stopped copy (Settings row: stop, choose, Save).
    await settingsView(page)
    const key = rowKey('/pair', r.cp)
    const row = () => delegatedRow(page, key)
    await waitFor('CP row stop icon', async () => row().locator(sel('run-member-stop')).first().isVisible().catch(() => false), 60000)
    await row().locator(sel('run-member-stop')).first().click()
    await openMember(page.locator(sel('run-delegated-launches')), key)
    await waitFor('CP stopped (model unlocked)', async () => (await row().locator(`${sel('run-setting-model')} ${sel('run-setting-locked')}`).count()) === 0, 60000, 1000)
    await chooseAnyModel(page, row(), MODEL)
    await saveSettings(page); await saved(page)
    r.cpRowAfter = await summaryOf(row())
    // A row on a user choice carries no source attribute; read the lead's own row by its key.
    r.leadRowAfter = await summaryOf(delegatedRow(page, rowKey('/pair/lead', r.cpLead)))
    r.engineerRowAfter = await summaryOf(delegatedRow(page, rowKey('/pair/engineer', objectsIn((await ownFile(r.cp, 'team_run_execution_tree.json')).json).find((x) => x.address === '/pair/engineer' && x.agentRunId)?.agentRunId)))
    assert(r.cpRowAfter.includes(MODEL_LABEL) && r.leadRowAfter.includes(MODEL_LABEL) && /grok/i.test(r.engineerRowAfter),
      'Settings: the Team choice reaches the following lead; the engineer keeps its own Grok launch', { team: r.cpRowAfter, lead: r.leadRowAfter, engineer: r.engineerRowAfter })
    await shot(page, 'DCR-003-copy-team-model-saved-1280', 1280)
    await backToConversation(page)
    await selectOrgManager(page)
    const from = (await launches(r.cpLead)).length
    r.resumeCall = await callFromComposer(page, 'manager → CP lead by run id', 'send_message_to', { target_agent_run_id: r.cpLead, content: 'Continue CP-RESUME-DCR3.' })
    assert(r.resumeCall.includes('"accepted":true'), 'message to the CP lead not accepted', r.resumeCall)
    await waitLaunches('CP lead resumed', r.cpLead, from + 1)
    r.leadResumed = (await launches(r.cpLead)).slice(from)
    assert(r.leadResumed.every(([model, conversation]) => model === MODEL && conversation === r.leadSession), 'the following lead of a configured-place Team copy takes the Team-level choice and resumes its own conversation', { resumed: r.leadResumed, own: r.leadSession })
    return r
  })
}
