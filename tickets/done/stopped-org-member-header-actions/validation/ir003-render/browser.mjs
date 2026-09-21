import {createRequire} from 'node:module';import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/package.json'),{chromium}=require('playwright-core');
const out='../tickets/in-progress/stopped-org-member-header-actions/validation/ir003-render/';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const errors=[],results=[];
try{
const page=await browser.newPage({viewport:{width:1280,height:850}});page.on('pageerror',e=>errors.push(e.message));
for(const entry of ['header','group']){
 await page.goto('http://127.0.0.1:50983/__impl-team-copy');const button=page.locator(entry==='header'?'[data-test="workspace-header-new-run"]':'.create-btn');
 await button.waitFor({timeout:60000});await button.click();
 const status=page.locator('[data-test="team-copy-status"]');await status.waitFor();
 if(await status.getAttribute('role')!=='status')throw Error('Missing loading');
 await page.screenshot({path:out+entry+'-pending.png'});await page.waitForFunction(()=>document.querySelector('[data-test="team-copy-status"]')?.getAttribute('role')==='alert');
 if(!await button.isVisible())throw Error('Source lost after failure');await page.screenshot({path:out+entry+'-error.png'});
 if(entry==='header'){await page.setViewportSize({width:760,height:850});await page.screenshot({path:out+'header-narrow.png'});}
 await button.click();await page.getByRole('button',{name:'Advanced',exact:true}).first().waitFor();await page.getByRole('button',{name:'Advanced',exact:true}).first().click();
 const input=page.locator('input[type="number"]').first();await input.waitFor();
 if(await input.inputValue()!=='0')throw Error('Canonical config not installed');
 await page.screenshot({path:out+entry+'-copied.png'});results.push({entry,pending:true,failureRetainsSource:true,retryFreshValue:true});
 await page.setViewportSize({width:1280,height:850});
}
await fs.writeFile(out+'results.json',JSON.stringify({scope:'Implementation synthetic transport renderer only; no backend/provider/API acceptance',results,errors},null,2));
}finally{await browser.close();}
