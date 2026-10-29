// Live tool list updates (ticket live-tool-list-updates, autobyteus-324). Registered by
// delegated-launch-defaults-probe.mjs (same owned stack: real Chrome → Nuxt dev → built backend with the scripted AGY CLI,
// which calls the real Agent Tools MCP endpoint when the user types `CALL_TOOL:{…}`; owned temp data root and HOME; no
// credentials). AGY applies a tool-list change at once; its notice and card come with the run's next message.
//
// Cases:
//   TLU-001 (AC-001, AC-003, AC-006; REQ-006, REQ-007; SCN-001b) The user changes an agent's tools in the app while its run
//           is open:
//           - a chat on the agent (tools: list_projects) calls list_projects;
//           - Agents → the agent → Edit → Tools: add list_project_tasks → Save Changes;
//           - back in the run, list_project_tasks works, and the conversation shows one "Tools updated" card
//             ("Now available: list_project_tasks.");
//           - Edit → remove list_projects → Save; the run's list_projects call is refused by the server ("Tool is not
//             enabled for this session") and a second card says "No longer available: list_projects.";
//           - the run is stopped; Edit → add list_projects back → Save; the user's next message restores the run, the
//             third card says "Now available: list_projects.", and list_projects works again (AC-006).
// Run alone: pnpm -C autobyteus-web test:e2e:tool-list-updates --output-dir <fresh dir>
import { randomUUID } from 'node:crypto'

const ALPHA = 'list_projects'
const BETA = 'list_project_tasks'
const CARD = '[data-testid="system-task-notification-segment"]'
const CARD_LABEL = '[data-testid="system-task-notification-label"]'
const REFUSED = 'Tool is not enabled for this session'

