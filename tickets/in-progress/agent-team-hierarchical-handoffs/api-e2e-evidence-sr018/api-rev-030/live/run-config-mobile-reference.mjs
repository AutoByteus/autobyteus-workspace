import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const base = 'http://127.0.0.1:31230';
const serverBase = 'http://127.0.0.1:60230';
const gqlEndpoint = `${serverBase}/graphql`;
const outDir = new URL('./browser/', import.meta.url).pathname;
const referencePath = new URL('./mobile-config-reference.txt', import.meta.url).pathname;
const expectedReply = 'MOBILE_CONFIG_REFERENCE_REPLY_AUTOBYTEUS';
const expectedComplete = 'MOBILE_CONFIG_REFERENCE_READY_AUTOBYTEUS';
const expectedContent = 'REFERENCE_CONTENT_AUTOBYTEUS';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(referencePath, `${expectedContent}\n`);

async function gql(query, variables = {}) {
  const response = await fetch(gqlEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const json = await response.json();
  if (!response.ok || json.errors) throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}
async function rest(pathname, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`${serverBase}${pathname}`, { ...init, headers });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`REST_FAILED:${pathname}:${response.status}:${text}`);
  return json;
}
const historyQuery = `query { listWorkspaceRunHistory(limitPerAgent:200) { teamDefinitions { teamDefinitionId runs { teamRunId createdAt isActive coordinatorAddress members { memberAddress agentRunId status runtimeKind } } } } }`;
const communicationQuery = `query($id:String!){getTeamCommunicationMessages(teamRunId:$id){messageId content senderAddress{rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId} receiverAddress{rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId} referenceFiles{referenceId path type}}}`;
function nestedRuns(data) { return data.listWorkspaceRunHistory.flatMap(w => w.teamDefinitions).filter(t => t.teamDefinitionId === 'nested-classroom-test').flatMap(t => t.runs); }
const beforeIds = new Set(nestedRuns(await gql(historyQuery)).map(run => run.teamRunId));

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });
const page = await context.newPage();
const consoleEvents = [];
page.on('console', m => { if (['warning','error'].includes(m.type())) consoleEvents.push({type:m.type(),text:m.text().slice(0,1000)}); });
let rootTeamRunId = null;
let termination = null;
let result = null;
try {
  await page.goto(`${base}/agent-teams?view=team-list`, { waitUntil: 'networkidle', timeout: 120000 });
  const card = page.locator('div.group').filter({ hasText: 'Nested Classroom Test Team' }).first();
  await card.waitFor({ state: 'visible', timeout: 120000 });
  await card.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForURL('**/workspace**', { timeout: 120000 });
  await page.locator('#team-run-runtime-kind').selectOption('autobyteus');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  await page.getByPlaceholder('Search models...').fill('gpt-5.6-luna');
  await page.locator('li').filter({ hasText: /gpt-5\.6-luna/i }).first().click();
  const autoApprove = page.locator('#team-auto-execute');
  if ((await autoApprove.getAttribute('class'))?.includes('bg-gray')) await autoApprove.click();
  await page.getByRole('button', { name: 'Run Team', exact: true }).click();
  const input = page.getByPlaceholder('Type a message...');
  await input.waitFor({ state: 'visible', timeout: 180000 });
  await input.fill(`Use send_message_to exactly once to send an ordinary message to ./StudentStudyGroup with reference_files:["${referencePath}"] asking its coordinator to reply to /Teacher with exactly ${expectedReply}. Wait for the exact reply. Then reply to the user with exactly ${expectedComplete}.`);
  await input.press('Enter');
  for (let i=0;i<120;i+=1) {
    const fresh=nestedRuns(await gql(historyQuery)).filter(run=>!beforeIds.has(run.teamRunId));
    if(fresh.length){rootTeamRunId=fresh.at(-1).teamRunId;break;}
    await page.waitForTimeout(500);
  }
  if(!rootTeamRunId) throw new Error('FRESH_TEAM_RUN_NOT_FOUND');
  let communications=[];
  for(let i=0;i<360;i+=1){
    await page.waitForTimeout(500);
    communications=(await gql(communicationQuery,{id:rootTeamRunId})).getTeamCommunicationMessages;
    const reference=communications.find(message=>message.referenceFiles.some(ref=>ref.path===referencePath));
    const reply=communications.find(message=>message.content.trim()===expectedReply && message.receiverAddress.memberAddress==='/Teacher');
    if(reference && reply) break;
  }
  communications=(await gql(communicationQuery,{id:rootTeamRunId})).getTeamCommunicationMessages;
  const referenceMessages=communications.filter(message=>message.referenceFiles.some(ref=>ref.path===referencePath));
  const exactReplies=communications.filter(message=>message.content.trim()===expectedReply && message.receiverAddress.memberAddress==='/Teacher');
  await page.reload({waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForTimeout(1200);
  const workspaceRow=page.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({state:'visible',timeout:120000});
  if((await workspaceRow.getAttribute('aria-expanded'))!=='true')await workspaceRow.locator('button').first().click();
  const teamDefinitionRow=page.locator('[data-test^="workspace-team-definition-row-"]').filter({hasText:'Nested Classroom Test Team'}).first();
  await teamDefinitionRow.waitFor({state:'visible',timeout:120000});
  if((await teamDefinitionRow.getAttribute('aria-expanded'))!=='true')await teamDefinitionRow.click();
  const restoredTeamRow=page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
  await restoredTeamRow.waitFor({state:'visible',timeout:120000});
  await restoredTeamRow.click();
  await page.getByPlaceholder('Type a message...').waitFor({state:'visible',timeout:120000});
  await page.getByText(expectedComplete,{exact:true}).last().waitFor({state:'visible',timeout:120000});
  await page.screenshot({path:`${outDir}/mobile-config-desktop-message.png`,fullPage:true});

  await page.locator('[data-test="workspace-header-edit-config"]').click();
  const back=page.locator('[data-test="run-config-back-to-events"]');
  await back.waitFor({state:'visible',timeout:120000});
  const configBody=await page.locator('body').innerText();
  const configEvidence={
    titleVisible:configBody.includes('Team Configuration'),
    readOnlyNoticeVisible:configBody.includes('Selected team run configuration is read-only.'),
    runtimeMatches:(await page.locator('#team-run-runtime-kind').inputValue())==='autobyteus',
    runtimeDisabled:await page.locator('#team-run-runtime-kind').isDisabled(),
    autoApproveDisabled:await page.locator('#team-auto-execute').isDisabled(),
    runButtonAbsent:(await page.getByRole('button',{name:'Run Team',exact:true}).count())===0,
  };
  await page.screenshot({path:`${outDir}/mobile-config-selected-team-read-only.png`,fullPage:true});
  await back.click();
  await input.waitFor({state:'visible',timeout:120000});

  const settings=await rest('/rest/remote-access/settings',{method:'PUT',body:JSON.stringify({phoneAccessEnabled:true})});
  const advertisedServerBaseUrl='http://192.168.2.158:60230';
  const pairing=await rest('/rest/remote-access/pairing-sessions',{method:'POST',body:JSON.stringify({serverBaseUrl:advertisedServerBaseUrl,serverName:'API REV 030 Disposable Browser Node',trustedPrivateHttpAcknowledged:true})});
  const exchange=await rest('/rest/remote-access/pairing-exchanges',{method:'POST',body:JSON.stringify({pairingCode:pairing.payload.pairingCode,deviceName:'API REV 030 Mobile Browser',serverBaseUrl:advertisedServerBaseUrl})});
  const mobileSession={version:1,nodeId:'mobile-paired-node',serverBaseUrl:serverBase,credential:exchange.credential,device:exchange.device,pairedAt:new Date().toISOString()};
  const mobile=await context.newPage();
  await mobile.setViewportSize({width:390,height:844});
  await mobile.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:'autobyteus.remote_access.mobile_session.v1',value:mobileSession});
  await mobile.goto(`${base}/mobile`,{waitUntil:'domcontentloaded',timeout:120000});
  await mobile.locator('[data-testid="mobile-home"]').waitFor({state:'visible',timeout:120000});
  const recent=mobile.locator('[data-testid="mobile-readable-work-row"]').filter({hasText:'Nested Classroom Test Team'}).first();
  await recent.waitFor({state:'visible',timeout:120000});
  await recent.click();
  await mobile.locator('[data-testid="mobile-work-shell"]').waitFor({state:'visible',timeout:120000});
  await mobile.locator('[data-testid="mobile-tab-activity"]').click();
  await mobile.locator('[data-testid="mobile-open-team-messages"]').click();
  const referenceRow=mobile.locator('[data-testid="mobile-team-reference-row"]').filter({hasText:'mobile-config-reference.txt'}).first();
  await referenceRow.waitFor({state:'visible',timeout:120000});
  await referenceRow.click();
  const viewer=mobile.locator('[data-testid="mobile-team-reference-viewer"]');
  await viewer.waitFor({state:'visible',timeout:120000});
  await viewer.getByText(expectedContent,{exact:false}).waitFor({state:'visible',timeout:120000});
  const viewerText=await viewer.innerText();
  await mobile.screenshot({path:`${outDir}/mobile-config-reference-content.png`,fullPage:true});
  await mobile.locator('[data-testid="mobile-team-reference-back"]').click();
  await viewer.waitFor({state:'hidden',timeout:120000});
  const mobileEvidence={
    phoneAccessEnabled:settings.settings?.phoneAccessEnabled===true,
    pairedCredentialIssued:typeof exchange.credential==='string'&&exchange.credential.startsWith('mra_'),
    exactActiveTeamSelected:(await mobile.locator('[data-testid="mobile-context-title"]').innerText()).includes('Nested Classroom Test Team'),
    exactReferencePathVisible:viewerText.includes('mobile-config-reference.txt'),
    exactReferenceContentVisible:viewerText.includes(expectedContent),
    referenceRowRestoredAfterBack:await referenceRow.isVisible(),
  };
  await mobile.screenshot({path:`${outDir}/mobile-config-reference-back.png`,fullPage:true});
  await mobile.close();
  const conditions={
    freshActiveTeam:Boolean(rootTeamRunId),
    exactOneReferencedMessage:referenceMessages.length===1,
    exactReplyReceived:exactReplies.length===1,
    desktopCompletionVisible:await page.getByText(expectedComplete,{exact:true}).isVisible(),
    selectedTeamConfigReadOnly:Object.values(configEvidence).every(Boolean),
    mobileReferenceContentPath:Object.values(mobileEvidence).every(Boolean),
    noBrowserConsoleErrors:consoleEvents.filter(event=>event.type==='error').length===0,
  };
  result={schemaVersion:1,passed:Object.values(conditions).every(Boolean),rootTeamRunId,conditions,configEvidence,mobileEvidence,communications,consoleEvents};
}catch(error){
  result={schemaVersion:1,passed:false,rootTeamRunId,fatalError:error instanceof Error?`${error.name}: ${error.message}\n${error.stack??''}`:String(error),consoleEvents};
  try{await page.screenshot({path:`${outDir}/mobile-config-failure.png`,fullPage:true});}catch{}
}finally{
  if(rootTeamRunId){try{termination=(await gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`,{id:rootTeamRunId})).terminateAgentTeamRun;}catch(error){termination={success:false,message:String(error)}}}
  result={...result,termination};
  fs.writeFileSync(`${outDir}/mobile-config-reference-row.json`,`${JSON.stringify(result,null,2)}\n`);
  console.log(JSON.stringify({passed:result.passed,rootTeamRunId,conditions:result.conditions,fatalError:result.fatalError??null,termination},null,2));
  await browser.close();
}
if(!result.passed||!termination?.success)process.exitCode=2;
