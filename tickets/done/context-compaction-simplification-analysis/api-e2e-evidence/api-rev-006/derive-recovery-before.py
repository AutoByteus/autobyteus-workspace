import pathlib,json,hashlib,re
e=pathlib.Path(__file__).parent
wire=[json.loads(s) for s in (e/'loopback-wire.jsonl').read_text().splitlines()]
req=[d for d in wire if d['event']=='request']
parents=[d for d in req if d['kind']=='parent']; comps=[d for d in req if d['kind']=='compaction']
last=lambda d: [m['content'] for m in d['body']['messages'] if m['role']=='user'][-1]
assert [d['id'] for d in parents]==[1,2,3,4,5,16,17,18]
assert all(x in last(parents[5]) for x in ['API6-A preserve','API6-ATTACHMENT','HX-204','context.txt'])
assert last(parents[6]).startswith('API6-B ');assert last(parents[7]).startswith('API6-C ')
assert len(comps)==10
assert len({d['body']['messages'][1]['content'] for d in comps})==1
assert all(d['body']['messages'][0]['content']==(e/'../../proposed-compaction-prompt.md').resolve().read_text() for d in comps)
assert all(d['body']['max_tokens']==8192 for d in comps)
raw=[json.loads(x) for p in (e/'recovered-files').glob('raw_traces*.jsonl') for x in p.read_text().splitlines()]
for name in ['API6-A preserve','API6-B queued','API6-C retry']:
 assert sum(d['trace_type']=='user' and name in str(d['content']) for d in raw)==1
snapshot=json.loads((e/'recovered-files/working_context_snapshot.json').read_text())
assert set(snapshot)=={'agent_id','messages'}
assert sum('## Goal and constraints' in str(m.get('content','')) for m in snapshot['messages'])==1
checks={'result':'Pass scoped recovery','parents':8,'compactor_attempts':10,'groups':[3,3,3,1],'remote':0,'parent_dispatch_ids':[d['id'] for d in parents],'one_raw_user_each':['A','B','C'],'attachment_in_A_parent':True,'unchanged_prepared_content_sha256':hashlib.sha256(comps[0]['body']['messages'][1]['content'].encode()).hexdigest(),'snapshot_keys':list(snapshot),'summary_count':1,'limits':'Scripted dependency; not fidelity, physical drag gesture, all hooks or process-crash proof.'}
(e/'recovery-assertions.json').write_text(json.dumps(checks,indent=2)+'\n')
print(checks)
