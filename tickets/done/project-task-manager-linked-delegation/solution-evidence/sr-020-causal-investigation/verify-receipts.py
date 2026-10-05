from pathlib import Path
import json,hashlib,datetime
E=Path(__file__).parent
load=lambda f:json.loads((E/f).read_text());a=load('sr-020-claude-concrete-agent_org.json');r=load('sr-020-claude-failed-exact-retry.json');w=load('final-witness.json');ev=[json.loads(x) for x in (E/'owner-debugger.jsonl').read_text().splitlines()]
by=lambda k:[x for x in ev if x['event']==k]
root=by('root-begin');assert len(root)==2;assert root[0]['value']==root[1]['value'];proof=by('root-proofs');assert len(proof)==2
for x in proof:
 assert len(x['value']['proofs'])==2
 for p in x['value']['proofs']:
  assert p['status']=='rejected'
  def messages(e):
   return [e['message']]+[m for c in e.get('errors') or [] for m in messages(c)]
  assert 'AgentRun termination cannot settle while submitted input remains unresolved.' in messages(p['error'])
reader=next(x['value']['runId'] for x in by('agent-manager') if x['value']['errors']);bad=[x for x in by('agent-manager') if x['value']['runId']==reader];assert len({x['value']['generation'] for x in bad})==1
assert all(not x['value']['attachments'] and x['value']['activePublished'] for x in bad)
backend=[x for x in by('agent-backend') if x['value']['runId']==reader];assert len(backend)==2
for x in backend:
 v=x['value'];assert v['result']=={'accepted':True};assert not v['activeDispatch'] and not v['uncertainDispatch'];assert len(v['input']['entries'])==1;entry=v['input']['entries'][0];assert entry['state']=='forwarded' and entry['pendingTerminal'] is None
for x in by('session-components'):
 assert all(z['status']=='fulfilled' for z in x['value']['results'])
for x in by('sdk-children'):
 assert all(z['status']=='fulfilled' for z in x['value']['results'])
 for z in x['value']['receipts']:assert all(z[k] for k in ['physicalExit','nodeClosed','stderrClosed','sdkExitDelivered','releaseProof']);assert z['streams'] is None
assert len(by('sdk-children'))==2 and len(by('session-components'))==2 # first only; successful concrete receipts not repeated
f=a['closedState'];before=r['beforeState'];after=r['atFailureState'];proj=lambda x:next(p for p in x if p.get('projectId')==a['project']['projectId']);B=lambda x:next(l for l in [l for p in x for l in p.get('taskLifetimes',[])] if l['taskId']==a['tasks']['B']['taskId'])
assert B(f)==B(before)==B(after)==B(w['projects']);assert B(after)['completedAt'];assert B(after)['executions'][0]['cleanup']=='failed';assert r['beforeTree']==r['atFailureTree']==w['privateTree']
A=next(l for l in [l for p in after for l in p.get('taskLifetimes',[])] if l['taskId']==a['tasks']['A']['taskId']);assert A['completedAt'] is None and A['executions'][0]['cleanup']=='not_requested'
for role in ['A','B']:
 t=next(t for t in proj(after)['tasks'] if t['taskId']==a['tasks'][role]['taskId']);assert t['description']==a['tasks'][role]['description'];assert [c['storedFilename'] for c in t['contextFiles']]==[c['storedFilename'] for c in a['tasks'][role]['contextFiles']]
 for ctx in t['contextFiles']:assert (E/'owned-context'/t['taskId']/ctx['storedFilename']).read_text()==a['tasks'][role]['marker']+'\n'
