// Full-flow SSE observer retains each safe chunk immediately, even if transport ends in error.
import { sha } from './wire-observer.js';
import { describeLiveE2eError } from '../../../../../test-support/live-e2e/live-e2e-safe-error.js';
export function observeFullFetch(delegate:typeof fetch,emit:(value:any)=>void,state:{limit:number;count:number;validate?:(body:any)=>void;pending:Promise<unknown>[]}):typeof fetch {
 return (async(input:any,init:any)=>{
  const url=new URL(typeof input==='string'?input:input.url??String(input));
  if(!['localhost','127.0.0.1'].includes(url.hostname)||url.port!=='1234'||url.pathname!=='/v1/chat/completions')throw new Error('DIAGNOSTIC_UNEXPECTED_ENDPOINT');
  if(state.count>=state.limit)throw new Error('DIAGNOSTIC_ATTEMPT_LIMIT');
  const raw=typeof init?.body==='string'?init.body:await input.clone().text();const body=JSON.parse(raw);state.validate?.(body);const sequence=++state.count;
  emit({event:'wire_request',sequence,body,bodySha256:sha(raw)});
  const record=(chunk:any)=>emit({event:'wire_chunk',sequence,id:chunk.id,model:chunk.model,usage:chunk.usage,choices:(chunk.choices??[]).map((v:any)=>({index:v.index,finish_reason:v.finish_reason,content:v.message?.content??v.delta?.content??null,tool_calls:v.message?.tool_calls??v.delta?.tool_calls??null}))});
  try{
   const response=await delegate(input,init);const copy=response.clone();
   const pending=(async()=>{
    emit({event:'wire_http',sequence,status:response.status});
    if(!response.ok)return;
    if(!body.stream){record(await copy.json());return;}
    const reader=copy.body!.getReader();const decoder=new TextDecoder();let buffer='';
    const line=(s:string)=>{if(s.startsWith('data: ')&&s.trim()!=='data: [DONE]')record(JSON.parse(s.slice(6)));};
    try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let index;while((index=buffer.indexOf('\n'))>=0){line(buffer.slice(0,index).trimEnd());buffer=buffer.slice(index+1);}}buffer+=decoder.decode();if(buffer.trim())line(buffer.trimEnd());}
    finally{reader.releaseLock();}
   })().catch(error=>emit({event:'wire_observation_error',sequence,error:describeLiveE2eError(error)}));state.pending.push(pending);return response;
  }catch(error){emit({event:'wire_error',sequence,error:describeLiveE2eError(error)});throw error;}
 }) as typeof fetch;
}
