// Skill Improvement removed (ticket remove-skill-improvement, autobyteus-205). Registered by
// delegated-launch-defaults-probe.mjs (same owned stack: real Chrome → Nuxt dev → built backend with the scripted AGY CLI,
// whose argv log shows each launch's `--model` and `--conversation`; owned temp data root and HOME; no credentials).
//
// Cases:
//   SIR-001 (BEH-003) `send_message_to` by run id, the path that went through the removed grant check, through real
//           tool calls typed into the composer:
//           - standalone → standalone (live path, `DELIVERED`, the target runs);
//           - an unknown run id (`TARGET_AGENT_RUN_NOT_ACTIVE`);
//           - a Team run's coordinator → the other member (root path; the member runs);
//           - a delegated Team copy's run id (`TARGET_IS_TEAM_RUN`, naming its coordinator); then its coordinator by
//             run id (root path; it runs).
//   SIR-002 (AC-003, AC-004; BEH-001, 002, 004, 005) An upgrade of an install that used the feature:
//           - Real runs are made from the UI (a standalone chat and a Team run).
//           - With the backend down, the released feature data is written around them in the shapes of
//             `skill-improvement-data-fixtures.ts`:
//             - records (F-1, F-2) and helper runs with history rows (F-5, F-5b);
//             - session folders inside the real runs (F-3, F-3b, F-4);
//             - the improver definition (F-6) and the Skill Self-Evolver;
//             - `.env` with the three keys, `ENABLE_SKILL_IMPROVEMENT=true`.
//           - The 20261020 ledger row is removed, as on an install that never ran it.
//           - The restarted backend deletes exactly the feature data. Every other file stays byte-identical, and
//             `.env` is back to its pre-feature bytes. A second start changes nothing.
//           - In the browser:
//             - the runs are listed;
//             - the Agents page keeps the Skill Self-Evolver; the Memory page has no improver;
//             - Settings Basics has no card; Advanced lists no retired key and refuses re-adding one;
//             - the existing run's and the Team member's composers show no "Improve skills";
//             - both runs resume on their own conversations.
// Run alone: pnpm -C autobyteus-web test:e2e:skill-improvement-removal --output-dir <fresh dir>
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MIGRATION_ID = '20261020_remove_skill_improvement_data'
const RETIRED_KEYS = ['ENABLE_SKILL_IMPROVEMENT', 'AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID', 'ENABLE_SELF_EVOLUTION']
const FEATURE_TEXT = /improve skills|skill improvement|retrospective skill improver/i
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.resolve(scriptDir, '../../../autobyteus-server-ts/tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts')

