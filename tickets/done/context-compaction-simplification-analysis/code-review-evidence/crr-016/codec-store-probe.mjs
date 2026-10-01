import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { RawTraceItem } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/dist/memory/models/raw-trace-item.js';
import { RunMemoryFileStore } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/dist/memory/store/run-memory-file-store.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crr016-codec-'));
try {
 const store=new RunMemoryFileStore(dir);
 const base={ts:123,turnId:'t',seq:1,traceType:'user',content:'content',sourceEvent:'review-check'};
 const old=new RawTraceItem({...base,id:'unknown'});
 const keyed=new RawTraceItem({...base,id:'raw-id',seq:2,messageId:' A ',dedupeKey:' d ',senderId:'sender',fileAttachments:[{uri:'/report.txt',fileType:'text',fileName:'Rich name'}]});
 const retained=new RawTraceItem({...base,id:'retained',seq:3,messageId:'B'});
 store.add([old,keyed,retained]);
 const expected=[old.toDict(),keyed.toDict(),retained.toDict()];
 assert.deepEqual(store.listTurnRawTraceCorpusOrdered().map(x=>x.toDict()),expected);
 assert.equal(Object.hasOwn(expected[0],'message_id'),false);
 const result=store.rotateActiveRawTracesBeforeBoundary({boundaryType:'native_compaction',boundaryKey:'crr016',boundaryTraceId:'retained',runtimeKind:'AUTOBYTEUS',sourceEvent:'review-check'});
 assert.ok(result);
 assert.deepEqual(store.listArchiveTurnRawTracesOrdered().map(x=>x.toDict()),expected.slice(0,2));
 assert.deepEqual(store.listTurnRawTracesOrdered().map(x=>x.toDict()),expected.slice(2));
 for(let i=0;i<2;i++) assert.deepEqual(store.listTurnRawTraceCorpusOrdered().map(x=>x.toDict()),expected);
 console.log(JSON.stringify({result:'Pass',scope:'ordinary optional codec and active/archive reads after rotation; synthetic test-owned rows only',records:3,unknownNotInvented:true,knownKeysAndAttachmentsRetained:true}));
} finally { fs.rmSync(dir,{recursive:true,force:true}); }

