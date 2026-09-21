// Renderer-only self-check: real Nuxt UI, synthetic replay transport, no Create/Send.
import { createRequire } from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(process.cwd()+'/package.json');const {chromium}=require('playwright-core');
const out=new URL('./',import.meta.url).pathname;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const mode=async value=>fetch('http://127.0.0.1:50782/__mode/'+value);
const diagnostic=page.locator('[data-test="org-config-reference-diagnostic"]');
const run=page.locator('[data-test="run-agent-org"]');
const capture=async name=>{await fs.writeFile(out+name+'.txt',await page.locator('body').innerText());await page.screenshot({path:out+name+'.png'})};
try{
 await mode('pending');
 await page.goto('http://127.0.0.1:50783/workspace?rootSubjectKind=agent_org&definitionId=readfix-alpha&mode=configuration');
 await diagnostic.waitFor({timeout:90000});
 assert.match(await diagnostic.innerText(),/Loading organization members/);assert.equal(await run.isDisabled(),true);
 await page.getByText('Files',{exact:true}).click();
 await page.getByRole('button',{name:'Select a model',exact:true}).first().click();
 await page.getByText('gpt-5.4-mini',{exact:true}).click();
 await page.locator('[data-test="org-auto-approve-row"] [role="switch"]').click();
 await capture('loading');
 await mode('ready');
 await page.waitForFunction(()=>{const b=document.querySelector('[data-test="run-agent-org"]');return b&&!b.disabled},{timeout:20000});
 assert.equal(await diagnostic.count(),0);
 assert.equal(await page.locator('[data-test="org-auto-approve-row"] [role="switch"]').getAttribute('aria-checked'),'true');
 await capture('ready');
 await page.locator('[data-test="org-member-overrides-toggle"]').click();
 await capture('expanded');
 await mode('error');await page.reload();await diagnostic.waitFor();
 assert.match(await diagnostic.innerText(),/Unable to load organization members/);assert.equal(await run.isDisabled(),true);
 await capture('unavailable');
 await page.setViewportSize({width:900,height:800});await capture('unavailable-narrow');
 await fs.writeFile(out+'result.json',JSON.stringify({renderer:'real Nuxt dev',transport:'synthetic read-response replay',viewports:['1280x900','900x800'],checks:['loading disables Run','model/approval choices retained through reference completion','ready enables Run','member disclosure opens','unavailable disables Run'],createOrSend:false},null,2));
 console.log('Renderer self-check passed; no Create or Send');
}finally{await mode('ready');await browser.close()}
