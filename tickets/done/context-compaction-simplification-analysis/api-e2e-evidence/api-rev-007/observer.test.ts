import {it,expect,vi} from 'vitest';
import {observe,sha,State} from './bounded-fetch.js';
const state=():State=>({parent:0,summary:0,closed:false,pending:[],summaryHash:sha('synthetic prompt'),phase:'flow',phaseSummary:0,deadline:Date.now()+10000,localOrigin:'http://127.0.0.1:9999'});
const parent={model:'deepseek-v4-flash',messages:[{role:'system',content:'synthetic parent'}],stream:true,temperature:0,max_completion_tokens:1024,thinking:{type:'disabled'}};
const summary={model:'deepseek-v4-flash',messages:[{role:'system',content:'synthetic prompt'}],temperature:0.7,max_completion_tokens:8192};
const options=(body:any)=>({method:'POST',body:JSON.stringify(body),headers:{Authorization:'NEVER_RETAIN'}});
const url='https://api.deepseek.com/chat/completions';
it('captures SSE chunks/summary safe data but never auth/hidden reasoning and enforces separate limits',async()=>{
 const events:any[]=[],s=state();
 const delegate=vi.fn(async(_i:any,o:any)=>JSON.parse(o.body).stream?new Response('data: {"choices":[{"delta":{"content":"safe","reasoning_content":"NEVER_RETAIN"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'):new Response('{"choices":[{"message":{"content":"summary"},"finish_reason":"stop"}]}'));
 const request=observe(delegate as never,x=>events.push(x),s);
 for(let i=0;i<10;i++)await request(url,options(parent));
 await request(url,options(summary));s.phase='quality';s.phaseSummary=0;
 await request(url,options(summary));await request(url,options(summary));await Promise.all(s.pending);
 await expect(request(url,options(parent))).rejects.toThrow('STOP_BOUND');expect(delegate).toHaveBeenCalledTimes(13);
 expect(JSON.stringify(events)).not.toContain('NEVER_RETAIN');expect(events.filter(e=>e.event==='wire_chunk')).toHaveLength(13);
});
it('retains partial SSE before safe read error and closes guard',async()=>{
 const events:any[]=[],s=state();let controller:ReadableStreamDefaultController;let sawChunk!:()=>void;
 const progress=new Promise<void>(resolve=>{sawChunk=resolve;});
 const stream=new ReadableStream({start(c){controller=c;c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));}});
 const delegate=vi.fn(async()=>new Response(stream));const request=observe(delegate as never,e=>{events.push(e);if(e.event==='wire_chunk')sawChunk();},s);
 await request(url,options(parent));await progress;
 controller!.error(Object.assign(new Error('private-detail'),{code:'ETIMEDOUT'}));await Promise.all(s.pending);
 expect(events.some(e=>e.event==='wire_chunk'&&e.choices[0].content==='partial')).toBe(true);expect(s.closed).toBe(true);
 expect(JSON.stringify(events)).not.toContain('private-detail');
 await expect(request(url,options(parent))).rejects.toThrow('STOP_BOUND');expect(delegate).toHaveBeenCalledTimes(1);
});
it('stops after HTTP error, discards error body and never sends Qwen or a second summary',async()=>{
 const s=state(),events:any[]=[],delegate=vi.fn(async()=>new Response('NEVER_RETAIN',{status:503}));
 const request=observe(delegate as never,e=>events.push(e),s);await request(url,options(summary));
 await expect(request(url,options(summary))).rejects.toThrow('STOP_BOUND');
 await expect(request('http://localhost:1234/v1/chat/completions',options(parent))).rejects.toThrow('UNEXPECTED_ENDPOINT');
 expect(delegate).toHaveBeenCalledTimes(1);expect(JSON.stringify(events)).not.toContain('NEVER_RETAIN');
});
it('rejects a second successful summary before sending',async()=>{
 const s=state(),delegate=vi.fn(async()=>new Response('{"choices":[]}')),request=observe(delegate as never,()=>{},s);
 await request(url,options(summary));await Promise.all(s.pending);
 await expect(request(url,options(summary))).rejects.toThrow('SUMMARY_BOUND');expect(delegate).toHaveBeenCalledTimes(1);
});
import {capture} from './capture-observation.js';
it('captures entire all-exit input atomically before forwarding, including failure metadata',()=>{
 const order:string[]=[],persist=vi.fn(()=>order.push('persist'));
 const source=JSON.stringify({event:'managed_compaction_all_exit',stage:'post-turn-4',error:{code:'ETIMEDOUT'},parentResponses:[{content:'safe synthetic'}]})+'\n';
 capture(source,()=>order.push('validate'),persist);order.push('forward');
 expect(order).toEqual(['validate','persist','forward']);expect(persist.mock.calls).toHaveLength(1);
 capture('ordinary reporter text',()=>{throw new Error('unexpected');},persist);
 expect(persist.mock.calls).toHaveLength(1);
});
it('never persists an observation if evidence scanner rejects it',()=>{
 const persist=vi.fn();
 expect(()=>capture('{"event":"managed_compaction_all_exit"}',()=>{throw new Error('unsafe');},persist)).toThrow('unsafe');
 expect(persist).not.toHaveBeenCalled();
});

