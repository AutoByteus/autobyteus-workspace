import { createRequire } from 'node:module'; import fs from 'node:fs/promises';
const require=createRequire(process.cwd()+'/package.json'),{chromium}=require('playwright-core');
const out='../tickets/in-progress/stopped-org-member-header-actions/validation/ir002-render/';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const errors=[]; try {const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:50983/__impl-org-seed?definitionId=org-definition';
await page.goto(base+'&sourceOrgRunId=org-run');await page.getByRole('button',{name:'Advanced',exact:true}).first().waitFor({timeout:60000});await page.getByRole('button',{name:'Advanced',exact:true}).first().click();await page.locator('input[type="number"]').first().waitFor();
if(await page.locator('input[type="number"]').first().inputValue()!=='0')throw Error('Seed not installed');
await page.locator('[data-test="org-member-overrides-toggle"]').click();await page.locator('[data-test="org-placement-/director"] > button').click();
await page.screenshot({path:out+'seed-direct.png'});await page.locator('input[type="number"]').first().fill('2');await page.locator('input[type="number"]').first().blur();
await page.setViewportSize({width:760,height:1000});await page.screenshot({path:out+'seed-narrow.png'});
await page.goto(base);await page.locator('[data-test="org-config-schema-diagnostic"]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-test="org-config-schema-diagnostic"]')?.textContent?.includes('Select a model'));
if(await page.locator('[data-test="org-config-schema-diagnostic"]').getAttribute('role')!=='status')throw Error('Missing model not neutral');
if(!await page.locator('[data-test="run-agent-org"]').isDisabled())throw Error('Empty launch enabled');await page.screenshot({path:out+'empty-neutral.png'});
await page.locator('#org-run-runtime-kind').selectOption('codex_app_server');await page.locator('[data-test="org-config-schema-diagnostic"]').waitFor();
await page.goto(base+'&sourceOrgRunId=org-run&fail=1');await page.locator('[data-test="org-seed-retry"]').waitFor();await page.screenshot({path:out+'source-failure.png'});
await fs.writeFile(out+'results.json',JSON.stringify({kind:'Implementation synthetic transport/catalog renderer only; not API acceptance',seedDirect:true,edit:true,narrow:true,neutralMissing:true,blockedMissing:true,sourceFailure:true,errors},null,2));
}finally{await browser.close()}
