from pathlib import Path
import json, hashlib, datetime
W=Path.cwd(); T=W/'tickets/in-progress/project-task-manager-linked-delegation'; E=T/'api-e2e-evidence'; C=T/'code-review-evidence'
read=lambda p: json.loads(p.read_text())
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
root='api014_claude_concrete_root_org_rerun_169281f2_8f8b_48f6_a709_41da495ed0f2_05e8277c90044361b6e98d99c8e01d35'
manager='project_task_manager_dabaeb11823148cf83c3718326eb31d0'; team='api014_claude_packet_team_7e12197fa5174475918ba29fbda9586e'
coordinator='api014_claude_team_coordinator_48f3584ea135473d93a5729505cafed4'; reader='api014_claude_team_reader_290ff120d050475081b9b8918de5ad5c'
bid='project_task_16dbaf7c-684a-4a5a-afae-cf6430fed02b'; aid='project_task_7ea591e8-5e18-4c45-a70e-42fd10c04175'
b=E/'api-014-owned-data/server-data/memory/agent_orgs'/root
raw=lambda p:[json.loads(l) for l in p.read_text().splitlines() if l.strip()]
m=raw(b/manager/'raw_traces_active.jsonl'); r=raw(b/team/reader/'raw_traces_active.jsonl')
first=read(E/'api-014-claude-concrete-agent_org.json'); retry=read(E/'api-014-claude-failed-exact-retry.json'); witness=read(E/'api-014-claude-failure-witness.json')
lifetime=lambda state,task:next(l for row in state for l in row.get('taskLifetimes',[]) if l['taskId']==task)
task=lambda state,tid:next(t for row in state for t in row.get('tasks',[]) if t['taskId']==tid)
lives=[lifetime(first['failureState'],bid),retry['beforeLife'],lifetime(retry['atFailureState'],bid),lifetime(witness['state'],bid),lifetime(read(E/'api-014-owned-data/server-data/projects/projects.json'),bid)]
assert all(l==lives[0] for l in lives)
assert lives[0]['completedAt']=='2026-10-04T06:30:33.945Z';assert lives[0]['executions'][0]['cleanup']=='failed'
assert lives[0]['executions'][0]['error']=={'code':'TASK_RELEASE_FAILED','message':'Exact Task execution cleanup failed.'}
assert retry['beforeTree']==retry['atFailureTree']==witness['tree']==read(b/'agent_org_run_execution_tree.json')
assert lifetime(first['currentState'],aid)==lifetime(retry['atFailureState'],aid)==lifetime(witness['state'],aid)
assert task(first['currentState'],aid)==task(witness['state'],aid)
assert task(first['currentState'],bid)['description']==task(witness['state'],bid)['description']
assert task(first['currentState'],bid)['contextFiles']==task(witness['state'],bid)['contextFiles']
calls=[v for v in m if v.get('trace_type')=='tool_call' and v.get('tool_name')=='create_or_update_task' and v.get('tool_args',{}).get('task_id')==bid and v['tool_args'].get('status')=='DONE']
assert len(calls)==2
business=[]
for call in calls:
 turn=[v for v in m if v.get('turn_id')==call['turn_id']]
 actual=[v for v in turn if v.get('trace_type')=='tool_call']
 assert [v['tool_name'] for v in actual]==['create_or_update_task','list_project_tasks']
 ack=next(v for v in turn if v.get('trace_type')=='tool_result' and v.get('tool_call_id')==call['tool_call_id'])
 result=json.loads(ack['tool_result']);assert result=={'task':{'projectId':lives[0]['projectId'],'taskId':bid,'status':'DONE'}}
 replies=[v for v in turn if v.get('trace_type')=='assistant']; assert len(replies)==1
 user=next(v for v in turn if v.get('trace_type')=='user'); assert 'explicitly instruct' in user['content']
 business.append({'callId':call['tool_call_id'],'timestamp':datetime.datetime.fromtimestamp(call['ts'],datetime.timezone.utc).isoformat(),'turnId':call['turn_id'],'tools':[v['tool_name'] for v in actual],'ack':result,'assistantTimestamp':replies[0]['ts'],'nonceMatched':('B_DONE_RECORDED' in replies[0]['content']) if len(business)==0 else retry['nonce'] in replies[0]['content']})
