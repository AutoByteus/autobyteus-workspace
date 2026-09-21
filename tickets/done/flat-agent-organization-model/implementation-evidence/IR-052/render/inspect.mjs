import { createRequire } from 'node:module'; import fs from 'node:fs/promises'; import assert from 'node:assert/strict';
const require=createRequire('/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-web/package.json');const {chromium}=require('playwright-core');
const out='/tmp/aorg-ir052-render';const result={observations:[],errors:[]};const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();page.on('pageerror',error=>result.errors.push(String(error)));
 await page.goto('http://localhost:30552/ir052-navigation?view=org-list');await page.getByRole('button',{name:'View Details',exact:true}).click();
 await page.getByRole('button',{name:'View ↗',exact:true}).click();await page.getByRole('heading',{name:'Research Team',exact:true}).waitFor();
 await page.locator('[data-test=agent-member-view]').click();await page.getByText('Actual shared Agent instructions',{exact:true}).waitFor();
 assert.equal(new URL(page.url()).searchParams.get('returnToOrg'),'local-owned-org');assert.equal(new URL(page.url()).searchParams.get('returnToTeam'),'agent-org-owned-team:local-owned-org:local-team');
 await page.screenshot({path:`${out}/${name}-agent.png`,fullPage:true});
 const back=page.getByRole('button',{name:/Back to Team/i});if(name==='narrow'){await back.focus();await back.press('Enter')}else await back.click();
 await page.getByRole('heading',{name:'Research Team',exact:true}).waitFor();await page.getByText('Exact bundled Team',{exact:true}).waitFor();
 assert.equal(new URL(page.url()).searchParams.get('id'),'agent-org-owned-team:local-owned-org:local-team');assert.equal(new URL(page.url()).searchParams.get('returnToOrg'),'local-owned-org');
 assert.equal(await page.getByText('Agent team not found',{exact:true}).count(),0);assert.equal(await page.evaluate(()=>window.__ir052.ownedInCatalog()),null);
 await page.screenshot({path:`${out}/${name}-returned-team.png`,fullPage:true});
 await page.getByRole('button',{name:/Back to Agent Orgs/i}).click();await page.getByText('Org description',{exact:true}).waitFor();
 assert.equal(new URL(page.url()).searchParams.get('id'),'local-owned-org');assert.equal(new URL(page.url()).searchParams.has('returnToOrg'),false);
 const evidence=await page.evaluate(()=>({navigation:window.__ir052.navigation,calls:window.__ir052.calls,overflow:document.documentElement.scrollWidth>innerWidth}));
 assert.deepEqual(evidence.navigation.map(x=>x.path),['/agent-orgs','/agent-teams','/agents','/agent-teams','/agent-orgs']);
 assert.equal(evidence.calls.every(x=>['agentOrgDefinitions','agentDefinitions','agentTeamDefinitions','agentTeamDefinition','getServerSettings'].includes(x.field)),true);assert.equal(evidence.overflow,false);
 await page.screenshot({path:`${out}/${name}-returned-org.png`,fullPage:true});result.observations.push({viewport:{width,height},...evidence});await context.close();
}assert.deepEqual(result.errors,[]);result.passed=true;
} finally {await fs.writeFile(`${out}/evidence.json`,JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({passed:result.passed,journeys:result.observations.length,errors:result.errors}));
