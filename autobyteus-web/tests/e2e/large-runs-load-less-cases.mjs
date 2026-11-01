// Large runs load less (ticket large-runs-load-less, autobyteus-358). Registered by delegated-launch-defaults-probe.mjs
// (same owned stack: real Chrome → Nuxt dev → built backend with the scripted AGY CLI, whose agents call the real tools
// for `CALL_TOOL:{…}`; owned temp data root and HOME; no credentials). Runs are started through the UI; a second client
// (a team stream WebSocket opened by the probe, as a phone or another window would) messages a run's coordinator.
//
// Cases:
//   LRL-001 (AC-003, QR-005, REQ-001) A stopped six-member Team run whose members all have conversations, opened from the
//           Workspaces tree in a fresh page: one member projection and one file-change request (the focused member);
//           another member opened: one more pair, for it only; going back loads nothing; every member row is shown; the
//           Team tab asks for the focused participant's messages once and lists the stored ones.
//   LRL-002 (AC-003, QR-005) The same for a stopped Org run (agents and a placed Team) opened from the Workspaces tree.
//   LRL-003 (AC-002, SCN-002b/c) A live Team run: the worker's Team tab loads while the coordinator sends the worker a
//           message (the participant response is held in the browser until the message is stored, then delivered as
//           the server read it): the list ends equal to the stored log, the new message once. Then the run's stream
//           drops (the probe closes its WebSocket and refuses reconnects), a message arrives meanwhile, the stream comes
//           back: the list again equals the stored log, the new message once.
//   LRL-004 (AC-006, SCN-007) A stopped Team run whose stored message log is damaged (one line overwritten while the
//           backend is down): the run opens with its member rows; the Team tab shows "unavailable" with the reason;
//           a message to the run (resume) is refused with the reason and the run stays stopped; on the phone (Phone
//           Access, 390×844) the run's message screen shows unavailable with the reason.
// Run alone: pnpm -C autobyteus-web test:e2e:large-runs-load-less --output-dir <fresh dir>
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const PARTICIPANT_OP = 'CollaborationParticipantMessages'
const TEAM_OPS = ['GetTeamMemberRunProjection', 'GetTeamMemberFileChanges']
const ORG_OPS = ['GetAgentOrgMemberRunProjection', 'GetAgentOrgMemberFileChanges']

