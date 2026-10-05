# Temporary exact-owned causal/protection/archive receipt. No application writes or secrets.
from pathlib import Path
import json, hashlib, datetime, shutil, subprocess
E=Path('tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence')
read=lambda n:json.loads((E/n).read_text())
i=read('api-008-lifecycle-restart.json')['result'];root=Path(i['dataRoot']).resolve()
assert i['instanceId']=='iso-55024-a24c' and i['ownsDataRoot'] and root.name=='autobyteus-isolated-root-7tRVK1'
c=read('api-008-round8-concrete-agent_team.json');r=read('api-008-exact-failed-retry.json');d=read('api-008-causal-failed-retry.json');setup=read('api-008-round8-live-setup.json');start=read('api-008-round8-start.json')
assert all(v['instanceId']==i['instanceId'] for v in [c,r,d,setup,start])
state=json.loads((root/'server-data/projects/projects.json').read_text());ls=[l for p in state for l in p.get('taskLifetimes',[])]
find=lambda s:[l for p in s for l in p.get('taskLifetimes',[]) if l['lifetimeId']==d['lifetimeId']][0]
lf=find(state); assert lf['completedAt']=='2026-10-03T16:00:36.636Z' and lf['executions'][0]['cleanup']=='failed'
assert d['finalLife']==r['finalLife']==lf
assert d['beforeTree']==d['finalTree']==r['finalTree']==c['reopenedTree']
assert [l for l in ls if l['lifetimeId']!=lf['lifetimeId']]==[l for p in d['beforeState'] for l in p.get('taskLifetimes',[]) if l['lifetimeId']!=lf['lifetimeId']]
for v in [r,d]:
 assert len(v['calls'])==1 and v['ack']['tool_result']=={'task':{'projectId':c['project']['projectId'],'taskId':c['tasks']['B']['taskId'],'status':'DONE'}}
 assert v['beforeLife']['completedAt']==lf['completedAt']
 assert any(x['trace_type']=='assistant' and x.get('source_event')=='SEGMENT_END' and v['nonce'] in x['content'] for x in v['retryTurn'])
