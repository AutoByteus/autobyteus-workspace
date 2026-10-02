import fs from 'node:fs';
import {expect,it,vi} from 'vitest';
import {Message,MessageRole} from 'autobyteus-ts/llm/utils/messages.js';
import {COMPACTION_SUMMARY_PROMPT} from 'autobyteus-ts/memory/compaction/compaction-summary-prompt.js';
import {parseCompactionSummary} from 'autobyteus-ts/memory/compaction/compaction-summary-parser.js';
import {createCompactionLlm} from '../../../../../autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.js';
import {appConfigProvider} from '../../../../../autobyteus-server-ts/src/config/app-config-provider.js';
import {LiveE2eHarness} from '../../../../../test-support/live-e2e/live-e2e-harness.js';
import {LiveE2eEvidenceScanner} from '../../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';
import {describeLiveE2eError} from '../../../../../test-support/live-e2e/live-e2e-safe-error.js';
import {createGuard,sha} from './guard.js';
const here=new URL('./',import.meta.url), frozen=JSON.parse(fs.readFileSync(new URL('../../solution-recovery-evidence/sr022/frozen-requests.json',here),'utf8'));
const arms=frozen.order.map((id:string)=>{const [key,variant]=id.split('-');const c=frozen.cases.find((c:any)=>c.id===key);return {id,messages:c[variant],hash:c[variant+'Sha256']}});
const scanner=new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);
const save=(name:string,v:any)=>{scanner.assertEvidenceClean(v);fs.writeFileSync(new URL(name,here),JSON.stringify(v,null,2)+'\n')};
const wire=new URL('wire.jsonl',here);
const emit=(v:any)=>{scanner.assertEvidenceClean(v);fs.appendFileSync(wire,JSON.stringify({time:new Date().toISOString(),...v})+'\n')};
it('runs only the four predeclared SR022 frozen request arms', {timeout:1650000},async()=>{
 expect(process.env.RUN_REAL_E2E).toBe('1');expect(process.env.AUTOBYTEUS_LIVE_E2E_SCENARIOS).toBe('deepseek.compaction-agent-flow');
 expect(frozen.order).toEqual(['F-withTarget','F-withoutTarget','R-withoutTarget','R-withTarget']);
 for(const arm of arms){expect(sha(JSON.stringify(arm.messages))).toBe(arm.hash);expect(arm.messages[0].content).toBe(COMPACTION_SUMMARY_PROMPT)}
 fs.writeFileSync(wire,'',{flag:'wx'});
 const guard=createGuard(arms,new URL(process.env.AUTOBYTEUS_TEST_SERVER_URL!).origin,emit);vi.stubGlobal('fetch',guard.wrap(globalThis.fetch));
 const campaignSignal=AbortSignal.timeout(1600000);const result:any={started:new Date().toISOString(),mode:'frozen-rendered-request replay through production factory/adapter/parser; no planner/commit',arms:arms.map((a:any)=>({id:a.id,status:'Not Tested'}))};
 let harness:LiveE2eHarness|undefined;
 try{
  harness=await LiveE2eHarness.open();
  const preflight=await harness.preflight('deepseek.compaction-agent-flow');save('preflight-in-worker.json',preflight);expect(preflight.health).toBe('READY');expect(preflight.missing).toEqual([]);
  expect(appConfigProvider.config.get('AUTOBYTEUS_COMPACTION_MODEL_SETTINGS')).toBeUndefined();
  for(let i=0;i<arms.length;i++){
   const arm=arms[i];const record:any={id:arm.id,status:'Started',started:new Date().toISOString(),requestedMessages:arm.messages,requestedMessagesSha256:arm.hash};result.arms[i]=record;save('results.json',result);
   fs.appendFileSync(new URL('../../api-e2e-test-case-ledger.md',here),'\nSR022 '+arm.id+' started '+record.started+'; one outboundmaximum.\n');
   let llm:Awaited<ReturnType<typeof createCompactionLlm>>|undefined;let failure=false;const begin=Date.now();
   try{
    llm=await createCompactionLlm({parentModelIdentifier:'deepseek-v4-flash'});
    record.config={modelIdentifier:llm.model.modelIdentifier,provider:String(llm.model.provider),temperature:llm.config.temperature,maxTokens:llm.config.maxTokens,extraParams:llm.config.extraParams,systemSha256:sha(llm.config.systemMessage??'')};
    expect(record.config.temperature).toBe(0.7);expect(record.config.maxTokens).toBe(8192);expect(record.config.systemSha256).toBe(sha(COMPACTION_SUMMARY_PROMPT));
    guard.begin(arm.id);
    const response=await llm.sendMessages(arm.messages.map((m:any)=>new Message(m.role as MessageRole,{content:m.content})),null,{logicalConversationId:'sr022-'+arm.id},{signal:AbortSignal.any([campaignSignal,AbortSignal.timeout(400000)]),turnId:'sr022-'+arm.id});
    record.response={content:response.content,completionStatus:response.completionStatus,completionReason:response.completionReason,usage:response.usage,reasoningCharacters:response.reasoning?.length??0};
    record.visibleCharacters=response.content.length;
    try{record.extractedBody=parseCompactionSummary(response.content);record.bodyCharacters=record.extractedBody.length;record.parseValid=true}catch(error){record.parseValid=false;record.parseErrorCode=(error as any)?.code==='invalid_summary'?'invalid_summary':'parser_rejection';record.bodyCharacters=null}
    record.acceptedByOutputContract=record.parseValid&&response.completionStatus!=='incomplete';
    const usage=response.usage;record.outputTokens=usage?.output_tokens??null;record.reasoningOutputTokens=usage?.reasoning_output_tokens??null;record.derivedNonReasoningOutputTokens=typeof record.outputTokens==='number'&&typeof record.reasoningOutputTokens==='number'?record.outputTokens-record.reasoningOutputTokens:null;
    record.status=record.acceptedByOutputContract?'Completed—manual fidelity pending':'Completed—output contract rejected';
    guard.finish();
   }catch(error){failure=true;guard.state.closed=true;record.status='Stopped';record.error=describeLiveE2eError(error);record.localCondition=error instanceof Error&&/^SR022_[A-Z_]+$/.test(error.message)?error.message:null;result.stopArm=arm.id;result.stopReason='SAFE_STOP_NO_RETRY';}
   finally{
    try{await llm?.cleanup({signal:AbortSignal.timeout(10000)})}catch(error){record.cleanupError=describeLiveE2eError(error);failure=true;guard.state.closed=true;result.stopReason='CLEANUP_ERROR'}
    record.elapsedMs=Date.now()-begin;record.finished=new Date().toISOString();save(arm.id+'.json',record);save('results.json',result);
    fs.appendFileSync(new URL('../../api-e2e-test-case-ledger.md',here),'\nSR022 '+arm.id+' '+record.status+' '+record.finished+'; manualfidelitypending; evidence sr022-budget-diagnostics/'+arm.id+'.json.\n');
   }
   if(failure)break;
  }
 }catch(error){result.setupError=describeLiveE2eError(error);guard.state.closed=true;result.stopReason='SETUP_ERROR_NO_SUBSTITUTION'}
 finally{
  try{await harness?.close()}catch(error){result.closeError=describeLiveE2eError(error)}
  result.finished=new Date().toISOString();result.outboundGenerations=guard.state.count;result.guardClosed=guard.state.closed;save('results.json',result);emit({event:'finished',outboundGenerations:guard.state.count,guardClosed:guard.state.closed});vi.unstubAllGlobals();
 }
 expect(result.stopReason??null).toBeNull();expect(guard.state.count).toBe(4);
});