export function registerSkillImprovementRemovalCases(h) {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, callTool, objectsIn, pick,
    newChatFor, chooseModel, typeAndSend, callFromComposer, conversationText, openAgentRun, openTeamRun,
    agyLaunchDetailsOf, teamTree, teamRunIds, restartBackend, AGY, MODEL, ALT, env } = h

  const tag = () => randomUUID().slice(0, 4)
  const createAgent = async (name, defaultLaunchConfig = null) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Follow the request.', toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
  const createTeam = async (name, nodes, coordinator, defaultLaunchConfig = null) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: `${name}.`, instructions: 'Work together.', coordinatorMemberName: coordinator, handoffs: [],
    ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}),
    nodes: Object.entries(nodes).map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
  const segmentOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const launches = (runId) => agyLaunchDetailsOf(runId)
  const waitLaunches = (label, runId, count) => waitFor(label, async () => { const l = await launches(runId); return l.length >= count ? l : null }, 90000, 1000)
  const codeOf = (text) => /"code":"([A-Z_]+)"/.exec(text)?.[1] ?? null
  const accepted = (text) => text.includes('"accepted":true')
  /** A standalone chat for an agent, started from the Agents page (as `startManagerChat` does). */
  const startChat = async (page, name, firstMessage) => {
    await newChatFor(page, '/agents', name)
    await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
    await typeAndSend(page, firstMessage)
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    const runId = new URL(page.url().includes('#') ? page.url().split('#')[1] : page.url(), 'http://probe.local').searchParams.get('id')
    await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 1500)
    return runId
  }
  /** A Team run started from the Agent Teams page; returns its run id and its members' run ids by member name. */
  const startTeamRun = async (page, teamDefinitionId, teamName, firstMessage) => {
    await newChatFor(page, '/agent-teams', teamName)
    await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
    const before = new Set(await teamRunIds(teamDefinitionId))
    await typeAndSend(page, firstMessage)
    await page.waitForURL(/\/workspace/, { timeout: 180000 })
    const teamRunId = await waitFor('new team run', async () => (await teamRunIds(teamDefinitionId)).find((id) => !before.has(id)), 60000)
    const tree = await teamTree(teamRunId)
    const members = Object.fromEntries((pick(tree, 'rootTeam')?.members ?? []).map((m) => [String(m.address).slice(1), pick(m, 'agentRunId')]))
    return { teamRunId, members }
  }
  const selectTeamMember = async (page, teamRunId, address) => {
    await page.locator(sel(`workspace-team-member-${teamRunId}-${address}`)).click(); await settle(page, 1500)
  }
  /** The message reached the target: its text is in a file of the target's own memory folder (its stored traces). */
  const receivedBy = (runId, marker) => waitFor(`${runId} received ${marker}`, async () => {
    const { dataRoot } = env()
    const grep = async (dir, depth) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const sub = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === runId) { if (await grepFiles(sub)) return true } else if (depth > 0 && await grep(sub, depth - 1)) return true
        }
      }
      return false
    }
    const grepFiles = async (dir) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const sub = path.join(dir, entry.name)
        if (entry.isFile() && (await fs.readFile(sub, 'utf8').catch(() => '')).includes(marker)) return true
      }
      return false
    }
    return grep(path.join(dataRoot, 'memory'), 5)
  }, 60000, 1000)
  const runProjection = async (runId) => JSON.stringify((await gql('query($r:String!){getRunProjection(runId:$r){runId conversation}}', { r: runId })).getRunProjection)
  const migrationRecord = async () => (await gql('{getAppDataMigrations{migrationId status attempts summary errorMessage}}'))
    .getAppDataMigrations.find((m) => m.migrationId === MIGRATION_ID)
  /** Text a user sees in the main area, plus any test hook that still names the removed feature. */
  const featureTraces = async (page) => ({
    text: FEATURE_TEXT.test(await page.locator('body').innerText()),
    hooks: await page.locator('[data-test*="skill-improvement"], [data-testid*="skill-improvement"], [data-test*="skill_improvement"], [data-testid*="skill-improve"]').count(),
  })

  // -------------------------------------------------------------------------------------------
  defineCase('SIR-001', 'BEH-003: send_message_to by run id through real tool calls: standalone → standalone delivered, unknown run not active, Team member → member, a Team copy\'s run id refused naming its coordinator, its coordinator reached', async (page) => {
    const r = {}
    const t = tag()
    r.names = { a: `Sender ${t}`, b: `Receiver ${t}`, team: `Relay Team ${t}`, pair: `Relay Pair ${t}` }
    await createAgent(r.names.a); await createAgent(r.names.b)
    const lead = await createAgent(`Relay Lead ${t}`); const member = await createAgent(`Relay Member ${t}`)
    r.teamDefinitionId = await createTeam(r.names.team, { lead, member }, 'lead')
    await createTeam(r.names.pair, { lead, member }, 'lead', { runtimeKind: AGY, llmModelIdentifier: ALT })

    // Standalone → standalone: the live-run path.
    r.b = await startChat(page, r.names.b, 'Hello. Marker SIR1-B.')
    await waitFor('B answered', async () => /SIR1-B[\s\S]*OK/.test(await conversationText(page)), 60000)
    r.a = await startChat(page, r.names.a, 'Hello. Marker SIR1-A.')
    await waitFor('A answered', async () => /SIR1-A[\s\S]*OK/.test(await conversationText(page)), 60000)
    r.toB = await callFromComposer(page, 'A → B by run id', 'send_message_to', { target_agent_run_id: r.b, content: 'Peer note SIR1-PEER-MARKER.' })
    assert(accepted(r.toB) && codeOf(r.toB) === 'DELIVERED', 'standalone → standalone should be DELIVERED', r.toB)
    r.bReceived = await receivedBy(r.b, 'SIR1-PEER-MARKER')
    r.bProjectionHasMessage = (await waitFor('B conversation has the message', async () => { const p = await runProjection(r.b); return p.includes('SIR1-PEER-MARKER') ? p : null }, 60000, 1000)).includes('SIR1-PEER-MARKER')
    r.toUnknown = await callFromComposer(page, 'A → unknown run id', 'send_message_to', { target_agent_run_id: `no_such_run_${t}`, content: 'Anyone?' })
    assert(!accepted(r.toUnknown) && codeOf(r.toUnknown) === 'TARGET_AGENT_RUN_NOT_ACTIVE', 'an unknown run id should be TARGET_AGENT_RUN_NOT_ACTIVE', r.toUnknown)

    // A delegated Team copy: its team run id is refused (naming the coordinator); the coordinator is reached by run id.
    r.copyCall = await callFromComposer(page, 'A delegates the Pair', 'delegate_task', { recipient_address: `/${segmentOf(r.names.pair)}`, description: 'Pair work SIR1.' })
    r.copyTeam = /"target_team_run_id":"([^"]+)"/.exec(r.copyCall)?.[1]
    r.copyLead = /"target_team_coordinator_agent_run_id":"([^"]+)"/.exec(r.copyCall)?.[1]
    assert(r.copyCall.includes('"delegated":true') && r.copyTeam && r.copyLead, 'Pair copy not delegated', r.copyCall)
    await waitLaunches('copy lead started', r.copyLead, 1)
    r.toCopyTeam = await callFromComposer(page, 'A → the copy\'s team run id', 'send_message_to', { target_agent_run_id: r.copyTeam, content: 'To the team.' })
    assert(!accepted(r.toCopyTeam) && codeOf(r.toCopyTeam) === 'TARGET_IS_TEAM_RUN' && r.toCopyTeam.includes(r.copyLead), 'a Team copy\'s run id should be TARGET_IS_TEAM_RUN naming its coordinator', r.toCopyTeam)
    r.toCopyLead = await callFromComposer(page, 'A → the copy\'s coordinator by run id', 'send_message_to', { target_agent_run_id: r.copyLead, content: 'Copy note SIR1-COPY-MARKER.' })
    assert(accepted(r.toCopyLead), 'the copy\'s coordinator should accept', r.toCopyLead)
    r.toCopyLeadCode = codeOf(r.toCopyLead)
    r.copyLeadReceived = await receivedBy(r.copyLead, 'SIR1-COPY-MARKER')

    // A Team run: the coordinator → the other member by run id (root path).
    const team = await startTeamRun(page, r.teamDefinitionId, r.names.team, 'Hello team. Marker SIR1-TEAM.')
    r.teamRunId = team.teamRunId; r.teamMembers = team.members
    await waitLaunches('Team lead answered', r.teamMembers.lead, 1)
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    await selectTeamMember(page, r.teamRunId, '/lead')
    r.toMember = await callFromComposer(page, 'lead → member by run id', 'send_message_to', { target_agent_run_id: r.teamMembers.member, content: 'Member note SIR1-MEMBER-MARKER.' })
    assert(accepted(r.toMember), 'a Team member should accept a message from its coordinator by run id', r.toMember)
    r.toMemberCode = codeOf(r.toMember)
    r.memberReceived = await receivedBy(r.teamMembers.member, 'SIR1-MEMBER-MARKER')
    await waitLaunches('member ran', r.teamMembers.member, 1)
    await shot(page, 'SIR-001-team-lead-to-member-1280', 1280)
    return r
  })

  // -------------------------------------------------------------------------------------------
  /** Relative path → sha256 (and `dir` markers) under the data root, without the database and logs. */
  const dataSnapshot = async (snapshot, root) => Object.fromEntries(Object.entries(await snapshot(root))
    .filter(([rel]) => !rel.startsWith('db/') && !/(^|\/)logs?\//.test(rel) && !rel.endsWith('.log')))
  const exists = (target) => fs.lstat(target).then(() => true, () => false)
  const findDir = async (root, name, depth = 4) => {
    for (const entry of await fs.readdir(root, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isDirectory()) continue
      const sub = path.join(root, entry.name)
      if (entry.name === name) return sub
      if (depth > 0) { const found = await findDir(sub, name, depth - 1); if (found) return found }
    }
    return null
  }

  defineCase('SIR-002', 'AC-003/AC-004: an upgrade around real runs deletes exactly the feature data once; other files and .env byte-identical; a second start changes nothing; runs listed and resumed; no feature UI; retired keys refused', async (page) => {
    const r = {}
    const t = tag()
    const fx = await import(pathToFileURL(FIXTURES).href)
    const { dataRoot, dbUrl, outDir } = env()
    const memory = path.join(dataRoot, 'memory')
    r.freshRecord = await migrationRecord()
    assert(r.freshRecord?.status === 'SUCCEEDED', 'fresh start: the migration finds nothing and succeeds', r.freshRecord)

    // Real runs from the UI: a standalone chat and a Team run whose coordinator messages the other member.
    r.names = { agent: `Upgrade Agent ${t}`, team: `Upgrade Team ${t}` }
    await createAgent(r.names.agent)
    const lead = await createAgent(`Upgrade Lead ${t}`); const member = await createAgent(`Upgrade Member ${t}`)
    r.teamDefinitionId = await createTeam(r.names.team, { lead, member }, 'lead')
    r.runId = await startChat(page, r.names.agent, 'Hello. Marker SIR2-A.')
    await waitFor('agent answered', async () => /SIR2-A[\s\S]*OK/.test(await conversationText(page)), 60000)
    const team = await startTeamRun(page, r.teamDefinitionId, r.names.team, callTool('send_message_to', { recipient_address: '/member', content: 'Team note SIR2-T.' }))
    r.teamRunId = team.teamRunId; r.members = team.members
    await waitLaunches('member ran', r.members.member, 1)
    r.agentSession = JSON.parse(await fs.readFile(path.join(memory, 'agents', r.runId, 'run_metadata.json'), 'utf8')).platformAgentRunId
    r.memberDir = await findDir(path.join(memory, 'agent_teams'), r.members.member)
    r.leadDir = await findDir(path.join(memory, 'agent_teams'), r.members.lead)
    assert(r.agentSession && r.memberDir && r.leadDir, 'real run folders and session', r)

    // The app is quit; the data folder gets the released feature data around the real runs (fixture shapes).
    await restartBackend('backend-upgraded', async () => {
      const envPath = path.join(dataRoot, '.env')
      r.envBefore = await fs.readFile(envPath, 'utf8')
      // The three keys between existing lines; the file keeps its own ending (the probe's has no final newline).
      const lines = r.envBefore.split('\n')
      const withKeys = [lines[0], `${RETIRED_KEYS[0]}=true`, lines[1], `${RETIRED_KEYS[1]}=${fx.IMPROVER_ID}`, lines[2], `${RETIRED_KEYS[2]}=false`, ...lines.slice(3)]
      await fs.writeFile(envPath, withKeys.join('\n'))
      r.envWithKeys = withKeys.join('\n')
      const realMetadata = JSON.parse(await fs.readFile(path.join(memory, 'agents', r.runId, 'run_metadata.json'), 'utf8'))
      const helperRun = async (runId, agentDefinitionId, extra = {}) => {
        await fx.put(path.join(memory, 'agents', runId, 'run_metadata.json'), { ...realMetadata, runId, agentDefinitionId, memoryDir: path.join(memory, 'agents', runId), platformAgentRunId: randomUUID(), ...extra })
        await fx.put(path.join(memory, 'agents', runId, 'raw_traces_active.jsonl'), `${JSON.stringify({ id: `rt_${runId}`, turn_id: 'turn_1', seq: 1, ts: 1790000000, trace_type: 'user', content: `improve ${runId}` })}\n`)
      }
      // F-5 / F-5b helper runs.
      for (const runId of fx.IMPROVER_RUNS) await helperRun(runId, fx.IMPROVER_ID)
      await helperRun(fx.SERVER_HELPER_RUN, 'some-helper-agent', { launchPurpose: 'server_helper' })
      // F-1 / F-2 records.
      const T0 = '2026-07-20T10:00:00.000Z'
      await fx.put(path.join(memory, 'skill_improvement', 'index.json'), Object.fromEntries(['impr_01', 'impr_02', 'impr_03'].map((id, i) =>
        [id, { improvementRunId: id, status: 'completed', target: { kind: 'agent_run', runId: r.runId }, requestedAt: T0, completedAt: T0, improverRunId: fx.IMPROVER_RUNS[i] }])))
      for (const [i, id] of ['impr_01', 'impr_02', 'impr_03'].entries()) {
        await fx.put(path.join(memory, 'skill_improvement', 'improvement_runs', id, 'record.json'), { improvementRunId: id, status: 'completed', requestedAt: T0, completedAt: T0, target: { kind: 'agent_run', runId: r.runId }, improverRunId: fx.IMPROVER_RUNS[i], errors: [] })
      }
      await fx.put(path.join(memory, 'self_evolution', 'index.json'), { evol_01: { evolutionRunId: 'evol_01', status: 'completed', requestedAt: T0, evolverRunId: fx.EVOLVER_RUNS[0] } })
      await fx.put(path.join(memory, 'self_evolution', 'evolution_runs', 'evol_01', 'record.json'), { evolutionRunId: 'evol_01', status: 'completed', requestedAt: T0, evolverRunId: fx.EVOLVER_RUNS[0], errors: [] })
      // F-3 / F-3b / F-4: session folders inside the real runs.
      const session = (dir, name, file) => fx.put(path.join(dir, name, file), { target: { runId: path.basename(dir) }, state: { updatedAt: T0 } })
      await session(path.join(memory, 'agents', r.runId), 'skill_improvement', 'improver_session.json')
      await session(r.memberDir, 'skill_improvement', 'improver_session.json')
      await session(r.leadDir, 'self_evolution', 'evolver_session.json')
      // History rows of the helper runs (and a stale evolver row) appended to the real index.
      const indexPath = path.join(memory, 'run_history_index.json')
      r.realRows = JSON.parse(await fs.readFile(indexPath, 'utf8'))
      await fs.writeFile(indexPath, `${JSON.stringify([...r.realRows,
        ...fx.IMPROVER_RUNS.map((id) => fx.historyRow(id, fx.IMPROVER_ID, 'Retrospective Skill Improver')),
        fx.historyRow(fx.SERVER_HELPER_RUN, 'some-helper-agent', 'Helper'),
        fx.historyRow(fx.EVOLVER_RUNS[0], 'autobyteus-skill-evolver', 'Skill Self-Evolver')], null, 2)}\n`)
      // F-6 and the kept Skill Self-Evolver.
      const agentsDir = path.join(dataRoot, 'agents')
      await fx.put(path.join(agentsDir, fx.IMPROVER_ID, 'agent.md'), '---\nname: Retrospective Skill Improver\n---\n\nImprove skills.\n')
      await fx.put(path.join(agentsDir, fx.IMPROVER_ID, 'agent-config.json'), { skillNames: ['retrospective-skill-improver'] })
      await fx.put(path.join(agentsDir, fx.IMPROVER_ID, 'skills', 'retrospective-skill-improver', 'SKILL.md'), '# skill\n')
      await fx.put(path.join(agentsDir, 'autobyteus-skill-evolver', 'agent.md'), '---\nname: Skill Self-Evolver\ndescription: Evolves skills.\n---\n\nEvolve.\n')
      // An install that never ran the removal.
      const db = new DatabaseSync(fileURLToPath(dbUrl))
      try { db.prepare('DELETE FROM app_data_migration_records WHERE migration_id = ?').run(MIGRATION_ID) } finally { db.close() }
      r.deleted = ['memory/skill_improvement', 'memory/self_evolution', ...fx.IMPROVER_RUNS.map((id) => `memory/agents/${id}`), `memory/agents/${fx.SERVER_HELPER_RUN}`,
        `memory/agents/${r.runId}/skill_improvement`, `${path.relative(dataRoot, r.memberDir)}/skill_improvement`, `${path.relative(dataRoot, r.leadDir)}/self_evolution`,
        `agents/${fx.IMPROVER_ID}`]
      r.before = await dataSnapshot(fx.snapshot, dataRoot)
      assert(r.deleted.every((rel) => Object.keys(r.before).some((k) => k.startsWith(rel))), 'feature data written', r.deleted)
    })

    // First start of the new build.
    r.firstRecord = await migrationRecord()
    assert(r.firstRecord?.status === 'SUCCEEDED' && r.firstRecord.attempts === 1 && !r.firstRecord.errorMessage, 'the removal succeeds on the first start', r.firstRecord)
    r.stillThere = []
    for (const rel of r.deleted) if (await exists(path.join(dataRoot, rel))) r.stillThere.push(rel)
    assert(r.stillThere.length === 0, 'every feature path is gone', r.stillThere)
    const expected = fx.without(r.before, [...r.deleted, 'memory/run_history_index.json', '.env'])
    const keptNow = (files) => Object.fromEntries(Object.entries(files).filter(([rel]) => rel in expected))
    const afterFirst = await dataSnapshot(fx.snapshot, dataRoot)
    r.changed = Object.keys(expected).filter((rel) => keptNow(afterFirst)[rel] !== expected[rel])
    assert(r.changed.length === 0, 'every other file is byte-identical', r.changed)
    const rows = JSON.parse(await fs.readFile(path.join(memory, 'run_history_index.json'), 'utf8'))
    r.rowsChanged = r.realRows.filter((row) => JSON.stringify(rows.find((x) => x.runId === row.runId)) !== JSON.stringify(row)).map((row) => row.runId)
    r.helperRowsLeft = rows.filter((row) => [...fx.IMPROVER_RUNS, fx.SERVER_HELPER_RUN, fx.EVOLVER_RUNS[0]].includes(row.runId)).map((row) => row.runId)
    assert(r.rowsChanged.length === 0 && r.helperRowsLeft.length === 0, 'real history rows unchanged; helper rows gone', r)
    r.envAfter = await fs.readFile(path.join(dataRoot, '.env'), 'utf8')
    assert(r.envAfter === r.envBefore, '.env is back to its exact pre-feature bytes', { before: r.envBefore, after: r.envAfter })
    r.counts = { featurePaths: r.deleted.length, keptFiles: Object.keys(expected).length }

    // A second start changes nothing.
    const indexAfterFirst = await fs.readFile(path.join(memory, 'run_history_index.json'), 'utf8')
    await restartBackend('backend-second-start')
    r.secondRecord = await migrationRecord()
    const afterSecond = await dataSnapshot(fx.snapshot, dataRoot)
    r.secondChanged = Object.keys(afterFirst).filter((rel) => !rel.startsWith('db/') && afterSecond[rel] !== afterFirst[rel])
    r.secondAdded = Object.keys(afterSecond).filter((rel) => !(rel in afterFirst))
    assert(r.secondRecord?.status === 'SUCCEEDED' && r.secondRecord.attempts === 1, 'the second start does not run it again', r.secondRecord)
    assert(r.secondChanged.length === 0 && (await fs.readFile(path.join(memory, 'run_history_index.json'), 'utf8')) === indexAfterFirst
      && (await fs.readFile(path.join(dataRoot, '.env'), 'utf8')) === r.envBefore, 'the second start changes nothing', { changed: r.secondChanged, added: r.secondAdded })

    // The product, as the user meets it after the upgrade.
    const listed = (await gql('{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId}} teamDefinitions{runs{teamRunId}}}}')).listWorkspaceRunHistory
    r.history = { agentRuns: objectsIn(listed).map((x) => x.runId).filter(Boolean), teamRuns: objectsIn(listed).map((x) => x.teamRunId).filter(Boolean) }
    assert(r.history.agentRuns.includes(r.runId) && r.history.teamRuns.includes(r.teamRunId)
      && !r.history.agentRuns.some((id) => [...fx.IMPROVER_RUNS, fx.SERVER_HELPER_RUN].includes(id)), 'run history lists the real runs and no helper run', r.history)
    r.agentIds = (await gql('{agentDefinitions{id name}}')).agentDefinitions
    assert(r.agentIds.some((d) => d.id === 'autobyteus-skill-evolver') && !r.agentIds.some((d) => d.id === fx.IMPROVER_ID), 'definitions: the Self-Evolver kept, the improver gone', r.agentIds.map((d) => d.id))
    await page.goto(`${env().frontUrl}/agents`, { waitUntil: 'domcontentloaded' }); await settle(page, 2500)
    await page.locator('main').getByText(r.names.agent, { exact: true }).first().waitFor({ timeout: 60000 })
    r.agentsPage = { selfEvolver: await page.locator('main').getByText('Skill Self-Evolver', { exact: true }).count(), traces: await featureTraces(page) }
    assert(r.agentsPage.selfEvolver > 0 && !r.agentsPage.traces.text, 'Agents page: the Skill Self-Evolver is listed, nothing of the feature', r.agentsPage)
    await shot(page, 'SIR-002-agents-page-1280', 1280)
    await page.goto(`${env().frontUrl}/memory`, { waitUntil: 'domcontentloaded' }); await settle(page, 3000)
    await waitFor('Memory page lists the real agent', async () => (await page.locator('body').innerText()).includes(r.names.agent), 60000, 1000)
    const memoryText = await page.locator('body').innerText()
    r.memoryPage = { traces: await featureTraces(page), helperIds: [...fx.IMPROVER_RUNS, fx.SERVER_HELPER_RUN].filter((id) => memoryText.includes(id)) }
    assert(!r.memoryPage.traces.text && r.memoryPage.helperIds.length === 0, 'Memory page: no improver and no helper run', r.memoryPage)
    await shot(page, 'SIR-002-memory-page-1280', 1280)

    // Settings: Basics without the card; Advanced without the keys, and re-adding one is refused.
    await page.goto(`${env().frontUrl}/settings?section=server-settings&mode=basics`, { waitUntil: 'domcontentloaded' }); await settle(page, 3000)
    await page.locator('[data-testid="settings-nav-server-settings-quick"]').first().click().catch(() => {}); await settle(page, 2000)
    r.basics = { cards: await page.locator('[data-testid$="feature-toggle-card"], [data-test$="feature-toggle-card"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid') ?? el.getAttribute('data-test'))), traces: await featureTraces(page) }
    assert(!r.basics.traces.text && r.basics.traces.hooks === 0 && !r.basics.cards.some((c) => /skill/i.test(c)), 'Settings Basics: no Skill Improvement card', r.basics)
    await shot(page, 'SIR-002-settings-basics-1280', 1280)
    await page.locator('[data-testid="settings-nav-server-settings-advanced"]').first().click(); await settle(page, 2500)
    const table = page.locator('table').filter({ hasText: 'APP_ENV' }).first(); await table.waitFor({ timeout: 60000 })
    r.advancedKeys = await table.locator('tbody tr td:first-child').evaluateAll((els) => els.map((el) => el.innerText.trim()).filter(Boolean))
    assert(r.advancedKeys.length > 0 && RETIRED_KEYS.every((key) => !r.advancedKeys.includes(key)), 'Settings Advanced: no retired key listed', r.advancedKeys)
    const addRow = table.locator('tbody tr').last()
    await addRow.locator('input').nth(0).fill(RETIRED_KEYS[0]); await addRow.locator('input').nth(1).fill('true'); await delay(300)
    await addRow.locator('button').last().click()
    // The page shows the refusal; the server's reason is read from the same mutation the page sends.
    r.refusal = await waitFor('refusal shown', async () => /Error updating server setting: [A-Z_]+/.exec(await page.locator('body').innerText())?.[0] ?? null, 30000, 500)
    r.serverReason = await gql('mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}', { k: RETIRED_KEYS[0], v: 'true' }).then((d) => `response: ${JSON.stringify(d)}`, (e) => `error: ${e.message}`)
    assert(/SERVER_SETTING_UPDATE_REJECTED/.test(r.refusal) && /retired|cannot be set|REJECTED/i.test(r.serverReason), 'adding a retired key is refused', r)
    await shot(page, 'SIR-002-settings-advanced-refused-1280', 1280)
    r.envAfterRefusal = await fs.readFile(path.join(dataRoot, '.env'), 'utf8')
    r.settingsAfterRefusal = (await gql('{getServerSettings{key}}')).getServerSettings.map((s) => s.key).filter((k) => RETIRED_KEYS.includes(k))
    assert(r.envAfterRefusal === r.envBefore && r.settingsAfterRefusal.length === 0, 'the refused key is not stored', r)

    // The existing runs: listed, no "Improve skills" (the released app showed it with ENABLE_SKILL_IMPROVEMENT=true), and they resume.
    await openAgentRun(page, r.runId)
    r.agentComposer = { composer: await page.locator('main textarea:visible').count(), traces: await featureTraces(page) }
    assert(r.agentComposer.composer > 0 && !r.agentComposer.traces.text && r.agentComposer.traces.hooks === 0, 'existing standalone run: composer without "Improve skills"', r.agentComposer)
    await shot(page, 'SIR-002-existing-run-composer-1280', 1280)
    const agentFrom = (await launches(r.runId)).length
    await typeAndSend(page, 'Resume. Marker SIR2-RESUME.')
    await waitFor('agent resumed and answered', async () => /SIR2-RESUME[\s\S]*OK/.test(await conversationText(page)), 90000, 1000)
    r.agentResumed = (await launches(r.runId)).slice(agentFrom)
    assert(r.agentResumed.length > 0 && r.agentResumed.every(([model, conversation]) => model === MODEL && conversation === r.agentSession), 'the standalone run resumes on its own conversation', { resumed: r.agentResumed, own: r.agentSession })
    await openTeamRun(page, r.teamRunId, r.teamDefinitionId)
    r.sidebarRuns = { team: await page.locator(sel(`workspace-team-row-${r.teamRunId}`)).count(),
      helpers: await page.locator([...fx.IMPROVER_RUNS, fx.SERVER_HELPER_RUN].map((id) => `[data-run-id="${id}"]`).join(', ')).count() }
    assert(r.sidebarRuns.team === 1 && r.sidebarRuns.helpers === 0, 'workspace: the Team run listed, no helper run', r.sidebarRuns)
    await selectTeamMember(page, r.teamRunId, '/member')
    r.memberComposer = { composer: await page.locator('main textarea:visible').count(), traces: await featureTraces(page) }
    assert(r.memberComposer.composer > 0 && !r.memberComposer.traces.text && r.memberComposer.traces.hooks === 0, 'Team member: composer without "Improve skills"', r.memberComposer)
    await shot(page, 'SIR-002-team-member-composer-1280', 1280)
    const memberSession = pick((pick(await teamTree(r.teamRunId), 'rootTeam')?.members ?? []).find((m) => pick(m, 'agentRunId') === r.members.member), 'platformAgentRunId') ?? null
    const memberFrom = (await launches(r.members.member)).length
    await typeAndSend(page, 'Resume member. Marker SIR2-MEMBER.')
    await waitLaunches('member resumed', r.members.member, memberFrom + 1)
    r.memberResumed = (await launches(r.members.member)).slice(memberFrom)
    r.memberSession = memberSession
    assert(memberSession && r.memberResumed.every(([model, conversation]) => model === MODEL && conversation === memberSession), 'the Team member resumes on its own conversation', { resumed: r.memberResumed, own: memberSession })
    await fs.writeFile(path.join(outDir, 'SIR-002-data-root-after.json'), JSON.stringify({ deleted: r.deleted, stillThere: r.stillThere, changed: r.changed, secondChanged: r.secondChanged, secondAdded: r.secondAdded, counts: r.counts }, null, 2))
    return r
  })
}
