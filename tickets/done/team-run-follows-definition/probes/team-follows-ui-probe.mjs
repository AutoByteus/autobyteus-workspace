#!/usr/bin/env node
// team-run-follows-definition AC-009 (REQ-008), AC-008 and design note N-8 in the real desktop renderer against a real node.
// Ticket-owned probe (not a package script): the journey belongs to this ticket's validation.
//
// Stack (probe-owned, removed in `finally`): the built node (`autobyteus-server-ts/dist/app.js`) on a temp data root and
// HOME, with the scripted Antigravity CLI (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`: `CALL_TOOL:{…}` calls the
// real agent tool, `HOLD_TURN` keeps a turn running, anything else is answered `OK`), `nuxt dev` (the desktop renderer)
// and fresh headless Chromium. No model, no keys. A local agent package holds the Team; the probe edits its
// `team-config.json` on disk while the Team view is open (the package folder watcher reloads it).
//
//   TFU-01 (AC-009) the open Team view: lead and writer shown; the writer posted to the lead earlier. The definition gains a
//          reviewer and loses the writer: without a reload the reviewer row appears (Offline) and the writer row goes; the
//          user selects the reviewer and sends from the composer: it starts and answers; the Team tab still shows the
//          writer's earlier message, named by its address.
//   TFU-02 (AC-008) the coordinator becomes the reviewer: after a fresh load of the Team view the reviewer is the focused
//          member and carries the coordinator mark; a message from the composer goes to it.
//   TFU-03 (AC-003, design SR-010) a member holding a turn is removed while the user looks at another member: its row in the
//          Workspaces tree stays, tagged "Leaving"; the row opens it (running, Stop shown); after the Stop it is released and
//          its row goes.
//   TFU-06 (SR-010) the team is stopped while a member is leaving: no leaving row is left; the user's next message reopens
//          the team and the stored marker is cleared.
//   TFU-05 (AC-005, SR-010) a delegated Team copy's member removed while busy: its row under the delegating run is tagged
//          "Leaving" (server row and rendered tag); interrupted, it goes.
//   TFU-04 (AC-003, DEC-002) a real Codex member (auto-execute off, `gpt-6.1-terra`) waits for approval; it is removed while
//          the user looks at another member; its Leaving row opens it, the user approves, the command runs, it finishes and
//          its row goes. Needs a signed-in `codex` (a throwaway CODEX_HOME links the host `auth.json`).
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`; Chromium (--browser-executable, default /usr/bin/chromium).
// The probe root is `$HOME/.autobyteus-e2e/team-follows-ui-probe-*` (outside /tmp for TFU-04), removed at the end.
// Run: node tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs --output-dir <fresh dir>
import fs from 'node:fs/promises'
import { createWriteStream, existsSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const probeDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(probeDir, '../../../..')
const webDir = path.join(repoRoot, 'autobyteus-web')
const serverDir = path.join(repoRoot, 'autobyteus-server-ts')
const access = await import(pathToFileURL(path.join(webDir, 'tests/e2e/fixtures/probe-node-access.mjs')).href)
access.attachToProbeProcess()
const require = createRequire(path.join(webDir, 'package.json'))
const { chromium } = require('playwright-core')
const WS = createRequire(path.join(serverDir, 'package.json'))('ws')

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback }
const outDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `team-follows-ui-probe-${Date.now()}`)))
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/usr/bin/chromium')
const fakeAgy = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const u = randomUUID().slice(0, 6)
const ids = { lead: `tfu-lead-${u}`, writer: `tfu-writer-${u}`, reviewer: `tfu-reviewer-${u}`, host: `tfu-host-${u}`, coder: `tfu-coder-${u}` }
const teamName = `tfu-team-${u}`
const codexTeamName = `tfu-codex-team-${u}`
const evidence = { startedAt: new Date().toISOString(), steps: [], processes: [], cleanup: [], browserErrors: [], cases: {} }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const step = (text, details) => { evidence.steps.push({ at: new Date().toISOString(), text, details: details ?? null }); console.log(`  · ${text}`) }
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.unref(); s.on('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const waitFor = async (label, fn, timeout = 90000, interval = 500) => {
  const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`)
}
const baseEnv = () => Object.fromEntries(['PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${label}.log`), { flags: 'a' })
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log)
  owned.push(child); evidence.processes.push({ label, pid: child.pid })
  return child
}
const stopOwned = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
  return exited ? 'SIGTERM' : 'SIGKILL'
}

