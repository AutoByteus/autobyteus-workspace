import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const cwd=process.cwd();
const out=path.join(cwd,'tickets/in-progress/antigravity-runtime-missing/evidence/api-e2e');
const {chromium}=createRequire(path.join(cwd,'autobyteus-web/package.json'))('playwright-core');
async function gql(query,variables){const r=await fetch('http://127.0.0.1:30697/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const b=await r.json();if(b.errors)throw new Error(JSON.stringify(b.errors));return b.data;}
let fixture;
try {fixture=JSON.parse(await fs.readFile(path.join(out,'fixture.json'),'utf8'));}catch{
const a=await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',{input:{name:'API Validation Agent',role:'assistant',description:'Disposable validation agent',instructions:'Reply only to synthetic validation tasks.',category:'validation',toolNames:[]}});
const t=await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',{input:{name:'API Validation Team',description:'Disposable selector fixture',instructions:'Synthetic validation only.',nodes:[{memberName:'coordinator',ref:a.createAgentDefinition.id,refScope:'SHARED'}],coordinatorMemberName:'coordinator'}});
fixture={agent:a.createAgentDefinition.id,team:t.createAgentTeamDefinition.id};await fs.writeFile(path.join(out,'fixture.json'),JSON.stringify(fixture,null,2));}
const catalog=await gql('{providerModelCatalogSnapshots(runtimeKind:"antigravity_cli"){runtimeKind llmModels{modelIdentifier name} sources{state modelCount}}}');
await fs.writeFile(path.join(out,'model-api.json'),JSON.stringify(catalog,null,2));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
let page;
try {page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(`http://localhost:3017/agent-teams?view=team-detail&id=${fixture.team}`,{waitUntil:'networkidle',timeout:120000});
await page.waitForTimeout(2500);
await page.getByRole('button',{name:'Run',exact:true}).click();
await page.waitForURL('**/workspace');
await page.locator('select').first().waitFor();
const runtime=page.locator('#team-scope-root-runtime-kind');
await runtime.locator('option[value="antigravity_cli"]').waitFor({state:'attached',timeout:60000});
const options=await runtime.locator('option').evaluateAll(xs=>xs.map(o=>({text:o.text,value:o.value,disabled:o.disabled})));
if(options.find(o=>o.value==='antigravity_cli')?.disabled!==false) throw new Error('AGY option disabled');
console.log('AGY visible',options);
await runtime.selectOption('antigravity_cli');
console.log('AGY selected');
await page.getByRole('button',{name:'Select a model',exact:true}).waitFor({timeout:60000});
await page.waitForFunction(()=>!document.querySelector('#team-scope-root-runtime-kind')?.closest('.space-y-4')?.innerText.includes('Loading models'),{},{timeout:60000});
console.log('MODEL button ready',await page.locator('body').innerText());
await page.getByRole('button',{name:'Select a model',exact:true}).click();
console.log('DROPDOWN',await page.locator('body').innerText());
await page.getByRole('option',{name:'Gemini 3.8 Flash (Low)',exact:true}).waitFor({timeout:60000});
await page.getByRole('option',{name:'Gemini 3.8 Flash (Low)',exact:true}).click();
if(await runtime.inputValue()!=='antigravity_cli')throw new Error('Runtime selection not retained');
await page.getByRole('button',{name:'Antigravity CLI (GEMINI) / Gemini 3.8 Flash (Low)',exact:true}).waitFor();
await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Run Team'&&!b.disabled),{},{timeout:60000});
await fs.writeFile(path.join(out,'browser-result.json'),JSON.stringify({result:'Pass',browser:browser.version(),viewport:{width:1440,height:1000},options,runtime:await runtime.inputValue(),selectedModel:'Gemini 3.8 Flash (Low)',launchEnabled:true,body:await page.locator('body').innerText(),errors},null,2));
await fs.writeFile(path.join(out,'browser-final.txt'),await page.locator('body').innerText());
await page.screenshot({path:path.join(out,'browser-final.png')});
console.log(await page.locator('body').innerText());
console.log('SELECTS',await page.locator('select').evaluateAll(xs=>xs.map(x=>({id:x.id,value:x.value,options:[...x.options].map(o=>({text:o.text,value:o.value,disabled:o.disabled}))}))));
console.log('BUTTONS',await page.getByRole('button').allTextContents());
await fs.writeFile(path.join(out,'browser-errors.json'),JSON.stringify(errors));
}catch(error){if(page){await fs.writeFile(path.join(out,'browser-failure.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(out,'browser-failure.png')});}throw error;}finally{await browser.close();}
