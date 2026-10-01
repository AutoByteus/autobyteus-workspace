import { createHash } from 'node:crypto';
import { describeLiveE2eError } from '../../../../../test-support/live-e2e/live-e2e-safe-error.js';
export const sha = (value:string) => createHash('sha256').update(value).digest('hex');
export function observeFetch(delegate:typeof fetch, emit:(value:unknown)=>void, state:{limit:number;count:number;validate?:(body:any)=>void;pending:Promise<unknown>[]}) : typeof fetch {
  return (async (input:any, init:any) => {
    const url = new URL(typeof input==='string'?input:input.url??String(input));
    if (!['localhost','127.0.0.1'].includes(url.hostname) || url.port!=='1234' || url.pathname!=='/v1/chat/completions') throw new Error('DIAGNOSTIC_UNEXPECTED_ENDPOINT');
    if(state.count >= state.limit) throw new Error('DIAGNOSTIC_ATTEMPT_LIMIT');
    const raw=typeof init?.body==='string'?init.body:await input.clone().text();
    const body=JSON.parse(raw);state.validate?.(body);state.count++;
    // Synthetic request content only; never headers or authentication fields.
    emit({event:'wire_request',sequence:state.count,body,bodySha256:sha(raw),messageSha256:sha(JSON.stringify(body.messages))});
    try {
      const response=await delegate(input,init);
      const copy=response.clone();
      const pending=(async()=>{
        if(!response.ok){emit({event:'wire_http_failure',status:response.status});return;}
        const content=await copy.text();
        const chunks=body.stream?content.split('\n').filter(l=>l.startsWith('data: ')&&l!=='data: [DONE]').map(l=>JSON.parse(l.slice(6))):[JSON.parse(content)];
        emit({event:'wire_response',status:response.status,stream:Boolean(body.stream),chunks:chunks.map(c=>({id:c.id,model:c.model,usage:c.usage,choices:(c.choices??[]).map((v:any)=>({index:v.index,finish_reason:v.finish_reason,content:v.message?.content??v.delta?.content??null,tool_calls:v.message?.tool_calls??v.delta?.tool_calls??null}))}))});
      })().catch(error=>emit({event:'wire_observation_error',error:describeLiveE2eError(error)}));
      state.pending.push(pending);return response;
    } catch(error){emit({event:'wire_error',error:describeLiveE2eError(error)});throw error;}
  }) as typeof fetch;
}