let ownedRoot, dataRoot, packageRoot, configFile, codexConfigFile, backendUrl, frontUrl, browser, teamRunId, teamDefinitionId, launch
const runOf = {}
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const tree = async () => JSON.parse(await fs.readFile(path.join(dataRoot, 'memory', 'agent_teams', teamRunId, 'team_run_execution_tree.json'), 'utf8'))
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
let teamConfig
const writeConfig = async (next) => { teamConfig = next; await fs.writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`) }
const writeCodexConfig = async (next) => { await fs.writeFile(codexConfigFile, `${JSON.stringify(next, null, 2)}\n`) }
const member = (memberName, ref) => ({ memberName, ref, refScope: 'shared' })

/** One command on the Team's own stream (the backend), e.g. a scripted message or an interrupt; waits for `until` frames. */
const teamSocket = async (id = teamRunId) => {
  const socket = new WS(access.ownerSocketUrl(`${backendUrl.replace('http', 'ws')}/ws/agent-team/${id}`))
  const frames = []
  socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
  await waitFor('team stream snapshot', () => frames.some((f) => f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT'), 30000)
  const send = (agentRunId, content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: agentRunId, content, message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`, context_file_paths: [], image_urls: [] } }))
  const interrupt = (agentRunId) => socket.send(JSON.stringify({ type: 'INTERRUPT_GENERATION', payload: { agent_run_id: agentRunId, command_id: randomUUID() } }))
  return { socket, frames, send, interrupt, close: () => socket.terminate() }
}
const conversationText = async (agentRunId) => JSON.stringify((await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: teamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation ?? null)

// The rendered Team view.
// The app lists a running Team's members as rows of the sidebar's run tree (WorkspaceStableExecutionRow).
const rowPrefix = (id = teamRunId) => `workspace-team-member-${id}-`
const memberRows = async (page, id = teamRunId) => page.locator(`[data-test^="${rowPrefix(id)}/"]`).evaluateAll((rows, prefix) => rows.map((row) => ({
  address: row.getAttribute('data-test').slice(prefix.length), text: row.innerText.replace(/\s+/g, ' ').trim(),
  leaving: Boolean(row.querySelector('[data-test="workspace-member-leaving"]')),
  current: row.getAttribute('aria-current') ?? row.className.includes('bg-indigo') })), rowPrefix(id))
const leavingRow = (rows, address) => rows.find((r) => r.address === address && r.leaving)
const hasRow = (rows, address) => rows.some((r) => r.address === address)
/** Anything the page shows about a leaving member: the "Leaving" tag (TeamMembersPanel) or the word. */
const leavingMarks = (page) => page.evaluate(() => ({ tags: [...document.querySelectorAll('[data-test="workspace-member-leaving"]')].map((tag) => ({ text: tag.textContent.trim(), title: tag.getAttribute('title') })) }))
const headerText = (page) => page.locator('main').first().evaluate((main) => (main.querySelector('header, h1, h2, [class*="header"]')?.textContent ?? main.innerText.slice(0, 80)).replace(/\s+/g, ' ').trim())
const dataTests = (page) => page.evaluate(() => [...new Set([...document.querySelectorAll('[data-test],[data-testid]')].map((e) => e.getAttribute('data-test') ?? e.getAttribute('data-testid')))])
const composer = (page) => page.locator('main textarea[aria-autocomplete="list"]').last()
const sendFromComposer = async (page, text) => {
  const input = composer(page); await input.waitFor({ timeout: 60000 })
  await input.click(); await page.keyboard.type(text); await delay(300); await page.keyboard.press('Enter')
}
const expandWorkspaces = async (page) => {
  const folders = page.locator('[data-test="workspace-row"]')
  for (let i = 0; i < await folders.count(); i += 1) {
    const row = folders.nth(i); const expandable = row.locator('xpath=ancestor-or-self::*[@aria-expanded][1]')
    if (await expandable.count() && await expandable.getAttribute('aria-expanded') === 'false') { await row.click(); await delay(500) }
  }
}
const openTeamRun = async (page, id = teamRunId, definitionId = teamDefinitionId) => {
  await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500)
  const row = page.locator(`[data-test="workspace-team-row-${id}"]`)
  await waitFor('team run row', async () => {
    if (await row.isVisible().catch(() => false)) return true
    await expandWorkspaces(page)
    const group = page.locator(`[data-test="workspace-team-definition-row-${definitionId}"]`).first()
    if (await group.isVisible().catch(() => false) && await row.count() === 0) { await group.click(); await delay(600) }
    return row.isVisible().catch(() => false)
  }, 60000, 1500)
  await row.click(); await waitFor('member rows', async () => (await memberRows(page, id)).length > 0, 60000, 1000); await delay(2000)
}
const sidebarText = (page) => page.locator('aside, nav').first().innerText().catch(() => '')

