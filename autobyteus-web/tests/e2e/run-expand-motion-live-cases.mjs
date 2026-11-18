// Runs view expand and collapse on a live run (run-expand-motion, autobyteus-390): opt-in cases of
// delegated-launch-defaults-probe.mjs (real Chrome → Nuxt dev → this worktree's dist/app.js, scripted AGY, owned data root).
// The live counterpart of run-expand-motion-probe.mjs (a fixture page): the rows come from a real run's delegated work.
//   pnpm -C autobyteus-web test:e2e:run-expand-motion-live --output-dir <fresh dir>
// Setup through public APIs: an agent with `update_task`, a Project with four Tasks. The run is started in New chat; the
// agent hands each Task to a Team copy and later closes one, each through its own tool call typed into the composer.
// Cases (run in order; each uses the run the first one starts):
//   RXM-001 (AC-001, AC-002, AC-005) In the Runs view, collapse hides the run's delegated rows from the first frame;
//           expand shows every delegated row at its final place, with its Task line and `transform: none`, in each of the
//           first 4 frames; a delegated Team expanded there shows its members at once and moves no row with a transform.
//   RXM-002 (AC-003, AC-005) While the run is expanded, the agent closes one Task (DONE): that row fades and closes
//           (`tree-row-leave-active`, opacity between 0 and 1), the row below glides up by layout with no transform, then
//           the other rows are at rest.
//   RXM-003 (AC-003, R-01) The run is stopped and the app reopened: the stored rows show; folded, the view switched
//           (Runs → Workspaces → Runs) and unfolded, the same rows show, the unfold reads nothing
//           (`GetAgentRunCollaboration`), and a delegated row clicked in the list is selected. Whether the fold survived
//           the view switch is recorded (it resets today: the disclosure state belongs to the Runs view's instance).

export const RXM_CASES = ['RXM-001', 'RXM-002', 'RXM-003']
const FRAMES = 4

