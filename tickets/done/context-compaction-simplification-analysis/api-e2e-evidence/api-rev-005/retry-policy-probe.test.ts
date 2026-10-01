import {afterEach,describe,expect,it,vi} from 'vitest';
import {DeepSeekLLM} from '../../../../../autobyteus-ts/src/llm/api/deepseek-llm.js';
import {LLMModel} from '../../../../../autobyteus-ts/src/llm/models.js';
import {LLMProvider} from '../../../../../autobyteus-ts/src/llm/providers.js';
import {LLMConfig} from '../../../../../autobyteus-ts/src/llm/utils/llm-config.js';
import {Message,MessageRole} from '../../../../../autobyteus-ts/src/llm/utils/messages.js';
import {LLMUserMessage} from '../../../../../autobyteus-ts/src/llm/user-message.js';
import {DirectLlmCompactionSummarizer} from '../../../../../autobyteus-ts/src/memory/compaction/direct-llm-compaction-summarizer.js';
import {COMPACTION_SUMMARY_HEADINGS} from '../../../../../autobyteus-ts/src/memory/compaction/compaction-summary-parser.js';
import {makeHarness} from '../../../../../autobyteus-ts/tests/unit/memory/direct-compaction-harness.js';
import {LLMRequestAssembler} from '../../../../../autobyteus-ts/src/agent/llm-request-assembler.js';
import {OpenAIChatRenderer} from '../../../../../autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.js';
import {AgentStatusDeriver} from '../../../../../autobyteus-ts/src/agent/status/status-deriver.js';
import {AgentStatus} from '../../../../../autobyteus-ts/src/agent/status/status-enum.js';
import {LLMCompleteResponseReceivedEvent,AgentIdleEvent} from '../../../../../autobyteus-ts/src/agent/events/agent-events.js';
import {CompleteResponse} from '../../../../../autobyteus-ts/src/llm/utils/response-types.js';
const body=COMPACTION_SUMMARY_HEADINGS.map(h=>'## '+h+'\n- No approval; continue the review.').join('\n\n');
const tagged='<compaction_summary>\n'+body+'\n</compaction_summary>';
const input={units:[{id:'u',kind:'message' as const,startIndex:0,endIndex:0,rawTraceIds:['r'],messages:[new Message(MessageRole.USER,{content:'Review only; do not approve.'})]}],summaryBudgetTokens:8192,parentModelIdentifier:'deepseek-v4-flash',operationId:'probe',executionTurnId:'turn',signal:new AbortController().signal};
const model=()=>new DeepSeekLLM(new LLMModel({name:'deepseek-v4-flash',value:'deepseek-v4-flash',provider:LLMProvider.DEEPSEEK,maxContextTokens:100000}),new LLMConfig({maxTokens:8192}),{resolve:async()=>({revealToTrustedConsumer:()=> 'synthetic-test-only'})} as any);
const ok=(content=tagged)=>new Response(JSON.stringify({id:'synthetic',object:'chat.completion',created:1,model:'deepseek-v4-flash',choices:[{index:0,message:{role:'assistant',content},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}),{status:200,headers:{'content-type':'application/json'}});
const error=(status:number)=>new Response(JSON.stringify({error:{message:'synthetic provider failure',type:'test'}}),{status,headers:{'content-type':'application/json','retry-after-ms':'1'}});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
describe('current production retry behavior; all transport in-memory, no network',()=>{
 it('DeepSeek SDK retries two503 responses then succeeds on thirdHTTP attempt',async()=>{
  const fetch=vi.fn().mockImplementationOnce(()=>Promise.resolve(error(503))).mockImplementationOnce(()=>Promise.resolve(error(503))).mockImplementation(()=>Promise.resolve(ok()));vi.stubGlobal('fetch',fetch);
  await expect(new DirectLlmCompactionSummarizer(async()=>model()).summarize(input)).resolves.toMatchObject({summary:body});
  expect(fetch).toHaveBeenCalledTimes(3);
 });
 it('DeepSeek SDK stops after three503 HTTP attempts',async()=>{
  const fetch=vi.fn(async()=>error(503));vi.stubGlobal('fetch',fetch);
  await expect(new DirectLlmCompactionSummarizer(async()=>model()).summarize(input)).rejects.toThrow('synthetic provider failure');expect(fetch).toHaveBeenCalledTimes(3);
 });
 it('authentication401 is not automatically retried by currentSDK',async()=>{
  const fetch=vi.fn(async()=>error(401));vi.stubGlobal('fetch',fetch);
  await expect(new DirectLlmCompactionSummarizer(async()=>model()).summarize(input)).rejects.toThrow('synthetic provider failure');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('HTTP200 invalidsummary is one applicationattempt, not a three-generation loop',async()=>{
  const fetch=vi.fn(async()=>ok('unusable output'));vi.stubGlobal('fetch',fetch);
  await expect(new DirectLlmCompactionSummarizer(async()=>model()).summarize(input)).rejects.toMatchObject({code:'invalid_summary'});expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('failedcompaction preserves snapshot; distinctnewuser retries before their message is assembled once',async()=>{
  const h=makeHarness();try{
   const before=h.snapshotStore.read('agent');const assembler=new LLMRequestAssembler(h.manager,new OpenAIChatRenderer(),h.executor);
   h.summarize.mockRejectedValueOnce(new Error('synthetic generation failure'));
   await expect(assembler.prepareRequest(new LLMUserMessage({content:'first unsent request'}),{...h.input,requestId:'r1'})).rejects.toThrow('synthetic generation failure');
   expect(h.summarize).toHaveBeenCalledTimes(1);expect(h.snapshotStore.read('agent')).toEqual(before);expect(h.manager.isCompactionAwaitingUserRetry()).toBe(true);
   const result=await assembler.prepareRequest(new LLMUserMessage({content:'new retry message'}),{...h.input,turnId:'next-user',requestId:'r2'});
   expect(result.didCompact).toBe(true);expect(h.summarize).toHaveBeenCalledTimes(2);expect(h.manager.hasPendingCompaction()).toBe(false);expect(result.canonicalMessages.filter(m=>m.role===MessageRole.USER&&m.content?.includes('new retry message'))).toHaveLength(1);
  }finally{h.dispose()}
 });
 it('current error-final followed by normal completedturn idleevent does not preserve AgentStatus.ERROR',()=>{
  const status=new AgentStatusDeriver(AgentStatus.AWAITING_LLM_RESPONSE);
  status.apply(new LLMCompleteResponseReceivedEvent(new CompleteResponse({content:'compaction failed'}),true,'turn'));
  status.apply(new AgentIdleEvent('turn'));expect(status.currentStatus).toBe(AgentStatus.IDLE);
 });
});