const cases = []
const defineCase = (id, fn) => cases.push({ id, fn })

defineCase('TFU-01', async (page) => {
  await openTeamRun(page)
  const before = await memberRows(page)
  await shot(page, 'TFU-01-a-before')
  step('team view open', { before, dataTests: (await dataTests(page)).slice(0, 120) })
  assert(hasRow(before, '/lead') && hasRow(before, '/writer'), 'lead and writer are shown', before)
  await writeConfig({ ...teamConfig, members: [member('lead', ids.lead), member('reviewer', ids.reviewer)],
    handoffs: [{ from: '/lead', to: '/reviewer', rules: ['Review drafts.'] }] })
  const after = await waitFor('reviewer row shown and writer row gone, without a reload', async () => {
    const rows = await memberRows(page)
    return hasRow(rows, '/reviewer') && !hasRow(rows, '/writer') ? rows : null
  }, 60000)
  await shot(page, 'TFU-01-b-after-change')
  step('rows after the change (no reload)', { after })
  const reviewerRow = after.find((r) => r.address === '/reviewer')
  const t = await tree(); runOf['/reviewer'] = t.rootTeam.members.find((m) => m.address === '/reviewer').agentRunId
  const reviewerStatusBefore = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRunId })).getTeamRunResumeConfig
  await page.locator(`[data-test="${rowPrefix()}/reviewer"]`).first().click(); await delay(1500)
  step('reviewer selected', { header: await headerText(page), reviewerRow })
  await sendFromComposer(page, 'Hello reviewer, please answer.')
  await waitFor('the reviewer started and answered', async () => (await conversationText(runOf['/reviewer'])).includes('"OK"'), 90000)
  await waitFor('the answer is rendered', async () => (await page.locator('main').innerText()).includes('OK'), 30000)
  await shot(page, 'TFU-01-c-reviewer-answered')
  // The Team tab (filtered by the focused member) keeps the removed writer's earlier message to the lead.
  await page.locator(`[data-test="${rowPrefix()}/lead"]`).first().click(); await delay(1500)
  const tab = page.getByText('Team', { exact: true }).first()
  const tabFound = await tab.isVisible().catch(() => false)
  if (tabFound) { await tab.click(); await delay(1500) }
  const mainText = await page.locator('body').innerText()
  await shot(page, 'TFU-01-d-team-tab')
  const writerMessageShown = mainText.includes(`WRITER-NOTE-${u}`)
  step('Team tab', { tabFound, writerMessageShown, writerAddressShown: /\/?writer/.test(mainText), excerpt: mainText.slice(0, 1500) })
  assert(writerMessageShown, "the removed writer's earlier message is still in the Team tab", mainText.slice(0, 2000))
  return { before, after, reviewerRow, writerMessageShown, reviewerOfflineBeforeMessage: JSON.stringify(reviewerStatusBefore).slice(0, 300) }
})

