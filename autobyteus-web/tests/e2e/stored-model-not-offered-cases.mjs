// Stored model no longer offered (autobyteus-500 G-5: REQ-016, AC-012, D-12), registered by delegated-launch-defaults-probe.mjs.
//
// Real browser → real Nuxt dev → the built backend with the probe's scripted AGY, whose `agy models` answers from a probe-owned
// file (so a model can be retired) and can be made slow or failing (an unreadable list). Each run is created with its saved
// model through GraphQL, then opened, messaged, reopened and messaged again through the UI.
//   G5-001 (AC-012) A Team run whose coordinator member saved a model that is then retired: Settings shows the "not offered"
//          note on that member (its card and its row in Members), not on the other member; a message to it shows the
//          RUN_MODEL_NOT_OFFERED text, and no AGY process is started for it.
//   G5-002 (AC-012) A standalone Agent run on a retired model: Settings shows the note; the message that would restore it
//          shows the same text, and no AGY process is started.
//   G5-003 (AC-012, D-12 "an unreadable list starts as today") A stopped run on an offered model whose `agy models` then
//          hangs past the 8 s budget, and then fails at once (a signed-out CLI): the run's message is never refused by G-5;
//          the start goes on as without the check (AGY itself needs its list to launch, so it may fail with its own
//          discovery error, as before G-5); the times are recorded.
// Alone: pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --cases G5-001,G5-002,G5-003 --output-dir <fresh dir>

