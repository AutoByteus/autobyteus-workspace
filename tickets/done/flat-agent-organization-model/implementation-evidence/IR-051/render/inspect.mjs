import { createRequire } from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json');const{chromium}=require('playwright-core');
const out='/tmp/aorg-ir051-render';const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const result={observations:[],errors:[]};
try{for(const [name,width,height]of[['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto('http://localhost:30551/ir051-orgs?view=org-list');await page.getByText('Local Research Org',{exact:true}).waitFor();
 await page.getByRole('button',{name:'View Details'}).click();await page.getByText('Coordinator: Research Coordinator',{exact:true}).waitFor();
 assert.equal(await page.getByText(/Unavailable:/).count(),0);await page.screenshot({path:`${out}/${name}-owned-detail.png`,fullPage:true});
 await page.getByRole('button',{name:'View ↗',exact:true}).click();await page.getByRole('heading',{name:'Bundled Research Team'}).waitFor();await page.getByText('Research Coordinator',{exact:true}).first().waitFor();
 await page.screenshot({path:`${out}/${name}-exact-team-detail.png`,fullPage:true});await page.getByRole('button',{name:/Back to Agent Orgs/}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();
 await page.getByRole('button',{name:'Save changes',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('button[type=submit]')?.disabled);
 await page.locator('form textarea').first().fill(`Updated ${name} description.`);if(name==='narrow')await page.getByRole('button',{name:'Save changes',exact:true}).press('Enter');else await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Agent Org saved.',{exact:true}).waitFor();
 const saved=await page.evaluate(()=>window.__ir051);assert.equal(saved.org.description,`Updated ${name} description.`);assert.equal(saved.org.instructions,'Hidden instructions retained.');assert.equal(saved.org.members.length,2);assert.deepEqual(saved.org.handoffs[0].rules,['Prepare a complete research request.','Keep the original context.']);assert.equal(saved.calls.filter(x=>x.field==='updateAgentOrgDefinition').length,1);
 await page.screenshot({path:`${out}/${name}-saved.png`,fullPage:true});
 await page.getByRole('button',{name:'Add member',exact:true}).click();await page.getByRole('tab',{name:'Teams',exact:true}).click();assert.equal(await page.locator('[data-test=member-picker-teams] li').count(),1);assert.match(await page.locator('[data-test=member-picker-teams]').innerText(),/No Teams match/);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'View Details'}).click();await page.getByText(`Updated ${name} description.`,{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 result.observations.push({viewport:{width,height},exactDetailAndCoordinator:true,teamViewAndBack:true,descriptionSaveAndReopen:true,sharedPickerExcludesOwned:true,operations:saved.calls});
 await context.close();
}
const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
await page.goto('http://localhost:30551/ir051-orgs?view=org-list');await page.getByText('Local Research Org',{exact:true}).waitFor();await page.evaluate(()=>window.__ir051.hold=true);await page.getByRole('button',{name:'View Details'}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();
await page.locator('form textarea').first().fill('Draft while exact references load');assert.equal(await page.getByRole('button',{name:'Save changes'}).isDisabled(),true);assert.equal(await page.locator('[data-test=handoff-manager-org]').isVisible(),false);await page.screenshot({path:`out/loading-narrow.png`.replace('out',out),fullPage:true});
await page.evaluate(()=>{window.__ir051.hold=false;window.__ir051.release()});await page.waitForFunction(()=>!document.querySelector('button[type=submit]')?.disabled);assert.equal(await page.locator('form textarea').first().inputValue(),'Draft while exact references load');await page.getByRole('button',{name:'Save changes'}).click();await page.getByText('Agent Org saved.',{exact:true}).waitFor();
await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.evaluate(()=>window.__ir051.missing=true);await page.getByRole('button',{name:'View Details'}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('alert').filter({hasText:'Referenced definitions are unavailable'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save changes'}).isDisabled(),true);await page.screenshot({path:`${out}/unavailable-narrow.png`,fullPage:true});
assert.equal(await page.evaluate(()=>window.__ir051.calls.filter(x=>x.field==='updateAgentOrgDefinition').length),1);result.observations.push({pendingReadPreservesDraft:true,genuineUnavailableBlocksSave:true});await context.close();
assert.deepEqual(result.errors,[]);result.passed=true;
}finally{await fs.writeFile(`${out}/evidence.json`,JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({passed:result.passed,observations:result.observations.length,errors:result.errors}));