assert all(v['nonceMatched'] for v in business)
statuses=[]
for frame in first['frames']+retry['frames']:
 payload=frame.get('payload',{});ev=payload.get('event',{});msg=ev.get('message',{})
 if msg.get('type')=='AGENT_STATUS' and ev.get('agent_run_id') in [coordinator,reader]:statuses.append({'agentRunId':ev['agent_run_id'],'status':msg.get('payload',{}).get('status')})
assert {'agentRunId':coordinator,'status':'offline'} in statuses
assert {'agentRunId':reader,'status':'offline'} not in statuses
last={v['agentRunId']:v['status'] for v in statuses};assert last[reader]=='running'
assert r[-1]['trace_type']=='tool_result' and r[-1]['tool_name']=='Read' and r[-1]['ts']<calls[0]['ts']
assert not any(v.get('trace_type')=='assistant' for v in r)
assert any(reader in row.get('label','') and ', running,' in row['label'] for row in witness['rows'])
assert any(manager in row.get('label','') and ', idle,' in row['label'] for row in witness['rows'])
count=lambda v: sum((1 if k=='taskLifetime' else 0)+count(x) for k,x in v.items()) if isinstance(v,dict) else sum(count(x) for x in v) if isinstance(v,list) else 0
public=next(row for row in witness['list'] if row['root_run_id']==root);assert public==witness['scoped'];assert count(public)==0
assert count(witness['tree'])>0
assert witness['inspection']['root_org']['execution_tree']==public['org']
a=read(C/'crr-017-input-preservation.json');current=read(C/'crr-018-input-preservation.json')
changed=[p for p,v in a['nonTicketDirty'].items() if v['sha256']!=current['dirty'].get(p,{}).get('sha256')]
sourcechanged=[p for p in changed if '/src/' in p or '/templates/' in p]
assert not sourcechanged
inputs=[E/'api-014-claude-concrete-agent_org.json',E/'api-014-claude-failed-exact-retry.json',E/'api-014-claude-failure-witness.json',b/manager/'raw_traces_active.jsonl',b/team/reader/'raw_traces_active.jsonl',b/'agent_org_run_execution_tree.json',E/'api-014-owned-data/server-data/projects/projects.json']
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Independent read-only archive/frame/trace comparison, no live reproduction or physical-owner attribution','rootId':root,'managerId':manager,'teamId':team,'readerId':reader,'businessTurns':business,'failedLifetimeExactAcrossFiveIndependentCaptures':True,'closedLifetime':lives[0],'wholePrivateTreeExactAcrossRetryAndArchive':True,'AAndBusinessContentProtected':True,'canonicalChildStatusCount':len(statuses),'lastCapturedStatus':last,'readerRawLastEvent':{'ts':r[-1]['ts'],'type':r[-1]['trace_type'],'tool':r[-1]['tool_name']},'readerNoAssistantOrOfflineNotPhysicalLeakProof':True,'publicListScopedEqualAndInspectionTreeEqual':True,'privateStampCount':count(witness['tree']),'publicStampCount':count(public),'sourceChangedSinceCRR017':sourcechanged,'allNonTicketHashDeltasSinceCRR017':changed,'runtimeComponentCause':'UNOBSERVED: aggregate/inner exception and exact child/IO/attachment/component receipts unavailable','inputHashes':{str(p):h(p) for p in inputs}}
(C/'crr-018-independent-evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':'PASS observations independently corroborated; origin still Unclear','rawDONECalls':len(calls),'sourceChanged':sourcechanged,'nonTicketHashDeltas':changed,'privateStamps':count(witness['tree']),'publicStamps':count(public)},indent=2))
