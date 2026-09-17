import {createRequire} from 'node:module';import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/autobyteus-web/package.json'),{chromium}=require('playwright-core');
const out='tickets/in-progress/org-history-startup-latency/validation/render/';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const errors=[],results=[];try{
 const page=await browser.newPage({viewport:{width:1180,height:800}});page.on('pageerror',e=>errors.push(e.message));
 for(const family of ['org','workspace']){
  await page.goto('http://127.0.0.1:50985/__impl-history-publication?mode='+family);
  await page.locator('[data-test="release-'+family+'"]').waitFor({timeout:60000});
  const start=Date.now();await page.locator('[data-test="release-'+family+'"]').click();
  const row=page.locator('[data-test="workspace-row"]');await row.waitFor();
  if(await row.getAttribute('aria-expanded')!=='true')await row.locator('button').first().click();
  await page.getByText(family==='org'?'History Org':'History Agent',{exact:true}).waitFor();
  const elapsed=Date.now()-start;
  if(!(await page.locator('pre').textContent()).includes('"operationComplete": false'))throw Error('Completion prematurely settled');
  if(family==='org'){
   await page.locator('[data-test="agent-org-definition-org-definition"]').click();
   await page.locator('[data-test="agent-org-run-disclosure-org-history"]').click();
   await page.locator('[data-test="agent-org-agent-row-writer-org-history"]').waitFor();
  }
  await page.screenshot({path:out+family+'-ready-other-pending.png'});
  await page.locator('[data-test="release-'+(family==='org'?'workspace':'org')+'"]').click();
  await page.locator('[data-test="release-catalog"]').click();
  await page.waitForFunction(()=>document.querySelector('pre')?.textContent?.includes('"operationComplete": true'));
  results.push({family,syntheticResolveClickToVisibleIncludingExpansionMs:elapsed,pendingOtherDidNotGate:true});
 }
 await fs.writeFile(out+'results.json',JSON.stringify({scope:'Implementation synthetic transport only; NOT real server startup or ten-second claim',results,errors},null,2));
}finally{await browser.close();}
