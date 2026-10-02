import fs from 'node:fs';
import { afterAll,beforeAll,expect,it,vi } from 'vitest';
import { LLMExtension } from '../../../../../autobyteus-ts/src/llm/extensions/base-extension.js';
import { Message,MessageRole } from '../../../../../autobyteus-ts/src/llm/utils/messages.js';
import { DirectLlmCompactionSummarizer } from '../../../../../autobyteus-ts/src/memory/compaction/direct-llm-compaction-summarizer.js';
import { createCompactedMemoryUserMessage } from '../../../../../autobyteus-ts/src/memory/working-context-finalizer.js';
import * as transport from '../../../../../autobyteus-ts/src/llm/transport/local-long-running-fetch.js';
import { createCompactionLlm } from '../../../../../autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.js';
import { appConfigProvider } from '../../../../../autobyteus-server-ts/src/config/app-config-provider.js';
import { COMPACTION_MODEL_SETTINGS_KEY } from '../../../../../autobyteus-server-ts/src/config/compaction-model-settings.js';
import { LiveE2eHarness } from '../../../../../test-support/live-e2e/live-e2e-harness.js';
import { LiveE2eEvidenceScanner } from '../../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';
import { describeLiveE2eError } from '../../../../../test-support/live-e2e/live-e2e-safe-error.js';
import { observeFetch,sha } from './wire-observer.js';
const here=new URL('./',import.meta.url);const file=(name:string)=>new URL(name,here);
const frozen=JSON.parse(fs.readFileSync(new URL('../../solution-recovery-evidence/sr014/frozen-repeated-input.json',here),'utf8'));
const model='qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234';
const scanner=new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);
let harness:LiveE2eHarness;let ready=false;let controlBaseline:string|undefined;
const unit=(id:string,message:Message,kind:any='message')=>({id,kind,startIndex:0,endIndex:0,rawTraceIds:[],messages:[message]});
beforeAll(async()=>{harness=await LiveE2eHarness.open();const preflight=await harness.preflight('lmstudio.qwen36.compaction-agent-flow');fs.writeFileSync(file('preflight.json'),JSON.stringify(preflight,null,2));ready=preflight.health==='READY'&&preflight.missing.length===0;});
afterAll(async()=>{if(harness){appConfigProvider.config.setDurably(COMPACTION_MODEL_SETTINGS_KEY,JSON.stringify({modelIdentifier:null,llmConfig:null}));await harness.close();}vi.restoreAllMocks();});
for(const [index,arm] of ['A','B','B','A'].entries()) {
 it(`SR014-D0${index+1} fixed input ${arm}`,{timeout:460_000},async()=>{
  const id=`D0${index+1}-${arm}`;const output=file(`${id}.jsonl`);fs.writeFileSync(output,'',{flag:'wx'});
  const emit=(v:any)=>{scanner.assertEvidenceClean(v);fs.appendFileSync(output,JSON.stringify({time:new Date().toISOString(),...v})+'\n');};
  const checkpoint=(status:string)=>fs.appendFileSync(new URL('../../api-e2e-test-case-ledger.md',here),`| SR014-${id} | ${new Date().toISOString()} | ${status} | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/${id}.jsonl |\n`);
  checkpoint('Started');
  if(!ready){emit({event:'not_executed',reason:'LOCAL_PREREQUISITE_UNAVAILABLE'});checkpoint('Not Executed');return;}
  const tuple={modelIdentifier:null,llmConfig:arm==='A'?null:{temperature:0}};
  const state={limit:1,count:0,pending:[] as Promise<unknown>[],validate:(body:any)=>{
    expect(body.messages).toEqual(frozen.sourceMessages);expect(Object.keys(body).sort()).toEqual(['max_completion_tokens','messages','model','temperature']);
    expect(body.model).toBe('qwen/qwen3.6-35b-a3b');expect(body.max_completion_tokens).toBe(8192);expect(body.temperature).toBe(arm==='A'?0.7:0);
    const controls=JSON.stringify({...body,temperature:'diagnostic-variable'});if(controlBaseline===undefined)controlBaseline=controls;else expect(controls).toBe(controlBaseline);
  }};
  const observedTransports: typeof fetch[]=[];
  const original=transport.createLocalLongRunningFetch;const fetchSpy=vi.spyOn(transport,'createLocalLongRunningFetch').mockImplementation(()=>{const wrapped=observeFetch(original(),emit,state);observedTransports.push(wrapped);return wrapped;});
  try{
    const metadata=await fetch('http://localhost:1234/api/v1/models',{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
    const m=metadata.models?.find((m:any)=>m.key==='qwen/qwen3.6-35b-a3b');if(!m)throw new Error('DIAGNOSTIC_MODEL_UNAVAILABLE');
    emit({event:'safe_discovery',model:{key:m.key,type:m.type,architecture:m.architecture,quantization:m.quantization,max_context_length:m.max_context_length,loaded_instances:m.loaded_instances?.map((i:any)=>({id:i.id,config:{context_length:i.config?.context_length,eval_batch_size:i.config?.eval_batch_size,flash_attention:i.config?.flash_attention}}))},unknown:['remoteSamplingDefaults','chatTemplate','thinkingMode','backendVersion','historicalFailedWire']});
    appConfigProvider.config.setDurably(COMPACTION_MODEL_SETTINGS_KEY,JSON.stringify(tuple));
    emit({event:'sample_start',id,tuple,frozenMessagesSha256:frozen.messagesSha256,sourceSha256:sha(frozen.firstSummary+'\n'+frozen.correction)});
    class Capture extends LLMExtension {
      async beforeInvoke(messages:any[],_payload:any,kwargs:any){const logical=messages.map(({role,content})=>({role,content}));expect(logical).toEqual(frozen.sourceMessages);emit({event:'logical_input',invocationId:kwargs?.logicalConversationId,messagesSha256:sha(JSON.stringify(logical)),systemSha256:sha(logical[0].content),bodySha256:sha(logical[1].content)});}
      async afterInvoke(_messages:any[],response:any){if(response)emit({event:'logical_response',content:response.content,completionStatus:response.completionStatus,completionReason:response.completionReason,usage:response.usage});}
    }
    const summarizer=new DirectLlmCompactionSummarizer(async input=>{const llm=await createCompactionLlm(input);expect(observedTransports).toContain((llm as any).clientOptions?.fetch);emit({event:'effective_config',modelIdentifier:llm.model.modelIdentifier,temperature:llm.config.temperature,maxTokens:llm.config.maxTokens,extraParams:llm.config.extraParams,stopSequences:llm.config.stopSequences,systemSha256:sha(llm.config.systemMessage??'')});llm.registerExtension(new Capture(llm));return llm;});
    const result=await summarizer.summarize({units:[unit('prior-summary',createCompactedMemoryUserMessage(frozen.firstSummary),'compacted_memory'),unit('correction',new Message(MessageRole.USER,{content:frozen.correction}))],summaryBudgetTokens:3000,parentModelIdentifier:model,operationId:id,executionTurnId:id,signal:AbortSignal.timeout(400_000)});
    emit({event:'accepted',...result});
  }catch(error){emit({event:'sample_error',error:describeLiveE2eError(error)});}
  finally{await Promise.all(state.pending);fetchSpy.mockRestore();emit({event:'sample_finished',actualWireCalls:state.count});checkpoint('Completed observation; manual adjudication pending');}
 });
}
