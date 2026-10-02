const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const dir=__dirname;
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const observed=n=>{const r=read(n);assert.equal(r.ok,true,n);return r.result.result;};
const traces=read('desktop-tool-traces.json');
const results=traces.filter(x=>x.trace_type==='tool_result'&&x.tool_name==='open_tab');
assert.equal(results.length,3);
const meta=read('desktop-run-metadata.json');
assert.equal(meta.runtimeKind,'antigravity_cli');
assert.equal(meta.llmModelIdentifier,'gemini-3.8-flash-medium');
const checks=[];
for(const [n,index] of [['second',1],['third',2]]){
 const before=observed('desktop-'+n+'-submit.json');
 assert.equal(before.sent.ok,true);
 assert.equal(before.before.tabs.find(x=>x.text==='Activity').selected,'true');
 const after=observed('desktop-'+n+'-after.json');
 const result=results[index].tool_result;
 assert.equal(result.status,'opened');
 assert.equal(result.output,undefined);
 assert.equal(after.snapshot.activeTabId,result.tab_id);
 assert.equal(after.snapshot.sessions.length,index+1);
 assert.equal(after.snapshot.sessions.find(x=>x.tab_id===result.tab_id).url,result.url);
 assert.equal(after.tabs.find(x=>x.text==='Browser').selected,'true');
 assert.equal(after.tabs.find(x=>x.text==='Activity').selected,'false');
 const native=observed('desktop-'+n+'-native.json');
 assert.equal(native.url,result.url); assert.equal(native.title,result.title);
 assert.equal(native.marker,'API-REV-001 local fixture');
 assert(native.text.includes('/'+n)); assert(native.width>0&&native.height>0);
 checks.push({case:'C-005',open:n,result:'Pass',tabId:result.tab_id,viewport:[native.width,native.height],automaticBrowserSelection:true});
}
const reopened=observed('desktop-reopened.json');
assert.equal(reopened.tabs.find(x=>x.text==='Activity').selected,'true');
assert.deepEqual(reopened.snapshot,observed('desktop-third-after.json').snapshot);
const projection=read('desktop-reopened-projection.json').data.getRunProjection;
for(const row of results){
 assert(reopened.text.includes(row.tool_result.tab_id));
 assert.deepEqual(projection.conversation.find(x=>x.invocationId===row.tool_call_id).toolResult,row.tool_result);
 assert.deepEqual(projection.activities.find(x=>x.invocationId===row.tool_call_id).result,row.tool_result);
}
checks.push({case:'C-006',result:'Pass',opaqueResultsPreserved:3,noHistoryFocus:true,sessionsUnchanged:true});
console.log(JSON.stringify({checks,passed:true},null,2));
