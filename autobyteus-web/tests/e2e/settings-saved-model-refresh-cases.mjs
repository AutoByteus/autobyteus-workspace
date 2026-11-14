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
    modelLocked, conversationText, focusedCard, subjectCard, groupRow, cardSummary, gql, teamTree } = h
  // autobyteus-461 rule 2 / SR-064: a delegated run's Save is its own stopped-run save, so what was saved is read from that
  // run itself (base kept the edit as `userLaunchSelection` / `userTeamLaunchSelection` in the delegator's tree).
  const ownAgent = async (runId) => (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{llmModelIdentifier llmConfig runtimeKind}}}', { id: runId }))
    .getAgentRunResumeConfig?.metadataConfig ?? null
  const ownTeam = async (teamRunId) => {
    const tree = await teamTree(teamRunId)
    const launch = (config) => config ? { model: pick(config, 'llmModelIdentifier') ?? null, llmConfig: pick(config, 'llmConfig') ?? null } : null
    const root = objectsIn(tree).find((x) => x.defaultLaunchConfiguration || x.default_launch_configuration)
    return { team: launch(root?.defaultLaunchConfiguration ?? root?.default_launch_configuration),
      members: Object.fromEntries(objectsIn(tree).filter((m) => typeof m.address === 'string' && m.address !== '/' && pick(m, 'agentRunId') && pick(m, 'launchConfiguration'))
        .map((m) => [m.address.slice(1), launch(pick(m, 'launchConfiguration'))])) }
  }
  // autobyteus-366: a copy's settings show when it is focused in the left tree (its card); a Team copy's own settings and its
  // members' rows are its group view.
  const summary = async row => await row.locator(sel('run-member-summary')).count()
    ? row.locator(sel('run-member-summary')).first().innerText().then(s => s.replace(/\s+/g, ' ').trim())
    : cardSummary(row)
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
  /** autobyteus-461 REQ-001: a copy outlives its delegator's Stop; it is stopped as itself (its Settings header stop icon). */
  async function stopCopy(p, id, { team = false } = {}) {
    const card = await focusedCard(p, id, { group: team })
    const stop = p.locator(sel('run-member-stop'))
    if (await stop.isVisible().catch(() => false)) await stop.click()
    await waitFor(`copy ${id} stopped`, async () => !(await stop.isVisible().catch(() => false)) && !(await modelLocked(card)), 90000, 1000)
  }
  async function assertVisible(p, row, label) {
    // A focused agent's card is always open (no disclosure).
    const state = { summary: await summary(row), editor: await row.locator(sel('chat-model-trigger')).first().innerText(),
      expanded: await row.locator(sel('run-member-toggle')).count() ? await row.locator(sel('run-member-toggle')).first().getAttribute('aria-expanded') : 'true', url: p.url() }
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
      if (!/UpdateStoppedAgentRunSelection|UpdateStoppedTeamRunSelections|AgentRunCollaboration|GetAgentRunResumeConfig|GetTeamRunResumeConfig/.test(body.query ?? '')) return
      const entry = { query: body.query, variables: body.variables, at: new Date().toISOString() }; records.push(entry)
      pending.push(req.response().then(async r => { entry.status = r?.status(); entry.response = r ? await r.json().catch(() => null) : null }).catch(e => { entry.error = e.message }))
    }
    p.on('request', request)
    return { records, stop: async () => { p.off('request', request); await Promise.all(pending); return records } }
  }
  const mutationCount = records => records.filter(r => /mutation UpdateStopped(AgentRunSelection|TeamRunSelections)/.test(r.query)).length

  defineCase('SSR-001', 'AC-001/004/005/006 stopped parent -> gear -> Agent copy + a second Agent copy Save, repeat, cancel and reopen', async p => {
    const r = {}, trace = wire(p)
    try {
      r.runId = await start(p, 'SSR-001')
      r.copyId = await copy(p, 'writer'); r.neighborId = await copy(p, 'writer')
      // collaboration-model-contract: there are no collaborators; a third Agent copy (of Plain) is changed the same way.
      r.collaboratorId = await copy(p, 'plain')
      await stopParent(p)
      // autobyteus-461 REQ-001: the parent's Stop leaves its copies working; each is stopped as itself before its Save.
      for (const id of [r.copyId, r.neighborId, r.collaboratorId]) await stopCopy(p, id)
      r.neighborBefore = await ownAgent(r.neighborId)
      const ids = [r.runId, r.copyId, r.neighborId, r.collaboratorId]
      const launches = () => Promise.all(ids.map(agyLaunchDetailsOf))
      r.launchesBefore = await launches()
      const row = await focusedCard(p, r.copyId)
      r.firstSave = await saveSameView(p, row, MODEL, MODEL_LABEL)
      r.firstCanonical = await ownAgent(r.copyId)
      assert(r.firstCanonical?.llmModelIdentifier === MODEL, 'Saved API value differs from mounted editor', r.firstCanonical)
      await shot(p, 'SSR-001-first-same-view')
      r.secondSave = await saveSameView(p, row, ALT, ALT_LABEL)
      assert((await ownAgent(r.copyId))?.llmModelIdentifier === ALT, 'Second Save not canonical')
      const count = mutationCount(trace.records)
      await chooseCopyModel(p, row, MODEL)
      await p.locator(sel('existing-run-cancel')).click()
      r.cancelled = await assertVisible(p, row, ALT_LABEL)
      assert(mutationCount(trace.records) === count, 'Cancel caused a write')
      r.collaboratorSave = await saveSameView(p, await focusedCard(p, r.collaboratorId), ALT, ALT_LABEL)
      assert((await ownAgent(r.collaboratorId))?.llmModelIdentifier === ALT, 'Collaborator Save not canonical')
      await shot(p, 'SSR-001-collaborator-saved')
      r.neighborAfter = await ownAgent(r.neighborId)
      assert(JSON.stringify(r.neighborAfter) === JSON.stringify(r.neighborBefore), 'Neighbor instance mutated', { before: r.neighborBefore, after: r.neighborAfter })
      r.launchesAfter = await launches()
      assert(JSON.stringify(r.launchesAfter) === JSON.stringify(r.launchesBefore), 'Save/cancel caused runtime start/resume')
      await backToConversation(p)
      r.reopened = await assertVisible(p, await focusedCard(p, r.copyId), ALT_LABEL)
      assert(JSON.stringify(await launches()) === JSON.stringify(r.launchesBefore), 'Reopen resumed stopped root')
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
      r.neighborId = pick(r.neighbor, 'teamRunId')
      await stopCopy(p, r.members.lead, { team: true }); await stopCopy(p, membersOf(r.neighbor).lead, { team: true })
      r.neighborBefore = await ownTeam(r.neighborId)
      r.ownBefore = await ownTeam(r.copyId)
      // autobyteus-461 TC-12: a delegated team is rooted at `/`; its member rows carry their own addresses.
      const memberKey = n => `/${n}@${r.members[n]}`
      // An explicit member choice made before changing the Team must not be overwritten by inheritance (the member's own card).
      r.memberSave = await saveSameView(p, await focusedCard(p, r.members.unoffered), MODEL, MODEL_LABEL)
      // The Team copy's group view: its card and its members' rows.
      const teamCard = await focusedCard(p, r.members.unoffered, { group: true })
      const engineerBefore = await summary(groupRow(p, memberKey('engineer')))
      // autobyteus-461 F-39 (SR-075): a team-level Save changes the team's own default only; each member keeps its own launch.
      const leadBefore = await summary(groupRow(p, memberKey('lead')))
      r.teamSave = await saveSameView(p, teamCard, MODEL, MODEL_LABEL)
      r.leadAfterTeamSave = await summary(groupRow(p, memberKey('lead')))
      assert(r.leadAfterTeamSave === leadBefore, 'a team-level Save changed a member\'s own launch (F-39)', { before: leadBefore, after: r.leadAfterTeamSave })
      assert(await summary(groupRow(p, memberKey('engineer'))) === engineerBefore, 'Own-default member changed')
      r.teamSecond = await saveSameView(p, teamCard, ALT, ALT_LABEL)
      assert(await summary(groupRow(p, memberKey('lead'))) === leadBefore, 'a second team-level Save changed a member\'s own launch (F-39)')
      r.ownMember = await assertVisible(p, await focusedCard(p, r.members.unoffered), MODEL_LABEL)
      r.ownAfter = await ownTeam(r.copyId)
      assert(r.ownAfter.team?.model === ALT, 'Team canonical differs', r.ownAfter)
      assert(r.ownAfter.members.unoffered?.model === MODEL, 'Own member canonical differs', r.ownAfter)
      assert(['lead', 'engineer'].every((n) => JSON.stringify(r.ownAfter.members[n]) === JSON.stringify(r.ownBefore.members[n])), 'members kept their own launches', { before: r.ownBefore, after: r.ownAfter })
      r.neighborAfter = await ownTeam(r.neighborId)
      assert(JSON.stringify(r.neighborAfter) === JSON.stringify(r.neighborBefore), 'Neighbor Team changed', { before: r.neighborBefore, after: r.neighborAfter })
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
      await stopCopy(p, r.copyId)
      const row = await focusedCard(p, r.copyId)
      r.launchesBefore = await agyLaunchDetailsOf(r.copyId)
      r.storedBefore = await ownAgent(r.copyId)
      let failWrite = true, failRead = false
      handler = async route => {
        const body = route.request().postDataJSON(), q = body?.query ?? ''
        if (/mutation UpdateStoppedAgentRunSelection/.test(q)) {
          if (failWrite) { failWrite = false; return route.abort('failed') }
          const response = await route.fetch()
          const result = await response.json()
          assert(result.data?.updateStoppedAgentRunSelection?.success, 'Expected real committed write before failed read', result)
          r.committed = result; failRead = true
          return route.fulfill({ response })
        }
        // After the committed write every read fails (whichever the editor uses to reload: rule 2 changed them).
        if (failRead && /^\s*query\b/.test(q)) { (r.failedReads ??= []).push(/query\s+(\w+)/.exec(q)?.[1] ?? 'anonymous'); return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'owned readback transport outage' }] }) }) }
        return route.continue()
      }
      await p.route('**/graphql', handler)
      await chooseCopyModel(p, row, MODEL); await saveSettings(p)
      await waitFor('write failure retained dirty controls', async () => await p.locator(sel('existing-run-note')).isVisible() && /Unsaved/.test(await saveBarText(p)))
      r.writeFailure = await p.locator(sel('existing-run-note')).innerText()
      assert(JSON.stringify(await ownAgent(r.copyId)) === JSON.stringify(r.storedBefore), 'Failed write recorded a choice')
      assert(!(await modelLocked(row)), 'Write failure should permit correcting/retrying edit')
      await shot(p, 'SSR-003-write-failed-recoverable')
      await saveSettings(p)
      // autobyteus-461 SR-064 / CR-461-077: a saved row shows its run's own save answer at once, so after a committed write
      // "Saved." with the saved model is the truth even when reads fail; otherwise the editor must ask for a Refresh.
      // Never: "Saved." beside a model that was not saved.
      r.readFailureState = await waitFor('the committed Save settled with reads failing', async () => {
        const state = await p.locator(sel('existing-run-settings')).getAttribute('data-state')
        const bar = await saveBarText(p)
        if (state === 'refresh-required' || /^\s*Saved\./.test(bar)) return { state, bar, note: await p.locator(sel('existing-run-note')).innerText().catch(() => null), summary: await summary(row) }
        return null
      }, 60000, 500)
      assert((r.readFailureState.state === 'refresh-required' && /refresh/i.test(r.readFailureState.note ?? ''))
        || (/^\s*Saved\./.test(r.readFailureState.bar) && r.readFailureState.summary.includes(MODEL_LABEL)), 'Read failure falsely presented success', r)
      assert((await ownAgent(r.copyId))?.llmModelIdentifier === MODEL, 'Write was not actually committed')
      await shot(p, 'SSR-003-saved-refresh-needed')
      const count = mutationCount(trace.records)
      await p.unroute('**/graphql', handler); handler = null
      if (r.readFailureState.state === 'refresh-required') await p.locator(sel('existing-run-refresh')).click()
      else { await backToConversation(p); await openSettings(p); await focusedCard(p, r.copyId) }
      await waitFor('canonical editor after the reads recover', async () => await p.locator(sel('existing-run-settings')).getAttribute('data-state') !== 'refresh-required' && !(await modelLocked(row)))
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
      await stopCopy(p, r.members.lead, { team: true })
      const row = await focusedCard(p, r.members.engineer), view = await p.locator(sel('existing-run-settings')).elementHandle(), url = p.url()
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
        const member = (await ownTeam(r.teamId)).members.engineer
        const selection = member ? { llmModelIdentifier: member.model, llmConfig: member.llmConfig } : null
        assert(selection?.llmModelIdentifier === 'grok-4.7' && selection?.llmConfig?.reasoning_effort === effort, 'Same-model settings not accepted by backend', member)
        const displayed = await row.locator(sel('chat-thinking-trigger')).innerText()
        assert(effort === 'low' ? /Low/i.test(displayed) : /Extra High|Xhigh/i.test(displayed), 'Thinking control stale after Save', displayed)
        assert((await summary(row)).includes('Grok 4.7'), 'Settings-only Save changed displayed model')
        assert(await row.isVisible(), 'Settings-only Save closed the member\'s card')
        r.saves.push({ effort, displayed, selection, summary: await summary(row) })
      }
      await shot(p, 'SSR-004-same-model-thinking-saved')
      await backToConversation(p); await focusedCard(p, r.members.engineer)
      r.reopened = await row.locator(sel('chat-thinking-trigger')).innerText()
      assert(/Extra High|Xhigh/i.test(r.reopened), 'Reopened thinking differs from accepted configuration')
      return r
    } catch (error) { error.details = r; throw error } finally { r.wire = await trace.stop() }
  })

}
