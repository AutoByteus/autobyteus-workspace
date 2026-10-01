from pathlib import Path
import json,collections
E=Path(__file__).resolve().parent;P=E/'product'
def j(n):return json.loads((P/n).read_text())
wire=[json.loads(x) for x in (P/'loopback-wire.jsonl').read_text().splitlines()]
req=[x for x in wire if x['event']=='request' and x['id']<=32]
assert len(req)==32 and collections.Counter(x['kind'] for x in req)=={'parent':12,'compaction':20}
results=[]
for c in ['a','t']:
 pre=j(f'resume-repeat-{c}-snapshot.json');post=j(f'resume-recovered-{c}-snapshot.json');assert post['state']['run_instance_id']==pre['state']['run_instance_id']
 assert post['state']['entries']==[] and post['state']['recoverableBlock'] is None
 markers=[f'API11-{c.upper()}-'+v for v in ['HELD-A','QUEUED-B','RECOVERY-C']]
 parent=[x for x in req if x['kind']=='parent' and x['id']>24 and any(m in json.dumps(x['body']) for m in markers)]
 # Only the most recent user message identifies the actual dispatched turn; preceding input remains model context.
 latest=[next(m['content'] for m in reversed(x['body']['messages']) if m['role']=='user') for x in parent]
 assert len(latest)==3 and all(markers[i] in str(latest[i]) for i in range(3))
 raw=[]
 for f in P.glob(f'resume-recovered-{c}-raw-*.jsonl'):raw.extend(json.loads(x) for x in f.read_text().splitlines())
 for marker in markers:assert len([x for x in raw if x.get('trace_type')=='user' and marker in x.get('content','')])==1
 copies=j(f'resume-recovered-{c}-dom.json')['result']['result']['copies']
 for marker in markers:assert len([x for x in copies if x['text']==marker])==1
 assert 'Open attachment.txt' in next(x['parent'] for x in copies if x['text']==markers[0])
 assert 'Held — waiting' not in j(f'resume-recovered-{c}-dom.json')['result']['result']['tail']
 results.append({'kind':c,'native':post['state']['run_instance_id'],'parentTurnRequestIds':[x['id'] for x in parent],'fifo':markers,'rawCountPerInput':1})
assert not [x for x in wire if x['event']=='guard_failure']
result={'result':'Pass','recovery':results,'requestsBefore':24,'requestsAfter':32,'successfulCompactions':2,'newParentTurns':6,'remote':0,'scope':'normal C composer input after two true reloads authorizes once-only native FIFO continuation; scripted model output is not semantic quality'}
(E/'recovery-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