export function registerToolListUpdateCases(h) {
  const { defineCase, assert, waitFor, delay, settle, shot, gql, newChatFor, chooseModel, typeAndSend, callFromComposer,
    callTool, openAgentRun, agyToolCalls, AGY, MODEL, env } = h

  const isError = (text) => /"isError":true/.test(text)
  const definitionTools = async (id) => (await gql('query($id:String!){agentDefinition(id:$id){toolNames}}', { id })).agentDefinition.toolNames
  /** The "Tools updated" cards in the open conversation, with the text each shows. */
  const toolCards = async (page) => {
    const cards = []
    for (const card of await page.locator(`main ${CARD}`).all()) {
      // textContent: the label is styled uppercase, and innerText reports the styled text.
      const label = ((await card.locator(CARD_LABEL).first().textContent().catch(() => '')) ?? '').trim()
      if (label === 'Tools updated') cards.push(((await card.textContent()) ?? '').replace(/\s+/g, ' ').trim())
    }
    return cards
  }
  const waitCards = (page, label, count) => waitFor(label, async () => { const c = await toolCards(page); return c.length >= count ? c : null }, 60000, 1000)

  /** Agents → the agent's page → Edit → the Tools field: `add` tools picked from the list, `remove` tools by their chips → Save Changes. */
  const editTools = async (page, definitionId, { add = [], remove = [] }) => {
    await page.goto(`${env().frontUrl}/agents?view=detail&id=${definitionId}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500)
    await page.locator('main').getByRole('button', { name: 'Edit', exact: true }).first().click()
    const field = page.locator('fieldset:has(label[for="tool_names"])').first()
    await field.waitFor({ timeout: 60000 }); await settle(page, 1000)
    for (const tool of add) {
      const search = field.getByPlaceholder('Search available items')
      await search.fill(tool); await delay(400)
      const item = field.locator('li', { hasText: tool }).filter({ has: page.getByText(tool, { exact: true }) }).first()
      await waitFor(`tool ${tool} listed`, async () => {
        if (await item.isVisible().catch(() => false)) return true
        for (const group of await field.locator('details:not([open]) > summary').all()) await group.click().catch(() => {})
        return false
      }, 30000, 500)
      await item.click(); await delay(300)
      await search.fill('')
    }
    for (const tool of remove) {
      await field.locator('span.rounded-full', { has: page.getByText(tool, { exact: true }) }).first().locator('button').click(); await delay(300)
    }
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
    await page.getByText('Agent definition updated successfully!').first().waitFor({ timeout: 30000 })
    await settle(page, 1500)
  }

  defineCase('TLU-001', 'AC-001, AC-003, AC-006: tools edited in the app reach the open run: added tool works with a "Tools updated" card, removed tool refused with a card, stopped run restored with its new tools and a card', async (page) => {
    const t = randomUUID().slice(0, 4)
    const r = { name: `Tool List ${t}` }
    r.projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `TLU Project ${t}` } })).createProject.projectId
    r.definitionId = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
      name: r.name, description: `${r.name}.`, instructions: 'Follow the request.', toolNames: [ALPHA] } })).createAgentDefinition.id

    // A chat on the agent, started from the Agents page.
    await newChatFor(page, '/agents', r.name)
    await chooseModel(page, page.locator('[data-test="chat-composer"]'), AGY, MODEL)
    await typeAndSend(page, 'Hello.')
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    r.runId = new URL(page.url(), 'http://probe.local').searchParams.get('id')
    await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await settle(page, 1500)
    r.alpha1 = await callFromComposer(page, 'alpha at the start', ALPHA, {})
    assert(!isError(r.alpha1) && r.alpha1.includes(`TLU Project ${t}`), 'list_projects works at the start', r.alpha1)
    assert((await toolCards(page)).length === 0, 'no card before any change', await toolCards(page))

    // Add beta in the app while the run is open.
    await editTools(page, r.definitionId, { add: [BETA] })
    r.toolsAfterAdd = await definitionTools(r.definitionId)
    assert(r.toolsAfterAdd.includes(ALPHA) && r.toolsAfterAdd.includes(BETA), 'the save added list_project_tasks', r.toolsAfterAdd)
    await openAgentRun(page, r.runId)
    r.beta = await callFromComposer(page, 'beta after it was added', BETA, { project_id: r.projectId })
    assert(!isError(r.beta), 'list_project_tasks works after it was added', r.beta)
    r.cardsAfterAdd = await waitCards(page, 'card after the add', 1)
    assert(r.cardsAfterAdd.length === 1 && r.cardsAfterAdd[0].includes(`Now available: ${BETA}.`) && !r.cardsAfterAdd[0].includes('[Platform notice'),
      'one "Tools updated" card naming list_project_tasks', r.cardsAfterAdd)
    await shot(page, 'TLU-001-card-added')

    // Remove alpha in the app; the run's call to it is refused.
    await editTools(page, r.definitionId, { remove: [ALPHA] })
    r.toolsAfterRemove = await definitionTools(r.definitionId)
    assert(!r.toolsAfterRemove.includes(ALPHA) && r.toolsAfterRemove.includes(BETA), 'the save removed list_projects', r.toolsAfterRemove)
    await openAgentRun(page, r.runId)
    const callsBefore = (await agyToolCalls()).length
    await typeAndSend(page, callTool(ALPHA, { marker: `TLU-${t}-removed` }))
    r.refusedCall = await waitFor('the removed tool\'s call', async () => (await agyToolCalls()).slice(callsBefore)
      .find((call) => call.name === ALPHA && call.arguments?.marker === `TLU-${t}-removed`), 90000, 1000)
    assert(r.refusedCall.error && String(r.refusedCall.error.message).includes(REFUSED) && !r.refusedCall.result,
      'the server refuses the removed tool', r.refusedCall)
    r.cardsAfterRemove = await waitCards(page, 'card after the removal', 2)
    assert(r.cardsAfterRemove.length === 2 && r.cardsAfterRemove[1].includes(`No longer available: ${ALPHA}.`), 'a second card naming list_projects as no longer available', r.cardsAfterRemove)
    await shot(page, 'TLU-001-card-removed')

    // Stop the run, add alpha back while it is stopped, and message it again: it is restored with its new tools (AC-006).
    r.terminate = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: r.runId })).terminateAgentRun
    assert(r.terminate.success, 'the run stopped', r.terminate)
    await editTools(page, r.definitionId, { add: [ALPHA] })
    await openAgentRun(page, r.runId)
    r.alpha2 = await callFromComposer(page, 'alpha after the restore', ALPHA, {})
    assert(!isError(r.alpha2) && r.alpha2.includes(`TLU Project ${t}`), 'list_projects works in the restored run', r.alpha2)
    r.cardsAfterRestore = await waitCards(page, 'card after the restore', 3)
    assert(r.cardsAfterRestore.length === 3 && r.cardsAfterRestore[2].includes(`Now available: ${ALPHA}.`), 'a third card naming list_projects', r.cardsAfterRestore)
    await shot(page, 'TLU-001-card-restored')
    return r
  })
}
