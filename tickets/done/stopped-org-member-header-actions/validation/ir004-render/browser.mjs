import {createRequire} from 'node:module';import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/package.json'),{chromium}=require('playwright-core');
const out='../tickets/in-progress/stopped-org-member-header-actions/validation/ir004-render/';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const errors=[];try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:50983/__impl-team-copy');const plus=page.locator('[data-test="workspace-header-new-run"]');await plus.waitFor({timeout:60000});await plus.click();
 await page.waitForFunction(()=>document.querySelector('[data-test="team-copy-status"]')?.getAttribute('role')==='alert');await plus.click();
 await page.locator('[data-test="team-member-overrides-toggle"]').waitFor();await page.locator('[data-test="team-member-overrides-toggle"]').click();
 const member=page.locator('[data-test="member-override-item"]');await member.waitFor();
 const advanced=member.getByRole('button',{name:'Advanced',exact:true});
 if(!await member.locator('input[type="number"]').isVisible())await advanced.click();
 const input=member.locator('input[type="number"]');await input.waitFor();
 if(await input.inputValue()!=='0')throw Error('Copied member parameters lost');
 if(!await member.getByText('Synthetic / replacement-model',{exact:true}).isVisible())throw Error('Replacement model not selected');
 await page.screenshot({path:out+'member-equal-parameters.png'});
 await input.fill('2');await input.blur();if(await input.inputValue()!=='2')throw Error('Copied parameters not editable');
 await page.setViewportSize({width:760,height:1000});await page.screenshot({path:out+'member-edited-narrow.png'});
 await fs.writeFile(out+'results.json',JSON.stringify({scope:'Synthetic IO implementation renderer; no backend/provider/API acceptance',copiedDifferentModelEqualParameters:true,editable:true,errors},null,2));
}finally{await browser.close();}