mem=root/'server-data/memory';team=mem/'agent_teams'/c['rootId'];borrowed=[json.loads(x) for x in (team/c['borrowedId']/'raw_traces_active.jsonl').read_text().splitlines() if x]
assert borrowed==c['borrowedTrace']
allowed={'raw_traces_active.jsonl','run_metadata.json','collaboration_tree.json','communication_messages.json','team_run_execution_tree.json','team_communication_messages.json'}
files=[]
def copy(p,q):
 assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root)
 q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q);files.append({'sourceRelative':str(p.relative_to(root)),'path':str(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size})
for directory in [mem/'agents'/start['hostRunId'],team]:
 for p in directory.rglob('*'):
  if p.is_file() and p.name in allowed:copy(p,E/'api-008-owned-history'/p.relative_to(mem))
protected=[]
for original in [setup,c]:
 p=next(p for p in state if p.get('projectId')==original['project']['projectId'])
 for k,t in original['tasks'].items():
  actual=next(x for x in p['tasks'] if x['taskId']==t['taskId']);assert actual['description']==t['description'] and actual['contextFiles']==next(z for q in d['beforeState'] if q.get('projectId')==p['projectId'] for z in q['tasks'] if z['taskId']==t['taskId'])['contextFiles'] and [(z['storedFilename'],z['displayName']) for z in actual['contextFiles']]==[(z['storedFilename'],z['displayName']) for z in t['contextFiles']];assert actual['status']==('IN_PROGRESS' if k=='A' else 'DONE')
  for f in t['contextFiles']:
   packet=root/'server-data/projects/task_context_files'/p['projectId']/t['taskId']/f['storedFilename'];assert packet.read_text()==t['marker']+'\n';copy(packet,E/'api-008-owned-saved-packets'/p['projectId']/t['taskId']/packet.name)
  protected.append({'project':p['projectId'],'task':t['taskId'],'descriptionAndContextUnchanged':True,'status':actual['status']})
for role,w in setup['workspaces'].items():assert (Path(w)/'protected-sentinel.txt').read_text()=='DO_NOT_DELETE_API008_'+role+'\n'
assert (Path(c['workspace'])/'protected-sentinel.txt').read_text()=='API008_PROTECT_agent_team\n'
(E/'api-008-owned-project-array.json').write_text(json.dumps(state,indent=2)+'\n')
(E/'api-008-owned-evidence-manifest.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'count':len(files),'allowlist':sorted(allowed),'interim':False,'scope':'Own two roots and four saved packets only; no DB/vault/key/env/args archive'},indent=2)+'\n')
events=[json.loads(x) for x in (E/'api-008-owner-debugger.jsonl').read_text().splitlines()];by=lambda e:[x for x in events if x['event']==e]
rootBegin=by('root-begin');assert len(rootBegin)==1 and rootBegin[0]['value']['lifetimeId']==lf['lifetimeId']
proof=by('root-proof-settled');assert len(proof)==1 and proof[0]['value']['execution']==lf['executions'][0]['execution'];assert all(x['status']=='rejected' for x in proof[0]['value']['proofs'])
caller=[x for x in by('error-caller-facts') if x['trigger']=='input-unresolved-assertion'][0];facts=caller['value'];assert facts['runId']==c['newIds'][1] and facts['input']['entries'][0]['state']=='forwarded'
components=by('agent-manager-components');assert components and all(x['value']['attachments']['errors']==[] for x in components)
pauses=by('resumed');assert by('detached') and not [x for x in events if x.get('evaluationException') or x['event'] in ['capture-error','resume-error']]
firstCalls=[x for x in c['newDoneTurn'] if x['trace_type']=='tool_call' and x.get('tool_name')=='create_or_update_task'];assert len(firstCalls)==1
firstAck=next(x for x in c['newDoneTurn'] if x['trace_type']=='tool_result' and x.get('tool_call_id')==firstCalls[0]['tool_call_id'])
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'finding':'FAPI-008 actual reopened Team-root assignment reader input-settlement rejection; original FAPI-007 relationship UNESTABLISHED','root':c['rootId'],'manager':c['managerRunId'],'project':c['project']['projectId'],'task':c['tasks']['B']['taskId'],'lifetime':lf,'firstDone':{'call':firstCalls[0],'ack':firstAck,'evidence':'api-008-round8-concrete-agent_team.json','cleanup':'failed','nestedCause':'unobserved'},'ordinaryExactRetry':{'nonce':r['nonce'],'call':r['calls'][0],'ack':r['ack'],'evidence':'api-008-exact-failed-retry.json','cleanup':'failed','nestedCause':'unobserved'},'diagnosticExactRetry':{'nonce':d['nonce'],'call':d['calls'][0],'ack':d['ack'],'evidence':'api-008-causal-failed-retry.json','cleanup':'failed'},'rootBegin':rootBegin[0],'rootRequests':by('root-proof-request'),'actualNestedRootRejections':proof,'memberFacts':facts,'agentComponentReceipts':components,'teamMemberSettlements':by('team-proof-settled'),'sameAuthorityLifetimeCompletionReservationIngressDispatchTree':True,'noNewCopySeedOrLifetime':True,'protectedOtherLifetimes':True,'protectedBorrowedTraceExactUnchanged':True,'protectedBusinessAndBytes':protected,'protectedWorkspaceSentinels':4,'backendReceipt':'Reader actual accepted/negative/thrown backend return UNOBSERVED: lexical result scoped out at queued assertion; do not infer accepted from source/offline/exact thread release. Coordinator fulfilled accepted member-release is not a physical backend certificate.','physicalOwnerFacts':'Exact reader thread absent from thread/preparation maps and in released set, no active provider turn, closed scope pending0; shared workspace client holders2/notclosing. These are separate actual observations, not whole provider PID exit or five-member proof.','registryFinalization':'Reader activePublished=true/retired=false; no successful removal/finalization receipt; Team lifecycle terminating and diagnostic failed.','observer':{'paused':len(pauses),'totalPauseMs':sum(x['pauseDurationMs'] for x in pauses),'maxPauseMs':max(x['pauseDurationMs'] for x in pauses),'readErrors':0,'detached':by('detached')[-1]['at'],'limit':'Read-only root/member/error capture only on third diagnostic retry; pauses/deoptimization not uninstrumented timing certificate. First two failures had no observer.'},'classification':'Observed input-settlement runtime failure. Local Fix vs demonstrated Design Impact requires focused reviewer; not API setup fault/human blame/source fix. No error/input/history discarded.'}
(E/'api-008-fapi-008-witness.json').write_text(json.dumps(out,indent=2)+'\n')
# Exact own ancestry capture only, plus already documented own PID receipts.
previous=read('api-008-owned-processes-before-cleanup.json');rows=[]
for line in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
 a=line.strip().split(None,2)
 if len(a)==3:rows.append({'pid':int(a[0]),'ppid':int(a[1]),'comm':a[2]})
ids={i['pid']}
for _ in rows:
 for p in rows:
  if p['ppid'] in ids:ids.add(p['pid'])
own=[p for p in rows if p['pid'] in ids];union={x['pid']:x for x in previous['allCaptured']}
for p in own:union[p['pid']]={**p,'scope':'Current exact own ancestry'}
(E/'api-008-owned-processes-before-stop.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'current':own,'allCaptured':list(union.values()),'scope':'Union of prior allowlisted exact-own-ID receipts and current own main ancestry only; no foreign signal, args or env'},indent=2)+'\n')
print(json.dumps({'archives':len(files),'ownCurrentPids':len(own),'allCapturedOwnPids':len(union),'causalMember':facts['runId'],'generation':facts['runInstanceId'],'pauses':len(pauses),'pauseTotalMs':sum(x['pauseDurationMs'] for x in pauses),'protectedSentinels':4,'sameFailedAuthority':True}))