defineCase('TFU-02', async (page) => {
  await writeConfig({ ...teamConfig, coordinatorMemberName: 'reviewer' })
  await waitFor('stored coordinator', async () => (await tree()).rootTeam.coordinatorAddress === '/reviewer', 60000)
  await openTeamRun(page)
  const rows = await memberRows(page)
  await shot(page, 'TFU-02-a-new-coordinator')
  const header = await headerText(page)
  step('fresh load after the coordinator change', { rows, header })
  assert(/reviewer/i.test(header), 'the new coordinator is the focused member (the chat header names it)', { header, rows })
  const before = (await conversationText(runOf['/reviewer'])).split('"OK"').length
  await sendFromComposer(page, 'Hello coordinator.')
  await waitFor('the coordinator answered the composer message', async () => (await conversationText(runOf['/reviewer'])).split('"OK"').length > before, 90000)
  await shot(page, 'TFU-02-b-coordinator-answered')
  await writeConfig({ ...teamConfig, coordinatorMemberName: 'lead' })
  await waitFor('coordinator back to the lead', async () => (await tree()).rootTeam.coordinatorAddress === '/lead', 60000)
  return { rows, header }
})

defineCase('TFU-03', async (page) => {
  // A removed busy member: its Workspaces-tree row stays, tagged "Leaving", and still opens; after it stops the row goes.
  await openTeamRun(page)
  const stream = await teamSocket()
  try {
    await page.locator(`[data-test="${rowPrefix()}/reviewer"]`).first().click(); await delay(1500)
    await sendFromComposer(page, 'HOLD_TURN')
    await waitFor('the reviewer is busy', () => stream.frames.some((f) => f.type === 'AGENT_STATUS' && f.payload?.agent_run_id === runOf['/reviewer'] && f.payload?.status === 'running'), 60000)
    // The user moves to the lead; the definition removes the reviewer.
    await page.locator(`[data-test="${rowPrefix()}/lead"]`).first().click(); await delay(1500)
    await writeConfig({ ...teamConfig, members: [member('lead', ids.lead)], handoffs: [] })
    const rowsWhileLeaving = await waitFor('the reviewer row is tagged Leaving', async () => { const rows = await memberRows(page); return leavingRow(rows, '/reviewer') ? rows : null }, 60000)
    const marks = await leavingMarks(page)
    await shot(page, 'TFU-03-a-leaving-tag')
    // The row still opens the member; its chat shows the running turn and the Stop.
    await page.locator(`[data-test="${rowPrefix()}/reviewer"]`).first().click(); await delay(1500)
    const header = await headerText(page)
    const stopButton = page.locator('main button[aria-label*="Stop" i], main button[title*="Stop" i]').first()
    const stopVisible = await stopButton.isVisible().catch(() => false)
    await shot(page, 'TFU-03-b-leaving-member-opened')
    const rowText = (await memberRows(page)).find((r) => r.address === '/reviewer')?.text ?? null
    const opened = /reviewer/i.test(header) && /Running/i.test(header)
    step('reviewer leaving', { rowsWhileLeaving, marks, header, stopVisible, opened, rowText })
    // Finish it either way, so the next cases start clean: the chat's Stop when the row opened it, else the team stream.
    if (opened && stopVisible) await stopButton.click(); else stream.interrupt(runOf['/reviewer'])
    const rowsAfter = await waitFor('the released reviewer row goes', async () => { const rows = await memberRows(page); return hasRow(rows, '/reviewer') ? null : rows }, 60000)
    await shot(page, 'TFU-03-c-released')
    const result = { rowsWhileLeaving, marks, header, stopVisible, opened, rowText, rowsAfter }
    evidence.cases['TFU-03-observed'] = result
    assert(marks.tags.some((tag) => tag.text === 'Leaving'), 'the tag reads Leaving', marks)
    assert(opened, 'the Leaving row opens the member (its chat, running, with Stop)', result)
    return result
  } finally { stream.close() }
})