export function registerLargeRunsLoadLessCases(h) {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, callTool, newChatFor, chooseModel, typeAndSend,
    callFromComposer, openTeamRun, expandWorkspaces, teamTree, teamRunIds, pick, objectsIn, restartBackend, AGY, MODEL, env } = h

  const tag = () => randomUUID().slice(0, 4)
  /** A case keeps what it recorded (`keep(r)`) when it fails: the probe stores error.details. */
  let kept = null
  const keep = (r) => { kept = r }
  const defineRecordedCase = (id, title, fn) => defineCase(id, title, async (page, context) => {
    kept = null
    try { return await fn(page, context) } catch (error) {
      error.details = { recorded: kept, ...(error.details !== undefined ? { assertion: error.details } : {}) }
      throw error
    }
  })
  const launch = { runtimeKind: AGY, llmModelIdentifier: MODEL }
  const createAgent = async (name, toolNames = []) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Follow the request.', toolNames, defaultLaunchConfig: launch } })).createAgentDefinition.id
  const createTeam = async (name, nodes, coordinator) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Work together.', coordinatorMemberName: coordinator, handoffs: [], defaultLaunchConfig: launch,
    nodes: Object.entries(nodes).map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
  const createOrg = async (name, members) => (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Plan.', handoffs: [], members, defaultLaunchConfig: launch } })).createAgentOrgDefinition.id
  const participantMessages = async (rootKind, rootRunId, agentRunId) => (await gql(
    'query($k:String!,$r:String!,$a:String!){collaborationParticipantMessages(rootKind:$k,rootRunId:$r,agentRunId:$a)}',
    { k: rootKind, r: rootRunId, a: agentRunId })).collaborationParticipantMessages.messages
  const teamMembers = async (teamRunId) => {
    const tree = await teamTree(teamRunId)
    return Object.fromEntries((pick(tree, 'rootTeam')?.members ?? []).map((m) => [String(m.address).split('/').pop(), pick(m, 'agentRunId')]))
  }
  const teamActive = async (teamRunId) => {
    const h = await gql('{ listWorkspaceRunHistory(limitPerAgent: 50) { teamDefinitions { runs { teamRunId isActive } } } }')
    return objectsIn(h).find((r) => r.teamRunId === teamRunId)?.isActive ?? null
  }

  /** GraphQL operations a page issues, with their variables (counted per window). */
  const watchOps = (page) => {
    const log = []
    const onRequest = (r) => { if (!r.url().endsWith('/graphql')) return; try { const b = r.postDataJSON(); log.push({ op: b.operationName, v: b.variables ?? {} }) } catch { /* not JSON */ } }
    page.on('request', onRequest)
    return { mark: () => log.length, since: (m, ops) => log.slice(m).filter((e) => !ops || ops.includes(e.op)),
      stop: () => page.off('request', onRequest) }
  }
  const countBy = (entries) => entries.reduce((m, e) => { const id = e.v.agentRunId ?? e.v.runId ?? '-'; const k = `${e.op}:${id}`; return { ...m, [k]: (m[k] || 0) + 1 } }, {})
  /** Waits until the page issues no GraphQL request for `ms`. */
  const quiet = async (watch, ms = 2500, max = 60000) => {
    const end = Date.now() + max
    let last = watch.mark(), since = Date.now()
    while (Date.now() < end) { await delay(250); const now = watch.mark(); if (now !== last) { last = now; since = Date.now() } else if (Date.now() - since >= ms) return }
  }

  /** A second client of a Team run: sends a message to one member over the Team stream, as the phone would. */
  const teamSend = async (teamRunId, agentRunId, content) => {
    const url = `${env().backendUrl.replace(/^http/, 'ws')}/ws/agent-team/${teamRunId}`
    const ws = new WebSocket(url)
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
    const id = `lrl-${randomUUID()}`
    const ack = new Promise((resolve) => ws.addEventListener('message', (e) => { try { const m = JSON.parse(String(e.data)); if (m.payload?.message_id === id || /SEND_MESSAGE/.test(m.type)) resolve(m) } catch { /* ignore */ } }))
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content, context_file_paths: [], image_urls: [], agent_run_id: agentRunId, message_id: id, dedupe_key: `agent_run_input:lrl:${id}` } }))
    const reply = await Promise.race([ack, delay(15000).then(() => null)])
    ws.close()
    return reply
  }
  const sendNote = (teamRunId, fromRunId, toRunId, note) => teamSend(teamRunId, fromRunId, callTool('send_message_to', { target_agent_run_id: toRunId, content: note }))
  const waitStored = (label, rootKind, rootRunId, agentRunId, marker) => waitFor(label, async () => {
    const list = await participantMessages(rootKind, rootRunId, agentRunId)
    return list.some((m) => m.content.includes(marker)) ? list : null
  }, 90000, 1000)

  /** A Team run started from the Agent Teams page; returns its run id. */
  const startTeamRun = async (page, teamDefinitionId, teamName, firstMessage) => {
    await newChatFor(page, '/agent-teams', teamName)
    await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
    const before = new Set(await teamRunIds(teamDefinitionId))
    await typeAndSend(page, firstMessage)
    await page.waitForURL(/\/workspace/, { timeout: 180000 })
    return waitFor('new team run', async () => (await teamRunIds(teamDefinitionId)).find((id) => !before.has(id)), 60000)
  }
  /** A Team member's row in the Workspaces tree, by its member name (the end of its address). */
  const memberRowOf = (page, teamRunId, memberName) => page.locator(`[data-team-run-id="${teamRunId}"][data-test^="workspace-team-member-"][data-member-address$="${memberName}"]`).first()
  const openTeamTab = async (page) => {
    const tab = page.getByRole('tab', { name: 'Team', exact: true }).first()
    if (await tab.getAttribute('aria-selected') !== 'true') await tab.click()
    await page.locator(sel('collaboration-messages-section')).first().waitFor({ timeout: 30000 })
  }
  const teamTabRows = (page) => page.locator(`${sel('collaboration-messages-section')} ${sel('team-communication-message-row')}`)
  const rowTexts = async (page) => (await teamTabRows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
  /** The Team tab equals the stored list: same count, and each stored message's marker appears in exactly one row. */
  const assertTabEqualsStored = async (page, label, stored, markers) => {
    const rows = await waitFor(`${label}: Team tab rows`, async () => { const r = await rowTexts(page); return r.length === stored.length ? r : null }, 30000, 500)
      .catch(async () => { throw Object.assign(new Error(`${label}: Team tab shows ${(await rowTexts(page)).length} rows, stored ${stored.length}`), { details: { rows: await rowTexts(page), stored: stored.map((m) => m.content.slice(0, 80)) } }) })
    for (const marker of markers) assert(rows.filter((r) => r.includes(marker)).length === 1, `${label}: "${marker}" shown once`, rows)
    return rows
  }
  /** A team run is stopped, and its member conversations are stored. */
  const stopTeamRun = async (teamRunId) => {
    const r = (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: teamRunId })).terminateAgentTeamRun
    assert(r.success, 'team run stopped', r)
    await waitFor('team run inactive', async () => (await teamActive(teamRunId)) === false, 60000, 1000)
  }

  defineRecordedCase('LRL-001', 'AC-003, QR-005 (Team): opening a stopped six-member Team run loads only the focused member; another member loads when opened; the Team tab asks once for the focused participant', async (page, context) => {
    const t = tag(), r = { names: { team: `LRL Team ${t}` } }
    keep(r)
    const roles = ['lead', 'designer', 'builder', 'reviewer', 'tester', 'writer']
    const defs = {}
    for (const role of roles) defs[role] = await createAgent(`LRL ${role} ${t}`)
    r.teamDefinitionId = await createTeam(r.names.team, defs, 'lead')
    r.teamRunId = await startTeamRun(page, r.teamDefinitionId, r.names.team, `Hello team LRL1-${t}.`)
    r.members = await teamMembers(r.teamRunId)
    assert(roles.every((role) => r.members[role]), 'six members', r.members)
    for (const role of roles.slice(1)) {
      await sendNote(r.teamRunId, r.members.lead, r.members[role], `Note for ${role} LRL1-${t}`)
      await waitStored(`${role} got its note`, 'agent_team', r.teamRunId, r.members[role], `Note for ${role} LRL1-${t}`)
    }
    await delay(3000)
    await stopTeamRun(r.teamRunId)

    // Cold open in a fresh page: the Workspaces tree → the Team run.
    const cold = await context.newPage()
    const watch = watchOps(cold)
    try {
      await cold.goto(`${env().frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(cold, 2500)
      const openMark = watch.mark(), openStart = Date.now()
      await openTeamRun(cold, r.teamRunId, r.teamDefinitionId)
      await quiet(watch)
      r.openMs = Date.now() - openStart
      r.openOps = countBy(watch.since(openMark, [...TEAM_OPS, PARTICIPANT_OP]))
      const memberLoads = watch.since(openMark, TEAM_OPS)
      r.loadedAtOpen = [...new Set(memberLoads.map((e) => e.v.agentRunId))]
      assert(r.loadedAtOpen.length === 1 && memberLoads.filter((e) => e.op === TEAM_OPS[0]).length === 1 && memberLoads.filter((e) => e.op === TEAM_OPS[1]).length === 1,
        'open: one projection and one file-change request, for one member', r.openOps)
      r.focused = r.loadedAtOpen[0]
      r.memberRowsShown = await cold.locator(`[data-team-run-id="${r.teamRunId}"][data-test^="workspace-team-member-"]`).count()
      assert(r.memberRowsShown >= roles.length, 'every member row is shown', r.memberRowsShown)

      // Another member, then back.
      const other = roles.map((role) => r.members[role]).find((id) => id !== r.focused)
      r.opened = other
      const otherMark = watch.mark()
      await memberRowOf(cold, r.teamRunId, Object.keys(r.members).find((k) => r.members[k] === other)).click()
      await quiet(watch)
      r.otherOps = countBy(watch.since(otherMark, TEAM_OPS))
      assert(JSON.stringify(Object.keys(r.otherOps).sort()) === JSON.stringify(TEAM_OPS.map((op) => `${op}:${other}`).sort())
        && Object.values(r.otherOps).every((n) => n === 1), 'another member: one projection and one file-change request, for it only', r.otherOps)
      const backMark = watch.mark()
      await memberRowOf(cold, r.teamRunId, Object.keys(r.members).find((k) => r.members[k] === r.focused)).click()
      await quiet(watch)
      r.backOps = countBy(watch.since(backMark, TEAM_OPS))
      assert(Object.keys(r.backOps).length === 0, 'going back to a loaded member loads nothing', r.backOps)

      // The Team tab: one participant request for the focused member; the stored messages listed.
      const tabMark = watch.mark()
      await openTeamTab(cold)
      await quiet(watch)
      r.tabOps = countBy(watch.since(tabMark, [PARTICIPANT_OP]))
      r.participantRequestsTotal = countBy(watch.since(openMark, [PARTICIPANT_OP]))
      const stored = await participantMessages('agent_team', r.teamRunId, r.focused)
      r.storedForFocused = stored.length
      await assertTabEqualsStored(cold, 'Team tab', stored, stored.map((m) => m.content.match(/Note for \w+ LRL1-\w+/)?.[0]).filter(Boolean))
      // The Team tab asks for the participant it shows, once each: the focused member, and the member opened while it showed.
      const asked = Object.keys(r.participantRequestsTotal).map((k) => k.split(':').slice(1).join(':'))
      assert(Object.values(r.participantRequestsTotal).every((n) => n === 1) && asked.includes(r.focused) && asked.every((id) => [r.focused, other].includes(id)),
        'one participant request per shown participant (the focused member, and the member opened)', r.participantRequestsTotal)
      assert(Object.keys(r.tabOps).length === 0, 'back on a loaded participant: no new participant request', r.tabOps)
      await shot(cold, 'LRL-001-team-open')
    } finally { watch.stop(); await cold.close() }
    return r
  })

  defineRecordedCase('LRL-002', 'AC-003, QR-005 (Org): opening a stopped Org run loads only the focused member; another member loads when opened', async (page, context) => {
    const t = tag(), r = { names: { org: `LRL Org ${t}` } }
    keep(r)
    const ids = {}
    for (const role of ['manager', 'writer', 'analyst', 'lead', 'engineer']) ids[role] = await createAgent(`LRLO ${role} ${t}`)
    ids.pair = await createTeam(`LRLO Pair ${t}`, { lead: ids.lead, engineer: ids.engineer }, 'lead')
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
    await page.locator('[data-test^="agent-org-agent-row-"]').filter({ hasText: /manager/i }).first().click(); await settle(page, 2000)
    for (const target of ['/writer', '/analyst', '/pair']) {
      const called = await callFromComposer(page, `manager → ${target}`, 'send_message_to', { recipient_address: target, content: `Org note ${target} LRL2-${t}` })
      assert(called.includes('"accepted":true') || called.includes('DELIVERED'), `manager → ${target} delivered`, called)
    }
    await delay(5000)
    const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.orgRunId })).getAgentOrgRunConfig.executionTree
    r.orgAgents = objectsIn(tree).filter((o) => pick(o, 'agentRunId') && typeof o.address === 'string').map((o) => ({ address: o.address, agentRunId: pick(o, 'agentRunId') }))
    const stop = (await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: r.orgRunId })).terminateAgentOrgRun
    assert(stop.success, 'org run stopped', stop)
    await delay(3000)

    const cold = await context.newPage()
    const watch = watchOps(cold)
    try {
      await cold.goto(`${env().frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(cold, 2500)
      const open = cold.locator(sel(`agent-org-run-open-${r.orgRunId}`))
      await waitFor('org run row', async () => {
        if (await open.isVisible().catch(() => false)) return true
        await expandWorkspaces(cold)
        const group = cold.locator(sel(`agent-org-definition-${r.orgDefinitionId}`)).first()
        if (await group.isVisible().catch(() => false) && await group.getAttribute('aria-expanded') !== 'true') await group.click()
        return false
      }, 60000, 1500)
      const openMark = watch.mark(), openStart = Date.now()
      await open.click()
      await quiet(watch)
      r.openMs = Date.now() - openStart
      r.openOps = countBy(watch.since(openMark, [...ORG_OPS, PARTICIPANT_OP]))
      const memberLoads = watch.since(openMark, ORG_OPS)
      r.loadedAtOpen = [...new Set(memberLoads.map((e) => e.v.agentRunId))]
      assert(r.loadedAtOpen.length <= 1 && memberLoads.filter((e) => e.op === ORG_OPS[0]).length <= 1 && memberLoads.filter((e) => e.op === ORG_OPS[1]).length <= 1,
        'open: at most the focused member is loaded', r.openOps)
      r.centerAtOpen = (await cold.locator(sel('workspace-center-pane')).innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)
      await shot(cold, 'LRL-002-org-opened')
      // Open the writer: one pair, for it only.
      const writer = r.orgAgents.find((a) => a.address.endsWith('/writer'))
      const row = cold.locator(sel(`agent-org-agent-row-${writer.agentRunId}`)).first()
      await waitFor('writer row', async () => {
        if (await row.isVisible().catch(() => false)) return true
        const disclosure = cold.locator(sel(`agent-org-run-disclosure-${r.orgRunId}`)).first()
        if (await disclosure.isVisible().catch(() => false) && await disclosure.getAttribute('aria-expanded') === 'false') await disclosure.click()
        return false
      }, 30000, 1000)
      const writerMark = watch.mark()
      await row.click()
      await quiet(watch)
      r.writerOps = countBy(watch.since(writerMark, ORG_OPS))
      assert(JSON.stringify(Object.keys(r.writerOps).sort()) === JSON.stringify(ORG_OPS.map((op) => `${op}:${writer.agentRunId}`).sort())
        && Object.values(r.writerOps).every((n) => n === 1), 'the writer: one projection and one file-change request, for it only', r.writerOps)
      r.memberRowsShown = await cold.locator('[data-test^="agent-org-agent-row-"]').count()
      r.allOrgMemberLoads = countBy(watch.since(openMark, ORG_OPS))
      await shot(cold, 'LRL-002-org-open')
    } finally { watch.stop(); await cold.close() }
    return r
  })

  defineRecordedCase('LRL-003', 'AC-002 live: a message sent while the Team tab loads, and while the stream is down, appears once; the list equals the stored log', async (page, context) => {
    const t = tag(), r = { names: { team: `LRL Live ${t}` } }
    keep(r)
    const lead = await createAgent(`LRLL lead ${t}`), worker = await createAgent(`LRLL worker ${t}`)
    r.teamDefinitionId = await createTeam(r.names.team, { lead, worker }, 'lead')
    r.teamRunId = await startTeamRun(page, r.teamDefinitionId, r.names.team, `Hello LRL3-${t}.`)
    r.members = await teamMembers(r.teamRunId)
    await sendNote(r.teamRunId, r.members.lead, r.members.worker, `Before ${t} M1`)
    await waitStored('M1 stored', 'agent_team', r.teamRunId, r.members.worker, `Before ${t} M1`)

    const live = await context.newPage()
    // The run's Team stream goes through the probe, which can drop it and refuse reconnects (network emulation).
    const sockets = []
    let refuse = false
    await live.routeWebSocket((url) => url.pathname.startsWith('/ws/agent-team/'), (ws) => {
      if (refuse) { ws.close({ code: 1011, reason: 'probe: network down' }); return }
      const server = ws.connectToServer()
      sockets.push({ ws, server })
    })
    // The worker's participant response: fetched from the server at once, delivered when released.
    let release, held = null
    const released = new Promise((resolve) => { release = resolve })
    await live.route('**/graphql', async (route) => {
      let body = null
      try { body = route.request().postDataJSON() } catch { /* not JSON */ }
      if (held === null && body?.operationName === PARTICIPANT_OP && body.variables?.agentRunId === r.members.worker) {
        const response = await route.fetch()
        held = { at: Date.now(), body: await response.text() }
        await released
        return route.fulfill({ response })
      }
      return route.fallback()
    })
    try {
      await live.goto(`${env().frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(live, 2500)
      await openTeamRun(live, r.teamRunId, r.teamDefinitionId)
      await memberRowOf(live, r.teamRunId, 'worker').click(); await settle(live, 1500)
      await openTeamTab(live)
      await waitFor('worker participant request held', async () => held !== null, 30000, 200)
      r.heldResponseHasM2 = held.body.includes(`During ${t} M2`)
      await sendNote(r.teamRunId, r.members.lead, r.members.worker, `During ${t} M2`)
      await waitStored('M2 stored', 'agent_team', r.teamRunId, r.members.worker, `During ${t} M2`)
      await delay(1500)
      r.loadingShownWhileHeld = await live.locator(sel('collaboration-messages-loading')).isVisible().catch(() => false)
      release()
      const stored1 = await participantMessages('agent_team', r.teamRunId, r.members.worker)
      r.afterLoad = await assertTabEqualsStored(live, 'after the held load', stored1, [`Before ${t} M1`, `During ${t} M2`])
      assert(!r.heldResponseHasM2, 'the delivered response was read before M2 (M2 came from the live stream)', held.body.slice(0, 400))

      // The stream drops; M3 arrives while it is down; the stream comes back.
      refuse = true
      for (const s of sockets.splice(0)) { s.ws.close({ code: 1011, reason: 'probe: network down' }); s.server.close() }
      await delay(1500)
      await sendNote(r.teamRunId, r.members.lead, r.members.worker, `Offline ${t} M3`)
      await waitStored('M3 stored', 'agent_team', r.teamRunId, r.members.worker, `Offline ${t} M3`)
      r.shownWhileDown = (await rowTexts(live)).some((x) => x.includes(`Offline ${t} M3`))
      refuse = false
      await waitFor('stream reconnected', async () => sockets.length > 0, 90000, 500)
      const stored2 = await participantMessages('agent_team', r.teamRunId, r.members.worker)
      r.afterReconnect = await assertTabEqualsStored(live, 'after the reconnect', stored2, [`Before ${t} M1`, `During ${t} M2`, `Offline ${t} M3`])
      await shot(live, 'LRL-003-after-reconnect')
    } finally { release?.(); await live.close() }
    await stopTeamRun(r.teamRunId).catch(() => {})
    return r
  })

  defineRecordedCase('LRL-004', 'AC-006: a Team run with a damaged stored message log opens; its Team tab and the phone show the messages as unavailable with the reason; a message to it is refused with the reason', async (page, context) => {
    const t = tag(), r = { names: { team: `LRL Damaged ${t}` } }
    keep(r)
    const lead = await createAgent(`LRLD lead ${t}`), worker = await createAgent(`LRLD worker ${t}`)
    r.teamDefinitionId = await createTeam(r.names.team, { lead, worker }, 'lead')
    r.teamRunId = await startTeamRun(page, r.teamDefinitionId, r.names.team, `Hello LRL4-${t}.`)
    r.members = await teamMembers(r.teamRunId)
    for (const n of [1, 2, 3]) {
      await sendNote(r.teamRunId, r.members.lead, r.members.worker, `Damage ${t} M${n}`)
      await waitStored(`M${n} stored`, 'agent_team', r.teamRunId, r.members.worker, `Damage ${t} M${n}`)
    }
    await stopTeamRun(r.teamRunId)

    // The stored log is damaged while the app is down: one line in the middle overwritten.
    const runDir = path.join(env().dataRoot, 'memory', 'agent_teams', r.teamRunId)
    const files = []
    const walk = async (dir) => { for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) await walk(p); else files.push(p) } }
    await walk(runDir)
    r.logFiles = files.filter((f) => /messag/i.test(path.basename(f))).map((f) => path.relative(runDir, f))
    assert(r.logFiles.length > 0, 'the run has a stored message log', files.map((f) => path.relative(runDir, f)))
    await restartBackend('backend-damaged-log', async () => {
      const file = path.join(runDir, r.logFiles.find((f) => f.endsWith('.jsonl')) ?? r.logFiles[0])
      const lines = (await fs.readFile(file, 'utf8')).split('\n')
      const content = lines.map((l, i) => [l, i]).filter(([l]) => l.trim())
      const [, index] = content[Math.floor(content.length / 2)]
      lines[index] = '{"messageId": "damaged", "broken'
      await fs.writeFile(file, lines.join('\n'))
      r.damaged = { file: path.relative(runDir, file), line: index + 1, nonEmptyLines: content.length }
    })

    const desk = await context.newPage()
    try {
      await desk.goto(`${env().frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await settle(desk, 2500)
      await openTeamRun(desk, r.teamRunId, r.teamDefinitionId)
      r.memberRowsShown = await desk.locator(`[data-team-run-id="${r.teamRunId}"][data-test^="workspace-team-member-"]`).count()
      assert(r.memberRowsShown >= 2, 'the run opens with its member rows', r.memberRowsShown)
      await openTeamTab(desk)
      const unavailable = desk.locator(sel('collaboration-messages-unavailable')).first()
      await unavailable.waitFor({ timeout: 30000 }).catch(async () => { throw Object.assign(new Error('Team tab: no unavailable state'), { details: { rows: await rowTexts(desk) } }) })
      r.teamTabText = (await unavailable.innerText()).replace(/\s+/g, ' ').trim()
      r.serverReason = await gql('query($k:String!,$r:String!,$a:String!){collaborationParticipantMessages(rootKind:$k,rootRunId:$r,agentRunId:$a)}',
        { k: 'agent_team', r: r.teamRunId, a: r.members.lead }).then(() => null, (e) => String(e.message))
      assert(r.serverReason, 'the server refuses the damaged log', r.serverReason)
      assert(await teamTabRows(desk).count() === 0, 'no partial list', await rowTexts(desk))
      r.reasonShown = r.teamTabText.length > 'Messages unavailable'.length
      await shot(desk, 'LRL-004-team-tab-unavailable')

      // Resume: a message to the stopped run is refused with the reason, and the run stays stopped.
      const restores = [], consoleErrors = []
      desk.on('response', async (res) => { try { const b = res.request().postDataJSON(); if (b?.operationName === 'RestoreAgentTeamRun') restores.push(await res.text()) } catch { /* not JSON */ } })
      desk.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
      const resumeText = `Resume please ${t}.`
      await typeAndSend(desk, resumeText)
      await delay(8000)
      r.restoreResponses = restores.map((x) => x.slice(0, 600))
      r.resumeConsoleErrors = consoleErrors.filter((x) => /sending|restor|JSON/i.test(x)).map((x) => x.slice(0, 300))
      r.activeAfterResume = await teamActive(r.teamRunId)
      r.composerStillHolds = (await desk.locator('main textarea:visible').last().inputValue()) === resumeText
      r.reasonVisibleAfterResume = (await desk.locator('body').innerText()).split(r.teamTabText.slice(-40)).length - 1
      assert(r.activeAfterResume === false, 'the run stays stopped', r.activeAfterResume)
      assert(r.restoreResponses.some((x) => x.includes('is not valid JSON')), 'the server refuses the resume with the reason', r.restoreResponses)
      await shot(desk, 'LRL-004-resume-refused')
    } finally { await desk.close() }

    // The phone: Phone Access paired through a private-network URL routed to the probe backend (network emulation only).
    const backendUrl = env().backendUrl
    const backendPort = new URL(backendUrl).port
    const remote = `http://192.168.77.10:${backendPort}`
    const settings = await fetch(`${backendUrl}/rest/remote-access/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneAccessEnabled: true }) })
    assert(settings.ok, 'Phone Access enabled', await settings.text())
    const session = await (await fetch(`${backendUrl}/rest/remote-access/pairing-sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serverBaseUrl: remote, trustedPrivateHttpAcknowledged: true }) })).json()
    assert(session.mobileUrl, 'pairing session', session)
    const phone = await context.browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' })
    try {
      await phone.route(`${remote}/**`, async (route) => route.fulfill({ response: await route.fetch({ url: route.request().url().replace(remote, backendUrl) }) }))
      const wsRemote = remote.replace(/^http/, 'ws')
      await phone.routeWebSocket((url) => url.href.startsWith(wsRemote), (ws) => {
        const upstream = new WebSocket(ws.url().replace(wsRemote, backendUrl.replace(/^http/, 'ws')))
        const queued = []
        upstream.addEventListener('open', () => { for (const m of queued.splice(0)) upstream.send(m) })
        upstream.addEventListener('message', (e) => ws.send(typeof e.data === 'string' ? e.data : String(e.data)))
        upstream.addEventListener('close', () => ws.close())
        upstream.addEventListener('error', () => ws.close())
        ws.onMessage((m) => { if (upstream.readyState === 1) upstream.send(m); else queued.push(m) })
        ws.onClose(() => upstream.close())
      })
      const mobile = await phone.newPage()
      await mobile.goto(`${env().frontUrl}/mobile?pairing=${encodeURIComponent(new URL(session.mobileUrl).searchParams.get('pairing'))}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
      await mobile.locator('[data-testid="mobile-pair-button"]').click({ timeout: 120000 })
      await mobile.locator('[data-testid="mobile-home"]').waitFor({ timeout: 120000 })
      await mobile.getByText('Choose work', { exact: true }).click()
      await mobile.locator('[data-testid="mobile-context-segment-teams"]').click()
      // The work row names the Team, or the run by its first message.
      await mobile.locator('[data-testid="mobile-context-search"]').fill(t)
      const workRow = mobile.locator('[data-testid="mobile-readable-work-row"]', { hasText: new RegExp(`${r.names.team}|LRL4-${t}`) }).first()
      await workRow.waitFor({ timeout: 60000 })
      await workRow.click({ timeout: 10000 }).catch(() => workRow.dispatchEvent('click'))
      await mobile.locator('[data-testid="mobile-work-shell"]').waitFor({ timeout: 60000 })
      await mobile.locator('[data-testid="mobile-tab-activity"]').click()
      await mobile.locator('[data-testid="mobile-open-team-messages"]').click()
      const phoneUnavailable = mobile.locator('[data-testid="mobile-team-messages-unavailable"]').first()
      await phoneUnavailable.waitFor({ timeout: 30000 })
      r.phoneText = (await phoneUnavailable.innerText()).replace(/\s+/g, ' ').trim()
      r.phoneRows = await mobile.locator('[data-testid="mobile-team-message-row"]').count()
      assert(r.phoneRows === 0, 'the phone shows no partial list', r.phoneRows)
      await mobile.screenshot({ path: path.join(env().outDir, 'LRL-004-phone-unavailable.png') })
    } finally { await phone.close() }
    return r
  })
}
