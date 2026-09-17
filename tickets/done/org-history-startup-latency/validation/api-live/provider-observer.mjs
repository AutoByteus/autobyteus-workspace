import fs from 'node:fs';
const root=process.env.API_PROBE_ROOT;if(!root?.endsWith('/.local/api-history-latency'))throw Error('owned observer only');
const orig=globalThis.fetch;let seq=0;
globalThis.fetch=async function(input,init){let url;try{url=new URL(typeof input==='string'?input:input.url||input.toString())}catch{};
const observe=url&&(/\/responses$|\/chat\/completions$|\/messages$/.test(url.pathname));let id;
if(observe){id=++seq;let b={};try{b=JSON.parse(init?.body||'{}')}catch{};fs.appendFileSync(root+'/provider-metadata.jsonl',JSON.stringify({type:'request',id,at:new Date().toISOString(),origin:url.origin,path:url.pathname,model:b.model,reasoning:b.reasoning,temperature:b.temperature,max_output_tokens:b.max_output_tokens,max_tokens:b.max_tokens,text:b.text})+'\n')}
try{const r=await orig.call(this,input,init);if(observe)fs.appendFileSync(root+'/provider-metadata.jsonl',JSON.stringify({type:'response',id,status:r.status,at:new Date().toISOString()})+'\n');return r}catch(e){if(observe)fs.appendFileSync(root+'/provider-metadata.jsonl',JSON.stringify({type:'error',id,name:e.name})+'\n');throw e}
};
