// Saved Settings regressions. Used by delegated-launch-defaults-probe (same public setup, no persistence edits).
// Run: pnpm -C autobyteus-web test:e2e:settings-saved-model-refresh --output-dir <fresh absolute dir>
// Builds current isolated Electron; uses its real remote-node UI to select a private real backend.
// Prerequisites: installed deps, current server build, graphical macOS, no credentials. --skip-build only for
// verified-current worktree bundle. --ledger-file appends each result. External AGY CLI is scripted, not inference.
// SSR-001 stopped Agent/second-copy repeated Save/cancel/reopen, SSR-002 Team inheritance/isolation,
// SSR-003 explicit network failures/read-only recovery. AGY has no model-specific settings: thinking/fast
// are not attributed to AGY. SSR-004 exercises real Grok catalog/schema reasoning with the same scripted backend.
// Fast mode remains covered by the mounted configurable-schema regression (not offered by these CLIs).
export function registerSavedRefreshCases(h) {
  const { defineCase, assert, waitFor, delay, sel, startManagerChat, callFromComposer, address,
    agentTree, objectsIn, pick, teamCopies, membersOf, openSettings, backToConversation,
    openMember, chooseCopyModel, saveSettings, saveBarText, shot, agyLaunchDetailsOf, MODEL, ALT, MODEL_LABEL, ALT_LABEL,
    modelLocked, conversationText } = h
  const sectionOf = p => p.locator(sel('run-delegated-launches'))
  const rowOf = (p, key) => sectionOf(p).locator(sel(`run-member-${key}`)).first()
  const summary = row => row.locator(sel('run-member-summary')).first().innerText().then(s => s.replace(/\s+/g, ' ').trim())
  const storedAgent = async (root, id) => objectsIn(await agentTree(root)).find(r => pick(r, 'agentRunId') === id && (pick(r, 'startedAt') || pick(r, 'addedViaAgentRunId')))
  const saved = p => waitFor('canonical Save settled', async () => /^\s*Saved\./.test(await saveBarText(p)), 60000)
  async function start(p, marker) {
    const runId = await startManagerChat(p, MODEL, `Hello. Marker ${marker}.`)
    await waitFor('manager answered', async () => (await conversationText(p)).includes(marker) && /OK/.test(await conversationText(p)))
    return runId
  }
  async function copy(p, name) {
    const result = await callFromComposer(p, `delegate ${name}`, 'delegate_task', { recipient_address: address(name), description: 'Owned settings refresh fixture.' })
    const id = /"target_agent_run_id":"([^"]+)"/.exec(result)?.[1]
    assert(id, 'Missing delegate identity', result)
    await waitFor('copy CLI started', async () => (await agyLaunchDetailsOf(id)).length)
    return id
  }
  async function stopParent(p) {
    const view = await openSettings(p)
    await view.locator(sel('existing-run-stop')).click()
    await waitFor('whole parent stopped', async () => await view.getAttribute('data-state') === 'stopped', 120000)
    await backToConversation(p)
    await openSettings(p) // Required stop parent -> gear entry, no forced store state.
    assert(await p.locator(sel('existing-run-settings')).getAttribute('data-state') === 'stopped', 'Parent must be stopped before editing')
  }
  async function assertVisible(p, row, label) {
    const state = { summary: await summary(row), editor: await row.locator(sel('chat-model-trigger')).first().innerText(),
      expanded: await row.locator(sel('run-member-toggle')).first().getAttribute('aria-expanded'), url: p.url() }
    assert(state.summary.includes(label) && state.editor.includes(label) && state.expanded === 'true', 'Summary/editor not canonical or disclosure collapsed', state)
    return state
  }
  async function saveSameView(p, row, model, label) {
    await chooseCopyModel(p, row, model)
    const url = p.url(), view = await p.locator(sel('existing-run-settings')).elementHandle()
    await saveSettings(p); await saved(p)
    assert(await view.evaluate(e => e.isConnected && e === document.querySelector('[data-test="existing-run-settings"]')), 'Settings remounted during Save')
    assert(p.url() === url, 'Navigation occurred during Save')
    return assertVisible(p, row, label)
  }
  function wire(p) {
    const records = [], pending = []
    const request = req => {
      if (!req.url().endsWith('/graphql') || req.method() !== 'POST') return
      const body = req.postDataJSON()
      if (!/UpdateDelegatedLaunchSelections|AgentRunCollaboration|GetAgentRunResumeConfig/.test(body.query ?? '')) return
      const entry = { query: body.query, variables: body.variables, at: new Date().toISOString() }; records.push(entry)
      pending.push(req.response().then(async r => { entry.status = r?.status(); entry.response = r ? await r.json().catch(() => null) : null }).catch(e => { entry.error = e.message }))
    }
    p.on('request', request)
    return { records, stop: async () => { p.off('request', request); await Promise.all(pending); return records } }
  }
  const mutationCount = records => records.filter(r => /mutation UpdateDelegatedLaunchSelections/.test(r.query)).length

  defineCase('SSR-001', 'AC-001/004/005/006 stopped parent -> gear -> Agent copy + a second Agent copy Save, repeat, cancel and reopen', async p => {
    const r = {}, trace = wire(p)
    try {
      r.runId = await start(p, 'SSR-001')
      r.copyId = await copy(p, 'writer'); r.neighborId = await copy(p, 'writer')
      // collaboration-model-contract: there are no collaborators; a third Agent copy (of Plain) is changed the same way.
      r.collaboratorId = await copy(p, 'plain')
      const copyKey = `${address('writer')}@${r.copyId}`, collabKey = `${address('plain')}@${r.collaboratorId}`
      await stopParent(p)
      const beforeTree = await agentTree(r.runId)
      const ids = [r.runId, r.copyId, r.neighborId, r.collaboratorId]
      const launches = () => Promise.all(ids.map(agyLaunchDetailsOf))
      r.launchesBefore = await launches()
      await openMember(sectionOf(p), copyKey)
      const row = rowOf(p, copyKey)
      r.firstSave = await saveSameView(p, row, MODEL, MODEL_LABEL)
      r.firstCanonical = await storedAgent(r.runId, r.copyId)
      assert(pick(r.firstCanonical, 'userLaunchSelection')?.llmModelIdentifier === MODEL, 'Saved API value differs from mounted editor', r.firstCanonical)
      await shot(p, 'SSR-001-first-same-view')
      r.secondSave = await saveSameView(p, row, ALT, ALT_LABEL)
      assert(pick(await storedAgent(r.runId, r.copyId), 'userLaunchSelection')?.llmModelIdentifier === ALT, 'Second Save not canonical')
      const count = mutationCount(trace.records)
      await chooseCopyModel(p, row, MODEL)
      await p.locator(sel('existing-run-cancel')).click()
      r.cancelled = await assertVisible(p, row, ALT_LABEL)
      assert(mutationCount(trace.records) === count, 'Cancel caused a write')
      await openMember(sectionOf(p), collabKey)
      r.collaboratorSave = await saveSameView(p, rowOf(p, collabKey), ALT, ALT_LABEL)
      assert(pick(await storedAgent(r.runId, r.collaboratorId), 'userLaunchSelection')?.llmModelIdentifier === ALT, 'Collaborator Save not canonical')
      await shot(p, 'SSR-001-collaborator-saved')
      const afterTree = await agentTree(r.runId)
      const neighbor = tree => objectsIn(tree).find(x => pick(x, 'agentRunId') === r.neighborId && pick(x, 'startedAt'))
      assert(JSON.stringify(neighbor(afterTree)) === JSON.stringify(neighbor(beforeTree)), 'Neighbor instance mutated')
      r.launchesAfter = await launches()
      assert(JSON.stringify(r.launchesAfter) === JSON.stringify(r.launchesBefore), 'Save/cancel caused runtime start/resume')
      await backToConversation(p); await openSettings(p); await openMember(sectionOf(p), copyKey)
      r.reopened = await assertVisible(p, rowOf(p, copyKey), ALT_LABEL)
      assert(JSON.stringify(await launches()) === JSON.stringify(r.launchesBefore), 'Reopen resumed stopped root')
      r.treeAfter = afterTree
      return r
    } catch (error) { error.details = r; throw error } finally { r.wire = await trace.stop() }
  })

  defineCase('SSR-002', 'AC-002/004/005/006 stopped parent Team followers, own member choice/default and neighboring instance', async p => {
    const r = {}, trace = wire(p)
    try {
      r.runId = await start(p, 'SSR-002')
      await callFromComposer(p, 'delegate Pair A', 'delegate_task', { recipient_address: address('pair'), description: 'Pair A settings.' })
      r.copy = await waitFor('Pair A', async () => teamCopies(await agentTree(r.runId), 'pair')[0])
      r.copyId = pick(r.copy, 'teamRunId'); r.members = membersOf(r.copy)
      await callFromComposer(p, 'delegate Pair B', 'delegate_task', { recipient_address: address('pair'), description: 'Pair B settings.' })
      r.neighbor = await waitFor('Pair B', async () => teamCopies(await agentTree(r.runId), 'pair').find(x => pick(x, 'teamRunId') !== r.copyId))
      await stopParent(p)
      r.neighbor = teamCopies(await agentTree(r.runId), 'pair').find(x => pick(x, 'teamRunId') !== r.copyId)
      const teamKey = `${address('pair')}@${r.copyId}`, memberKey = n => `${address('pair')}/${n}@${r.members[n]}`
      await openMember(sectionOf(p), teamKey)
      await openMember(sectionOf(p), memberKey('unoffered'))
      // An explicit member choice made before changing the Team must not be overwritten by inheritance.
      r.memberSave = await saveSameView(p, rowOf(p, memberKey('unoffered')), MODEL, MODEL_LABEL)
      const engineerBefore = await summary(rowOf(p, memberKey('engineer')))
      r.teamSave = await saveSameView(p, rowOf(p, teamKey), MODEL, MODEL_LABEL)
      r.following = await summary(rowOf(p, memberKey('lead')))
      assert(r.following.includes(MODEL_LABEL), 'Team follower did not refresh', r)
      assert(await summary(rowOf(p, memberKey('engineer'))) === engineerBefore, 'Own-default member changed')
      r.teamSecond = await saveSameView(p, rowOf(p, teamKey), ALT, ALT_LABEL)
      assert((await summary(rowOf(p, memberKey('lead')))).includes(ALT_LABEL), 'Follower second save stale')
      r.ownMember = await assertVisible(p, rowOf(p, memberKey('unoffered')), MODEL_LABEL)
      r.canonical = teamCopies(await agentTree(r.runId), 'pair')
      const current = r.canonical.find(x => pick(x, 'teamRunId') === r.copyId)
      assert(pick(current, 'userTeamLaunchSelection')?.llmModelIdentifier === ALT, 'Team canonical differs')
      assert(pick(current.members.find(x => pick(x, 'agentRunId') === r.members.unoffered), 'userLaunchSelection')?.llmModelIdentifier === MODEL, 'Own member canonical differs')
      assert(JSON.stringify(r.canonical.find(x => pick(x, 'teamRunId') !== r.copyId)) === JSON.stringify(r.neighbor), 'Neighbor Team changed')
      await shot(p, 'SSR-002-team-followers-own-choice')
      return r
    } catch (error) { error.details = r; throw error } finally { r.wire = await trace.stop() }
  })

  defineCase('SSR-003', 'AC-003/005/006 write transport failure retains edits; committed read failure locks, read-only Refresh reconciles', async p => {
    const r = {}, trace = wire(p)
    let handler
    try {
      r.runId = await start(p, 'SSR-003'); r.copyId = await copy(p, 'writer')
      await stopParent(p)
      const key = `${address('writer')}@${r.copyId}`
      await openMember(sectionOf(p), key)
      const row = rowOf(p, key)
      r.launchesBefore = await agyLaunchDetailsOf(r.copyId)
      let failWrite = true, failRead = false
      handler = async route => {
        const body = route.request().postDataJSON(), q = body?.query ?? ''
        if (/mutation UpdateDelegatedLaunchSelections/.test(q)) {
          if (failWrite) { failWrite = false; return route.abort('failed') }
          const response = await route.fetch()
          const result = await response.json()
          assert(result.data?.updateDelegatedLaunchSelections?.success, 'Expected real committed write before failed read', result)
          r.committed = result; failRead = true
          return route.fulfill({ response })
        }
        if (failRead && /query GetAgentRunCollaboration\(/.test(q)) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'owned readback transport outage' }] }) })
        return route.continue()
      }
      await p.route('**/graphql', handler)
      await chooseCopyModel(p, row, MODEL); await saveSettings(p)
      await waitFor('write failure retained dirty controls', async () => await p.locator(sel('existing-run-note')).isVisible() && /Unsaved/.test(await saveBarText(p)))
      r.writeFailure = await p.locator(sel('existing-run-note')).innerText()
      assert(!pick(await storedAgent(r.runId, r.copyId), 'userLaunchSelection'), 'Failed write recorded a choice')
      assert(!(await modelLocked(row)), 'Write failure should permit correcting/retrying edit')
      await shot(p, 'SSR-003-write-failed-recoverable')
      await saveSettings(p)
      await waitFor('saved but refresh failed', async () => await p.locator(sel('existing-run-settings')).getAttribute('data-state') === 'refresh-required')
      r.readFailure = await p.locator(sel('existing-run-note')).innerText()
      assert(/saved/i.test(r.readFailure) && /refresh/i.test(r.readFailure) && !/^\s*Saved\./.test(await saveBarText(p)), 'Read failure falsely presented success', r)
      assert(await modelLocked(row), 'Committed unrefreshed rows must be locked')
      assert(pick(await storedAgent(r.runId, r.copyId), 'userLaunchSelection')?.llmModelIdentifier === MODEL, 'Write was not actually committed')
      await shot(p, 'SSR-003-saved-refresh-needed')
      const count = mutationCount(trace.records)
      await p.unroute('**/graphql', handler); handler = null
      await p.locator(sel('existing-run-refresh')).click()
      await waitFor('Refresh unlocked canonical editor', async () => await p.locator(sel('existing-run-settings')).getAttribute('data-state') === 'stopped' && !(await modelLocked(row)))
      r.reconciled = await assertVisible(p, row, MODEL_LABEL)
      assert(mutationCount(trace.records) === count, 'Refresh resaved instead of reading')
      assert(JSON.stringify(await agyLaunchDetailsOf(r.copyId)) === JSON.stringify(r.launchesBefore), 'Save/Refresh resumed copy')
      await shot(p, 'SSR-003-read-only-refresh-recovered')
      return r
    } catch (error) { error.details = r; throw error } finally { if (handler) await p.unroute('**/graphql', handler); r.wire = await trace.stop() }
  })

  defineCase('SSR-004', 'AC-001/002/004/006 same-model settings-only Grok member thinking Save, repeated edit and reopen', async p => {
    const r = {}, trace = wire(p)
    try {
      r.runId = await start(p, 'SSR-004')
      await callFromComposer(p, 'delegate Pair for settings', 'delegate_task', { recipient_address: address('pair'), description: 'Settings-only member fixture.' })
      const team = await waitFor('Pair team', async () => teamCopies(await agentTree(r.runId), 'pair')[0])
      r.teamId = pick(team, 'teamRunId'); r.members = membersOf(team)
      await stopParent(p)
      const teamKey = `${address('pair')}@${r.teamId}`, memberKey = `${address('pair')}/engineer@${r.members.engineer}`
      await openMember(sectionOf(p), teamKey); await openMember(sectionOf(p), memberKey)
      const row = rowOf(p, memberKey), view = await p.locator(sel('existing-run-settings')).elementHandle(), url = p.url()
      r.saves = []
      for (const effort of ['low', 'xhigh']) {
        await row.locator(sel('chat-thinking-trigger')).click()
        const menu = p.locator(sel('chat-thinking-menu')).first()
        await menu.waitFor()
        const primary = menu.locator(sel(`chat-thinking-option-primary-${effort}`))
        if (await primary.count()) await primary.click()
        else await menu.locator(`[data-test$="-${effort}"]`).first().click()
        await p.keyboard.press('Escape')
        await saveSettings(p); await saved(p)
        assert(p.url() === url && await view.evaluate(e => e.isConnected), 'Settings remounted or navigated for settings-only Save')
        const canonical = teamCopies(await agentTree(r.runId), 'pair').find(x => pick(x, 'teamRunId') === r.teamId)
        const member = canonical.members.find(x => pick(x, 'agentRunId') === r.members.engineer)
        const selection = pick(member, 'userLaunchSelection')
        assert(selection?.llmModelIdentifier === 'grok-4.7' && selection?.llmConfig?.reasoning_effort === effort, 'Same-model settings not accepted by backend', member)
        const displayed = await row.locator(sel('chat-thinking-trigger')).innerText()
        assert(effort === 'low' ? /Low/i.test(displayed) : /Extra High|Xhigh/i.test(displayed), 'Thinking control stale after Save', displayed)
        assert((await summary(row)).includes('Grok 4.7'), 'Settings-only Save changed displayed model')
        assert(await row.locator(sel('run-member-toggle')).first().getAttribute('aria-expanded') === 'true', 'Settings-only Save collapsed member')
        r.saves.push({ effort, displayed, selection, summary: await summary(row) })
      }
      await shot(p, 'SSR-004-same-model-thinking-saved')
      await backToConversation(p); await openSettings(p); await openMember(sectionOf(p), teamKey); await openMember(sectionOf(p), memberKey)
      r.reopened = await row.locator(sel('chat-thinking-trigger')).innerText()
      assert(/Extra High|Xhigh/i.test(r.reopened), 'Reopened thinking differs from accepted configuration')
      return r
    } catch (error) { error.details = r; throw error } finally { r.wire = await trace.stop() }
  })

}
