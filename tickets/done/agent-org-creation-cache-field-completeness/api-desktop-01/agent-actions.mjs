import path from 'node:path'
export async function createAgent(context, name, key) {
 const {page,state,assert,record,out,waitOperation,cache,publicRead}=context
 await page.getByRole('button',{name:'Agents',exact:true}).click()
 const catalogBefore=await cache('Agent')
 await page.getByRole('button',{name:'Create Agent',exact:true}).click()
 await page.locator('form #name').waitFor()
 const fields=await page.locator('form input,form textarea').evaluateAll(items=>items.map(el=>({id:el.id,type:el.type,required:el.required})))
 const input={name,role:'Cache validation observer',category:'Cache validation',description:'Disposable definition for real catalog cache proof.',instructions:'Keep this instruction content unchanged during the ordinary edit.\nNo model execution is needed.'}
 for(const [field,value] of Object.entries(input)) await page.locator('form #'+field).fill(value)
 await page.locator('form button[type="submit"]').click()
 await page.getByText('Agent definition created successfully!',{exact:true}).waitFor()
 const op=await waitOperation('createAgentDefinition'), row=op.response.data.createAgentDefinition
 assert.equal(row.name,name);assert(Object.hasOwn(row,'loadIssue'));assert.equal(row.loadIssue,null)
 assert.equal(row.ownershipScope,'SHARED');assert.equal(row.description,input.description);assert.equal(row.instructions,input.instructions)
 await page.getByRole('heading',{name,exact:true}).waitFor()
 const route=new URL(page.url().split('#')[1],'http://renderer.local')
 assert.equal(route.pathname,'/agents');assert.equal(route.searchParams.get('view'),'detail');assert.equal(route.searchParams.get('id'),row.id)
 const liveCache=await cache('Agent')
 const cached=liveCache.cached.agentDefinitions.find(a=>a.id===row.id)
 assert.deepEqual(cached,row);assert.deepEqual(liveCache.store.agentDefinitions.find(a=>a.id===row.id),row)
 for(const old of catalogBefore.cached.agentDefinitions) assert.deepEqual(liveCache.cached.agentDefinitions.find(a=>a.id===old.id),old)
 const persisted=await publicRead(state.queries.GetAgentDefinitions)
 assert.deepEqual(persisted.agentDefinitions.find(a=>a.id===row.id),row)
 state[key]=row
 await page.screenshot({path:path.join(out,key+'-created.png')})
 return {input,fields,catalogBefore,mutation:op,liveCache,persisted,successNotification:true,actualDetailRoute:page.url()}
}
