"""Read-only recheck of actual API011 captures; no product mutation."""
from pathlib import Path
import json,collections
E=Path(__file__).resolve().parent;P=E/'product'
def read(n):return json.loads((P/n).read_text())
wire=[json.loads(x) for x in (P/'loopback-wire.jsonl').read_text().splitlines()]
req=[x for x in wire if x['event']=='request']
for c in ['a','t']:
 s=read(f'{c}-stable-snapshot.json');q=read(f'{c}-queued-snapshot.json')
 a=f'API11-{c.upper()}-HELD-A';b=f'API11-{c.upper()}-QUEUED-B'
 assert [(x['content'],x['state']) for x in q['state']['entries']]==[(a,'held'),(b,'queued')]
 assert q['state']['run_instance_id']==s['state']['run_instance_id']
 assert q['state']['recoverableBlock']['failureEpoch']==3
 raw=(P/f'{c}-queued-raw-0.jsonl').read_bytes()
 assert raw==(P/f'{c}-stable-raw-0.jsonl').read_bytes()
 rows=[json.loads(x) for x in raw.splitlines()]
 held=[x for x in rows if x.get('trace_type')=='user' and a in x.get('content','')]
 assert len(held)==1
 entry=q['state']['entries'][0]
 assert held[0]['message_id']==entry['message_id'] and held[0]['dedupe_key']==entry['dedupe_key']
 history=read(f'{c}-queued-projection.api.json')['response']['data']['agentRunCollaborationMemberProjection']['conversation']
 hist=[x for x in history if x.get('role')=='user' and a in x.get('content','')]
 assert len(hist)==1 and hist[0]['messageId']==entry['message_id'] and hist[0]['dedupeKey']==entry['dedupe_key']
 ui=read(f'{c}-queued-dom.json')['result']['result']
 ah=[x for x in ui['copies'] if x['text']==a];bh=[x for x in ui['copies'] if x['text']==b]
 assert len(ah)==len(bh)==1
 assert 'Held — waiting for compaction' in ah[0]['parent'] and 'Open attachment.txt' in ah[0]['parent'] and 'Queued' in bh[0]['parent']
 assert not [x for x in req if x['kind']=='parent' and a in json.dumps(x['body'])]
assert len(req)==24 and collections.Counter(x['kind'] for x in req)=={'parent':6,'compaction':18}
assert len([x for x in wire if x['event']=='response_error'])==18
assert not [x for x in wire if x['event']=='guard_failure']
before=read('reload-sentinel.json')['result']['result'];after=read('script-reload-observe.json')['result']['result']
assert before['timeOrigin']==after['timeOrigin'] and before['sentinel']==after['sentinel']
assert not read('blocked-disarmed.json')['armed']
print(json.dumps({'preReloadCheckpointAssertions':'Pass','newRendererProof':'NOT ESTABLISHED','overallPass':False,'requests':24,'parent':6,'compaction503':18,'remote':0},indent=2))
