import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const e='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';const start=JSON.parse(await fs.readFile(e+'/api-003-manager-start.json'));const tree=JSON.parse(await fs.readFile(e+'/api-003-agent-tree-open.json'));const initial=start.ws.find(m=>m.type==='ROOT_EXECUTION_VIEW_SNAPSHOT').payload;
const stamped=structuredClone(initial);stamped.root_agent.execution_tree=tree;
const unstamped=structuredClone(stamped);delete unstamped.root_agent.execution_tree.taskExecutions[0].taskLifetime;
const root=process.cwd();const bundled=path.join(root,'autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/node_modules/@autobyteus/collaboration-stream-contracts');
const output={timestamp:new Date().toISOString(),actualLiveErrorCount:start.ws.filter(m=>m.type==='ERROR'&&m.payload.message.includes('taskLifetime')).length,experiments:[],hashes:[]};
for(const [label,dir] of [['currentFreshWorkspace',path.join(root,'autobyteus-collaboration-stream-contracts')],['actualPackagedServer',bundled]]){
 const {RootExecutionViewDtoSchema}=await import(pathToFileURL(path.join(dir,'dist/index.js')).href);
 const a=RootExecutionViewDtoSchema.safeParse(stamped),b=RootExecutionViewDtoSchema.safeParse(unstamped);
 output.experiments.push({label,stampedAccepted:a.success,unmodifiedInitialAccepted:RootExecutionViewDtoSchema.safeParse(initial).success,onlyStampRemovedAccepted:b.success,issues:a.success?[]:a.error.issues});assert.equal(a.success,false);assert.equal(b.success,true);assert.equal(RootExecutionViewDtoSchema.safeParse(initial).success,true);
 for(const name of ['agent-org-execution-dtos.js','agent-run-collaboration-dtos.js','root-execution-view-dtos.js'])output.hashes.push({label,name,sha256:createHash('sha256').update(await fs.readFile(path.join(dir,'dist',name))).digest('hex')});
}
assert(output.actualLiveErrorCount>0);for(const n of new Set(output.hashes.map(r=>r.name))){let r=output.hashes.filter(r=>r.name===n);assert.equal(r[0].sha256,r[1].sha256);}
output.interpretation='Actual current live Agent root snapshot/event stream rejects valid persisted assignment ownership stamp. Current freshly built and actual packaged schema bytes match. Removing only stamp isolates strict DTO boundary, NOT an approved implementation fix or live acceptance. No source/contract/product mutation.';
await fs.writeFile(e+'/api-003-stream-stamp-origin.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({experiments:output.experiments.map(({issues,...r})=>r),hashesMatch:true,interpretation:output.interpretation},null,2));
