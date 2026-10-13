import path from 'node:path'
export async function createOrg(context,name,key,agents,withHandoff=false) {
 const {page,state,assert,out,cache,waitOperation,publicRead}=context
 await page.getByRole('button',{name:'Agent Orgs',exact:true}).click()
 await page.locator('[data-test="create-org"]').waitFor()
 const catalogBefore=await cache('Org')
 await page.locator('[data-test="create-org"]').click()
 await page.locator('form input[required]').waitFor()
 assert.equal(await page.locator('form input[required]').count(),1)
 await page.locator('form input[required]').fill(name)
 const description='Disposable Org with real referenced Agents and preserved routing.'
 await page.locator('form textarea').first().fill(description)
 await page.locator('[data-test="open-member-picker"]').click()
 const picker=page.locator('[data-test="org-member-picker"]')
 for(const agent of agents) await picker.getByRole('button',{name:'Add '+agent.name,exact:true}).click()
 await picker.getByRole('button',{name:'Done',exact:true}).click()
 let handoff
 if(withHandoff) {
  await page.locator('[data-test="add-handoff"]').click()
  const options=await page.locator('[data-test="handoff-from"] option').evaluateAll(items=>items.map(item=>({value:item.value,text:item.textContent,disabled:item.disabled})))
  const available=options.filter(option=>option.value && !option.disabled)
  assert.equal(available.length,agents.length)
  const from=available[0].value,to=available[1].value
  await page.locator('[data-test="handoff-from"]').selectOption(from)
  await page.locator('[data-test="handoff-to"]').selectOption(to)
  const rules=['When this review is complete, hand the package to the next member.','Preserve the original member identity and rules.']
  await page.locator('[data-test="when-condition-0"]').fill(rules[0])
  await page.locator('[data-test="add-when-condition"]').click()
  await page.locator('[data-test="when-condition-1"]').fill(rules[1])
  await page.locator('[data-test="apply-handoff-draft"]').click()
  assert.equal(await page.locator('[data-test="handoff-editor"]').count(),0)
  handoff={from,to,rules}
 }
 await page.locator('form button[type="submit"]').click()
 const op=await waitOperation('createAgentOrgDefinition'),row=op.response.data.createAgentOrgDefinition
 assert.equal(row.name,name);assert.equal(row.description,description);assert.equal(typeof row.revision,'string');assert(row.revision)
 assert(Object.hasOwn(row,'loadIssues'));assert.deepEqual(row.loadIssues,[])
 assert.deepEqual(row.members.map(member=>member.ref).sort(),agents.map(agent=>agent.id).sort())
 assert(row.members.every(member=>member.refType==='AGENT' && member.refScope==='SHARED'))
 assert(row.members.every(member=>member.memberName))
 assert.deepEqual(row.handoffs.map(({__typename,...entry})=>entry),handoff?[handoff]:[])
 assert(!op.request.variables.input.members.some(member=>Object.hasOwn(member,'__typename')))
 await page.waitForURL(url=>{const route=new URL(url.hash.slice(1),'http://renderer.local');return route.pathname==='/agent-orgs' && route.searchParams.get('view')==='org-edit' && route.searchParams.get('id')===row.id})
 await page.getByRole('status').filter({hasText:'Agent Org saved.'}).waitFor()
 const liveCache=await cache('Org');assert.deepEqual(liveCache.cached.agentOrgDefinitions.find(org=>org.id===row.id),row)
 assert.deepEqual(liveCache.store.definitions.find(org=>org.id===row.id),row)
 for(const old of catalogBefore.cached.agentOrgDefinitions) assert.deepEqual(liveCache.cached.agentOrgDefinitions.find(org=>org.id===old.id),old)
 const persisted=await publicRead(state.queries.GetAgentOrgDefinitions);assert.deepEqual(persisted.agentOrgDefinitions.find(org=>org.id===row.id),row)
 state[key]=row;await page.screenshot({path:path.join(out,key+'-created.png')})
 return{catalogBefore,mutation:op,expectedMembers:agents.map(agent=>({id:agent.id,name:agent.name})),handoff,liveCache,persisted,successStatus:true,url:page.url()}
}
