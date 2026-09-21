import fs from 'node:fs/promises';
const root='/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model';
const { ContextFile }=await import(root+'/autobyteus-ts/dist/agent/message/context-file.js');
const { ContextFileType }=await import(root+'/autobyteus-ts/dist/agent/message/context-file-type.js');
const { partitionRawTraceAttachments }=await import(root+'/autobyteus-ts/dist/memory/models/raw-trace-attachments.js');
const { RawTraceItem }=await import(root+'/autobyteus-ts/dist/memory/models/raw-trace-item.js');
const { normalizeRawTraceRecords }=await import(root+'/autobyteus-server-ts/dist/agent-memory/services/raw-trace-record-normalizer.js');
const { buildHistoricalReplayEvents }=await import(root+'/autobyteus-server-ts/dist/run-history/projection/transformers/raw-trace-to-historical-replay-events.js');
const { buildRunProjectionConversation }=await import(root+'/autobyteus-server-ts/dist/run-history/projection/transformers/historical-replay-events-to-conversation.js');
const { buildEventMonitorActiveTracePageEvents }=await import(root+'/autobyteus-server-ts/dist/run-history/projection/event-monitor-active-trace-page-projection.js');
const base='/rest/agent-org-runs/root/agent-runs/task-repeat/context-files/';
const inputs=[
 {id:'org',uri:base+'ctx_token__notes.txt',label:'notes.txt'},
 {id:'team',uri:'/rest/team-runs/team/members/lead/context-files/ctx_token__notes.txt',label:'notes.txt'},
 {id:'agent',uri:'/rest/runs/agent/context-files/ctx_token__notes.txt',label:'notes.txt'},
 {id:'custom',uri:base+'ctx_token__custom.txt',name:'Custom report',label:'Custom report'},
 {id:'custom-prefix',uri:base+'ctx_token__custom-prefix.txt',name:'ctx_custom__literal.txt',label:'ctx_custom__literal.txt'},
 {id:'literal-prefix',uri:base+'ctx_token__ctx_original__literal.txt',label:'ctx_original__literal.txt'},
 {id:'external',uri:'https://example.test/ctx_token__notes.txt',label:'ctx_token__notes.txt'},
 {id:'workspace',uri:'/workspace/ctx_token__notes.txt',label:'ctx_token__notes.txt'},
 {id:'unknown',uri:base+'ctx_token__payload.bin',type:ContextFileType.UNKNOWN,label:'payload.bin'},
 {id:'image',uri:base+'ctx_token__image.png',type:ContextFileType.IMAGE,label:'image.png'},
];
const rows=inputs.map(i=>{
 const file=new ContextFile(i.uri,i.type??ContextFileType.TEXT,i.name??null);
 const raw=new RawTraceItem({id:'raw-'+i.id,ts:10,turnId:'turn',seq:1,traceType:'user',content:'Inspect recorded attachment',sourceEvent:'implementation-fixture',...partitionRawTraceAttachments([file])}).toDict();
 const replay=buildHistoricalReplayEvents(normalizeRawTraceRecords([JSON.parse(JSON.stringify(raw))]));
 return {...i,bytes:'Original fixture bytes for '+i.id,raw,conversation:buildRunProjectionConversation(replay),page:buildEventMonitorActiveTracePageEvents(replay).map(e=>({...e,visuals:e.visuals.map(v=>({...v,__typename:'EventMonitorUserVisual'}))}))};
});
await fs.writeFile('/tmp/aorg-ir056/render-data.json',JSON.stringify(rows,null,2));
