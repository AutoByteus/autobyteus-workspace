from pathlib import Path
import json,hashlib
r=Path.cwd();t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'code-review-evidence/crr-015';p=t/'api-e2e-evidence/api-rev-009/product'
def read(n):return json.loads((p/n).read_text())
before=read('real-reconnect-before.api.json')['response']['data']['agentRunCollaboration']['root_agent']['agent_input_states']
after=read('real-reconnect-after.api.json')['response']['data']['agentRunCollaboration']['root_agent']['agent_input_states']
assert before==after and len(after)==2
sentinel=read('real-reconnect-sentinel.json')['result']['result'];old=read('reconnect-two-held-before.json')['result']['result']['timeOrigin'];assert sentinel['sentinel'] is None and sentinel['timeOrigin']!=old
wire=[json.loads(x) for x in (p/'loopback-wire.jsonl').read_text().splitlines()]
parents=[x for x in wire if x.get('event')=='request' and x.get('kind')=='parent']
rows=[]
for kind in ['agent','team']:
 projection=read(f'finding-{kind}-projection.api.json')['response']['data']['agentRunCollaborationMemberProjection']
 live=next(x['state'] for x in after if x['agent_run_id']==projection['agentRunId']); assert len(live['entries'])==1
 held=live['entries'][0];assert held['state']=='held'
 history=[x for x in projection['conversation'] if x.get('content')==held['content']];assert len(history)==1
 assert not any(k in history[0] for k in ['messageId','message_id','dedupeKey','dedupe_key'])
 dom=read(f'finding-{kind}-dom.json')['result']['result'];assert len(dom)==2 and all(x['text']==held['content'] for x in dom)
 assert sum('Held — waiting for compaction' in x['parent'] for x in dom)==1
 raw=[]
 for f in (p/'owned-run-memory-before-cleanup').rglob('raw_traces_active.jsonl'):
  for line in f.read_text().splitlines():
   x=json.loads(line)
   if x.get('content')==held['content']:raw.append({'path':str(f),'entry':x})
 assert len(raw)==1 and raw[0]['entry']['turn_id']==held['turn_id'] and raw[0]['entry']['trace_type']=='user'
 assert not any(k in raw[0]['entry'] for k in ['messageId','message_id','dedupeKey','dedupe_key'])
 parent_dispatches=[x['id'] for x in parents if next((m.get('content') for m in reversed(x['body']['messages']) if m['role']=='user'),None)==held['content']]
 assert not parent_dispatches
 rows.append({'kind':kind,'runId':projection['agentRunId'],'input':live,'history':history,'domCopies':len(dom),'heldLabeledCopies':1,'nativeRaw':raw,'heldParentRequests':parent_dispatches})
result={'result':'Captured evidence consistency verified; PRODUCT FAIL, not acceptance','equalBeforeAfterStates':True,'oldTimeOrigin':old,'newDocument':sentinel,'children':rows}
(e/'captured-observations.json').write_text(json.dumps(result,indent=2)+'\n')
paths='''autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts
autobyteus-web/services/agentStreaming/handlers/agentInputStateHandler.ts
autobyteus-web/services/runHydration/runProjectionConversation.ts
autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts
autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts
autobyteus-web/services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts
autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts
autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts
autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts
autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts
autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-member-view-projection-service.ts
autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts
autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts
autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts
autobyteus-server-ts/src/run-history/projection/run-projection-types.ts
autobyteus-ts/src/agent/loop/agent-turn-runner.ts
autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts
autobyteus-ts/src/memory/memory-manager.ts
autobyteus-ts/src/memory/raw-trace-ingestion.ts
autobyteus-ts/src/memory/models/raw-trace-item.ts'''.splitlines()
oldpins=json.loads((t/'code-review-evidence/crr-014/entry-audit.json').read_text())['pins']; pins={}; matches=[]
for rel in paths:
 f=r/rel;sha=hashlib.sha256(f.read_bytes()).hexdigest();pins[str(f)]=sha
 matches.append({'path':rel,'sha256':sha,'crr014EntrySha256':oldpins.get(str(f)),'sameAsCRR014Entry':oldpins.get(str(f))==sha if str(f) in oldpins else None})
(e/'reviewed-source-pins.json').write_text(json.dumps(pins,indent=2)+'\n');(e/'prior-review-source-comparison.json').write_text(json.dumps(matches,indent=2)+'\n')
print({'childrenVerified':len(rows),'sourcePaths':len(paths),'sameAsCRR014':sum(x['sameAsCRR014Entry'] is True for x in matches),'notPreviouslyPinned':[x['path'] for x in matches if x['sameAsCRR014Entry'] is None],'changed':[x['path'] for x in matches if x['sameAsCRR014Entry'] is False]})