it('blocks parent11 independently of total limit',async()=>{
 const s=state();s.parent=10;const d=vi.fn(),r=observe(d as never,()=>{},s);
 await expect(r(url,options(parent))).rejects.toThrow('PARENT_BOUND');expect(d).not.toHaveBeenCalled();expect(s.closed).toBe(true);
});
it('allows only two quality summaries and no quality parent',async()=>{
 const s=state();s.phase='quality';s.phaseSummary=2;const d=vi.fn(),r=observe(d as never,()=>{},s);
 await expect(r(url,options(summary))).rejects.toThrow('SUMMARY_BOUND');expect(d).not.toHaveBeenCalled();
 const p=state();p.phase='quality';await expect(observe(d as never,()=>{},p)(url,options(parent))).rejects.toThrow('PARENT_BOUND');
});
it.each([
 ['wrong model',{...parent,model:'qwen'}],
 ['parent config',{...parent,temperature:0.8}],
 ['prompt mutation',{...summary,messages:[{role:'system',content:'mutated'}]}],
 ['summary tools',{...summary,tools:[]}],
])('rejects %s before network',async(_name,body)=>{
 const s=state(),d=vi.fn();await expect(observe(d as never,()=>{},s)(url,options(body))).rejects.toThrow();
 expect(d).not.toHaveBeenCalled();expect(s.closed).toBe(true);
});
it('rejects expired deadline; aborts a never-settling provider with unchanged body',async()=>{
 const s=state();s.deadline=Date.now()-1;const d=vi.fn();
 await expect(observe(d as never,()=>{},s)(url,options(parent))).rejects.toThrow('STOP_BOUND');expect(d).not.toHaveBeenCalled();
 const a=state();a.deadline=Date.now()+30;
 const hanging=vi.fn((_i:any,o:any)=>new Promise<Response>((_res,rej)=>{expect(o.body).toBe(JSON.stringify(parent));o.signal.addEventListener('abort',()=>rej(Object.assign(new Error('private'),{code:'ETIMEDOUT'})),{once:true});}));
 const events:any[]=[];await expect(observe(hanging as never,x=>events.push(x),a)(url,options(parent))).rejects.toThrow();
 expect(a.closed).toBe(true);expect(JSON.stringify(events)).not.toContain('private');expect(hanging).toHaveBeenCalledTimes(1);
});
it('allows only owned local origin and captures semantic event before forwarding',async()=>{
 const s=state(),d=vi.fn(async()=>new Response('{}')),r=observe(d as never,()=>{},s);
 await r('http://127.0.0.1:9999/graphql',{});expect(s.parent+s.summary).toBe(0);
 await expect(r('https://example.com/chat/completions',options(parent))).rejects.toThrow('UNEXPECTED_ENDPOINT');expect(d).toHaveBeenCalledTimes(1);
 const p=vi.fn();capture(JSON.stringify({event:'semantic_repeated',summary:'requested not complete'}),()=>{},p);expect(p).toHaveBeenCalledTimes(1);
});
