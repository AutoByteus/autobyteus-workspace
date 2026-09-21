import fs from 'node:fs/promises';
import path from 'node:path';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const [runId,fromAddress,toAddress,marker,refFile,outName] = process.argv.slice(2);
if (![runId,fromAddress,toAddress,marker,refFile,outName].every(Boolean)) throw new Error('usage: runId from to marker refFile outName');
const out = new URL('./', import.meta.url);
const runRoot = new URL(`../runtime/server-data/memory/agent_orgs/${runId}/`, out);
const sidecarPath = new URL('agent_org_communication_messages.json', runRoot);
const tree = JSON.parse(await fs.readFile(new URL('agent_org_run_execution_tree.json', runRoot), 'utf8'));
const flatten=(node,out=[])=>{for(const m of node.members??[]){if(m.agentRunId)out.push(m);if(m.members)flatten(m,out)};return out};
const members=flatten(tree.rootOrg); const from=members.find(m=>m.address===fromAddress); const to=members.find(m=>m.address===toAddress);
if(!from||!to) throw new Error(`address not found: ${fromAddress} -> ${toAddress}`);
const before=JSON.parse(await fs.readFile(sidecarPath,'utf8'));
if(before.messages.some(m=>m.content===marker)) throw new Error(`marker already exists: ${marker}`);
const browser=await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('127.0.0.1:3594'));
if(!page)throw new Error('AutoByteus open_tab page missing');
const errors=[];page.on('pageerror',e=>errors.push({type:'pageerror',message:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',message:m.text()})});
await page.setViewportSize({width:1502,height:844});
for(const team of [tree.rootOrg.members.find(m=>m.address==='/research-team'),tree.rootOrg.members.find(m=>m.address==='/support-team')].filter(Boolean)){
 const l=page.locator(`[data-test="agent-org-team-row-${team.teamRunId}"]`); if(await l.count()&&await l.getAttribute('aria-expanded')==='false')await l.click();
}
const memberRow=(m)=>page.locator(`[data-test="agent-org-agent-row-${m.agentRunId}"]`);
const ensureOrg=async()=>{const tab=page.locator('button[aria-label="Agent Org"]');if(await tab.count()&&!await page.locator('[data-test="collaboration-messages-section"]').count()){await tab.click();await page.waitForTimeout(100)}};
const snapshot=async(label,focus,marker)=>page.evaluate(({label,runId,focus,marker})=>{const section=document.querySelector('[data-test="collaboration-messages-section"]');const center=[...document.querySelectorAll('*')].filter(x=>x.children.length===0&&x.textContent?.trim().startsWith('You received a message from sender')&&x.textContent.includes(marker)&&!section?.contains(x));const rows=[...document.querySelectorAll('[data-test="team-communication-message-row"]')].filter(x=>x.textContent?.includes(marker)).map(x=>x.innerText);const selected=[...document.querySelectorAll('[data-test^="agent-org-agent-row-"]')].filter(x=>x.classList.contains('is-selected')).map(x=>x.getAttribute('data-test'));return{label,at:new Date().toISOString(),url:location.href,runId,focus,selected,messagesHeader:document.querySelector('[data-test="collaboration-messages-header"]')?.innerText,sectionText:section?.innerText,markerRows:rows,inboundCenter:center.map(x=>x.textContent),body:document.body.innerText.slice(-16000),scroll:{width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}}},{label,runId,focus,marker});
await memberRow(from).click();await page.waitForTimeout(200);await ensureOrg();
const selectedBefore=await snapshot('sender-before',fromAddress,marker);
const composer=page.locator('textarea[placeholder="Type a message..."]');
const refPath=path.resolve(refFile);
const prompt=`Your system instructions and live Agent Tools MCP catalog expose send_message_to. Use send_message_to exactly once with recipient_address \`${toAddress}\`, content \`${marker}\`, and reference_files [\`${refPath}\`]. Do not claim the tool is unavailable and do not call any other tool. After the successful tool result, reply exactly ${marker}-SENT.`;
await composer.fill(prompt);await page.locator('button[title="Send message"]').click();
let committed;
for(let n=0;n<240;n++){await new Promise(r=>setTimeout(r,500));const d=JSON.parse(await fs.readFile(sidecarPath,'utf8'));const hit=d.messages.filter(m=>m.content===marker);if(hit.length){committed=d;break}}
if(!committed)throw new Error(`sidecar commit timeout: ${marker}`);
await page.waitForFunction(m=>document.querySelector('[data-test="collaboration-messages-section"]')?.textContent?.includes(m),marker,{timeout:30000});
const sender=await snapshot('sender-after-live-no-refocus',fromAddress,marker);
await page.screenshot({path:new URL(`screenshots/${outName}-sender.png`,out).pathname,fullPage:false});
await memberRow(to).click();await page.waitForTimeout(250);await ensureOrg();
await page.waitForFunction(m=>[...document.querySelectorAll('*')].some(x=>x.children.length===0&&x.textContent?.trim().startsWith('You received a message from sender')&&x.textContent.includes(m)),marker,{timeout:30000});
const receiver=await snapshot('receiver-after',toAddress,marker);
await page.screenshot({path:new URL(`screenshots/${outName}-receiver.png`,out).pathname,fullPage:false});
const after=committed;const exact=after.messages.filter(m=>m.content===marker);const fromName=fromAddress.split('/').filter(Boolean).at(-1);const toName=toAddress.split('/').filter(Boolean).at(-1);
const assertions={
 sidecarIncrementedOnce:after.messages.length===before.messages.length+1&&exact.length===1,
 exactRunIds:exact[0]?.senderAgentRunId===from.agentRunId&&exact[0]?.receiverAgentRunId===to.agentRunId,
 exactReference:exact[0]?.referenceFiles?.length===1&&exact[0].referenceFiles[0]===refPath,
 senderRemainedSelected:selectedBefore.selected.length===1&&sender.selected.length===1&&sender.selected[0].endsWith(from.agentRunId),
 senderOnePerspectiveRow:sender.markerRows.length===1&&sender.markerRows[0].includes(`to ${toName}`)&&sender.markerRows[0].includes(toAddress),
 senderNoInboundEvent:sender.inboundCenter.length===0,
 receiverOnePerspectiveRow:receiver.markerRows.length===1&&receiver.markerRows[0].includes(`from ${fromName}`)&&receiver.markerRows[0].includes(fromAddress),
 receiverExactlyOneInbound:receiver.inboundCenter.length===1&&receiver.inboundCenter[0].includes(`sender id: ${from.agentRunId}`)&&receiver.inboundCenter[0].includes(refPath),
 desktopNoOverflow:receiver.scroll.width===receiver.scroll.client,
 noBrowserErrors:errors.length===0,
};
const result={runId,from,to,marker,refPath,beforeCount:before.messages.length,afterCount:after.messages.length,exact,selectedBefore,sender,receiver,assertions,errors};
await fs.writeFile(new URL(`${outName}.json`,out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({outName,assertions,errors},null,2));
await browser.close();
if(Object.values(assertions).some(v=>v!==true))process.exit(2);process.exit(0);
