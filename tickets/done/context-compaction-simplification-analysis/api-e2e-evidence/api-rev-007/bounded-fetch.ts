import {createHash} from 'node:crypto';
import {describeLiveE2eError} from '../../../../../test-support/live-e2e/live-e2e-safe-error.js';
export const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
export type State={parent:number;summary:number;closed:boolean;pending:Promise<unknown>[];summaryHash:string; phase:'flow'|'quality'; phaseSummary:number; deadline:number; localOrigin:string};
export function observe(delegate:typeof fetch,emit:(value:any)=>void,state:State):typeof fetch {
 return (async(input:any,init:any)=>{
  const url=new URL(typeof input==='string'?input:input.url??String(input));
  if(url.hostname!=='api.deepseek.com'){
   if(url.origin!==state.localOrigin||url.pathname.includes('completions')){state.closed=true;throw new Error('API007_C08_UNEXPECTED_ENDPOINT');}
   return delegate(input,init);
  }
  if(url.protocol!=='https:'||url.pathname!=='/chat/completions'){state.closed=true;throw new Error('API007_C08_UNEXPECTED_ENDPOINT');}
  if(state.closed||Date.now()>=state.deadline||state.parent+state.summary>=13)throw new Error('API007_C08_STOP_BOUND');
  const raw=typeof init?.body==='string'?init.body:await input.clone().text(),body=JSON.parse(raw);
  const parent=body.stream===true;
  const deny=(code:string):never=>{state.closed=true;emit({event:'guard_rejected',code});throw new Error(code);};
  if(body.model!=='deepseek-v4-flash')deny('API007_C08_WRONG_MODEL');
  if(parent){
   if(state.phase!=='flow'||state.parent>=10)deny('API007_C08_PARENT_BOUND');
   if(body.temperature!==0||(body.max_tokens??body.max_completion_tokens)!==1024||body.thinking?.type!=='disabled')deny('API007_C08_PARENT_CONFIG');
  }else{
   if(state.summary>=3||state.phaseSummary>=(state.phase==='flow'?1:2))deny('API007_C08_SUMMARY_BOUND');
   if(body.temperature!==0.7||(body.max_tokens??body.max_completion_tokens)!==8192||body.tools||sha(body.messages?.[0]?.content??'')!==state.summaryHash)deny('API007_C08_SUMMARY_CONFIG');
  }
  if(parent)state.parent++;else{state.summary++;state.phaseSummary++;}
  const sequence=state.parent+state.summary;
  emit({event:'wire_request',sequence,kind:parent?'parent':'summary',body,bodySha256:sha(raw)});
  const record=(value:any)=>emit({event:'wire_chunk',sequence,id:value.id,model:value.model,usage:value.usage,choices:(value.choices??[]).map((v:any)=>({index:v.index,finish_reason:v.finish_reason,content:v.message?.content??v.delta?.content??null,tool_calls:v.message?.tool_calls??v.delta?.tool_calls??null}))});
  try {
   const budgetSignal=AbortSignal.timeout(Math.max(1,state.deadline-Date.now()));
   const supplied=init?.signal??(typeof input==='object'?input.signal:null);
   const signal=supplied?AbortSignal.any([supplied,budgetSignal]):budgetSignal;
   const response=await delegate(input,{...init,signal});emit({event:'wire_status',sequence,status:response.status});
   if(!response.ok){state.closed=true;return response;}
   const copy=response.clone();
   const pending=(async()=>{
    if(!parent){record(await copy.json());return;}
    const reader=copy.body!.getReader(),decoder=new TextDecoder();let buffer='';
    const line=(text:string)=>{if(text.startsWith('data: ')&&text.trim()!=='data: [DONE]')record(JSON.parse(text.slice(6)));};
    try{while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let i;while((i=buffer.indexOf('\n'))>=0){line(buffer.slice(0,i).trimEnd());buffer=buffer.slice(i+1);}}buffer+=decoder.decode();if(buffer.trim())line(buffer.trimEnd());}
    finally{reader.releaseLock();}
   })().catch(error=>{state.closed=true;emit({event:'capture_error',sequence,error:describeLiveE2eError(error)});});
   state.pending.push(pending);return response;
  }catch(error){state.closed=true;emit({event:'wire_error',sequence,error:describeLiveE2eError(error)});throw error;}
 }) as typeof fetch;
}
