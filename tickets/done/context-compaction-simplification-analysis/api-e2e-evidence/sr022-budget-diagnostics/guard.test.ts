import fs from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createGuard,sha} from './guard.js';
import {DeepSeekLLM} from '../../../../../autobyteus-ts/src/llm/api/deepseek-llm.js';
import {LLMModel} from '../../../../../autobyteus-ts/src/llm/models.js';
import {LLMProvider} from '../../../../../autobyteus-ts/src/llm/providers.js';
import {LLMConfig} from '../../../../../autobyteus-ts/src/llm/utils/llm-config.js';
import {Message,MessageRole} from '../../../../../autobyteus-ts/src/llm/utils/messages.js';
const frozen=JSON.parse(fs.readFileSync(new URL('../../solution-recovery-evidence/sr022/frozen-requests.json',import.meta.url),'utf8'));
const arms=frozen.order.map((id:string)=>{const [key,variant]=id.split('-');return {id,messages:frozen.cases.find((c:any)=>c.id===key)[variant]}});
const origin='http://127.0.0.1:12345';
const request=(messages=arms[0].messages,extra={})=>({method:'POST',body:JSON.stringify({model:'deepseek-v4-flash',temperature:0.7,max_completion_tokens:8192,messages,...extra})});
const response=()=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{message:{content:'synthetic content',reasoning_content:'HIDDEN_REASONING'},finish_reason:'stop'}],usage:{completion_tokens:9,completion_tokens_details:{reasoning_tokens:3}}}),{headers:{'content-type':'application/json'}});
afterEach(()=>vi.unstubAllGlobals());
describe('SR022 no-network guard prerequisite',()=>{
 it('verifies both frozen hashes, unchanged v5 and exact prefix-only pair diff',()=>{
  const prompt=fs.readFileSync(new URL('../../proposed-compaction-prompt.md',import.meta.url),'utf8');
  for(const c of frozen.cases){expect(c.withTarget[0].content).toBe(prompt);expect(c.withoutTarget[0]).toEqual(c.withTarget[0]);expect(c.withTarget[1].content).toBe('Summary budget: '+c.historicalSoftTargetTokens+' tokens.\n\n'+c.withoutTarget[1].content);for(const v of ['withTarget','withoutTarget'])expect(sha(JSON.stringify(c[v]))).toBe(c[v+'Sha256']);}
 });
 it('permits exactly ordered four calls and strips headers/hiddenreasoning from evidence',async()=>{
  const out:any[]=[];const g=createGuard(arms,origin,v=>out.push(v));const delegate=vi.fn(async()=>response());const fetch=g.wrap(delegate);
  for(const a of arms){g.begin(a.id);await fetch('https://api.deepseek.com/chat/completions',request(a.messages));g.finish()}
  expect(delegate).toHaveBeenCalledTimes(4);expect(()=>g.begin(arms[0].id)).toThrow('SR022_ARM_ORDER');expect(JSON.stringify(out)).not.toContain('HIDDEN_REASONING');expect(JSON.stringify(out)).not.toContain('authorization');
 });
 it('blocks an SDK retry of an already used arm before network',async()=>{
  const g=createGuard(arms,origin,()=>{});const delegate=vi.fn(async()=>response());const fetch=g.wrap(delegate);g.begin(arms[0].id);await fetch('https://api.deepseek.com/chat/completions',request());await expect(fetch('https://api.deepseek.com/chat/completions',request())).rejects.toThrow('SR022_REQUEST_BOUND');expect(delegate).toHaveBeenCalledTimes(1);
 });
 it('closes on non200 and prevents nextarm or transportretry',async()=>{
  const g=createGuard(arms,origin,()=>{});const delegate=vi.fn(async()=>new Response('{}',{status:503}));g.begin(arms[0].id);const fetch=g.wrap(delegate);await fetch('https://api.deepseek.com/chat/completions',request());await expect(fetch('https://api.deepseek.com/chat/completions',request())).rejects.toThrow('SR022_REQUEST_BOUND');expect(()=>g.begin(arms[1].id)).toThrow();expect(delegate).toHaveBeenCalledTimes(1);
 });
 it('closes on transport exception without another outbound call',async()=>{
  const g=createGuard(arms,origin,()=>{});const delegate=vi.fn(async()=>{throw new Error('synthetic transport')});g.begin(arms[0].id);const fetch=g.wrap(delegate);await expect(fetch('https://api.deepseek.com/chat/completions',request())).rejects.toThrow();await expect(fetch('https://api.deepseek.com/chat/completions',request())).rejects.toThrow();expect(delegate).toHaveBeenCalledTimes(1);
 });
 it.each(['wrongmessages','wrongcap','cancelled','wrongendpoint'])('blocks unsafe request before outbound: %s',async kind=>{
  const g=createGuard(arms,origin,()=>{});const delegate=vi.fn(async()=>response());g.begin(arms[0].id);const signal=AbortSignal.abort();const req=kind==='wrongmessages'?request([]):kind==='wrongcap'?request(undefined,{max_completion_tokens:7}):kind==='cancelled'?{...request(),signal}:request();await expect(g.wrap(delegate)(kind==='wrongendpoint'?'http://127.0.0.1:1234/v1/chat/completions':'https://api.deepseek.com/chat/completions',req)).rejects.toThrow();expect(delegate).not.toHaveBeenCalled();
 });
 it('prevents actual production adapter SDK retry from reaching fake transport twice',async()=>{
  const g=createGuard(arms,origin,()=>{});const delegate=vi.fn(async()=>new Response(JSON.stringify({error:{message:'synthetic503'}}),{status:503,headers:{'content-type':'application/json','retry-after-ms':'1'}}));g.begin(arms[0].id);vi.stubGlobal('fetch',g.wrap(delegate));
  const model=new DeepSeekLLM(new LLMModel({name:'deepseek-v4-flash',value:'deepseek-v4-flash',provider:LLMProvider.DEEPSEEK,maxContextTokens:100000}),new LLMConfig({temperature:0.7,maxTokens:8192}),{resolve:async()=>({revealToTrustedConsumer:()=> 'synthetic-only'})} as any);
  await expect(model.sendMessages(arms[0].messages.map((m:any)=>new Message(m.role as MessageRole,{content:m.content})),null,{}, {signal:AbortSignal.timeout(5000)})).rejects.toThrow();expect(delegate).toHaveBeenCalledTimes(1);expect(g.state.closed).toBe(true);
 });
});