parse=lambda p:[json.loads(x) for x in p.read_text().splitlines()]
manager=parse(E/'owned-history'/a['managerRunId']/'raw_traces_active.jsonl');calls=[x for x in manager if x['trace_type']=='tool_call' and x.get('tool_name')=='create_or_update_task' and x['tool_args'].get('task_id')==a['tasks']['B']['taskId'] and x['tool_args'].get('status')=='DONE'];assert len(calls)==2
turns=[]
for c in calls:
 turn=[x for x in manager if x.get('turn_id')==c['turn_id']];mut=[x for x in turn if x['trace_type']=='tool_call' and x.get('tool_name')=='create_or_update_task'];assert len(mut)==1;ack=next(x for x in turn if x['trace_type']=='tool_result' and x['tool_call_id']==c['tool_call_id']);value=ack['tool_result'];value=json.loads(value) if isinstance(value,str) else value;assert value=={'task':{'projectId':a['project']['projectId'],'taskId':a['tasks']['B']['taskId'],'status':'DONE'}};assert any(x['trace_type']=='tool_call' and x.get('tool_name')=='list_project_tasks' for x in turn);assert any(x['trace_type']=='assistant' for x in turn);turns.append({'callAt':c['ts'],'turnId':c['turn_id'],'ack':value,'assistantAt':[x['ts'] for x in turn if x['trace_type']=='assistant']})
borrowed=parse(next((E/'owned-history').rglob(a['borrowedId']+'/raw_traces_active.jsonl')));assert borrowed==a['borrowedTrace']
readerTrace=parse(next((E/'owned-history').rglob(reader+'/raw_traces_active.jsonl')));assert any(x['trace_type']=='tool_result' and x.get('tool_name') in ['Read','Bash','read_file'] and a['tasks']['B']['marker'] in json.dumps(x) for x in readerTrace)
assert not any(x['trace_type']=='assistant' for x in readerTrace)
statuses=w['inspection']['root_org']['agent_statuses'];selected=[s for s in statuses if s['agent_run_id'] in [reader,a['managerRunId']]];readerPresentation=next(s for s in selected if s['agent_run_id']==reader)['status'];assert readerPresentation=='offline';assert next(s for s in selected if s['agent_run_id']==a['managerRunId'])['status']=='idle';assert w['inspection']['root_org']['is_active']
assert not any(x.get('evaluationException') for x in ev);assert not by('capture-error') and not by('resume-error')
# Independent original raw trace reparse; original inner receipt remains unavailable.
T=E.parents[1];O=T/'api-e2e-evidence/api-014-owned-data/server-data/memory/agent_orgs/api014_claude_concrete_root_org_rerun_169281f2_8f8b_48f6_a709_41da495ed0f2_05e8277c90044361b6e98d99c8e01d35';om=parse(O/'project_task_manager_dabaeb11823148cf83c3718326eb31d0/raw_traces_active.jsonl');oc=[x for x in om if x['trace_type']=='tool_call' and x.get('tool_name')=='create_or_update_task' and x['tool_args'].get('task_id')=='project_task_16dbaf7c-684a-4a5a-afae-cf6430fed02b' and x['tool_args'].get('status')=='DONE'];assert len(oc)==2
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':a['instanceId'],'rootId':a['rootId'],'managerId':a['managerRunId'],'readerId':reader,'lifetime':B(after),'businessTurns':turns,'originalTwoDONECalls':[x['ts'] for x in oc],'firstAndRetryRootReferenceIdentical':True,'rejectedRootBranchesPerAttempt':2,'exactReaderGeneration':bad[0]['value']['generation'],'firstAndRetryBackendAcceptedWithForwardedInput':True,'attachmentErrors':[],'SDKChildAndIOReceiptFirstOnly': [x['value'] for x in by('sdk-children')],'wholePrivateTreeAndClosedLifetimeExactAfterRetry':True,'AContextBorrowedProtected':True,'currentStatus':selected,'activeRoot':True,'readEvaluationsWithoutErrors':True,'pauseMaxMs':max(x.get('pauseMs',0) for x in ev),'pauseTotalMs':sum(x.get('pauseMs',0) for x in ev),'scope':'New exact supported reproduction receipts; not original inner exception/repair or all-background-PID certificate'}
(E/'receipt-assessment.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:out[k] for k in ['instanceId','readerId','exactReaderGeneration','businessTurns','pauseMaxMs','pauseTotalMs']}))
