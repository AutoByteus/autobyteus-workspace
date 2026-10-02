import fs from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const e=path.dirname(fileURLToPath(import.meta.url));
const {parseCompactionSummary}=await import('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/dist/memory/compaction/compaction-summary-parser.js');
const prompt=fs.readFileSync('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/proposed-compaction-prompt.md','utf8');
const out=path.join(e,'guard');fs.mkdirSync(out);
const child=spawn(process.execPath,['/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-007/ui-continuation/loopback-provider.mjs'],{env:{...process.env,API7_FIXTURE_OUTPUT_DIR:out,API7_HOLD_MS:'250'},stdio:['ignore','pipe','pipe']});
const done=new Promise(r=>child.on('exit',(code)=>r(code)));
let results=[];
try{
 for(let i=0;i<100&&!fs.existsSync(path.join(out,'loopback-state.json'));i++)await new Promise(r=>setTimeout(r,30));
 const {url,model}=JSON.parse(fs.readFileSync(path.join(out,'loopback-state.json')));
 const req=async(p,b)=>{const r=await fetch(url+p,b?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}:{});return {status:r.status,text:await r.text()};};
 const control=mode=>req('/control',{mode});
 const comp={model,messages:[{role:'system',content:prompt},{role:'user',content:'API7-GUARD synthetic history'}],max_tokens:8192};
 assert.equal(JSON.parse((await req('/api/v1/models')).text).models[0].key,model);results.push('discovery');
 assert.equal(JSON.parse((await req('/state')).text).armed,false);results.push('disarmed state');
 await control('fail');assert.equal((await req('/v1/chat/completions',comp)).status,503);results.push('503');
 await control('success');const success=JSON.parse((await req('/v1/chat/completions',comp)).text);assert.ok(parseCompactionSummary(success.choices[0].message.content));results.push('six-heading parser');
 const parent=await req('/v1/chat/completions',{model,stream:true,messages:[{role:'user',content:'API7-GUARD'}]});assert.ok(parent.text.includes('ACK API7-GUARD')&&parent.text.includes('[DONE]'));results.push('SSE');
 await control('hold_success');const pending=req('/v1/chat/completions',comp);for(let i=0;i<30;i++){if(JSON.parse((await req('/state')).text).held===1)break;await new Promise(r=>setTimeout(r,20));}
 assert.equal(JSON.parse((await req('/state')).text).held,1);await control('release');assert.equal((await pending).status,200);results.push('hold release');
 await control('hold_success');const ac=new AbortController();const aborted=fetch(url+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(comp),signal:ac.signal}).catch(e=>e.name);
 for(let i=0;i<30;i++){if(JSON.parse((await req('/state')).text).held===1)break;await new Promise(r=>setTimeout(r,5));}
 ac.abort();assert.equal(await aborted,'AbortError');await new Promise(r=>setTimeout(r,350));
 assert.equal(JSON.parse((await req('/state')).text).closed,false);await control('release');
 assert.ok(fs.readFileSync(path.join(out,'loopback-wire.jsonl'),'utf8').includes('discard_closed_response'));results.push('abort clears deadline; late response discarded');
 await control('disarm');assert.equal((await req('/v1/chat/completions',comp)).status,400);assert.equal(JSON.parse((await req('/state')).text).closed,true);results.push('reject disarmed, closes');
 fs.writeFileSync(path.join(e,'guard-results.json'),JSON.stringify({result:'Pass',checks:results,accepted:5,remote:0},null,2));
 console.log(results);
}finally{child.kill('SIGTERM');await done;}
