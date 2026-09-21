import fs from'node:fs/promises';import{env}from'./lib.mjs';
export async function rawFiles(root=env.dataDir+'/memory'){const out=[];async function walk(p){for(const e of await fs.readdir(p,{withFileTypes:true})){if(e.isDirectory())await walk(p+'/'+e.name);else if(e.name==='raw_traces_active.jsonl')out.push(p+'/'+e.name)}}await walk(root);return out}
export async function trace(id){const f=(await rawFiles()).find(x=>x.split('/').at(-2)===id);return{path:f??null,rows:f?(await fs.readFile(f,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse):[]}}
export const reply=(t,marker)=>t.rows.some(x=>x.trace_type==='assistant'&&x.content?.trim()===marker);
