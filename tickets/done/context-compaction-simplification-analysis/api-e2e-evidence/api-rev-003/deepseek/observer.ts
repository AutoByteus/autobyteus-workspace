import { createHash } from 'node:crypto';
import { describeLiveE2eError } from '../../../../../../test-support/live-e2e/live-e2e-safe-error.js';
export const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export function observe(delegate:typeof fetch,emit:(v:any)=>void,state:{count:number;closed:boolean;pending:Promise<unknown>[];promptHash:string}):typeof fetch {
 return (async(input:any,init:any)=>{
  const url=new URL(typeof input==='string'?input:input.url??String(input));
  if(url.hostname!=='api.deepseek.com') {
   if(!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('API_C12_UNEXPECTED_REMOTE_ENDPOINT');
   if(url.pathname.includes('completions')) throw new Error('API_C12_UNEXPECTED_LOCAL_GENERATION');
   return delegate(input,init);
  }
  if(url.protocol!=='https:'||url.pathname!=='/chat/completions')throw new Error('API_C12_UNEXPECTED_ENDPOINT');
  if(state.closed||state.count>=2)throw new Error('API_C12_STOP_BOUND');
  const raw=typeof init?.body==='string'?init.body:await input.clone().text(),body=JSON.parse(raw);
  if(body.model!=='deepseek-v4-flash'||body.tools||body.stream||body.messages?.length!==2||sha(body.messages[0].content)!==state.promptHash)throw new Error('API_C12_REQUEST_INVALID');
  if(body.max_tokens!==8192&&body.max_completion_tokens!==8192)throw new Error('API_C12_CAP_INVALID');
  if(body.temperature!==0.7)throw new Error('API_C12_TEMPERATURE_INVALID');
  const allowed=['model','messages','temperature','max_tokens','max_completion_tokens','thinking','reasoning_effort'];
  if(Object.keys(body).some(k=>!allowed.includes(k)))throw new Error('API_C12_UNEXPECTED_CONTROL');
  const sequence=++state.count;
  emit({event:'wire_request',sequence,body,bodySha256:sha(raw)});
  try {
   const response=await delegate(input,init);
   emit({event:'wire_status',sequence,status:response.status});
   if(!response.ok){state.closed=true;return response;}
   const pending=response.clone().json().then((value:any)=>emit({event:'wire_response',sequence,id:value.id,model:value.model,usage:value.usage,choices:value.choices?.map((c:any)=>({index:c.index,finish_reason:c.finish_reason,content:c.message?.content??null}))})).catch(error=>{state.closed=true;emit({event:'capture_error',sequence,error:describeLiveE2eError(error)});});
   state.pending.push(pending);return response;
  }catch(error){state.closed=true;emit({event:'wire_error',sequence,error:describeLiveE2eError(error)});throw error;}
 }) as typeof fetch;
}
