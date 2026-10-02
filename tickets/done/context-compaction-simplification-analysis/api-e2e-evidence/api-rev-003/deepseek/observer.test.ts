import {describe,it,expect,vi} from 'vitest';
import {observe,sha} from './observer.js';
const request={model:'deepseek-v4-flash',messages:[{role:'system',content:'synthetic prompt'},{role:'user',content:'synthetic input'}],temperature:0.7,max_tokens:8192};
const options={method:'POST',body:JSON.stringify(request),headers:{authorization:'NEVER_RETAIN'}};
const state=()=>({count:0,closed:false,pending:[] as Promise<unknown>[],promptHash:sha('synthetic prompt')});
describe('bounded DeepSeek observer without provider access',()=>{
 it('records safe synthetic body/response, strips response extras and never sends a third request',async()=>{
  const events:any[]=[],s=state(),delegate=vi.fn(async()=>new Response(JSON.stringify({id:'test',model:'deepseek-v4-flash',secret:'NEVER_RETAIN',choices:[{index:0,finish_reason:'stop',message:{content:'synthetic output',reasoning_content:'DO_NOT_RETAIN'}}]})));
  const fetcher=observe(delegate as never,v=>events.push(v),s);
  await fetcher('https://api.deepseek.com/chat/completions',options);await fetcher('https://api.deepseek.com/chat/completions',options);
  await expect(fetcher('https://api.deepseek.com/chat/completions',options)).rejects.toThrow('STOP_BOUND');
  await Promise.all(s.pending);expect(delegate).toHaveBeenCalledTimes(2);expect(JSON.stringify(events)).not.toMatch(/NEVER_RETAIN|DO_NOT_RETAIN|authorization/);expect(events.filter(v=>v.event==='wire_response')).toHaveLength(2);
 });
 it('blocks network retry after HTTP failure and never captures an error body',async()=>{
  const events:any[]=[],s=state(),delegate=vi.fn(async()=>new Response('NEVER_RETAIN',{status:503}));
  const fetcher=observe(delegate as never,v=>events.push(v),s);
  await fetcher('https://api.deepseek.com/chat/completions',options);await expect(fetcher('https://api.deepseek.com/chat/completions',options)).rejects.toThrow('STOP_BOUND');
  expect(delegate).toHaveBeenCalledTimes(1);expect(JSON.stringify(events)).not.toContain('NEVER_RETAIN');
 });
 it('blocks altered prompt/model and local generation before sending',async()=>{
  const delegate=vi.fn(),fetcher=observe(delegate,()=>{},state());
  await expect(fetcher('http://localhost:1234/v1/chat/completions',options)).rejects.toThrow('LOCAL_GENERATION');
  await expect(fetcher('https://api.deepseek.com/chat/completions',{...options,body:JSON.stringify({...request,model:'other'})})).rejects.toThrow('REQUEST_INVALID');
  expect(delegate).not.toHaveBeenCalled();
 });
});
