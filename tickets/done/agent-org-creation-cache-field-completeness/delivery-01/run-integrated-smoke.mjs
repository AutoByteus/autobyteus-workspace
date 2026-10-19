// Delivery-owned smoke/setup only; exact isolated receipt; no models/production data/doubles.
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { run } from './desktop-session.mjs'
import { createAgent } from './agent-actions.mjs'
import { createOrg } from './org-actions.mjs'
const out=path.dirname(fileURLToPath(import.meta.url))
const summary={startedAt:new Date().toISOString(),purpose:'Integrated cache fix smoke and human-check setup, not human acceptance',steps:[]}
try {
 let step=await run('D01-loaded-agent-catalog',async({page,waitOperation,cache,observed})=>{
  await page.getByRole('button',{name:'Agents',exact:true}).click()
  await page.getByRole('button',{name:'Create Agent',exact:true}).waitFor()
  await page.getByRole('button',{name:'Reload',exact:true}).click()
  await waitOperation('agentDefinitions')
  return {catalog:await cache('Agent'),page:await observed()}
 });summary.steps.push({label:step.label,result:step.result})
 step=await run('D02-control-agent-create',ctx=>createAgent(ctx,'Verification Control Agent','controlAgent'));summary.steps.push({label:step.label,result:step.result})
 step=await run('D03-primary-agent-create',ctx=>createAgent(ctx,'Cache Fix Verification Agent','primaryAgent'));summary.steps.push({label:step.label,result:step.result})
 step=await run('D04-agent-edit',async({page,state,assert,cache,waitOperation,publicRead})=>{
  const old=state.primaryAgent
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  await page.locator('form #name').waitFor()
  await page.locator('form #name').fill('Cache Fix Verification Agent Edited')
  await page.locator('form #description').fill('User-check Agent: current cache fix, create/edit save and diagnostic response.')
  await page.locator('form button[type="submit"]').click()
  await page.getByText('Agent definition updated successfully!',{exact:true}).waitFor()
  const op=await waitOperation('updateAgentDefinition');const row=op.response.data.updateAgentDefinition
  assert.equal(row.id,old.id);assert.equal(row.name,'Cache Fix Verification Agent Edited');assert(Object.hasOwn(row,'loadIssue'));assert.equal(row.loadIssue,null)
  for(const field of ['role','instructions','category','ownershipScope']) assert.deepEqual(row[field],old[field])
  const live=await cache('Agent');assert.deepEqual(live.cached.agentDefinitions.find(a=>a.id===row.id),row)
  const persisted=await publicRead(state.queries.GetAgentDefinitions);assert.deepEqual(persisted.agentDefinitions.find(a=>a.id===row.id),row)
  state.primaryAgent=row;return {mutation:op,cache:live,persisted}
 });summary.steps.push({label:step.label,result:step.result})
 step=await run('D05-org-create',async ctx=>{
  await ctx.page.getByRole('button',{name:'Agent Orgs',exact:true}).click()
  await ctx.page.locator('[data-test="create-org"]').waitFor()
  await ctx.page.getByRole('button',{name:'Reload',exact:true}).click()
  await ctx.waitOperation('agentOrgDefinitions')
  return await createOrg(ctx,'Cache Fix Verification Org','primaryOrg',[ctx.state.controlAgent,ctx.state.primaryAgent],true)
 });summary.steps.push({label:step.label,result:step.result})
 step=await run('D06-org-edit',async({page,state,assert,cache,waitOperation,publicRead,out})=>{
  const old=state.primaryOrg
  await page.locator('form input[required]').fill('Cache Fix Verification Org Edited')
  await page.locator('form textarea').first().fill('User-check Org: two Agents and ordered handoff rules, current cache fix.')
  await page.locator('form button[type="submit"]').click()
  const op=await waitOperation('updateAgentOrgDefinition');const row=op.response.data.updateAgentOrgDefinition
  assert.equal(row.id,old.id);assert.notEqual(row.revision,old.revision);assert.equal(row.name,'Cache Fix Verification Org Edited');assert(Object.hasOwn(row,'loadIssues'));assert.deepEqual(row.loadIssues,[])
  assert.deepEqual(row.members,old.members);assert.deepEqual(row.handoffs,old.handoffs)
  const live=await cache('Org');assert.deepEqual(live.cached.agentOrgDefinitions.find(o=>o.id===row.id),row)
  const persisted=await publicRead(state.queries.GetAgentOrgDefinitions);assert.deepEqual(persisted.agentOrgDefinitions.find(o=>o.id===row.id),row)
  state.primaryOrg=row;await page.screenshot({path:path.join(out,'verification-org-ready.png')});return {mutation:op,cache:live,persisted}
 });summary.steps.push({label:step.label,result:step.result})
 step=await run('D07-user-check-ready',async({page,state,cache,out,observed})=>{
  await page.getByRole('button',{name:'Agents',exact:true}).click()
  const agents=await cache('Agent');await page.screenshot({path:path.join(out,'verification-agent-catalog.png')})
  await page.getByRole('button',{name:'Agent Orgs',exact:true}).click()
  const orgs=await cache('Org');await page.screenshot({path:path.join(out,'verification-org-catalog.png')})
  return {agents,orgs,page:await observed(),userAcceptance:'Pending / NEW cache Task; old UI acceptance not inherited',modelExecution:'None'}
 });summary.steps.push({label:step.label,result:step.result});summary.result='Pass'
} catch(error) {summary.result='Fail';summary.failure={message:error.message,stack:error.stack};process.exitCode=1}
finally {summary.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'integrated-smoke-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2))}
