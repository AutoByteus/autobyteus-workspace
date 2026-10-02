import {createHash} from 'node:crypto';
import {describeLiveE2eError} from '../../../../../test-support/live-e2e/live-e2e-safe-error.js';
export const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
export type Arm={id:string;messages:Array<{role:string;content:string}>};
export function createGuard(arms:Arm[],ownedOrigin:string,emit:(v:any)=>void){
 const state={index:0,active:null as string|null,used:false,count:0,closed:false,started:Date.now(),wireControls:null as string|null};
 const stop=(code:string):never=>{state.closed=true;emit({event:'guard_stop',arm:state.active,code,outboundCount:state.count});throw new Error(code)};
 return {state,
  begin(id:string){if(state.closed||state.active||state.index>=4||arms[state.index]?.id!==id)stop('SR022_ARM_ORDER');state.active=id;state.used=false},
  finish(){if(!state.active||!state.used||state.closed)stop('SR022_ARM_UNFINISHED');state.active=null;state.index++},
  wrap(delegate:typeof fetch):typeof fetch{return (async(input:any,init:any)=>{
   const url=new URL(typeof input==='string'?input:input.url??String(input));
   if(url.origin===ownedOrigin&&!url.pathname.includes('completions'))return delegate(input,init);
   if(url.origin!=='https://api.deepseek.com'||url.pathname!=='/chat/completions')stop('SR022_UNEXPECTED_ENDPOINT');
   if(state.closed||!state.active||state.used||state.count>=4||Date.now()-state.started>=1600000)stop('SR022_REQUEST_BOUND');
   const signal:AbortSignal|undefined=init?.signal??input?.signal;if(signal?.aborted)stop('SR022_CANCELLED');
   const raw=typeof init?.body==='string'?init.body:await input.clone().text();const body=JSON.parse(raw);
   if(body.model!=='deepseek-v4-flash'||body.temperature!==0.7||(body.max_tokens??body.max_completion_tokens)!==8192||body.stream===true||body.tools||body.n&&body.n!==1)stop('SR022_WIRE_CONFIG');
   if(JSON.stringify(body.messages)!==JSON.stringify(arms[state.index].messages))stop('SR022_FROZEN_MESSAGES');
   const controls=JSON.stringify({...body,messages:undefined});if(state.wireControls&&state.wireControls!==controls)stop('SR022_CONTROLS_CHANGED');state.wireControls=controls;
   state.used=true;state.count++;const arm=state.active;
   emit({event:'wire_request',arm,sequence:state.count,body,bodySha256:sha(raw),messagesSha256:sha(JSON.stringify(body.messages))});
   try{
    const response=await delegate(input,init);emit({event:'wire_status',arm,status:response.status});
    if(!response.ok){state.closed=true;emit({event:'campaign_stop',arm,code:'HTTP_'+response.status});return response;}
    const value:any=await response.clone().json();
    emit({event:'wire_response',arm,id:value.id,model:value.model,usage:value.usage,choices:(value.choices??[]).map((c:any)=>({index:c.index,finish_reason:c.finish_reason,content:c.message?.content??null,tool_calls:c.message?.tool_calls??null}))});
    return response;
   }catch(error){state.closed=true;emit({event:'wire_error',arm,error:describeLiveE2eError(error)});throw error}
  }) as typeof fetch}
 };
}
