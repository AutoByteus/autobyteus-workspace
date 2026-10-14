// Ticket-owned setup for explicit HUMAN verification only, not a new full-app/cache test.
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
try { seed = JSON.parse(await fs.readFile(path.join(out, 'verification-data.json'), 'utf8')) } catch (error) {
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
  const team = await create({ name: 'Software Engineering Team - Isolated Verification', description: 'Test-owned six-member Team in a source-current isolated desktop. Verify Description → Members → Instructions → Handoffs. Your normal app and definitions are untouched.', instructions, category: 'Delivery verification', nodes, coordinatorMemberName: members[0], handoffs })
  const alternate = await create({ name: 'Research Team - Isolated Verification', description: 'A second Team verifies this layout is universal, not a named-team special case.', instructions: 'Short instructions, same reading order.', category: 'Delivery verification', nodes: nodes.slice(0,2), coordinatorMemberName: members[0], handoffs: [] })
  seed = { instanceId: instance.instanceId, agents, team, alternate, instructions, handoffs }
  await fs.writeFile(path.join(out, 'verification-data.json'), JSON.stringify(seed, null, 2) + '\n')
}
assert.equal(seed.instanceId, instance.instanceId, 'Never reuse another instance seed')

const browser = await chromium.connectOverCDP(instance.controlEndpoint)
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('/renderer/index.html'))
  assert(page, 'Own renderer missing')
  const base = page.url().split('#')[0]
  const url = `${base}#/agent-teams?view=team-detail&id=${encodeURIComponent(seed.team.id)}`
  const observations = {instanceId:instance.instanceId, purpose:'Human verification setup only; not API/full-app/cache sign-off', dataPreparation:'Public isolated-backend API creates; no UI cache creation assertions or baseline repair', events:[], url}
  page.on('pageerror',e=>observations.events.push({type:'pageerror',message:e.message}))
  page.on('console',e=>{if(['error','warning'].includes(e.type())) observations.events.push({type:e.type(),message:e.text()})})
  await page.goto(url)
  await page.getByRole('heading',{name:'Members (6)',exact:true}).waitFor({timeout:45000})
  await page.waitForTimeout(1200)
  observations.headings = await page.locator('section h2').allTextContents()
  observations.userConfirmation = 'Pending, never inferred from page readiness'
  await page.screenshot({path:path.join(out,'verification-ready.png')})
  await fs.writeFile(path.join(out,'verification-ready.json'), JSON.stringify(observations,null,2)+'\n')
  console.log(JSON.stringify(observations,null,2))
} finally { await browser.close() }
