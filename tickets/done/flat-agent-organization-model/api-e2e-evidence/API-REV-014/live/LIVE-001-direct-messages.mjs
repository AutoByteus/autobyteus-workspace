import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out = new URL('./', import.meta.url);
const runId = 'aorg_e2e_direct_agents_org_9e6292c5584542e8bb0d74d02fc1e97a';
const root = new URL(`../runtime/server-data/memory/agent_orgs/${runId}/`, out);
const sidecar = JSON.parse(await fs.readFile(new URL('agent_org_communication_messages.json', root), 'utf8'));
const tree = JSON.parse(await fs.readFile(new URL('agent_org_run_execution_tree.json', root), 'utf8'));
const lead = tree.rootOrg.members.find((m) => m.address === '/lead');
const verifier = tree.rootOrg.members.find((m) => m.address === '/verifier');
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('127.0.0.1:3594'));
if (!page) throw new Error('AutoByteus open_tab page missing');
const errors=[]; page.on('pageerror',e=>errors.push({type:'pageerror',message:e.message})); page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',message:m.text()})});
const row = (run) => page.locator(`[data-test="agent-org-agent-row-${run}"]`);
const snapshot = async (label) => page.evaluate((label) => {
  const section=document.querySelector('[data-test="collaboration-messages-section"]');
  const centerLeaves=[...document.querySelectorAll('*')].filter((x)=>x.children.length===0 && x.textContent?.includes('APIREV14-DIRECT-DIRECT-MSG-001') && !section?.contains(x));
  const inboundCenterLeaves=centerLeaves.filter((x)=>x.textContent?.trim().startsWith('You received a message from sender'));
  const selected=[...document.querySelectorAll('[data-test^="agent-org-agent-row-"]')].filter((x)=>x.classList.contains('is-selected')).map((x)=>({test:x.getAttribute('data-test'),aria:x.getAttribute('aria-label')}));
  return {label,at:new Date().toISOString(),url:location.href,viewport:{width:innerWidth,height:innerHeight},header:document.querySelector('main')?.innerText?.slice(0,500),messagesHeader:document.querySelector('[data-test="collaboration-messages-header"]')?.innerText,sectionText:section?.innerText,centerLeaves:centerLeaves.map((x)=>x.textContent),inboundCenterLeaves:inboundCenterLeaves.map((x)=>x.textContent),selected,body:document.body.innerText.slice(-14000),scroll:{width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}};
}, label);
await page.setViewportSize({width:1502,height:844});
await row(lead.agentRunId).click(); await page.waitForTimeout(250);
const sender = await snapshot('sender-live-no-refocus');
await page.screenshot({path:new URL('screenshots/LIVE-001-direct-sender.png',out).pathname,fullPage:false});
await row(verifier.agentRunId).click(); await page.waitForTimeout(250);
const receiver = await snapshot('receiver-exact-center-and-messages');
await page.screenshot({path:new URL('screenshots/LIVE-001-direct-receiver.png',out).pathname,fullPage:false});
await page.locator('[data-test="team-communication-reference-row"]').click();
await page.waitForFunction(()=>document.body.innerText.includes('APIREV14-REF-DIRECT-DIRECT-001'),null,{timeout:10000});
const reference = await snapshot('reference-opened');
await page.screenshot({path:new URL('screenshots/LIVE-001-direct-reference.png',out).pathname,fullPage:false});
const durable=sidecar.messages.filter((m)=>m.content==='APIREV14-DIRECT-DIRECT-MSG-001 from /lead to /verifier');
const assertions={
  exactCurrentRoot: sender.url.includes(runId) && receiver.url.includes(runId),
  durableExactlyOne: durable.length===1,
  durableExactRunIds: durable[0]?.senderAgentRunId===lead.agentRunId && durable[0]?.receiverAgentRunId===verifier.agentRunId,
  durableExactReference: durable[0]?.referenceFiles?.length===1 && durable[0].referenceFiles[0].endsWith('/refs/direct-direct.txt'),
  senderStayedSelectedForLiveUpdate: sender.selected.length===1 && sender.selected[0].test?.endsWith(lead.agentRunId),
  senderExactlyOneSentRow: sender.messagesHeader?.includes('1 Messages') && sender.sectionText?.includes('to verifier') && sender.sectionText?.includes('/verifier'),
  senderNoInboundCenterEvent: sender.inboundCenterLeaves.length===0,
  receiverExactlyOneInboundCenterEvent: receiver.inboundCenterLeaves.length===1 && receiver.inboundCenterLeaves[0].includes(`sender id: ${lead.agentRunId}`) && receiver.inboundCenterLeaves[0].includes('Reference files:'),
  receiverExactlyOneReceivedRow: receiver.messagesHeader?.includes('1 Messages') && receiver.sectionText?.includes('from lead') && receiver.sectionText?.includes('/lead'),
  referenceInspectable: reference.body.includes('APIREV14-REF-DIRECT-DIRECT-001'),
  desktopNoHorizontalOverflow: reference.scroll.width===reference.scroll.client,
  noBrowserErrors: errors.length===0,
};
const result={runId,lead,verifier,durable,sender,receiver,reference,assertions,errors};
await fs.writeFile(new URL('LIVE-001-direct-messages.json',out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({runId,assertions,errors},null,2));
await browser.close();
if(Object.values(assertions).some(v=>v!==true)) process.exit(2);
process.exit(0);