defineCase('TFU-06', async (page) => {
  // Stop the team while a member is leaving: no leaving row is left; reopening clears the stored marker.
  await writeConfig({ ...teamConfig, members: [member('lead', ids.lead), member('scout', ids.reviewer)] })
  await waitFor('scout joined', async () => (await tree()).rootTeam.members.some((m) => m.address === '/scout'), 60000)
  runOf['/scout'] = (await tree()).rootTeam.members.find((m) => m.address === '/scout').agentRunId
  await openTeamRun(page)
  const stream = await teamSocket()
  try {
    stream.send(runOf['/scout'], 'HOLD_TURN'); await delay(2500)
    await writeConfig({ ...teamConfig, members: [member('lead', ids.lead)], handoffs: [] })
    await waitFor('the scout row is tagged Leaving', async () => leavingRow(await memberRows(page), '/scout'), 60000)
    await shot(page, 'TFU-06-a-leaving')
    await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRunId })
    const rowsAfterStop = await waitFor('no leaving row after the Stop', async () => { const rows = await memberRows(page); return rows.some((r) => r.leaving) ? null : rows }, 60000)
    await shot(page, 'TFU-06-b-stopped')
    const markerAfterStop = ((await tree()).rootTeam.formerMembers ?? []).filter((m) => m.leaving).map((m) => m.address)
    step('team stopped while the scout was leaving', { rowsAfterStop, markerAfterStop })
    // Reopening (the user's message) clears the marker.
    stream.send(runOf['/lead'], 'Reply OK.')
    await waitFor('the marker is cleared after reopening', async () => !((await tree()).rootTeam.formerMembers ?? []).some((m) => m.leaving), 90000)
    return { rowsAfterStop, markerAfterStop }
  } finally { stream.close() }
})

