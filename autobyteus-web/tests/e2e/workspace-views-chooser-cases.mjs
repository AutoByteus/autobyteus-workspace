// Run section views and the chat chooser's Remove (workspace-tree-vs-chooser, autobyteus-385): opt-in cases of
// delegated-launch-defaults-probe.mjs (real Chrome → Nuxt dev → this worktree's dist/app.js, scripted AGY, owned data root).
// They are registered only when selected, because WVC-003 archives runs and WVC-002 removes folders:
//   pnpm -C autobyteus-web test:e2e:workspace-views-chooser --output-dir <fresh dir>
// Runs are started in the UI where the case is about starting one (WVC-001, the running run of WVC-002); the runs a case
// only needs to exist are created through the public GraphQL API (createAgentRun / createAgentTeamRun / createAgentOrgRun),
// each in a folder of its own, so every assertion is about that folder.
//   WVC-001 (AC-012, VIS-017, DEC-010; REQ-009) A folder is listed only while it has a listed run: a Team-only and an
//           Org-only folder are listed; a folder with only an unsent draft is not; the first sent message lists it; after
//           its one run is stopped and archived in the Runs view it leaves the Workspaces view; the chat chooser offers
//           every folder throughout.
//   WVC-002 (AC-002, AC-005, CR-001; REQ-002, REQ-004) Remove in the chat chooser: the chosen folder, with a stopped Agent,
//           Team and Org run, leaves the chooser and the Workspaces view (also after the next poll); the chip falls back
//           to Temp workspace; its runs stay in the Runs view and in the server's history; its files stay. A folder with a
//           running run is refused with "Stop active runs before removing this workspace." and stays registered and listed.
//   WVC-003 (REQ-008, AC-009, AC-011; DS-002, DS-007) Runs → Workspaces → Runs with 9 runs of one agent in one folder: the
//           reads on the wire use the window null / 6 / null; "Show older (N)" counts every listed run; the Workspaces
//           tree shows that agent's newest 6 (and the running run, which the app holds live); after the round trip no run is missing from the Runs view; the view survives a
//           reload. "Archive all older" is refused while an older run runs (nothing archived), and after it is stopped
//           archives exactly the older runs.
//   WVC-004 (DS-002; design Risks: the phone and the desktop share runHistoryStore) The desktop in the Runs view reads with
//           null; the paired phone (/mobile, Phone Access) reads the complete history too (null, autobyteus-277 DS-001),
//           and the desktop's window stays null after the phone's reads.
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

export const WVC_CASES = ['WVC-001', 'WVC-002', 'WVC-003', 'WVC-004']

