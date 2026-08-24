import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/autobyteus-web/node_modules/playwright-core/index.mjs';
const UI='http://127.0.0.1:3107';
const ROOT='/home/autobyteus/workspace/autobyteus-workspace';
const E='/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/probes/api-e2e';
const log=[]; const errors=[];
const say=(x,d='')=>{const line=`${new Date().toISOString()} ${x}${d?` ${JSON.stringify(d)}`:''}`;log.push(line);console.log(line)};
let releaseFetch; const gate=new Promise(resolve=>{releaseFetch=resolve}); let held=false; let continued=false;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  const context=await browser.newContext({viewport:{width:1600,height:1050}});
  await context.route('**/graphql',async route=>{
    const req=route.request(); let body={};
    if(req.method()==='POST'){try{body=req.postDataJSON()}catch{}}
    if(!held && body.operationName==='GetAllWorkspaces'){
      held=true; say('held-GetAllWorkspaces'); await gate; continued=true; say('released-GetAllWorkspaces');
    }
    await route.continue();
  });
  const page=await context.newPage(); page.setDefaultTimeout(30_000);
  page.on('console',m=>{if(m.type()==='error')errors.push({source:'console',text:m.text()})});
  page.on('pageerror',e=>errors.push({source:'pageerror',text:e.message}));
  await page.goto(`${UI}/agent-teams`,{waitUntil:'domcontentloaded',timeout:60_000});
  await page.locator('div.group').filter({hasText:'Software Engineering Team'}).getByRole('button',{name:'Run',exact:true}).click();
  await page.waitForURL('**/workspace');
  assert.equal(held,true,'GetAllWorkspaces must still be held during explicit interaction');
  const newTab=page.getByRole('tab',{name:'New',exact:true});
  await newTab.click();
  const input=page.locator('input[placeholder="/absolute/path/to/workspace"]');
  await input.fill(ROOT);
  assert.equal(await newTab.getAttribute('aria-selected'),'true');
  assert.equal(await input.inputValue(),ROOT);
  say('explicit-New-path-entered-before-workspaces-resolved');
  releaseFetch();
  for(let i=0;i<60&&!continued;i++) await page.waitForTimeout(100);
  assert.equal(continued,true);
  await page.waitForTimeout(1500);
  assert.equal(await newTab.getAttribute('aria-selected'),'true','late workspace result must not replace explicit New');
  assert.equal(await input.inputValue(),ROOT,'late workspace result must not erase explicit path');
  assert.equal(await page.getByRole('tab',{name:'Existing',exact:true}).getAttribute('aria-selected'),'false');
  await page.screenshot({path:`${E}/30-delayed-fetch-explicit-new.png`,fullPage:true});
  say('delayed-fetch-pass',{mode:await newTab.getAttribute('aria-selected'),path:await input.inputValue(),errors:errors.length});
  assert.deepEqual(errors,[]);
} finally {
  releaseFetch?.(); await browser.close();
  await fs.writeFile(`${E}/31-delayed-fetch.log`,`${log.join('\n')}\n`);
  await fs.writeFile(`${E}/32-delayed-fetch-errors.json`,`${JSON.stringify(errors,null,2)}\n`);
}
