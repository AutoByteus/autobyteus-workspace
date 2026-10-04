// Temporary real-product setup; no credentials or inference. Lifecycle CLI owns this instance.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const root=process.cwd(),out=path.join(root,'tickets/in-progress/org-run-config-performance/evidence');
const receipt=JSON.parse(await fs.readFile(path.join(out,'api-packaged-start.json'),'utf8'));assert.equal(receipt.ok,true);const info=receipt.result;
assert(info.executablePath.startsWith(root+'/autobyteus-web/electron-dist/'));assert(info.graphqlUrl.startsWith('http://127.0.0.1:'));
const evidence={at:new Date().toISOString(),info,source:'current worktree package, no pre-change/user app',cases:{},errors:[]};const save=()=>fs.writeFile(path.join(out,'api-packaged-setup.json'),JSON.stringify(evidence,null,2)+'\n');
const fixture=path.join(info.dataRoot,'fixture-agent-package');const manifest=JSON.parse(await fs.readFile(path.join(out,'launch-row-fixture-manifest.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const f of manifest.files){const src=path.join(manifest.source,f.path),dest=path.join(fixture,f.path);const b=await fs.readFile(src);assert.equal(hash(b),f.sha256,'Baseline exact fixture mismatch '+f.path);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);}
evidence.fixture={source:manifest.source,path:fixture,files:manifest.files,exactBaselineMatch:true};await save();
const {chromium,selectors}=createRequire(path.join(root,'autobyteus-web/package.json'))('playwright-core');selectors.setTestIdAttribute('data-test');
const browser=await chromium.connectOverCDP(info.controlEndpoint);const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('/renderer/index.html'));assert(page);page.setDefaultTimeout(30000);
page.on('pageerror',e=>evidence.errors.push(e.message));
try{
 if(await page.getByRole('button',{name:'Settings',exact:true}).count())await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('[data-testid="settings-nav-agent-packages"]').click();if(!process.argv.includes('--already-imported')){await page.locator('[data-testid="agent-package-source-input"]').fill(fixture);
 const imported=page.waitForResponse(r=>r.url()===info.graphqlUrl&&r.request().postDataJSON()?.operationName==='ImportAgentPackage');
 await page.locator('[data-testid="agent-package-import-button"]').click();await page.locator('[data-testid="agent-packages-success"]').waitFor();evidence.importResponse=await(await imported).json();assert(!evidence.importResponse.errors);evidence.cases.import='Pass';}else{evidence.importResponse=JSON.parse(await fs.readFile(path.join(out,'api-packaged-setup-pre-reload.json'),'utf8')).importResponse;evidence.cases.import='Pass — prior exact owned import retained';}
 await page.screenshot({path:path.join(out,'api-packaged-import.png')});await page.locator('[data-testid="settings-nav-back"]').click();await page.getByRole('button',{name:'Agent Orgs',exact:true}).click();await page.getByRole('button',{name:'Reload',exact:true}).click();await page.getByTestId('org-card-autobyteus-org').waitFor();
 const gql=async(query,variables={})=>{const response=await fetch(info.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const body=await response.json();assert.equal(response.status,200);assert(!body.errors,JSON.stringify(body.errors));return body.data;};
 evidence.capability=await gql('{ runtimeAvailability(runtimeKind:"codex_app_server") {runtimeKind enabled reason} }');assert.equal(evidence.capability.runtimeAvailability.enabled,true);
 evidence.catalog=await gql('{providerModelCatalogSnapshots(runtimeKind:"codex_app_server"){runtimeKind ownerProvider{id name} llmModels{modelIdentifier canonicalName configSchema}}}');
 const models=evidence.catalog.providerModelCatalogSnapshots.flatMap(s=>s.llmModels);assert(models.some(m=>m.modelIdentifier==='gpt-6.1-sol'),'Required GPT-6.1 Sol missing; no substitution');evidence.cases.exactCatalog='Pass';
 evidence.definitions=await gql('{agentOrgDefinitions{id name members{memberName ref refType refScope}}}');assert(evidence.definitions.agentOrgDefinitions.some(d=>d.id==='autobyteus-org'));
 for(const f of manifest.files)assert.equal(hash(await fs.readFile(path.join(fixture,f.path))),f.sha256,'Import rewrote copied source '+f.path);
 evidence.cases.sourceBytes='Pass';evidence.dom=await page.locator('body').innerText();await save();console.log(JSON.stringify({fixture,capability:evidence.capability,cases:evidence.cases,errors:evidence.errors}));
}catch(e){evidence.failure=e.stack;evidence.dom=await page.locator('body').innerText().catch(()=>null);await page.screenshot({path:path.join(out,'api-packaged-setup-failure.png')}).catch(()=>{});await save();console.error(e.stack);process.exitCode=1;}
process.exit(process.exitCode??0);