export const registerRunExpandMotionLiveCases = (h) => {
  const { defineCase, assert, waitFor, delay, sel, settle, shot, gql, newChatFor, chooseModel, typeAndSend, callFromComposer, callTool,
    AGY, MODEL, ids, names, address, env } = h
  const s = {}
  const tree = (runId) => `[data-test="workspace-agent-run-task-tree"][data-run-id="${runId}"]`
  const runRow = (runId) => `li[data-test="run-list-row"][data-run-id="${runId}"]`
  const mode = (page) => page.evaluate(() => Object.entries(window.localStorage).find(([k]) => k.startsWith('autobyteus.leftPanel.runSectionMode.'))?.[1] ?? 'workspaces')
  const chooseView = async (page, view) => {
    if ((await mode(page)) !== view) {
      await page.locator(sel('run-section-view-menu')).click()
      await page.locator(sel(`run-section-view-${view}`)).click()
    }
    await waitFor(`${view} view`, async () => (await mode(page)) === view, 15000)
    await settle(page, 1000)
  }
  /** Delegated rows on screen (folded rows stay mounted and hidden, SR-002). */
  const rowCount = (page, runId) => page.evaluate((treeSel) => [...document.querySelectorAll(`${treeSel} > *`)].filter((row) => row.getClientRects().length > 0).length, tree(runId))
  const expanded = async (page, runId) => (await page.locator(`${runRow(runId)} ${sel('run-list-disclosure')}`).getAttribute('aria-expanded')) === 'true'
  /** Clicks the run's disclosure and samples its delegated rows for FRAMES animation frames, then once settled. */
  const toggleAndSample = (page, runId, clickSel = null) => page.evaluate(async ([treeSel, clickSel, frames]) => {
    // SR-002: folded rows stay mounted and hidden, so only rows with a layout box are on screen.
    const rows = () => [...document.querySelectorAll(`${treeSel} > *`)].filter((row) => row.getClientRects().length > 0)
    const sample = () => rows().map((row) => ({ top: Math.round(row.getBoundingClientRect().top), transform: getComputedStyle(row).transform,
      taskLine: /RXM Task \d/.test(row.textContent ?? '') }))
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
    document.querySelector(clickSel).click()
    const perFrame = []
    for (let i = 0; i < frames; i += 1) { await frame(); perFrame.push(sample()) }
    await new Promise((resolve) => setTimeout(resolve, 700))
    return { perFrame, settled: sample(), treeShown: Boolean(document.querySelector(treeSel)?.getClientRects().length) }
  }, [tree(runId), clickSel ?? `${runRow(runId)} [data-test="run-list-disclosure"]`, FRAMES])

  defineCase('RXM-001', 'AC-001/AC-002: a live run\'s delegated rows: collapse hides them from the first frame; expand shows each at its final place with no transform from the first frame', async (page) => {
    const r = {}
    s.agentName = `RXM Manager ${Date.now().toString(36)}`
    s.agentId = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
      name: s.agentName, description: 'Hands out and closes Project Tasks.', instructions: 'Follow the request.', toolNames: ['update_task'] } })).createAgentDefinition.id
    s.projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `RXM Project ${Date.now().toString(36)}` } })).createProject.projectId
    s.tasks = []
    for (let i = 1; i <= 4; i += 1) {
      s.tasks.push((await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: {
        projectId: s.projectId, title: `RXM Task ${i}`, description: `Part ${i} of the work.` } })).createProjectTask.taskId)
    }
    // The run: New chat for the agent; its first message hands out Task 1, then the composer hands out Tasks 2-4.
    await newChatFor(page, '/agents', s.agentName)
    await chooseModel(page, page.locator(sel('chat-composer')), AGY, MODEL)
    await typeAndSend(page, callTool('delegate_task', { recipient_address: address('home'), task_id: s.tasks[0] }))
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    s.runId = new URL(page.url()).searchParams.get('id')
    await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 1500)
    for (const taskId of s.tasks.slice(1)) {
      const called = await callFromComposer(page, `delegate ${taskId}`, 'delegate_task', { recipient_address: address('home'), task_id: taskId })
      assert(/delegated/.test(called), 'delegation failed', called)
    }
    await chooseView(page, 'runs')
    await page.locator(runRow(s.runId)).waitFor({ timeout: 30000 })
    await waitFor('four delegated rows in the Runs view', async () => (await rowCount(page, s.runId)) === 4, 60000)
    assert(await expanded(page, s.runId), 'the run does not start expanded')
    await delay(800)
    r.before = await page.evaluate((treeSel) => [...document.querySelectorAll(`${treeSel} > *`)].map((row) => Math.round(row.getBoundingClientRect().top)), tree(s.runId))
    await shot(page, 'RXM-001-expanded')

    r.collapse = await toggleAndSample(page, s.runId)
    assert(r.collapse.perFrame.every((rows) => rows.length === 0) && !r.collapse.treeShown, 'delegated rows are still shown after collapse', r.collapse)
    assert(!(await expanded(page, s.runId)), 'the disclosure did not report collapsed')
    await shot(page, 'RXM-001-collapsed')

    r.expand = await toggleAndSample(page, s.runId)
    const finalTops = r.expand.settled.map((row) => row.top)
    assert(JSON.stringify(finalTops) === JSON.stringify(r.before), 'settled rows differ from before collapse', { finalTops, before: r.before })
    assert(r.expand.perFrame.every((rows) => rows.length === 4), 'not every row is on screen from the first frame', r.expand.perFrame.map((rows) => rows.length))
    r.offending = r.expand.perFrame.flatMap((rows, frame) => rows.map((row, index) => ({ frame, index, ...row, final: finalTops[index] }))
      .filter((row) => row.transform !== 'none' || row.top !== row.final))
    assert(r.offending.length === 0, `${r.offending.length} row samples moved from elsewhere on screen`, r.offending.slice(0, 6))
    assert(r.expand.perFrame.every((rows) => rows.every((row) => row.taskLine)), 'a row is shown without its Task line after expand (SR-002 AC-001)', r.expand.perFrame)
    assert(await expanded(page, s.runId), 'the disclosure did not report expanded')
    await shot(page, 'RXM-001-expanded-again')
    // AC-005: a delegated Team row expanded in the Runs view moves no row with a transform; its members show at once.
    const teamToggle = `${tree(s.runId)} [data-test="workspace-team-transient-disclosure"]`
    r.teamExpand = await toggleAndSample(page, s.runId, teamToggle)
    r.teamExpandRows = r.teamExpand.perFrame.map((rows) => rows.length)
    assert(r.teamExpand.settled.length > 4 && r.teamExpand.perFrame.every((rows) => rows.length === r.teamExpand.settled.length), 'the Team\'s members are not all shown from the first frame', r.teamExpandRows)
    r.teamOffending = r.teamExpand.perFrame.flatMap((rows, frame) => rows.map((row, index) => ({ frame, index, ...row, final: r.teamExpand.settled[index].top }))
      .filter((row) => row.transform !== 'none' || row.top !== row.final))
    assert(r.teamOffending.length === 0, `${r.teamOffending.length} row samples slid when a Team expanded`, r.teamOffending.slice(0, 6))
    await shot(page, 'RXM-001-team-expanded')
    await page.locator(teamToggle).first().click()
    await waitFor('the Team collapsed again', async () => (await rowCount(page, s.runId)) === 4, 15000)
    return { runId: s.runId, tasks: s.tasks, ...r }
  })

  defineCase('RXM-002', 'AC-003: while the run is expanded, the agent closes a Task (DONE): its row leaves with the designed fade, then the other rows are at rest', async (page) => {
    assert(s.runId, 'RXM-002 needs RXM-001')
    const r = {}
    await page.evaluate(([treeSel]) => {
      const record = { frames: [], stop: false }
      window.__rxmLeave = record
      const tick = () => {
        const rows = [...document.querySelectorAll(`${treeSel} > *`)]
        record.frames.push({ t: Math.round(performance.now()), rows: rows.map((row) => ({ leaving: row.classList.contains('tree-row-leave-active'),
          opacity: Number(getComputedStyle(row).opacity), transform: getComputedStyle(row).transform, top: Math.round(row.getBoundingClientRect().top) })) })
        if (!record.stop && record.frames.length < 1200) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, [tree(s.runId)])
    const called = await callFromComposer(page, 'close Task 1', 'update_task', { task_id: s.tasks[0], status: 'DONE' })
    r.called = called.slice(0, 200)
    await waitFor('the closed Task\'s row leaves', async () => (await rowCount(page, s.runId)) === 3, 30000)
    await delay(600)
    const recorded = await page.evaluate(() => { window.__rxmLeave.stop = true; return window.__rxmLeave.frames })
    const leavingFrames = recorded.filter((f) => f.rows.some((row) => row.leaving))
    r.leavingFrameCount = leavingFrames.length
    r.fadeOpacities = leavingFrames.flatMap((f) => f.rows.filter((row) => row.leaving).map((row) => row.opacity)).slice(0, 20)
    r.leaveMs = leavingFrames.length ? leavingFrames.at(-1).t - leavingFrames[0].t : 0
    assert(r.fadeOpacities.some((o) => o > 0 && o < 1), 'no frame showed the leaving row fading', r)
    // AC-005: the rows below glide up by layout as the leaving row closes, never by a move transform.
    r.movedByTransform = leavingFrames.flatMap((f) => f.rows.filter((row) => !row.leaving && row.transform !== 'none')).length
    assert(r.movedByTransform === 0, 'a row below the leaving row moved with a transform', leavingFrames.slice(0, 3))
    // The row right below the leaving one.
    const nextTops = leavingFrames.map((f) => { const i = f.rows.findIndex((row) => row.leaving); return f.rows.slice(i + 1).find((row) => !row.leaving)?.top })
      .filter((top) => top !== undefined)
    r.nextRowTops = [...new Set(nextTops)]
    assert(r.nextRowTops.length >= 3, 'the row below did not glide up (fewer than 3 positions while the row closed)', r.nextRowTops)
    const atRest = await page.evaluate((treeSel) => [...document.querySelectorAll(`${treeSel} > *`)].map((row) => getComputedStyle(row).transform), tree(s.runId))
    assert(atRest.length === 3 && atRest.every((t) => t === 'none'), 'the remaining rows are not at rest', atRest)
    await shot(page, 'RXM-002-after-done')
    return r
  })

  defineCase('RXM-003', 'AC-003/R-01: a stopped run reopened: stored rows show; fold, Runs → Workspaces → Runs, unfold: same rows, no read for the unfold; a delegated row is selected from the list', async (page) => {
    assert(s.runId, 'RXM-003 needs RXM-001')
    const r = {}
    const stopped = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: s.runId })).terminateAgentRun
    assert(stopped.success, stopped.message)
    const reads = []
    const onRequest = (req) => {
      if (!req.url().includes('/graphql') || req.method() !== 'POST') return
      try { const body = JSON.parse(req.postData() ?? '{}'); if (body.operationName === 'GetAgentRunCollaboration' && body.variables?.runId === s.runId) reads.push(Date.now()) } catch { /* not JSON */ }
    }
    page.on('request', onRequest)
    try {
      await page.goto(`${env().frontUrl}/workspace`, { waitUntil: 'domcontentloaded' })
      await page.locator(sel('run-section-view-menu')).waitFor({ timeout: 120000 }); await settle(page, 1500)
      await chooseView(page, 'runs')
      await waitFor('the stored rows after reopening', async () => (await rowCount(page, s.runId)) === 3, 60000)
      r.storedRows = await page.locator(`${tree(s.runId)} > *`).evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80)))
      r.readsOnOpen = reads.length
      await page.locator(`${runRow(s.runId)} ${sel('run-list-disclosure')}`).click(); await delay(500)
      assert(!(await expanded(page, s.runId)) && !(await page.locator(tree(s.runId)).isVisible()), 'fold did not hide the tree')
      await chooseView(page, 'workspaces')
      await chooseView(page, 'runs')
      await page.locator(runRow(s.runId)).waitFor({ timeout: 30000 })
      // Recorded, not asserted: the fold lives in the Runs view's own disclosure state (useRunListDisclosure), so it
      // resets when the view is shown again (unchanged by this ticket). Fold again so the unfold below is measured.
      r.foldKeptAcrossSwitch = !(await expanded(page, s.runId))
      if (!r.foldKeptAcrossSwitch) {
        await page.locator(`${runRow(s.runId)} ${sel('run-list-disclosure')}`).click(); await delay(500)
        assert(!(await expanded(page, s.runId)) && !(await page.locator(tree(s.runId)).isVisible()), 'fold did not hide the tree')
      }
      r.readsBeforeUnfold = reads.length
      await page.locator(`${runRow(s.runId)} ${sel('run-list-disclosure')}`).click()
      await waitFor('the rows after unfold', async () => (await rowCount(page, s.runId)) === 3, 30000)
      await delay(1500)
      r.readsAfterUnfold = reads.length
      r.rowsAfterUnfold = await page.locator(`${tree(s.runId)} > *`).evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80)))
      assert(JSON.stringify(r.rowsAfterUnfold) === JSON.stringify(r.storedRows), 'the rows differ after unfold', r)
      assert(r.readsAfterUnfold === r.readsBeforeUnfold, 'the unfold read the stored view again', r)
      await shot(page, 'RXM-003-unfolded-after-switch')
      const first = page.locator(`${tree(s.runId)} ${sel('workspace-team-transient-execution-row')}`).first()
      await first.click(); await settle(page, 1500)
      await waitFor('the clicked delegated row is selected', async () => (await page.locator(`${tree(s.runId)} ${sel('workspace-team-transient-execution-row')}[aria-current="true"]`).count()) === 1, 30000)
      r.selectedRow = (await page.locator(`${tree(s.runId)} [aria-current="true"]`).first().textContent()).trim().replace(/\s+/g, ' ').slice(0, 80)
      await shot(page, 'RXM-003-delegated-row-selected')
      return r
    } finally { page.off('request', onRequest) }
  })
}
