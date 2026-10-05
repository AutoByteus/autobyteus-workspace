# Own allowlisted data and actual observation only; no DB/vault/key/env/process argument archive.
import pathlib,json,hashlib,shutil,subprocess,datetime
E=pathlib.Path('tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence');T=E.parent
def read(n):return json.loads((E/n).read_text())
i=read('api-006-restart-after-poweroff.json')['result'];root=pathlib.Path(i['dataRoot']).resolve();assert i['instanceId']=='iso-51765-db16' and root.name=='autobyteus-isolated-root-FGGMBI'
state=json.loads((root/'server-data/projects/projects.json').read_text());(E/'api-006-physical-project-array-final.json').write_text(json.dumps(state,indent=2)+'\n');lifetimes=next(x['taskLifetimes'] for x in state if 'taskLifetimes' in x)
allowed={'raw_traces_active.jsonl','run_metadata.json','agent_org_run_execution_tree.json','agent_org_communication_messages.json'};archives=[];cases=[]
for prefix in ['api-006','api-006r2','api-006r3','api-006r4']:
 v=read(prefix+'-physical-recursive.json');d=root/'server-data/memory/agent_orgs'/v['rootId'];life=next(l for l in lifetimes if l['lifetimeId']==v['lifeA']['lifetimeId']);b=next(l for l in lifetimes if l['lifetimeId']==v['lifeB']['lifetimeId']);project=next(p for p in state if p.get('projectId')==v['project']['projectId']);checks=[]
 for p in d.rglob('*'):
  if p.is_file() and p.name in allowed:
   assert not p.is_symlink() and p.resolve().is_relative_to(root);q=E/'api-006-owned-history/agent_orgs'/p.relative_to(d.parent);q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q);archives.append({'sourceRelative':str(p.relative_to(root)),'archive':str(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size})
 for k,t in v['tasks'].items():
  current=next(t1 for t1 in project['tasks'] if t1['taskId']==t['taskId']);assert current['description']==t['description'];assert [c['storedFilename'] for c in current['contextFiles']]==[c['storedFilename'] for c in t['contextFiles']]
  for c in current['contextFiles']:
   p=root/'server-data/projects/task_context_files'/project['projectId']/t['taskId']/c['storedFilename'];assert p.read_text()==t['marker']+'\n';q=E/'api-006-owned-saved-packets'/project['projectId']/t['taskId']/p.name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q);checks.append({'task':k,'archive':str(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'unchanged':True});archives.append({'sourceRelative':str(p.relative_to(root)),'archive':str(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size})
 for w in [v['w1'],v['w2']]:assert pathlib.Path(w).resolve().is_relative_to(root);assert (pathlib.Path(w)/'protected-sentinel.txt').read_text().startswith('API006')
 managerRows=[json.loads(l) for l in (d/v['managerRunId']/'raw_traces_active.jsonl').read_text().splitlines() if l];doneCalls=[]
 for call in managerRows:
  if call['trace_type']!='tool_call' or call.get('tool_name')!='create_or_update_task':continue
  result=next((x for x in managerRows if x['trace_type']=='tool_result' and x.get('tool_call_id')==call['tool_call_id']),None)
  if result and result.get('tool_result',{}).get('task',{}).get('status')=='DONE':assert set(result['tool_result'])=={'task'} and set(result['tool_result']['task'])=={'projectId','taskId','status'};doneCalls.append({'turnId':call['turn_id'],'toolCallId':call['tool_call_id'],'result':result['tool_result'],'createdAt':result.get('created_at')})
 terminals=[f for f in v['frames'] if f.get('type')=='ROOT_EXECUTION_EVENT' and f['payload'].get('event',{}).get('agent_run_id') in v['ownedIds'] and f['payload']['event'].get('message',{}).get('type')=='AGENT_STATUS' and f['payload']['event']['message']['payload'].get('status')=='offline']
 debug=[json.loads(l) for l in (E/(prefix+'-owner-debugger.jsonl')).read_text().splitlines()];bad=[x for x in debug if x.get('evaluationException')];captures=[x for x in debug if x['event'] not in ['breakpoint','resumed','owner-verified','detached']]
 assert life['completedAt'];assert b['completedAt'] is None and all(x['cleanup']=='not_requested' for x in b['executions']);assert all(e['root']['rootRunId']==v['rootId'] for e in life['executions'])
 cases.append({'evidence':prefix+'-physical-recursive.json','result':v.get('result'),'error':v.get('error'),'rootId':v['rootId'],'managerRunId':v['managerRunId'],'projectId':project['projectId'],'taskA':v['tasks']['A']['taskId'],'taskB':v['tasks']['B']['taskId'],'lifetimeA':life,'lifetimeB':b,'ownedFive':v['ownedIds'],'actualReadPaths':v['reads'],'firstDoneCalls':doneCalls,'genuineTerminalEvents':terminals,'exclusiveW2Provider':v['provider'],'exactCapturedDescendants':v['exactDescendants'],'remainingExactAtTaskClose':v['remainingExact'],'protectedW1ProvidersAtTaskClose':v['protectedProviders'],'filesProtected':checks,'activeRootAtTaskClose':v['closedInspection']['root_org']['is_active'],'sourceScope':'Original saved-ID COPY/Leaf/helper/five reads/DONE assertions unchanged; new namespace; no stopped generation replay.','debuggerCaptures':captures,'debuggerReadFailures':bad,'pauseCount':len([x for x in debug if x['event']=='resumed']),'pauseTotalMs':sum(x['pauseDurationMs'] for x in debug if x['event']=='resumed'),'pauseMaxMs':max([x['pauseDurationMs'] for x in debug if x['event']=='resumed'] or [0])})
(E/'api-006-owned-evidence-manifest.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archives':archives,'scope':'Own allowlisted history/packet only; no DB/vault/key/env'},indent=2)+'\n')
(E/'api-006-bounded-causal-attempts.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'cases':cases,'limits':'Fresh supported execution witnesses; do not infer original inner exception from successful stops or a pre-queue unsettled input snapshot. First3 success do not repair original FAPI007. Poweroff between1 and2 disclosed.'},indent=2)+'\n')
rows=[]
for l in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
 a=l.strip().split(None,2)
 if len(a)==3:rows.append({'pid':int(a[0]),'ppid':int(a[1]),'comm':a[2]})
ids={i['pid']}
for _ in rows:
 for r in rows:
  if r['ppid'] in ids:ids.add(r['pid'])
own=[r for r in rows if r['pid'] in ids];(E/'api-006-owned-processes-before-stop.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'processes':own,'scope':'Current exact own ancestry PIDs/names only; no args/env, no foreign signal'},indent=2)+'\n')
print('Archived',len(archives),'files; exact',len(cases),'case receipts;',len(own),'own ancestry PIDs captured')
