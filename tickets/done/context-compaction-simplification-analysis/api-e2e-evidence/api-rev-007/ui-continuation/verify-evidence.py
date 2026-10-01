import pathlib,json,re,collections,hashlib
u=pathlib.Path(__file__).parent;t=u.parents[2]
check=[]
def ok(value,label):
 assert value,label
 check.append(label)
events=[json.loads(x) for x in (u/'loopback-wire.jsonl').read_text().splitlines()]
req=[x for x in events if x['event']=='request']
ok([x['id'] for x in req]==list(range(1,36)),'35 unique cumulative request IDs across process replacement')
ok(sum(x['kind']=='parent' for x in req)==13,'13 parent calls')
ok(sum(x['kind']=='compaction' for x in req)==22,'22 compaction calls')
prompt=(t/'proposed-compaction-prompt.md').read_text()
for x in req:
 if x['kind']=='compaction':
  b=x['body']
  ok(len(b['messages'])==2 and b['messages'][0]['content']==prompt and not b.get('tools') and not b.get('stream'),'exact prompt/tool-free nonstream compactor '+str(x['id']))
last=lambda x:[m for m in x['body']['messages'] if m['role']=='user'][-1]['content']
capture=json.loads((u/'tool-network-complete.json').read_text())['result']['result']
ws=[json.loads(x['data']) for x in capture['observer']['events'] if x.get('kind')=='ws_message']
def flatten(m):
 return m['payload']['event']['message'] if m['type']=='ROOT_EXECUTION_EVENT' and m['payload']['event']['kind']=='agent_presentation' else m
ws=[flatten(x) for x in ws]
for scenario,count in [('TEAM',5),('ORG',4),('TOOL',3)]:
 raw=[]
 for f in (u/'final-memory').rglob('raw_traces*.jsonl'):
  rows=[json.loads(x) for x in f.read_text().splitlines()]
  if any('API7-'+scenario+'-' in str(x.get('content')) for x in rows):raw.extend(rows)
 # All shards of same selected member included by marker; final-memory contains no duplicate copies.
 users=[x for x in raw if x['trace_type']=='user']
 ok(len(users)==count and len({x['id'] for x in users})==count,scenario+' raw unique admissions')
 targeted=[x for x in req if x['kind']=='parent' and str(last(x)).startswith('API7-'+scenario+'-')]
 tags=[re.search('API7-[A-Z0-9_-]+',last(x))[0] for x in targeted]
 exp=['API7-TEAM-SEED1','API7-TEAM-SEED2','API7-TEAM-A','API7-TEAM-B','API7-TEAM-C'] if scenario=='TEAM' else ['API7-ORG-SEED1','API7-ORG-SEED2','API7-ORG-A','API7-ORG-B'] if scenario=='ORG' else ['API7-TOOL-READ','API7-TOOL-READ','API7-TOOL-A','API7-TOOL-B']
 ok(tags==exp,scenario+' parent order')
 final=json.loads((u/(scenario.lower()+'-recovered.json')).read_text())['result']['result']['body']
 ok(all(final.count('ACK API7-'+scenario+'-'+s)==1 for s in ('ABC' if scenario=='TEAM' else 'AB')),scenario+' UI ACK once')
 ok('Held —' not in final and '\nQueued\n' not in final,scenario+' UI queue cleared')
 states=[m['payload'] for m in ws if m['type']=='AGENT_INPUT_STATE' and any(str(x['content']).startswith('API7-'+scenario+'-A') for x in m['payload']['entries'])]
 held=[s for s in states if any(e['state']=='held' and str(e['content']).startswith('API7-'+scenario+'-A') for e in s['entries'])]
 recovering=[s for s in states if (s.get('recoverableBlock') or {}).get('state')=='recovering' and s['revision']>held[0]['revision']]
 ok(bool(held) and bool(recovering),scenario+' actual held/recovering DTO')
 firstA=next(x for x in held[0]['entries'] if x['content'].startswith('API7-'+scenario+'-A'))
 ok(all(any(x['message_id']==firstA['message_id'] and x['turn_id']==firstA['turn_id'] for x in s['entries']) for s in recovering),scenario+' held A identity retained across retries')
snaps=list((u/'final-memory').rglob('working_context_snapshot.json'))
ok(len(snaps)==3,'3 actual current snapshots')
for f in snaps:
 d=json.loads(f.read_text());summaries=[m['content'] for m in d['messages'] if isinstance(m.get('content'),str) and m['content'].startswith('## Goal and constraints')]
 ok(set(d)=={'agent_id','messages'} and len(summaries)==1,'current snapshot one summary '+f.parent.name)
 ok(any(m.get('content')==summaries[0] for x in req if x['kind']=='parent' for m in x['body']['messages']),'installed summary reaches actual parent '+f.parent.name)
ok(json.loads((u/'tool-assertions.json').read_text())['actual_tool_executions']==1,'actual consumed tool not replayed')
ok(all(json.loads((u/'cleanup.json').read_text())['portsReleased'].values()),'owned ports released')
out={'result':'Pass','checks':check,'count':len(check),'remote':0,'accepted':35,'parent':13,'compaction':22,'limits':'40 requests/original60min/120sheld','localExecutionError':'Team B hold timeout preserved; subsequent C releases A/B/C','limitsOfProof':'synthetic external generation, 2memberTeam/3agentOrg one active, not native OS gesture or sevenmember UI'}
(u/'evidence-assertions.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
