import { expect,it,vi } from 'vitest';
import { observeFetch } from './wire-observer.js';
it('captures synthetic request/output/finish without headers or raw reasoning; enforces no substitute request',async()=>{
 const records:any[]=[];let network=0;const state={limit:1,count:0,pending:[] as Promise<unknown>[]};
 const wrapped=observeFetch((async()=>{network++;return new Response(JSON.stringify({id:'fixture',model:'qwen',choices:[{index:0,finish_reason:'stop',message:{content:'synthetic body',reasoning_content:'synthetic-private-value'}}],usage:{completion_tokens:1}}),{status:200,headers:{'content-type':'application/json'}});}) as typeof fetch,v=>records.push(v),state);
 const init={method:'POST',body:JSON.stringify({model:'qwen',messages:[{role:'user',content:'synthetic'}],temperature:0.7,max_completion_tokens:8192}),headers:{Authorization:'synthetic-private-value'}};
 await wrapped('http://localhost:1234/v1/chat/completions',init);await Promise.all(state.pending);
 expect(JSON.stringify(records)).not.toContain('synthetic-private-value');expect(records[1].chunks[0].choices[0]).toMatchObject({content:'synthetic body',finish_reason:'stop'});
 await expect(wrapped('http://localhost:1234/v1/chat/completions',init)).rejects.toThrow('DIAGNOSTIC_ATTEMPT_LIMIT');expect(network).toBe(1);
});
it('captures bounded transport errors but never arbitrary exception text',async()=>{
 const records:any[]=[];const wrapped=observeFetch((async()=>{throw Object.assign(new Error('synthetic-private-value'),{code:'ECONNRESET'});}) as typeof fetch,v=>records.push(v),{limit:1,count:0,pending:[]});
 await expect(wrapped('http://localhost:1234/v1/chat/completions',{method:'POST',body:'{"messages":[]}'})).rejects.toThrow();
 expect(records[1]).toMatchObject({event:'wire_error',error:{code:'ECONNRESET'}});expect(JSON.stringify(records)).not.toContain('synthetic-private-value');
});

import * as transport from '../../../../../autobyteus-ts/src/llm/transport/local-long-running-fetch.js';
import { LMStudioLLM } from '../../../../../autobyteus-ts/src/llm/api/lmstudio-llm.js';
import { LLMModel } from '../../../../../autobyteus-ts/src/llm/models.js';
import { LLMConfig } from '../../../../../autobyteus-ts/src/llm/utils/llm-config.js';
import { LLMProvider } from '../../../../../autobyteus-ts/src/llm/providers.js';
import { Message,MessageRole } from '../../../../../autobyteus-ts/src/llm/utils/messages.js';
it('actual LMStudio SDK fetch is intercepted without provider traffic',async()=>{
 const records:any[]=[];const state={limit:1,count:0,pending:[] as Promise<unknown>[]};
 const wrapped=observeFetch((async()=>new Response(JSON.stringify({id:'fixture',choices:[{index:0,finish_reason:'stop',message:{content:'synthetic SDK body'}}]}),{status:200,headers:{'content-type':'application/json'}})) as typeof fetch,v=>records.push(v),state);
 const spy=vi.spyOn(transport,'createLocalLongRunningFetch').mockReturnValue(wrapped);
 try{
  const model=new LLMModel({name:'fixture',value:'fixture',provider:LLMProvider.LMSTUDIO,hostUrl:'http://localhost:1234'});
  const llm=new LMStudioLLM(model,new LLMConfig({temperature:0.7,maxTokens:8192}),{resolve:async()=>{throw new Error('no credentials');}} as never);
  expect((llm as any).clientOptions.fetch).toBe(wrapped); // Assert before possible dispatch.
  const result=await llm.sendMessages([new Message(MessageRole.USER,{content:'synthetic SDK input'})]);
  await Promise.all(state.pending);expect(result.content).toBe('synthetic SDK body');expect(records[0].body).toMatchObject({temperature:0.7,max_completion_tokens:8192});expect(state.count).toBe(1);await llm.cleanup();
 }finally{spy.mockRestore();}
});
it('stream observation retains content/tools/finish but excludes raw reasoning',async()=>{
 const records:any[]=[];const state={limit:1,count:0,pending:[] as Promise<unknown>[]};
 const chunks=[{id:'s',choices:[{index:0,delta:{reasoning_content:'synthetic-private-value'}}]},{id:'s',choices:[{index:0,delta:{content:'synthetic stream'}}]},{id:'s',choices:[{index:0,delta:{},finish_reason:'length'}]}];
 const wrapped=observeFetch((async()=>new Response(chunks.map(c=>'data: '+JSON.stringify(c)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}})) as typeof fetch,v=>records.push(v),state);
 const response=await wrapped('http://localhost:1234/v1/chat/completions',{method:'POST',body:JSON.stringify({stream:true,messages:[]})});await response.text();await Promise.all(state.pending);
 expect(JSON.stringify(records)).not.toContain('synthetic-private-value');expect(records[1].chunks[2].choices[0].finish_reason).toBe('length');expect(records[1].chunks[1].choices[0].content).toBe('synthetic stream');
});
import { observeFullFetch } from './full-wire-observer.js';
it('retains partial safe stream before a transport failure and excludes reasoning',async()=>{
 const records:any[]=[];const state={limit:1,count:0,pending:[] as Promise<unknown>[]};let controllerRef:ReadableStreamDefaultController;
 const stream=new ReadableStream({start(controller){controllerRef=controller;controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:'before disconnect',reasoning_content:'synthetic-private-value'}}]})+'\n\n'));}});
 const wrapped=observeFullFetch((async()=>new Response(stream)) as typeof fetch,v=>{records.push(v);if(v.event==='wire_chunk')controllerRef.error(Object.assign(new Error('synthetic-private-value'),{code:'ECONNRESET'}));},state);
 await wrapped('http://localhost:1234/v1/chat/completions',{method:'POST',body:'{"stream":true,"messages":[]}'});await Promise.all(state.pending);
 expect(JSON.stringify(records)).not.toContain('synthetic-private-value');expect(records.some(v=>v.event==='wire_chunk'&&v.choices[0].content==='before disconnect')).toBe(true);expect(records.at(-1)).toMatchObject({event:'wire_observation_error',error:{code:'ECONNRESET'}});
});
