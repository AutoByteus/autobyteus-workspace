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
import { delegatedNodes, readRunTree } from './fixtures/run-tree.mjs'

export function registerDelegatedCopyOwnFileCases(h) {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, callTool, objectsIn, pick,
    newChatFor, chooseModel, typeAndSend, callFromComposer, conversationText, openSidebarAgent, openTeamRun, openSettings,
    backToConversation, delegatedRows, rowsAt, openDrawer, closeDrawer, openMember, memberRow, saveSettings, saveBarText,
    focusedCard, groupRow, cardSummary,
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
    // autobyteus-461 E6: `address` and `launchSource` are the run's own fields, with `delegatedFrom`; no `taskAgent`.
    assert(j.address === address && j.launchSource?.origin === 'configured', `${label}: own file records the configured launch source`, file)
    assert(!('taskAgent' in j) && j.delegatedFrom?.delegatingRun, `${label}: own file names its delegating run, no taskAgent`, file)
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
  /**
   * A Team copy's member row in its Settings group view (autobyteus-461 TC-12, SR-084 step 2f): keyed by its own address in the
   * copy's own view, or by its tree row key (`team_member:<copy>:<agent>`); either names the same row.
   */
  const copyMemberRow = (page, teamRunId, address, runId) => page.locator(`[data-test="existing-run-settings"] [data-test="run-member-${address}"], `
    + `[data-test="existing-run-settings"] [data-test="run-member-team_member:${teamRunId}:${runId}"]`).first()
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
  /** A delegated run's own context (autobyteus-461 rule 2: a copy opened from its row is its own run, not an agent of its delegator's view). */
  const ownContext = (page, agentRunId) => page.evaluate((a) => {
    const stores = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s
    const ctx = stores.get('agentContexts')?.getRun(a)
    return ctx ? { config: { llmModelIdentifier: ctx.config.llmModelIdentifier }, state: { conversation: { llmModelIdentifier: ctx.state.conversation.llmModelIdentifier, agentName: ctx.state.conversation.agentName } } } : null
  }, agentRunId).then(contextFacts)
  /**
   * autobyteus-461 SR-091 (REQ-014): a delegated run has one name everywhere, its slot's (the last segment of its delegation
   * address), as at base. For a copy opened from its row: its row, its own context, its header, its Task card, its Settings
   * card and, when the run list lists it, its run-list name. `marker` is a word of its Task's description. A copy delegated by
   * a run that works on a Task is sub-work of that Task (a described delegation creates no Task of its own:
   * `TaskDelegation.prepareWork`), so it has no Task card and no Task view (`ownTask: false`).
   */
  const namesOf = async (page, agentRunId, marker, rowName) => {
    // The opened run's header: the Agent surface's title, or (a copy opened in a Team run's tree) the Team surface's member name.
    const header = await waitFor('copy header', async () => (await page.locator(`${sel('agent-workspace-title')}:visible, [data-testid="team-workspace-surface"] h4:visible`).first()
      .innerText({ timeout: 1000 }).catch(() => ''))?.trim() || null, 15000, 300).catch(() => null)
    const surfaceAtRead = await page.evaluate(() => ({ agentSurface: document.querySelectorAll('[data-testid="agent-workspace-surface"]').length, teamSurface: document.querySelectorAll('[data-testid="team-workspace-surface"]').length,
      titles: document.querySelectorAll('[data-test="agent-workspace-title"]').length, url: location.href }))
    if (!header) await shot(page, `names-${agentRunId.slice(-6)}-header-read`)
    const context = (await ownContext(page, agentRunId))?.name ?? null
    // The Task card, found as a user finds it: the board's search (a description match) leaves its one card.
    const search = page.locator('[data-testid="temp-tasks-search-input"]:visible, [data-testid="project-tasks-search-input"]:visible').first()
    let taskCard = null
    if (await search.isVisible().catch(() => false)) {
      await search.fill(marker); await settle(page, 800)
      const cards = (await page.locator('[data-testid="project-task-root-name"]:visible').allInnerTexts()).map((x) => x.trim())
      taskCard = cards.length === 1 ? cards[0] : cards.length ? `ambiguous: ${cards.join(', ')}` : null
      await search.fill(''); await settle(page, 300)
    }
    const view = await settingsView(page)
    const settings = await view.locator(sel('run-subject-name')).first().innerText().catch(() => null)
    await backToConversation(page)
    const history = (await gql('query{listWorkspaceRunHistory(limitPerAgent: 50){agentDefinitions{runs{runId displayName}}}}')).listWorkspaceRunHistory
    const listed = objectsIn(history).find((x) => x.runId === agentRunId)
    // The server's Task view (what the Task page and card read): the Task whose description carries the marker.
    const tasks = (await gql('query{tasksWithoutProject{taskId description root{displayName ingressAgentRunId}}}')).tasksWithoutProject ?? []
    const task = tasks.find((x) => x.description?.includes(marker))
    const names = { row: rowName, context, header: header?.trim() ?? null, taskCard, taskView: task ? (task.root?.displayName ?? null) : 'no Task', settings: settings?.trim() ?? null,
      runList: listed ? (listed.displayName ?? null) : 'not listed' }
    // When a page read is empty, what the page showed (for classification).
    names.surfaceAtRead = surfaceAtRead
    if (!names.header || !names.taskCard) names.page = await page.evaluate(() => ({ url: location.href,
      titles: [...document.querySelectorAll('[data-test="agent-workspace-title"]')].map((el) => ({ text: el.textContent?.trim(), visible: el.offsetParent !== null })),
      settingsOpen: Boolean(document.querySelector('[data-test="existing-run-settings"]')),
      boardSearch: [...document.querySelectorAll('[data-testid$="tasks-search-input"]')].map((el) => ({ id: el.getAttribute('data-testid'), visible: el.offsetParent !== null })),
      cards: [...document.querySelectorAll('[data-testid="project-task-root-name"]')].map((el) => el.textContent?.trim()) }))
    if (!names.taskCard) names.taskDescriptions = tasks.map((x) => x.description?.slice(0, 60))
    return names
  }
  const allNamed = (names, slot, ownTask = true) => names.row === slot && names.context === slot && (names.header === slot || names.header?.startsWith(`${slot} - `))
    && (ownTask ? names.taskCard === slot && names.taskView === slot : names.taskCard === null && names.taskView === 'no Task')
    && names.settings?.toLowerCase() === slot && (names.runList === 'not listed' || names.runList === slot)
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
    // autobyteus-461 SR-084: a delegated run is a row of its delegator's tree (the Team's own tree holds its members only).
    const delegatedOf = async (teamRunId) => delegatedNodes(await readRunTree(gql, 'team', teamRunId))
    const w = await waitFor('catalog copy W', async () => (await delegatedOf(r.teamRunId)).find((x) => x.address === writerAddress && x.agentRunId), 120000, 1500)
    r.writerCopy = w.agentRunId
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
    // Its row in the tree carries the launch it recorded (configuration and source).
    const c1Record = await waitFor('C1 in the tree', async () => (await delegatedOf(r.teamRunId)).find((x) => x.agentRunId === r.c1), 60000, 1000)
    r.c1RecordSource = c1Record.launch
    assert(r.c1RecordSource?.llmModelIdentifier === MODEL && r.c1RecordSource?.source?.origin === 'configured', 'C1 tree record source', c1Record)
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
    r.rowsRunning = await delegatedRows(page, { kind: 'team', id: r.teamRunId })
    assert(configuredRows(r.rowsRunning, '/worker').length === 1 && configuredRows(r.rowsRunning, '/worker')[0].launch.includes(MODEL_LABEL), 'Settings: C1 row reads "As configured in this run" on the started model', r.rowsRunning)
    await shot(page, 'DCR-001-settings-configured-copy-running-1280', 1280)

    // SCN-003: stop the Team run and set /worker to ALT in its Settings.
    await stopRootFromSettings(page)
    // autobyteus-461 REQ-001: the root's Stop leaves its working copy running; C1 is stopped by its own Stop, so the next
    // message restores it (rule 2: its own terminate).
    await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: r.c1 })
    // autobyteus-366: the slot /worker's own Settings (its member row focused in the tree).
    const workerCard = async () => {
      await page.locator(sel(`workspace-team-member-${r.teamRunId}-/worker`)).first().click(); await settle(page, 1500)
      if (!(await page.locator(sel('existing-run-settings')).isVisible().catch(() => false))) await openSettings(page)
      const card = page.locator(sel('existing-run-subject-card'))
      await card.waitFor({ timeout: 30000 })
      return card
    }
    await chooseAnyModel(page, await workerCard(), ALT)
    await saveSettings(page); await saved(page)
    const editedTree = await teamTree(r.teamRunId)
    r.slotAfterEdit = modelOf(pick(configuredAt(editedTree, '/worker'), 'launchConfiguration'))
    // The copy's row keeps the launch C1 recorded (its own run's), whatever the slot's edit.
    r.c1AfterEdit = (await delegatedOf(r.teamRunId)).find((x) => x.agentRunId === r.c1)?.launch?.llmModelIdentifier ?? null
    assert(r.slotAfterEdit === ALT && r.c1AfterEdit === MODEL, 'slot edited; C1 keeps its snapshot', r)
    r.workerSlotSummary = await cardSummary(await workerCard())
    r.rowsStopped = await delegatedRows(page, { kind: 'team', id: r.teamRunId })
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

    // AC-004: the context of each agent (what its conversation runs with: a copy's own, the slot's in its Team), Settings rows, the run view.
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    await openSidebarAgent(page, r.c1)
    await openSidebarAgent(page, r.c2)
    r.contexts = { c1: await ownContext(page, r.c1), c2: await ownContext(page, r.c2), slot: await teamContext(page, r.teamRunId, r.slotRunId) }
    assert(r.contexts.c1?.model === MODEL && r.contexts.c2?.model === ALT && r.contexts.slot?.model === ALT && r.contexts.slot.name === 'worker',
      'Team contexts: each copy on its own model; the slot on its edit, named "worker"', r.contexts)
    // SR-091: each copy of /worker is named "worker" everywhere: row, context, header, Task card, Settings, run list.
    const teamRows = await delegatedOf(r.teamRunId)
    r.slotNames = {}
    for (const [key, id, marker] of [['c1', r.c1, 'COPY1-MARKER-DCR1'], ['c2', r.c2, 'COPY2-MARKER-DCR1']]) {
      await openSidebarAgent(page, id)
      r.slotNames[key] = await namesOf(page, id, marker, teamRows.find((x) => x.agentRunId === id)?.name ?? null)
    }
    // C1 and C2 are delegated by W, which works on its Task: they are sub-work of it, with no Task of their own.
    assert(allNamed(r.slotNames.c1, 'worker', false) && allNamed(r.slotNames.c2, 'worker', false), 'SR-091: each copy of /worker reads "worker" in its row, context, header, Settings and run list (sub-work: no Task of its own)', r.slotNames)
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    await settingsView(page)
    r.rowsFinal = await delegatedRows(page, { kind: 'team', id: r.teamRunId })
    const finalRows = configuredRows(r.rowsFinal, '/worker')
    assert(finalRows.length === 2 && finalRows.some((x) => x.launch.includes(MODEL_LABEL)) && finalRows.some((x) => x.launch.includes(ALT_LABEL)), 'Settings: one row per copy, each on its own model, both "As configured in this run"', r.rowsFinal)
    await shot(page, 'DCR-001-settings-two-copies-1280', 1280)
    // autobyteus-461 rule 2: the copy is its own run (its conversation by its own run ID); the slot is the team's member.
    const c1View = JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){runId conversation}}', { id: r.c1 })).getRunProjection)
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
    // autobyteus-461 TC-12 / E6t: a delegated team's own file is rooted at `/` (members `/lead`, `/engineer`), no `followsTeam`.
    r.cpLead = r.cpLead ?? objectsIn(cpTree).find((x) => x.address === '/lead' && pick(x, 'agentRunId'))?.agentRunId
    r.cpLeadLaunches = await waitLaunches('CP lead started', r.cpLead, 1)
    assert(r.cpLeadLaunches[0][0] === ALT, 'CP lead should start on the Team slot (ALT)', r.cpLeadLaunches)
    r.cpLeadSession = await leadSession(r.cp, r.cpLead)
    const cpMembers = objectsIn(cpTree).filter((x) => typeof x.address === 'string' && x.address !== '/' && x.launchConfiguration && pick(x, 'agentRunId'))
    r.cpMemberFacts = cpMembers.map((m) => ({ address: m.address, model: modelOf(m.launchConfiguration), keys: Object.keys(m.launchConfiguration ?? {}).sort() }))
    assert(cpMembers.length === 2 && cpMembers.every((m) => m.launchConfiguration && !('followsTeam' in m)), 'CP own tree: every member has its own launch (no followsTeam)', { cpMemberFacts: r.cpMemberFacts, cpTree })
    assert(!('taskAgent' in cpTree) && cpTree.delegatedFrom?.delegatingRun && cpTree.rootTeam?.address === '/', 'CP own tree: rooted at /, names its delegating run, no taskAgent', { delegatedFrom: cpTree.delegatedFrom, root: cpTree.rootTeam?.address })
    r.cpOwnTreeExcerpt = { path: r.cpOwnFile.path, delegatedFrom: cpTree.delegatedFrom, members: r.cpMemberFacts, handoffs: objectsIn(cpTree).find((x) => Array.isArray(x.handoffs))?.handoffs ?? null }

    // AC-004: Settings rows.
    await settingsView(page)
    r.rowsRunning = await delegatedRows(page, { kind: 'org', id: r.orgRunId })
    assert(configuredRows(r.rowsRunning, '/writer').length === 1 && configuredRows(r.rowsRunning, '/pair').length === 1, 'Settings: CW and CP read "As configured in this run"', r.rowsRunning)
    await shot(page, 'DCR-002-org-settings-configured-copies-1280', 1280)

    // SCN-003: stop the Org; set /writer and the /pair Team to MODEL.
    await stopRootFromSettings(page)
    // autobyteus-461 REQ-001: the Org's Stop leaves its working copies running; each is stopped by its own Stop.
    await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: r.cw })
    await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: r.cp })
    // autobyteus-366: /writer from its own Settings; the placed Team /pair from the Org's group view (one Save for both).
    await chooseAnyModel(page, await focusedCard(page, r.slotWriter), MODEL)
    await page.locator(sel('run-settings-switch-group')).click(); await settle(page, 600)
    await chooseAnyModel(page, await openMember(page.locator(sel('existing-run-settings')), '/pair'), MODEL)
    await saveSettings(page); await saved(page)
    const edited = await orgConfigTree(r.orgRunId)
    r.slotsAfterEdit = { writer: modelOf(pick(configuredAt(edited, '/writer'), 'launchConfiguration')), pair: modelOf(pick(configuredAt(edited, '/pair'), 'defaultLaunchConfiguration')),
      pairLead: modelOf(pick(configuredAt(edited, '/pair/lead'), 'launchConfiguration')) }
    // autobyteus-461 rule 2: the Org's configuration holds no delegated runs; each copy's launch is its own run's.
    r.copiesAfterEdit = { cw: (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{llmModelIdentifier}}}', { id: r.cw })).getAgentRunResumeConfig?.metadataConfig?.llmModelIdentifier ?? null,
      cp: modelOf(pick(objectsIn(await teamTree(r.cp)).find((x) => x.defaultLaunchConfiguration || x.default_launch_configuration), 'defaultLaunchConfiguration')) }
    assert(r.slotsAfterEdit.writer === MODEL && r.slotsAfterEdit.pair === MODEL && r.copiesAfterEdit.cw === ALT && r.copiesAfterEdit.cp === ALT, 'slots edited; copies keep their snapshots', r)
    r.rowsStopped = await delegatedRows(page, { kind: 'org', id: r.orgRunId })
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
      // TC-12: the copy team's own file is rooted at `/` (its lead is `/lead`); CR-461-089: no `followsTeam`.
      lead: objectsIn(cp2Tree).filter((x) => x.address === '/lead' && x.launchConfiguration).map((x) => ({ model: modelOf(x.launchConfiguration) })) }
    r.cp2Lead = coordinatorRunIdOf(r.cp2Call) ?? objectsIn(cp2Tree).find((x) => x.address === '/lead' && pick(x, 'agentRunId'))?.agentRunId
    r.cp2LeadLaunches = await waitLaunches('CP2 lead started', r.cp2Lead, 1)
    assert(r.cp2Facts.default === MODEL && r.cp2Facts.lead[0]?.model === r.slotsAfterEdit.pairLead && r.cp2LeadLaunches[0][0] === r.slotsAfterEdit.pairLead, 'CP2 should start from the edited Team slot', r)

    await settingsView(page)
    r.rowsFinal = await delegatedRows(page, { kind: 'org', id: r.orgRunId })
    const writerRows = configuredRows(r.rowsFinal, '/writer')
    const pairRows = configuredRows(r.rowsFinal, '/pair')
    assert(writerRows.length === 2 && writerRows.some((x) => x.launch.includes(ALT_LABEL)) && writerRows.some((x) => x.launch.includes(MODEL_LABEL))
      && pairRows.length === 2 && pairRows.some((x) => x.launch.includes(ALT_LABEL)) && pairRows.some((x) => x.launch.includes(MODEL_LABEL)), 'Settings: each copy on its own values, all "As configured in this run"', r.rowsFinal)
    await shot(page, 'DCR-002-org-settings-four-copies-1280', 1280)
    await backToConversation(page)
    // AC-004: the Org context of each agent copy (opened from its sidebar row) and of the slot.
    for (const id of [r.cw, r.cw2]) {
      const row = page.locator(`${sel('workspace-team-transient-execution-row')}[data-agent-run-id="${id}"]`).first()
      await waitFor(`Org sidebar row ${id}`, async () => row.isVisible().catch(() => false), 60000, 1000)
      await row.click(); await settle(page, 1500)
    }
    r.contexts = { cw: await ownContext(page, r.cw), cw2: await ownContext(page, r.cw2), slot: await orgContext(page, r.orgRunId, r.slotWriter) }
    assert(r.contexts.cw?.model === ALT && r.contexts.cw2?.model === MODEL && r.contexts.slot?.model === MODEL,
      'Org contexts: each copy on its own model; the slot on its edit', r.contexts)
    // SR-091: each copy of /writer is named "writer" everywhere: row, context, header, Task card, Settings, run list.
    const orgRows = delegatedNodes(await readRunTree(gql, 'org', r.orgRunId))
    r.slotNames = {}
    for (const [key, id, marker] of [['cw', r.cw, 'CW-MARKER-DCR2'], ['cw2', r.cw2, 'CW2-MARKER-DCR2']]) {
      const row = page.locator(`${sel('workspace-team-transient-execution-row')}[data-agent-run-id="${id}"]`).first()
      await row.click(); await settle(page, 1500)
      r.slotNames[key] = await namesOf(page, id, marker, orgRows.find((x) => x.agentRunId === id)?.name ?? null)
    }
    assert(allNamed(r.slotNames.cw, 'writer') && allNamed(r.slotNames.cw2, 'writer'), 'SR-091: each copy of /writer reads "writer" in its row, context, header, Task card, Settings and run list', r.slotNames)
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
      .filter((x) => typeof x.address === 'string' && x.address !== '/' && x.launchConfiguration && pick(x, 'agentRunId'))
      .map((m) => [m.address, { runtime: m.launchConfiguration.runtimeKind, model: modelOf(m.launchConfiguration), auto: m.launchConfiguration.autoExecuteTools,
        workspace: m.launchConfiguration.workspaceRootPath, followsTeam: 'followsTeam' in m }]))
    // (a) with auto-approve: the Grok Team copy.
    r.gcpCall = await callFromComposer(page, 'manager → delegate /gpair', 'delegate_task', { recipient_address: '/gpair', description: 'Grok pair copy work GCP-MARKER-DCR3.' })
    r.gcp = delegatedId(r.gcpCall)
    assert(r.gcpCall.includes('"delegated":true') && r.gcp, 'copy of /gpair not delegated', r.gcpCall)
    r.gcpFacts = await factsOf(r.gcp)
    // autobyteus-461 F-39 / TC-12: members are addressed from the team's own root and carry their resolved launch; no follow flag.
    assert(r.gcpFacts['/lead']?.followsTeam === false && r.gcpFacts['/lead'].auto === r.slots.gpairLead.auto && r.gcpFacts['/lead'].model === r.slots.gpair.model
      && r.gcpFacts['/helper']?.followsTeam === false, 'Grok copy: the lead starts on the Team model with its own auto-approve; the AGY helper on its own', r.gcpFacts)
    // (a) the Team-level choice reaching such a member: the AGY Team copy.
    r.cpCall = await callFromComposer(page, 'manager → delegate /pair', 'delegate_task', { recipient_address: '/pair', description: 'Pair copy work CP-MARKER-DCR3.' })
    r.cp = delegatedId(r.cpCall); r.cpLead = coordinatorRunIdOf(r.cpCall)
    assert(r.cpCall.includes('"delegated":true') && r.cp && r.cpLead, 'copy of /pair not delegated', r.cpCall)
    r.cpFacts = await factsOf(r.cp)
    assert(r.cpFacts['/lead']?.model === ALT && r.cpFacts['/engineer'] && /grok/i.test(r.cpFacts['/engineer'].runtime ?? ''),
      'AGY copy: the lead starts on the Team model; the Grok engineer on its own default', r.cpFacts)
    r.leadFirst = await waitLaunches('CP lead started', r.cpLead, 1)
    assert(r.leadFirst[0][0] === ALT, 'CP lead should start on the Team model', r.leadFirst)
    r.leadSession = await leadSession(r.cp, r.cpLead)

    // A Team-level model choice on the stopped copy (Settings row: stop, choose, Save).
    // autobyteus-366: the Team copy's own settings are its group view, reached from its lead.
    await settingsView(page)
    const teamCard = await focusedCard(page, r.cpLead, { group: true })
    const row = () => teamCard
    await waitFor('CP header stop icon', async () => page.locator(sel('run-member-stop')).isVisible().catch(() => false), 60000)
    await page.locator(sel('run-member-stop')).click()
    await waitFor('CP stopped (model unlocked)', async () => (await row().locator(`${sel('run-setting-model')} ${sel('run-setting-locked')}`).count()) === 0, 60000, 1000)
    await chooseAnyModel(page, row(), MODEL)
    await saveSettings(page); await saved(page)
    r.cpRowAfter = await cardSummary(row())
    // A row on a user choice carries no source attribute; read the lead's own row by its key.
    r.leadRowAfter = await summaryOf(copyMemberRow(page, r.cp, '/lead', r.cpLead))
    r.engineerRowAfter = await summaryOf(copyMemberRow(page, r.cp, '/engineer', objectsIn((await ownFile(r.cp, 'team_run_execution_tree.json')).json).find((x) => x.address === '/engineer' && x.agentRunId)?.agentRunId))
    // The stored truth beside the rendered rows: the copy team's own file after the team-level Save.
    const cpOwnAfter = (await ownFile(r.cp, 'team_run_execution_tree.json')).json
    r.cpStoredAfter = { team: modelOf(pick(objectsIn(cpOwnAfter).find((x) => x.address === '/' && x.defaultLaunchConfiguration), 'defaultLaunchConfiguration')),
      lead: modelOf(pick(objectsIn(cpOwnAfter).find((x) => x.address === '/lead' && x.launchConfiguration), 'launchConfiguration')),
      engineer: modelOf(pick(objectsIn(cpOwnAfter).find((x) => x.address === '/engineer' && x.launchConfiguration), 'launchConfiguration')) }
    // autobyteus-461 F-39 (SR-075): a team-level choice changes the team's default; each member keeps its own saved launch.
    assert(r.cpRowAfter.includes(MODEL_LABEL) && !r.leadRowAfter.includes(MODEL_LABEL) && /grok/i.test(r.engineerRowAfter),
      'Settings: the Team choice changes the team default; the lead and the engineer keep their own launches', { team: r.cpRowAfter, lead: r.leadRowAfter, engineer: r.engineerRowAfter, stored: r.cpStoredAfter })
    await shot(page, 'DCR-003-copy-team-model-saved-1280', 1280)
    await backToConversation(page)
    await selectOrgManager(page)
    const from = (await launches(r.cpLead)).length
    r.resumeCall = await callFromComposer(page, 'manager → CP lead by run id', 'send_message_to', { target_agent_run_id: r.cpLead, content: 'Continue CP-RESUME-DCR3.' })
    assert(r.resumeCall.includes('"accepted":true'), 'message to the CP lead not accepted', r.resumeCall)
    await waitLaunches('CP lead resumed', r.cpLead, from + 1)
    r.leadResumed = (await launches(r.cpLead)).slice(from)
    assert(r.leadResumed.every(([model, conversation]) => model === ALT && conversation === r.leadSession), 'the lead keeps its own launch after the Team-level choice (F-39) and resumes its own conversation', { resumed: r.leadResumed, own: r.leadSession })
    return r
  })
}