export const registerStoredModelNotOfferedCases = (h) => {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, typeAndSend, conversationText, openSettings, backToConversation,
    openAgentRun, openTeamRun, agyLaunchesOf, offerAgyModels, setAgyModelsMode, agyModelsReads, AGY, MODEL, ALT, RETIRING, ids, names, env } = h

  const NOTE = sel('run-setting-model-unavailable')
  const runConfig = (model) => ({ llmModelIdentifier: model, runtimeKind: AGY, autoExecuteTools: true, workspaceRootPath: env().workspace })
  const refusalPattern = (model) => new RegExp(`(\\S+) can't start: its saved model '${model}' is not offered by Antigravity CLI now\\. Stop it, then choose a runtime and model for (\\S+) in Settings\\.`)
  const bodyText = async (page) => (await page.locator('body').innerText()).replace(/[‘’]/g, "'")
  const createAgentRun = async (definitionId, model) => {
    const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
      { input: { agentDefinitionId: definitionId, ...runConfig(model) } })).createAgentRun
    assert(r.success, `createAgentRun: ${r.message}`, r)
    return r.runId
  }
  const terminateAgentRun = async (runId) => assert((await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: runId }))
    .terminateAgentRun.success, 'terminate the agent run')
  /** The UI's first message to a run, answered by the scripted agent: the run is live and has its saved launch. */
  const answered = async (page, marker) => {
    await typeAndSend(page, `Hello. Marker ${marker}.`)
    await waitFor(`${marker} answered`, async () => new RegExp(`${marker}[\\s\\S]*OK`).test(await conversationText(page)), 90000)
  }
  /** Settings' member rows (the Members section), by their key, each expanded to show its card. */
  const expandedMemberRows = async (view) => {
    const rows = {}
    for (const row of await view.locator('[data-test^="run-member-"]:has([data-test="run-member-toggle"])').all()) {
      const key = (await row.getAttribute('data-test')).slice('run-member-'.length)
      const toggle = row.locator(sel('run-member-toggle')).first()
      if (await toggle.getAttribute('aria-expanded') !== 'true') { await toggle.click(); await delay(400) }
      rows[key] = { notes: await row.locator(NOTE).count(), noteText: await row.locator(NOTE).first().innerText({ timeout: 1000 }).catch(() => null) }
    }
    return rows
  }

  defineCase('G5-001', 'G-5/AC-012: a Team member whose saved model is retired: its Settings row shows the note; a message is refused with RUN_MODEL_NOT_OFFERED and starts no runtime', async (page) => {
    const r = {}
    await offerAgyModels([MODEL, ALT, RETIRING])
    const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: {
      teamDefinitionId: ids.home, teamConfigs: [{ teamAddress: '/', ...runConfig(MODEL) }],
      memberConfigs: [{ memberAddress: '/manager', agentDefinitionId: ids.manager, ...runConfig(RETIRING) },
        { memberAddress: '/worker', agentDefinitionId: ids.worker, ...runConfig(MODEL) }] } })).createAgentTeamRun
    assert(created.success, `createAgentTeamRun: ${created.message}`, created)
    r.teamRunId = created.teamRunId
    const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree
    r.managerRunId = tree.root_team.members.find((m) => m.address === '/manager').agent_run_id
    await openTeamRun(page, r.teamRunId, ids.home)
    await answered(page, 'G5-001')
    r.launchesBefore = (await agyLaunchesOf(r.managerRunId)).length
    assert(r.launchesBefore > 0, 'the coordinator ran on its saved model first', r)
    assert((await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: r.teamRunId })).terminateAgentTeamRun.success, 'terminate the team run')
    await offerAgyModels([MODEL, ALT])
    await openTeamRun(page, r.teamRunId, ids.home)
    const view = await openSettings(page)
    // "This agent": the focused coordinator's own card; "Team settings": the team's card and its Members rows.
    r.subjectNote = await view.locator(`${sel('existing-run-subject-card')} ${NOTE}`).first().innerText({ timeout: 5000 }).catch(() => null)
    await shot(page, 'G5-001-settings-this-agent-1280', 1280)
    await view.locator(sel('run-settings-switch-group')).click(); await settle(page, 1200)
    r.rows = await expandedMemberRows(view)
    const managerKey = Object.keys(r.rows).find((key) => key.endsWith('manager'))
    const workerKey = Object.keys(r.rows).find((key) => key.endsWith('worker'))
    assert(managerKey && workerKey, 'both member rows are listed', r.rows)
    assert(r.rows[managerKey].notes === 1 && r.rows[workerKey].notes === 0, 'only the retired member\'s row has the note', r.rows)
    assert(r.subjectNote, 'the focused member\'s card shows the note too', r)
    await shot(page, 'G5-001-settings-member-note-1280', 1280)
    await view.locator(sel('run-settings-switch-agent')).click(); await settle(page, 600)
    await backToConversation(page)
    await typeAndSend(page, 'After the retirement. Marker G5-001-B.')
    await waitFor('the refusal text', async () => refusalPattern(RETIRING).test(await bodyText(page)), 60000)
    const match = refusalPattern(RETIRING).exec(await bodyText(page))
    r.refusal = match[0]
    assert(match[1] === 'manager' && match[2] === 'manager', 'the refusal names the member', r)
    await shot(page, 'G5-001-refusal-1280', 1280)
    await delay(5000)
    r.launchesAfter = (await agyLaunchesOf(r.managerRunId)).length
    assert(r.launchesAfter === r.launchesBefore, 'no AGY process started for the refused member', r)
    return r
  })

  defineCase('G5-002', 'G-5/AC-012: a standalone run on a retired model: Settings shows the note; restoring it by a message is refused with RUN_MODEL_NOT_OFFERED and starts no runtime', async (page) => {
    const r = {}
    await offerAgyModels([MODEL, ALT, RETIRING])
    r.runId = await createAgentRun(ids.writer, RETIRING)
    await openAgentRun(page, r.runId)
    await answered(page, 'G5-002')
    r.launchesBefore = (await agyLaunchesOf(r.runId)).length
    assert(r.launchesBefore > 0, 'the run ran on its saved model first', r)
    await terminateAgentRun(r.runId)
    await offerAgyModels([MODEL, ALT])
    await openAgentRun(page, r.runId)
    const view = await openSettings(page)
    r.note = await view.locator(NOTE).first().innerText({ timeout: 10000 }).catch(() => null)
    assert(r.note, 'Settings shows the note for the run', r)
    await shot(page, 'G5-002-settings-note-1280', 1280)
    await backToConversation(page)
    await typeAndSend(page, 'After the retirement. Marker G5-002-B.')
    await waitFor('the refusal text', async () => refusalPattern(RETIRING).test(await bodyText(page)), 60000)
    const match = refusalPattern(RETIRING).exec(await bodyText(page))
    r.refusal = match[0]
    assert(match[1] === match[2], 'the refusal names one agent', r)
    await shot(page, 'G5-002-refusal-1280', 1280)
    await delay(5000)
    r.launchesAfter = (await agyLaunchesOf(r.runId)).length
    assert(r.launchesAfter === r.launchesBefore, 'no AGY process started for the refused run', r)
    return r
  })

  defineCase('G5-003', 'G-5/D-12: an unreadable model list (slower than the 8 s budget, then failing) starts the stopped run as today, with no refusal', async (page) => {
    const r = { attempts: [] }
    await offerAgyModels([MODEL, ALT])
    r.runId = await createAgentRun(ids.writer, MODEL)
    await openAgentRun(page, r.runId)
    let started = Date.now()
    await answered(page, 'G5-003')
    r.firstStartMs = Date.now() - started
    for (const mode of ['hang', 'fail']) {
      await terminateAgentRun(r.runId)
      await openAgentRun(page, r.runId)
      const readsBefore = (await agyModelsReads()).length
      const launchesBefore = (await agyLaunchesOf(r.runId)).length
      await setAgyModelsMode(mode)
      const marker = `G5-003-${mode.toUpperCase()}`
      const errorsBefore = (await bodyText(page)).split('An Error Occurred').length
      started = Date.now()
      let outcome
      try {
        await typeAndSend(page, `Hello. Marker ${marker}.`)
        // The start goes on as without the check: the run answers, or the runtime's own start fails (AGY needs its list to
        // launch); never G-5's refusal.
        outcome = await waitFor(`${marker}: an answer or the runtime's own error`, async () => {
          const text = await bodyText(page)
          if (refusalPattern(MODEL).test(text)) return 'g5-refusal'
          if (new RegExp(`${marker}[\\s\\S]*OK`).test(await conversationText(page))) return 'answered'
          return text.split('An Error Occurred').length > errorsBefore ? 'runtime-error' : null
        }, 120000)
      } finally { await setAgyModelsMode('normal') }
      const text = await bodyText(page)
      const attempt = { mode, outcome, ms: Date.now() - started, modelReads: (await agyModelsReads()).length - readsBefore,
        launches: (await agyLaunchesOf(r.runId)).length - launchesBefore,
        error: outcome === 'runtime-error' ? text.slice(text.lastIndexOf('An Error Occurred'), text.lastIndexOf('An Error Occurred') + 200) : null }
      r.attempts.push(attempt)
      assert(outcome !== 'g5-refusal', `no G-5 refusal with the list ${mode}`, r)
      assert(attempt.modelReads >= 1, `the start read the list (${mode})`, r)
      await shot(page, `G5-003-${mode}-1280`, 1280)
    }
    await shot(page, 'G5-003-started-1280', 1280)
    return r
  })
}