defineCase('TFU-05', async (page) => {
  // A delegated Team copy's member removed while busy: its row under the delegating run is tagged Leaving while the copy runs.
  await writeConfig({ ...teamConfig, members: [member('lead', ids.lead), member('scout', ids.reviewer)] })
  await waitFor('scout back in the definition', async () => (await tree()).rootTeam.members.some((m) => m.address === '/scout'), 60000)
  const host = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.host, ...launch } })).createAgentRun
  assert(host.success, host.message)
  const hostSocket = new WS(access.ownerSocketUrl(`${backendUrl.replace('http', 'ws')}/ws/agent/${host.runId}`))
  await new Promise((resolve, reject) => { hostSocket.once('open', resolve); hostSocket.once('error', reject) })
  hostSocket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: host.runId, content: `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { recipient_address: `/${teamName.replace(/[^a-z0-9]+/g, '_')}`, description: 'Draft the post.' } })}`,
    message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`, context_file_paths: [], image_urls: [] } }))
  const copy = await waitFor('the delegated copy', async () => {
    const rows = (await gql('query($k:String!,$r:String!){runTree(kind:$k,runId:$r)}', { k: 'agent', r: host.runId })).runTree.rows
    const team = rows.find((r) => r.kind === 'team'); return team ? { rows, team } : null }, 90000)
  const copyRunId = copy.team.openTarget.runId
  const copyTree = JSON.parse(await fs.readFile(path.join(dataRoot, 'memory', 'agent_teams', copyRunId, 'team_run_execution_tree.json'), 'utf8'))
  const copyScout = copyTree.rootTeam.members.find((m) => m.address.endsWith('/scout'))
  const copyStream = await teamSocket(copyRunId)
  try {
    copyStream.send(copyScout.agentRunId, 'HOLD_TURN'); await delay(3000)
    // The user opens the host's run: the copy and its members are rows under it.
    await page.goto(`${frontUrl}/workspace`, { waitUntil: 'domcontentloaded' }); await delay(2500); await expandWorkspaces(page)
    const hostRow = page.locator('[data-test="workspace-agent-run-row"]', { hasText: 'CALL_TOOL' }).first()
    await waitFor('host run row', async () => {
      if (await hostRow.isVisible().catch(() => false)) return true
      const group = page.locator('[data-test="workspace-agent-row"]', { hasText: ids.host }).first()
      if (await group.isVisible().catch(() => false)) { await group.click().catch(() => {}); await delay(800) }
      return hostRow.isVisible().catch(() => false)
    }, 60000, 1500)
    await hostRow.click(); await delay(2500)
    await writeConfig({ ...teamConfig, members: [member('lead', ids.lead)], handoffs: [] })
    const tagged = await waitFor('the copy member row under the host run is tagged Leaving', async () => {
      const rows = (await gql('query($k:String!,$r:String!){runTree(kind:$k,runId:$r)}', { k: 'agent', r: host.runId })).runTree.rows
      const serverRow = rows.find((r) => r.leaving && r.openTarget?.agentRunId === copyScout.agentRunId)
      if (!serverRow) return null
      // expand every disclosure under the host so the copy's member rows render
      for (const d of await page.locator('[data-test="workspace-team-transient-disclosure"]').all()) { if ((await d.getAttribute('aria-expanded')) === 'false') { await d.click().catch(() => {}); await delay(400) } }
      const domTags = await page.locator('[data-test="workspace-team-transient-execution-row"]').evaluateAll((rows) => rows.filter((row) => row.querySelector('[data-test="workspace-member-leaving"]')).map((row) => row.innerText.replace(/\s+/g, ' ').trim()))
      return domTags.length ? { serverRow, domTags } : null
    }, 90000, 1500)
    await shot(page, 'TFU-05-a-copy-member-leaving')
    copyStream.interrupt(copyScout.agentRunId)
    await waitFor('the copy member row goes', async () => {
      const rows = (await gql('query($k:String!,$r:String!){runTree(kind:$k,runId:$r)}', { k: 'agent', r: host.runId })).runTree.rows
      return !rows.some((r) => r.openTarget?.agentRunId === copyScout.agentRunId) }, 60000)
    await delay(1500)
    await shot(page, 'TFU-05-b-copy-member-released')
    return { copyRunId, copiedFrom: copyTree.copiedFrom, tagged }
  } finally { copyStream.close(); hostSocket.terminate() }
})

defineCase('TFU-04', async (page) => {
  // A real Codex member (auto-execute off) waits for approval; it is removed while the user looks at another member; its
  // Leaving row opens it, the user approves, the command runs, it finishes and its row goes.
  const codexTeam = (await gql('{ agentTeamDefinitions { id name } }')).agentTeamDefinitions.find((t) => t.name === codexTeamName)
  const codexLaunch = { workspaceRootPath: path.join(ownedRoot, 'workspace-codex'), llmModelIdentifier: 'gpt-6.1-terra', llmConfig: { reasoning_effort: 'low' }, autoExecuteTools: false, runtimeKind: 'codex_app_server' }
  await fs.mkdir(codexLaunch.workspaceRootPath, { recursive: true })
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId: codexTeam.id, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: ids.lead, ...launch }, { memberAddress: '/coder', agentDefinitionId: ids.coder, ...codexLaunch }] } })).createAgentTeamRun
  assert(created.success, created.message)
  const codexRunId = created.teamRunId
  // The team's own stream from the start: it records the coder's approval requests (a fallback to answer them if the app cannot).
  const stream = await teamSocket(codexRunId)
  await openTeamRun(page, codexRunId, codexTeam.id)
  const outside = path.join(ownedRoot, `outside-${u}.txt`)
  await page.locator(`[data-test="${rowPrefix(codexRunId)}/coder"]`).first().click(); await delay(1500)
  await sendFromComposer(page, `Run exactly this shell command once: echo leaving > ${outside} — then reply DONE.`)
  const approve = page.getByRole('button', { name: 'Approve' }).first()
  await waitFor('the coder waits for approval', async () => approve.isVisible().catch(() => false), 300000, 1500)
  await shot(page, 'TFU-04-a-approval-pending')
  await page.locator(`[data-test="${rowPrefix(codexRunId)}/lead"]`).first().click(); await delay(1500)
  await writeCodexConfig({ coordinatorMemberName: 'lead', members: [member('lead', ids.lead)], handoffs: [], avatarUrl: null })
  const rows = await waitFor('the coder row is tagged Leaving', async () => { const r = await memberRows(page, codexRunId); return leavingRow(r, '/coder') ? r : null }, 60000)
  await shot(page, 'TFU-04-b-coder-leaving')
  await page.locator(`[data-test="${rowPrefix(codexRunId)}/coder"]`).first().click(); await delay(2000)
  const approveAgain = page.getByRole('button', { name: 'Approve' }).first()
  const approvalShown = await waitFor('the leaving coder shows its pending approval', async () => approveAgain.isVisible().catch(() => false), 30000).then(() => true, () => false)
  const rowText = (await memberRows(page, codexRunId)).find((r) => r.address === '/coder')?.text ?? null
  await shot(page, 'TFU-04-c-leaving-coder-opened')
  step('leaving coder opened', { approvalShown, rowText, header: await headerText(page) })
  const coderRunId = JSON.parse(await fs.readFile(path.join(dataRoot, 'memory', 'agent_teams', codexRunId, 'team_run_execution_tree.json'), 'utf8'))
    .rootTeam.formerMembers.find((m) => m.address === '/coder').agentRunId
  const approveByStream = () => { for (const f of stream.frames) if (f.type === 'TOOL_APPROVAL_REQUESTED' && f.payload?.agent_run_id === coderRunId && !stream.approved?.has(f.payload.invocation_id)) {
    (stream.approved ??= new Set()).add(f.payload.invocation_id)
    stream.socket.send(JSON.stringify({ type: 'APPROVE_TOOL', payload: { invocation_id: f.payload.invocation_id, agent_run_id: coderRunId, reason: null } })) } }
  if (approvalShown) await approveAgain.click()
  // Codex may ask once more (e.g. its reply needs nothing; any further request is approved as a user would).
  const approvals = ['run_bash']
  const ran = await waitFor('the approved command ran', async () => {
    const more = page.getByRole('button', { name: 'Approve' }).first()
    if (await more.isVisible().catch(() => false)) { await more.click().catch(() => {}); approvals.push('another') }
    if (!approvalShown) approveByStream()
    return existsSync(outside)
  }, 300000, 1500)
  const released = await waitFor('the coder row goes after it stops', async () => {
    const more = page.getByRole('button', { name: 'Approve' }).first()
    if (await more.isVisible().catch(() => false)) { await more.click().catch(() => {}); approvals.push('another') }
    if (!approvalShown) approveByStream()
    const r = await memberRows(page, codexRunId); return hasRow(r, '/coder') ? null : r }, 300000, 1500)
  await shot(page, 'TFU-04-d-coder-released')
  stream.close()
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: codexRunId }).catch(() => {})
  const result = { rows, approvalShown, rowText, ran, approvals, approvedByStream: [...(stream.approved ?? [])], released, outsideFile: await fs.readFile(outside, 'utf8') }
  evidence.cases['TFU-04-observed'] = result
  assert(approvalShown, "the Leaving row opens the coder with its pending approval (the user answers it there)", result)
  return result
})

let exitCode = 0
try {
  await fs.mkdir(outDir, { recursive: true })
  assert(existsSync(chrome), `Chromium not found: ${chrome}`)
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  // Outside the temp folder: Codex `workspace-write` always allows /tmp, so a write there would not ask for approval (TFU-04).
  const base = path.join(os.homedir(), '.autobyteus-e2e'); await fs.mkdir(base, { recursive: true })
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(base, 'team-follows-ui-probe-')))
  dataRoot = path.join(ownedRoot, 'server-data'); packageRoot = path.join(ownedRoot, 'package')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true }); await fs.mkdir(path.join(ownedRoot, 'home'), { recursive: true })
  const workspace = path.join(ownedRoot, 'workspace'); await fs.mkdir(workspace, { recursive: true })
  for (const id of Object.values(ids)) {
    const dir = path.join(packageRoot, 'agents', id); await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${id}\ndescription: Team follows UI probe agent\nrole: assistant\n---\n\nInstructions of ${id}.\n`)
    await fs.writeFile(path.join(dir, 'agent-config.json'), JSON.stringify({ toolNames: [] }))
  }
  const teamDir = path.join(packageRoot, 'agent-teams', teamName); await fs.mkdir(teamDir, { recursive: true })
  await fs.writeFile(path.join(teamDir, 'team.md'), `---\nname: ${teamName}\ndescription: Team follows UI probe\n---\n\nWork together.\n`)
  configFile = path.join(teamDir, 'team-config.json')
  const codexTeamDir = path.join(packageRoot, 'agent-teams', codexTeamName); await fs.mkdir(codexTeamDir, { recursive: true })
  await fs.writeFile(path.join(codexTeamDir, 'team.md'), `---\nname: ${codexTeamName}\ndescription: Team follows UI probe (Codex)\n---\n\nWork together.\n`)
  codexConfigFile = path.join(codexTeamDir, 'team-config.json')
  await writeCodexConfig({ coordinatorMemberName: 'lead', members: [member('lead', ids.lead), member('coder', ids.coder)], handoffs: [], avatarUrl: null })
  const codexHome = path.join(ownedRoot, 'codex-home'); await fs.mkdir(codexHome, { recursive: true })
  await fs.symlink(path.join(os.homedir(), '.codex', 'auth.json'), path.join(codexHome, 'auth.json'))
  await writeConfig({ coordinatorMemberName: 'lead', members: [member('lead', ids.lead), member('writer', ids.writer)], handoffs: [{ from: '/lead', to: '/writer', rules: ['Draft.'] }], avatarUrl: null })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  await new Promise((resolve, reject) => {
    const child = spawn(path.join(serverDir, 'node_modules/.bin/prisma'), ['migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), HOME: path.join(ownedRoot, 'home'), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const env = { ...baseEnv(), HOME: path.join(ownedRoot, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl,
    AUTOBYTEUS_ALLOWED_ORIGINS: frontUrl, DISABLE_HTTP_REQUEST_LOGS: 'true', LMSTUDIO_HOSTS: 'http://127.0.0.1:1', ANTIGRAVITY_CLI_COMMAND: fakeAgy, AGY_FAKE_CASE: 'linked_skills', CODEX_HOME: codexHome }
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, access.withNodeCredential(env))
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 1000)
  spawnOwned('frontend', path.join(webDir, 'node_modules/.bin/nuxt'), ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), HOME: process.env.HOME, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 300000, 1000)
  // Package, Team run, earlier work: the writer posts to the lead (the Team tab's message), the lead answers.
  await gql('mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId } }', { input: { sourceKind: 'LOCAL_PATH', source: packageRoot } })
  teamDefinitionId = (await gql('{ agentTeamDefinitions { id name } }')).agentTeamDefinitions.find((t) => t.name === teamName).id
  launch = { workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' }
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...launch }],
    memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: ids.lead, ...launch }, { memberAddress: '/writer', agentDefinitionId: ids.writer, ...launch }] } })).createAgentTeamRun
  assert(created.success, created.message)
  teamRunId = created.teamRunId
  for (const m of (await tree()).rootTeam.members) runOf[m.address] = m.agentRunId
  const seed = await teamSocket()
  seed.send(runOf['/writer'], `CALL_TOOL:${JSON.stringify({ name: 'send_message_to', arguments: { recipient_address: '/lead', content: `WRITER-NOTE-${u}` } })}`)
  await waitFor("the writer's message reached the lead", async () => (await conversationText(runOf['/lead'])).includes(`WRITER-NOTE-${u}`), 90000)
  seed.close()
  step('seeded', { teamRunId, runOf })
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' })
  await access.attachToBrowserContext(context)
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  page.on('pageerror', (e) => evidence.browserErrors.push(e.message))
  for (const route of ['/chat', '/workspace']) { await page.goto(`${frontUrl}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {}); await delay(4000) }
  for (const entry of cases) {
    const started = Date.now()
    try { evidence.cases[entry.id] = { result: 'Pass', details: await entry.fn(page), ms: Date.now() - started } }
    catch (error) {
      exitCode = 1
      await page.screenshot({ path: path.join(outDir, `${entry.id}-failure.png`) }).catch(() => {})
      evidence.cases[entry.id] = { result: 'Fail', error: error.message, details: error.details ?? null, ms: Date.now() - started }
    }
    console.log(`${entry.id} ${evidence.cases[entry.id].result}${evidence.cases[entry.id].error ? ` — ${evidence.cases[entry.id].error}` : ''}`)
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[team-follows-ui-probe] ${error.message}`)
} finally {
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.writeFile(path.join(outDir, 'team-follows-ui-evidence.json'), access.redactCredentials(JSON.stringify(evidence, null, 2)))
  process.exitCode = exitCode
}
