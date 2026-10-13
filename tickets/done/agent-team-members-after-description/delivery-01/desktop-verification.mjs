// Ticket-owned full-app smoke, not a replacement for durable API/E2E coverage.
// Attach ONLY to the isolated-app start result from this ticket. No API/WS doubles,
// internal data writes, model runs, user app access, or confirmed deletion.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const out = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(out, '../../../..')
const { chromium } = createRequire(path.join(root, 'autobyteus-web/package.json'))('playwright-core')
const receipt = JSON.parse(await fs.readFile(path.join(out, 'isolated-start.json'), 'utf8'))
assert(receipt.ok, 'Own isolated start must succeed')
const instance = receipt.result
assert(instance.executablePath.includes('/agent-team-members-after-description/'), 'Wrong app build')
assert(instance.ownsDataRoot, 'Data must be disposable/test-owned')
async function gql(query, variables = {}) {
  const response = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  assert(response.ok, `HTTP ${response.status}`)
  const body = await response.json()
  assert(!body.errors, JSON.stringify(body.errors))
  return body.data
}
let seed
try { seed = JSON.parse(await fs.readFile(path.join(out, 'seed.json'), 'utf8')) } catch (error) {
  if (error.code !== 'ENOENT') throw error
  const members = ['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'delivery_engineer']
  const agents = []
  for (const name of members) {
    const data = await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}', { input: { name, role: 'Delivery verification fixture', description: 'Disposable Agent created through the isolated backend public API.', instructions: 'This Agent is for definition inspection only; no execution required.', category: 'Delivery verification', toolNames: [] } })
    agents.push(data.createAgentDefinition)
  }
  const nodes = members.map((memberName, i) => ({ memberName, ref: agents[i].id, refScope: 'SHARED' }))
  const handoffs = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,2],[2,4]].map(([a,b], i) => ({ from: `/${members[a]}`, to: `/${members[b]}`, rules: [`Verification rule ${i + 1}: preserve the ordered routing content.`, `This is test-owned rule text, not a live team configuration.`] }))
  const instructions = Array.from({ length: 34 }, (_, i) => `Instruction ${i + 1}: inspect the member roster before long instructions and handoffs.`).join('\n')
  const create = async input => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id name nodes{memberName ref refScope} coordinatorMemberName handoffs{from to rules}}}', { input })).createAgentTeamDefinition
  const team = await create({ name: 'Software Engineering Team - Delivery Verification', description: 'Test-owned six-member Team in a source-current isolated desktop. Verify Description → Members → Instructions → Handoffs. Your normal app and definitions are untouched.', instructions, category: 'Delivery verification', nodes, coordinatorMemberName: members[0], handoffs })
  const alternate = await create({ name: 'Research Team - Delivery Verification', description: 'A second Team verifies this layout is universal, not a named-team special case.', instructions: 'Short instructions, same reading order.', category: 'Delivery verification', nodes: nodes.slice(0,2), coordinatorMemberName: members[0], handoffs: [] })
  seed = { instanceId: instance.instanceId, agents, team, alternate, instructions, handoffs }
  await fs.writeFile(path.join(out, 'seed.json'), JSON.stringify(seed, null, 2) + '\n')
}
assert.equal(seed.instanceId, instance.instanceId, 'Never reuse another instance seed')
const evidence = { startedAt: new Date().toISOString(), instance, transport: 'Real isolated embedded server GraphQL/WS; no doubles', events: [], steps: [], layouts: {} }
let browser, page
const save = () => fs.writeFile(path.join(out, 'desktop-evidence.json'), JSON.stringify(evidence, null, 2) + '\n')
try {
  browser = await chromium.connectOverCDP(instance.controlEndpoint)
  const pages = browser.contexts().flatMap(c => c.pages())
  evidence.tabs = pages.map(p => p.url())
  page = pages.find(p => p.url().includes('/renderer/index.html'))
  assert(page, 'Own main renderer tab missing')
  page.setDefaultTimeout(45000)
  page.on('pageerror', error => evidence.events.push({ type: 'pageerror', message: error.message }))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) evidence.events.push({ type: message.type(), message: message.text() }) })
  page.on('requestfailed', request => evidence.events.push({ type: 'requestfailed', url: request.url(), failure: request.failure() }))
  const base = page.url().split('#')[0]
  const route = id => `${base}#/agent-teams?view=team-detail&id=${encodeURIComponent(id)}`
  await page.goto(route(seed.team.id))
  await page.getByRole('heading', { name: 'Members (6)', exact: true }).waitFor()
  const sections = page.locator('section').filter({ has: page.locator('h2') })
  for (const width of [1440, 600]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.waitForTimeout(300)
    const observed = await sections.evaluateAll(ss => {
      const box = el => { const b = el.getBoundingClientRect(); return { x:b.x, y:b.y, width:b.width, height:b.height, bottom:b.bottom, right:b.right } }
      return ss.map(section => ({ heading:section.querySelector('h2')?.textContent.trim(), box:box(section), cards:[...section.querySelectorAll('article')].map(card => ({ text:card.textContent.trim(), box:box(card) })), clientWidth:section.clientWidth, scrollWidth:section.scrollWidth }))
    })
    assert.deepEqual(observed.map(s => s.heading), ['Description', 'Members (6)', 'Instructions', 'Handoffs'])
    for (let i = 1; i < observed.length; i++) assert(observed[i].box.y >= observed[i-1].box.bottom, 'Sections overlap')
    const roster = observed[1]
    assert.equal(roster.cards.length, 6)
    assert.equal(roster.cards.filter(c => c.text.includes('COORDINATOR')).length, 1)
    assert(roster.scrollWidth <= roster.clientWidth, 'Roster overflow')
    roster.cards.forEach(card => assert(card.box.x >= roster.box.x && card.box.right <= roster.box.right, 'Card outside roster'))
    assert(width === 1440 ? Math.abs(roster.cards[0].box.y - roster.cards[1].box.y) < 2 : roster.cards[1].box.y >= roster.cards[0].box.bottom, 'Wrong responsive columns')
    evidence.layouts[width] = observed
    await page.screenshot({ path:path.join(out, `desktop-${width}.png`) })
  }
  assert.equal((await page.locator('[data-test="instruction-viewport"]').textContent()).trim(), seed.instructions)
  assert.equal(await page.locator('[data-test^="handoff-card-"]').count(), 8)
  await page.locator('[data-test="instruction-toggle"]').click()
  assert.equal(await page.locator('[data-test="instruction-toggle"]').getAttribute('aria-expanded'), 'true')
  await page.locator('[data-test="instruction-toggle"]').click()
  evidence.steps.push('D01 long-content order/count/coordinator/cards/columns/content/disclosure Pass')
  await page.locator('[data-test="agent-member-view"]').first().click()
  await page.getByRole('heading', { name:seed.agents[0].name, exact:true }).waitFor()
  assert(page.url().includes('/agents?view=detail') && page.url().includes(`returnToTeam=${encodeURIComponent(seed.team.id)}`), 'Wrong actual Agent destination/return')
  evidence.memberDestination = page.url()
  await page.getByRole('button', { name:'Back to team', exact:true }).click()
  await page.getByRole('heading', { name:'Members (6)', exact:true }).waitFor()
  evidence.steps.push('D02 actual member View and parent return Pass')
  await page.getByRole('button', { name:'Delete', exact:true }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('dialog').getByRole('button', { name:'Cancel', exact:true }).click()
  assert.equal(await page.getByRole('dialog').count(), 0)
  await page.getByRole('button', { name:'Edit', exact:true }).click()
  await page.waitForURL(url => url.hash.includes('view=team-edit'))
  evidence.editDestination = page.url()
  await page.goto(route(seed.team.id))
  await page.getByRole('heading', { name:'Members (6)', exact:true }).waitFor()
  evidence.steps.push('D03 real Delete-cancel and Edit destination Pass; no mutation')
  await page.goto(route(seed.alternate.id))
  await page.getByRole('heading', { name:'Members (2)', exact:true }).waitFor()
  assert.deepEqual(await sections.locator('h2').allTextContents(), ['Description', 'Members (2)', 'Instructions', 'Handoffs'])
  await page.screenshot({ path:path.join(out, 'desktop-alternate.png') })
  evidence.steps.push('D04 alternate Team universal order/empty handoffs Pass')
  await page.setViewportSize({ width:1440, height:1000 })
  await page.goto(route(seed.team.id))
  await page.getByRole('heading', { name:'Members (6)', exact:true }).waitFor()
  evidence.userVerificationRoute = page.url()
  evidence.result = 'Pass'
  assert.deepEqual(evidence.events.filter(e => ['pageerror','error','requestfailed'].includes(e.type)), [], 'Unexpected app error; inspect retained evidence')
} catch (error) {
  evidence.result = 'Fail'
  evidence.failure = { message:error.message, stack:error.stack }
  if (page) await page.screenshot({ path:path.join(out, 'desktop-failure.png') }).catch(() => {})
  process.exitCode = 1
} finally {
  evidence.finishedAt = new Date().toISOString()
  await save()
  // CDP-attached browser.close disconnects this client, not the isolated app.
  await browser?.close()
}
console.log(JSON.stringify({ result:evidence.result, steps:evidence.steps, events:evidence.events, failure:evidence.failure, userVerificationRoute:evidence.userVerificationRoute }, null, 2))
