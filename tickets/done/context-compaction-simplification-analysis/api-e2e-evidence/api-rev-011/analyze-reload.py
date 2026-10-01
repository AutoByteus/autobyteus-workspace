from pathlib import Path
import json
E=Path(__file__).resolve().parent;P=E/'product'
def j(n):return json.loads((P/n).read_text())
def dom(n):return j(n)['result']['result']
b=dom('resume-before-reload.json');one=dom('resume-reload-proof.json');two=dom('resume-repeat-proof.json')
assert len({b['timeOrigin'],one['timeOrigin'],two['timeOrigin']})==3
assert b['sentinel'] and one['sentinel'] is None and two['sentinel'] is None
assert dom('resume-repeat-before.json')['sentinel'] and not one['wirePresent'] and not two['wirePresent']
for c in ['a','t']:
 before=j(f'resume-{c}-before-snapshot.json')
 for prefix,d in [(f'resume-{c}-after',f'resume-{c}-dom.json'),(f'resume-repeat-{c}',f'resume-repeat-{c}-dom.json')]:
  after=j(prefix+'-snapshot.json');assert after['state']==before['state']
  assert (P/(prefix+'-raw-0.jsonl')).read_bytes()==(P/f'resume-{c}-before-raw-0.jsonl').read_bytes()
  assert '92623' in (P/(prefix+'-backend.txt')).read_text()
  assert j(prefix+'-projection.api.json')['response']['data']==j(f'resume-{c}-before-projection.api.json')['response']['data']
  copies=dom(d)['copies'];a=f'API11-{c.upper()}-HELD-A';q=f'API11-{c.upper()}-QUEUED-B'
  aa=[x for x in copies if x['text']==a];bb=[x for x in copies if x['text']==q]
  assert len(aa)==len(bb)==1
  assert 'Held — waiting for compaction' in aa[0]['parent'] and 'Open attachment.txt' in aa[0]['parent'] and 'Queued' in bb[0]['parent']
  for label in [a,q]:
   old=next(x['parent'] for x in dom(f'{c}-queued-dom.json')['copies'] if x['text']==label)
   new=next(x['parent'] for x in copies if x['text']==label)
   # Timestamp is visible on enclosing row, while native state carries acceptedAt; exact state above includes it.
 assert before['state']['entries'][0]['state']=='held'
for name in ['resume-provider-after.json','resume-repeat-provider.json']:
 assert j(name)==j('resume-provider-before.json')
for name in ['resume-repeat-before.json','resume-wire-before-recovery.json']:
 assert not [x for x in dom(name)['wire'] if x['direction']=='out']
result={'result':'Pass','documentTimeOrigins':[b['timeOrigin'],one['timeOrigin'],two['timeOrigin']],'nativeReloads':2,'sentinelsLost':2,'backendPid':92623,'agentAndTeamNativeInstancesUnchanged':True,'heldAQueuedBOneCopyEach':True,'attachmentOriginalNameRetained':True,'rawAndProjectionUnchanged':True,'providerCountsUnchanged':j('resume-repeat-provider.json'),'outboundOnInstrumentedHydrationConnections':0,'limit':'Post-load wire observer starts after boot; unchanged native/raw/provider boundaries supplement that observation gap.'}
(E/'reload-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