export const registerWorkspaceViewsChooserCases = (h) => {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, newChatFor, chooseModel, typeAndSend, AGY, MODEL, ids, names, env } = h
  const config = (workspaceRootPath) => ({ workspaceRootPath, llmModelIdentifier: MODEL, runtimeKind: AGY, autoExecuteTools: true, llmConfig: null })
  const folderSeq = { n: 0 }
  /** A new folder on disk with one file, registered through the API (it is then in the chooser, not in the left panel). */
  const newFolder = async (name) => {
    const root = path.join(path.dirname(env().dataRoot), 'wvc-folders', `${name}-${++folderSeq.n}`)
    await fs.mkdir(root, { recursive: true }); await fs.writeFile(path.join(root, 'keep.txt'), 'kept')
    const created = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId workspaceRootPath}}', { input: { rootPath: root } })).createWorkspace
    return { root: created.workspaceRootPath, id: created.workspaceId, name: path.basename(root) }
  }
  const agentRun = async (folder, agentKey = 'plain', { stop = true } = {}) => {
    const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids[agentKey], ...config(folder.root) } })).createAgentRun
    assert(created.success, created.message)
    if (stop) { const r = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: created.runId })).terminateAgentRun; assert(r.success, r.message) }
    return created.runId
  }
  const teamRun = async (folder) => {
    const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
      teamDefinitionId: ids.home, teamConfigs: [{ teamAddress: '/', ...config(folder.root) }],
      memberConfigs: [{ memberAddress: '/manager', agentDefinitionId: ids.manager, ...config(folder.root) }, { memberAddress: '/worker', agentDefinitionId: ids.worker, ...config(folder.root) }] } })).createAgentTeamRun
    assert(created.success, created.message)
    const r = (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: created.teamRunId })).terminateAgentTeamRun; assert(r.success, r.message)
    return created.teamRunId
  }
  const orgRun = async (folder) => {
    const created = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: {
      agentOrgDefinitionId: ids.hostOrg, rootConfiguration: config(folder.root), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun
    assert(created.success, created.message)
    const r = (await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: created.agentOrgRunId })).terminateAgentOrgRun; assert(r.success, r.message)
    return created.agentOrgRunId
  }
  const historyAll = async () => {
    const groups = (await gql('{listWorkspaceRunHistory(limitPerAgent:null){workspaceRootPath agentDefinitions{agentDefinitionId runs{runId isActive}} teamDefinitions{runs{teamRunId isActive}}}}')).listWorkspaceRunHistory
    const roots = (await gql('{listCollaborationRootHistory{__typename ... on AgentOrgRootHistoryObject{root_subject_kind root_run_id is_active}}}')).listCollaborationRootHistory
    return {
      agents: groups.flatMap((g) => g.agentDefinitions.flatMap((a) => a.runs.map((r) => ({ ...r, folder: g.workspaceRootPath, agent: a.agentDefinitionId })))),
      teams: groups.flatMap((g) => g.teamDefinitions.flatMap((t) => t.runs.map((r) => ({ ...r, folder: g.workspaceRootPath })))),
      orgs: roots.filter((r) => r.root_subject_kind === 'agent_org'),
    }
  }
  const registered = async () => (await gql('{workspaces{workspaceId workspaceRootPath}}')).workspaces

  // ------------------------------------------------------------------ UI helpers
  const mode = (page) => page.evaluate(() => Object.entries(window.localStorage).find(([k]) => k.startsWith('autobyteus.leftPanel.runSectionMode.'))?.[1] ?? 'workspaces')
  const openWorkspacePage = async (page) => {
    await page.goto(`${env().frontUrl}/workspace`, { waitUntil: 'domcontentloaded' })
    await page.locator(sel('run-section-view-menu')).waitFor({ timeout: 120000 }); await settle(page, 1500)
  }
  const chooseView = async (page, view) => {
    if ((await mode(page)) === view && (await page.locator(sel('run-section-title')).count())) return
    await page.locator(sel('run-section-view-menu')).click()
    await page.locator(sel(`run-section-view-${view}`)).click()
    await waitFor(`${view} view`, async () => (await mode(page)) === view, 15000)
    await settle(page, 1200)
  }
  const treeRoots = (page) => page.locator(sel('workspace-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-workspace-root')))
  const openChooser = async (page) => {
    if (!(await page.locator(sel('chat-workspace-menu')).isVisible().catch(() => false))) await page.locator(sel('chat-workspace-trigger')).click()
    await page.locator(sel('chat-workspace-menu')).waitFor()
    await page.locator(sel('chat-target-tab-workspaces')).click({ timeout: 2000 }).catch(() => undefined)
  }
  const closeChooser = async (page) => { if (await page.locator(sel('chat-workspace-menu')).isVisible().catch(() => false)) { await page.keyboard.press('Escape'); await delay(300) } }
  const chooserIds = (page) => page.locator('[data-test^="chat-workspace-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-workspace-option-', '')))
  const chipText = async (page) => (await page.locator(sel('chat-workspace-trigger')).innerText()).trim()
  const plainNewChat = async (page) => { await newChatFor(page, '/agents', names.plain); await chooseModel(page, page.locator('main'), AGY, MODEL) }
  const runRows = (page) => page.locator(sel('run-list-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-run-id')))
  const showOlder = async (page) => {
    const toggle = page.locator(sel('run-list-show-older'))
    if (await toggle.count() && (await toggle.getAttribute('aria-expanded')) !== 'true') { await toggle.click(); await delay(500) }
  }
  const olderCount = async (page) => {
    const toggle = page.locator(sel('run-list-show-older'))
    if (!(await toggle.count())) return 0
    if ((await toggle.getAttribute('aria-expanded')) === 'true') { await toggle.click(); await delay(400) }
    const text = (await toggle.innerText()).trim()
    const n = Number(text.match(/\((\d+)\)/)?.[1] ?? NaN)
    assert(Number.isFinite(n), 'Show older label has no count', text)
    return n
  }
  const toastText = async (page, text) => (await page.locator('body').innerText()).includes(text)
  /** Records the window of every ListWorkspaceRunHistory read the page sends. */
  const recordWindows = (page) => {
    const reads = []
    page.on('request', (req) => {
      if (!req.url().includes('/graphql') || req.method() !== 'POST') return
      try { const body = JSON.parse(req.postData() ?? '{}'); if (body.operationName === 'ListWorkspaceRunHistory') reads.push(body.variables?.limitPerAgent === undefined ? 'omitted' : body.variables.limitPerAgent) } catch { /* not JSON */ }
    })
    return reads
  }

  defineCase('WVC-001', 'AC-012/VIS-017/DEC-010: a folder is listed only while it has a listed run (Team-only and Org-only folders listed; a draft is not; the first message lists it; archiving its last run unlists it); the chooser offers every folder', async (page) => {
    const r = {}
    const teamOnly = await newFolder('team-only'), orgOnly = await newFolder('org-only'), life = await newFolder('lifecycle')
    r.teamRunId = await teamRun(teamOnly); r.orgRunId = await orgRun(orgOnly)
    await openWorkspacePage(page); await chooseView(page, 'workspaces')
    await waitFor('Team-only and Org-only folders listed', async () => { const roots = await treeRoots(page); return roots.includes(teamOnly.root) && roots.includes(orgOnly.root) }, 30000)
    r.rootsBefore = await treeRoots(page)
    assert(!r.rootsBefore.includes(life.root), 'a folder without runs is listed', r.rootsBefore)
    await shot(page, 'WVC-001-team-and-org-only-folders')

    // A draft in the folder: chosen in the chooser, text typed, not sent.
    await plainNewChat(page)
    await openChooser(page)
    r.chooserBefore = await chooserIds(page)
    for (const f of [teamOnly, orgOnly, life]) assert(r.chooserBefore.includes(f.id), `the chooser lacks ${f.name}`, r.chooserBefore)
    await page.locator(sel(`chat-workspace-option-${life.id}`)).click(); await delay(500)
    r.chip = await chipText(page)
    assert(r.chip.includes(life.name), 'the chip shows the chosen folder', r.chip)
    const input = page.locator('main textarea:visible').last()
    await input.click(); await input.fill('WVC-001 first message'); await delay(6000) // more than one 5 s poll
    r.rootsWithDraft = await treeRoots(page)
    assert(!r.rootsWithDraft.includes(life.root), 'a folder with only an unsent draft is listed', r.rootsWithDraft)
    await input.press('Enter')
    await page.waitForURL((u) => /[?&]id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 120000 })
    r.runId = new URL(page.url()).searchParams.get('id')
    await waitFor('the folder appears with its first sent message', async () => (await treeRoots(page)).includes(life.root), 30000)
    await shot(page, 'WVC-001-folder-listed-after-first-message')

    // Its one run is stopped and archived in the Runs view: the folder leaves the Workspaces view.
    await chooseView(page, 'runs')
    const row = page.locator(`${sel('run-list-row')}[data-run-id="${r.runId}"]`)
    await row.waitFor({ timeout: 30000 })
    const stop = row.locator(sel('run-list-stop'))
    if (await stop.count()) { await stop.click(); await waitFor('run stopped', async () => !(await historyAll()).agents.find((x) => x.runId === r.runId)?.isActive, 60000) }
    await row.hover()
    await waitFor('archive offered', async () => (await row.locator(sel('run-list-archive')).count()) > 0, 30000)
    await row.locator(sel('run-list-archive')).click()
    await waitFor('run archived on the server', async () => !(await historyAll()).agents.some((x) => x.runId === r.runId), 30000)
    await waitFor('row leaves the Runs view', async () => !(await runRows(page)).includes(r.runId), 30000)
    await chooseView(page, 'workspaces')
    await waitFor('the folder leaves the Workspaces view', async () => !(await treeRoots(page)).includes(life.root), 30000)
    r.rootsAfter = await treeRoots(page)
    assert(r.rootsAfter.includes(teamOnly.root) && r.rootsAfter.includes(orgOnly.root), 'the other folders stay', r.rootsAfter)
    await shot(page, 'WVC-001-folder-unlisted-after-archive')
    await plainNewChat(page); await openChooser(page)
    r.chooserAfter = await chooserIds(page)
    assert(r.chooserAfter.includes(life.id), 'the archived folder is no longer offered in the chooser', r.chooserAfter)
    await closeChooser(page)
    assert((await registered()).some((w) => w.workspaceId === life.id), 'the folder is unregistered')
    return { folders: { teamOnly, orgOnly, life }, ...r }
  })

  defineCase('WVC-002', 'AC-002/AC-005/CR-001: Remove in the chooser: the chosen folder with stopped Agent, Team and Org runs leaves the chooser and the Workspaces view; the chip falls back to Temp; its runs and files stay; a folder with a running run is refused and unchanged', async (page) => {
    const r = {}
    const removed = await newFolder('removed'), busy = await newFolder('busy')
    r.agentRunId = await agentRun(removed); r.teamRunId = await teamRun(removed); r.orgRunId = await orgRun(removed)
    // The running run is started in the UI, in the busy folder.
    await plainNewChat(page); await openChooser(page)
    await page.locator(sel(`chat-workspace-option-${busy.id}`)).click(); await delay(400)
    await typeAndSend(page, 'WVC-002 keep running')
    await page.waitForURL((u) => /[?&]id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 120000 })
    r.runningRunId = new URL(page.url()).searchParams.get('id')
    await waitFor('the busy run is active', async () => (await historyAll()).agents.find((x) => x.runId === r.runningRunId)?.isActive === true, 60000)

    await openWorkspacePage(page); await chooseView(page, 'workspaces')
    await waitFor('both folders listed', async () => { const roots = await treeRoots(page); return roots.includes(removed.root) && roots.includes(busy.root) }, 30000)

    // Remove the chosen folder from a New chat's chooser.
    await plainNewChat(page); await openChooser(page)
    await page.locator(sel(`chat-workspace-option-${removed.id}`)).click(); await delay(400)
    r.chipBefore = await chipText(page)
    assert(r.chipBefore.includes(removed.name), 'the chip shows the folder before Remove', r.chipBefore)
    await openChooser(page)
    await page.locator(sel(`chat-workspace-option-${removed.id}`)).hover()
    await page.locator(sel(`chat-workspace-remove-${removed.id}`)).click()
    const dialog = page.locator('[role="dialog"]'); await dialog.waitFor()
    r.confirmation = (await dialog.innerText()).trim()
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    await waitFor('success toast', () => toastText(page, `${removed.name} removed. Files, memories, and run history were not deleted.`), 15000)
    await closeChooser(page)
    r.chipAfter = await chipText(page)
    assert(/Temp/i.test(r.chipAfter), 'the chip did not fall back to Temp workspace', r.chipAfter)
    await openChooser(page)
    assert(!(await chooserIds(page)).includes(removed.id), 'the removed folder is still offered')
    await closeChooser(page)
    await shot(page, 'WVC-002-removed-chip-temp')

    // Gone from the Workspaces view, also after a poll; its runs stay in the Runs view and in the history; files stay.
    await openWorkspacePage(page); await chooseView(page, 'workspaces')
    await delay(6000)
    r.rootsAfterPoll = await treeRoots(page)
    assert(!r.rootsAfterPoll.includes(removed.root), 'the removed folder is listed in the Workspaces view', r.rootsAfterPoll)
    assert(r.rootsAfterPoll.includes(busy.root), 'the busy folder is not listed', r.rootsAfterPoll)
    await chooseView(page, 'runs'); await showOlder(page)
    await waitFor('the removed folder\'s runs are in the Runs view', async () => { const rows = await runRows(page); return [r.agentRunId, r.teamRunId, r.orgRunId].every((id) => rows.includes(id)) }, 30000)
    await shot(page, 'WVC-002-runs-view-keeps-runs')
    const history = await historyAll()
    assert(history.agents.some((x) => x.runId === r.agentRunId) && history.teams.some((x) => x.teamRunId === r.teamRunId) && history.orgs.some((x) => x.root_run_id === r.orgRunId), 'the history lost a run of the removed folder')
    assert(!(await registered()).some((w) => w.workspaceId === removed.id), 'the folder is still registered')
    assert(existsSync(path.join(removed.root, 'keep.txt')), 'the folder\'s files were deleted')

    // Refused while a run is running there: nothing changes.
    await plainNewChat(page); await openChooser(page)
    await page.locator(sel(`chat-workspace-option-${busy.id}`)).hover()
    await page.locator(sel(`chat-workspace-remove-${busy.id}`)).click()
    const refuse = page.locator('[role="dialog"]'); await refuse.waitFor()
    await refuse.getByRole('button', { name: 'Remove', exact: true }).click()
    await waitFor('refusal toast', () => toastText(page, 'Stop active runs before removing this workspace.'), 15000)
    await shot(page, 'WVC-002-remove-refused')
    await closeChooser(page)
    assert((await registered()).some((w) => w.workspaceId === busy.id), 'the busy folder was unregistered')
    await openChooser(page)
    assert((await chooserIds(page)).includes(busy.id), 'the busy folder is no longer offered')
    await closeChooser(page)
    await openWorkspacePage(page); await chooseView(page, 'workspaces')
    assert((await treeRoots(page)).includes(busy.root), 'the busy folder left the Workspaces view')
    // Leave nothing running for later cases.
    const stopped = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: r.runningRunId })).terminateAgentRun
    assert(stopped.success, stopped.message)
    return { folders: { removed, busy }, ...r }
  })

  defineCase('WVC-003', 'REQ-008/AC-009/AC-011, DS-002/DS-007: Runs → Workspaces → Runs with 9 runs of one agent: windows null/6/null; Show older (N) counts every run; the tree shows the newest 6; nothing missing after the round trip; the view survives a reload; Archive all older is all-or-nothing', async (page) => {
    const r = {}
    const folder = await newFolder('many-runs')
    // The oldest run of the folder stays running (it is among the older runs); then nine stopped runs.
    r.runningRunId = await agentRun(folder, 'plain', { stop: false })
    await delay(50)
    r.runIds = []; for (let i = 0; i < 9; i += 1) { r.runIds.push(await agentRun(folder)); await delay(20) }
    const reads = recordWindows(page)
    await openWorkspacePage(page); await chooseView(page, 'workspaces')
    reads.length = 0
    await chooseView(page, 'runs')
    await waitFor('a read with the Runs window', () => reads.includes(null), 15000)
    const history = await historyAll()
    r.listed = history.agents.length + history.teams.length + history.orgs.length
    await waitFor('every folder run in the Runs view', async () => { await showOlder(page); const rows = await runRows(page); return r.runIds.every((id) => rows.includes(id)) }, 30000)
    r.olderBefore = await olderCount(page)
    r.newestShown = (await runRows(page)).length
    assert(r.newestShown === 5 && r.olderBefore === r.listed - 5, 'Show older does not count every listed run', { newestShown: r.newestShown, older: r.olderBefore, listed: r.listed })
    await shot(page, 'WVC-003-runs-view-fold')

    reads.length = 0
    await chooseView(page, 'workspaces')
    await waitFor('a read with the Workspaces window', () => reads.includes(6), 15000)
    r.readsToWorkspaces = [...reads]
    assert(!reads.includes(null), 'the Workspaces view read every run', reads)
    const folderRow = page.locator(`${sel('workspace-row')}[data-workspace-root="${folder.root}"]`)
    await folderRow.waitFor({ timeout: 30000 })
    if ((await folderRow.getAttribute('aria-expanded')) !== 'true') { await folderRow.locator('button').first().click(); await delay(600) }
    const agentRow = page.locator(`${sel('workspace-agent-row')}[data-workspace-root="${folder.root}"][data-agent-definition-id="${ids.plain}"]`)
    await agentRow.waitFor({ timeout: 30000 })
    if ((await agentRow.getAttribute('aria-expanded')) !== 'true') { await agentRow.click(); await delay(600) }
    const mine = [r.runningRunId, ...r.runIds]
    await waitFor('the folder\'s runs in the tree', async () => (await page.locator(sel('workspace-agent-run-row')).count()) > 0, 15000)
    r.treeRuns = (await page.locator(sel('workspace-agent-run-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-run-id')))).filter((id) => mine.includes(id))
    // The window reads the newest 6; the tree also shows a run the app holds live (the running run, discovered by the
    // Runs view's read), as it shows any run with a live context. So: the newest 6 stopped runs, plus at most the running one.
    const newestSix = r.runIds.slice(-6)
    r.treeExtra = r.treeRuns.filter((id) => !newestSix.includes(id))
    assert(newestSix.every((id) => r.treeRuns.includes(id)) && r.treeExtra.every((id) => id === r.runningRunId), 'the Workspaces tree does not show the agent\'s newest 6', { treeRuns: r.treeRuns, newestSix, running: r.runningRunId })
    await shot(page, 'WVC-003-workspaces-view-window-6')

    reads.length = 0
    await chooseView(page, 'runs')
    await waitFor('a read with the Runs window again', () => reads.includes(null), 15000)
    r.readsBackToRuns = [...reads]
    await delay(6000) // one more poll
    await showOlder(page)
    const rowsAfter = await runRows(page)
    r.missingAfterRoundTrip = [r.runningRunId, ...r.runIds].filter((id) => !rowsAfter.includes(id))
    assert(r.missingAfterRoundTrip.length === 0, 'runs disappeared from the Runs view after the round trip', r.missingAfterRoundTrip)
    r.olderAfter = await olderCount(page)
    assert(r.olderAfter === r.olderBefore, 'Show older changed after the round trip', { before: r.olderBefore, after: r.olderAfter })

    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator(sel('run-section-view-menu')).waitFor({ timeout: 120000 }); await settle(page, 1500)
    r.titleAfterReload = (await page.locator(sel('run-section-title')).innerText()).trim()
    assert(r.titleAfterReload === 'Runs' && (await mode(page)) === 'runs', 'the Runs view was not kept on reload', r.titleAfterReload)

    // Archive all older: refused while an older run runs; then archives exactly the older runs.
    const newest = (await runRows(page)).slice(0, 5)
    await showOlder(page)
    assert(!newest.includes(r.runningRunId), 'the running run is among the newest 5; the case needs it older', newest)
    await page.locator(sel('run-list-archive-older')).click()
    await waitFor('refusal toast', () => toastText(page, 'Stop running runs first.'), 10000)
    assert(await page.locator('[role="dialog"]').count() === 0, 'a confirmation opened although an older run runs')
    const unchanged = await historyAll()
    assert(unchanged.agents.length + unchanged.teams.length + unchanged.orgs.length === r.listed, 'a run was archived after the refusal')
    const stopped = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: r.runningRunId })).terminateAgentRun
    assert(stopped.success, stopped.message)
    await waitFor('the running row stops', async () => !(await historyAll()).agents.find((x) => x.runId === r.runningRunId)?.isActive, 30000)
    await delay(6000)
    await showOlder(page)
    await page.locator(sel('run-list-archive-older')).click()
    const confirm = page.locator('[role="dialog"]'); await confirm.waitFor()
    r.archiveConfirmation = (await confirm.innerText()).trim()
    await shot(page, 'WVC-003-archive-older-confirmation')
    await confirm.getByRole('button', { name: 'Archive all', exact: true }).click()
    await waitFor('older runs archived', async () => { const h = await historyAll(); return h.agents.length + h.teams.length + h.orgs.length === 5 }, 60000)
    const left = await historyAll()
    r.remaining = [...left.agents.map((x) => x.runId), ...left.teams.map((x) => x.teamRunId), ...left.orgs.map((x) => x.root_run_id)]
    assert(newest.every((id) => r.remaining.includes(id)), 'a run of the newest 5 was archived', { newest, remaining: r.remaining })
    await waitFor('no fold after archiving', async () => (await page.locator(sel('run-list-show-older')).count()) === 0, 30000)
    await shot(page, 'WVC-003-after-archive-older')
    return { folder, ...r }
  })

  defineCase('WVC-004', 'DS-002/design Risks: the desktop Runs view reads with null, and the paired phone reads the complete history (null, autobyteus-277 DS-001) without changing the desktop window', async (page, context) => {
    const r = {}
    const desktopReads = recordWindows(page)
    await openWorkspacePage(page); await chooseView(page, 'runs')
    desktopReads.length = 0 // the page's first read follows the stored view; count the reads of the Runs view only
    await delay(6000)
    r.desktopReads = [...new Set(desktopReads)]
    assert(desktopReads.length > 0 && desktopReads.every((w) => w === null), 'the desktop Runs view read with another window', desktopReads)
    const { backendUrl, frontUrl } = env()
    const remote = `http://192.168.77.11:${new URL(backendUrl).port}`
    const settings = await fetch(`${backendUrl}/rest/remote-access/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneAccessEnabled: true }) })
    assert(settings.ok, 'Phone Access enabled', await settings.text())
    const session = await (await fetch(`${backendUrl}/rest/remote-access/pairing-sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ connectionWay: 'local_network', serverBaseUrl: remote, trustedPrivateHttpAcknowledged: true }) })).json()
    assert(session.mobileUrl, 'pairing session', session)
    const phone = await context.browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' })
    const phoneReads = []
    try {
      await phone.route(`${remote}/**`, async (route) => {
        const req = route.request()
        if (req.url().includes('/graphql') && req.method() === 'POST') {
          try { const body = JSON.parse(req.postData() ?? '{}'); if (body.operationName === 'ListWorkspaceRunHistory') phoneReads.push(body.variables && 'limitPerAgent' in body.variables ? body.variables.limitPerAgent : 'omitted') } catch { /* not JSON */ }
        }
        await route.fulfill({ response: await route.fetch({ url: req.url().replace(remote, backendUrl) }) })
      })
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
      await mobile.goto(`${frontUrl}/mobile?pairing=${encodeURIComponent(new URL(session.mobileUrl).searchParams.get('pairing'))}`, { waitUntil: 'domcontentloaded', timeout: 180000 })
      await mobile.locator('[data-testid="mobile-pair-button"]').click({ timeout: 120000 })
      // The phone's run list (autobyteus-277) reads the complete history, as the desktop Runs view does.
      await mobile.locator('[data-testid="mobile-run-list"]').waitFor({ timeout: 120000 })
      await waitFor('the phone reads the history', () => phoneReads.length > 0, 60000)
      await mobile.screenshot({ path: path.join(env().outDir, 'WVC-004-phone-run-list.png') })
      r.phoneReads = [...phoneReads]
      assert(phoneReads.every((w) => w === null), 'the phone read with another window', phoneReads)
    } finally { await phone.close() }
    desktopReads.length = 0
    await delay(6000)
    r.desktopReadsAfterPhone = [...new Set(desktopReads)]
    assert(desktopReads.length > 0 && desktopReads.every((w) => w === null), 'the desktop window changed after the phone read', desktopReads)
    return r
  })
}
