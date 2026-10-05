import hashlib,json,pathlib,shutil,datetime
E=pathlib.Path('tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence')
def read(n): return json.loads((E/n).read_text())
start=read('api-004-start.json'); setup=read('api-004-live-setup.json'); i=read('api-004-instance.json')['result']; restart=read('api-004-restart-after-import.json')['result']
assert i['instanceId']==restart['instanceId']=='iso-62535-1894' and i['dataRoot']==restart['dataRoot'] and i['ownsDataRoot']
root=pathlib.Path(i['dataRoot']).resolve(); assert root.name=='autobyteus-isolated-root-KNLcN9'
source=root/'server-data'/'memory'/'agents'/start['hostRunId'];target=E/'api-004-owned-agent-history';target.mkdir(exist_ok=True)
allowed={'raw_traces_active.jsonl','run_metadata.json','collaboration_tree.json','communication_messages.json'}; archived=[]
for p in source.rglob('*'):
 if not p.is_file():continue
 assert not p.is_symlink() and p.resolve().is_relative_to(source)
 assert p.name in allowed, f'Unapproved archive path: {p}'
 q=target/p.relative_to(source);q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q)
 archived.append({'path':str(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size})
statePath=root/'server-data'/'projects'/'projects.json';state=json.loads(statePath.read_text());assert isinstance(state,list)
(E/'api-004-physical-state-final.json').write_text(json.dumps(state,indent=2)+'\n')
project=next(p for p in state if p.get('projectId')==setup['project']['projectId']);lifetimes=next(p['taskLifetimes'] for p in state if 'taskLifetimes' in p)
packetChecks=[]
for key,task in setup['tasks'].items():
 current=next(t for t in project['tasks'] if t['taskId']==task['taskId']);assert current['status']=='DONE' and current['description']==task['description']
 assert [c['storedFilename'] for c in current['contextFiles']]==[c['storedFilename'] for c in task['contextFiles']]
 life=next(l for l in lifetimes if l['taskId']==task['taskId']);assert life['completedAt'] and all(e['cleanup']=='released' for e in life['executions'])
 for c in current['contextFiles']:
  p=root/'server-data'/'projects'/'task_context_files'/project['projectId']/task['taskId']/c['storedFilename'];assert p.resolve().is_relative_to(root)
  assert p.read_text().strip()==task['marker'];q=E/'api-004-owned-saved-packets'/c['storedFilename'];q.parent.mkdir(exist_ok=True);shutil.copyfile(p,q)
  packetChecks.append({'task':key,'path':str(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size})
sentinels=[]
for role,work in setup['workspaces'].items():
 p=pathlib.Path(work)/'protected-sentinel.txt';assert p.resolve().is_relative_to(root/'validation-workspace')
 assert p.read_text()==f'DO_NOT_DELETE_API004_{role}\n'
 sentinels.append({'role':role,'unchanged':True,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
mutationChecks=[];lastList=None
for n in ['api-004-start.json','api-004-done-a-corrected.json','api-004-done-b.json']:
 for frame in read(n)['ws']:
  m=frame.get('message',{});p=m.get('payload',{});name=p.get('tool_name','')
  if m.get('type')!='TOOL_EXECUTION_SUCCEEDED':continue
  if name.endswith('create_or_update_task'):
   result=p['result'];assert set(result)=={'task'} and set(result['task'])=={'projectId','taskId','status'}
   mutationChecks.append({'evidence':n,'arguments':p['arguments'],'result':result})
  elif name.endswith('list_project_tasks'):lastList=p['result']
assert lastList and {t['taskId'] for t in lastList['tasks']}=={t['taskId'] for t in project['tasks']}
for t in lastList['tasks']:
 assert set(t)=={'projectId','taskId','description','status','contextFiles','assignments'}
 physical=next(x for x in project['tasks'] if x['taskId']==t['taskId']);assert t['description']==physical['description'] and t['status']=='DONE'
 life=next(x for x in lifetimes if x['taskId']==t['taskId']);business=[e for e in life['executions'] if e['purpose']!='helper']
 assert len(t['assignments'])==len(business)
 for a,b in zip(t['assignments'],business):
  assert set(a)=={'root','execution','ingressAgentRunId','dispatchOutcome'}
  assert a['root']==b['root'] and a['execution']==b['execution'] and a['ingressAgentRunId']==b['ingressAgentRunId'] and a['dispatchOutcome']=='accepted'
  if 'teamRunId' in a['execution']:assert a['execution']['teamRunId']!=a['ingressAgentRunId']
rootEvents=[]
for frame in read('api-004-done-b.json')['ws']:
 if '/ws/agent-collaboration/' in frame['url']:
  m=frame['message'];rootEvents.append(m)
summary={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'hostRunId':start['hostRunId'],'archive':archived,'savedPackets':packetChecks,'protectedSentinels':sentinels,'actualBusinessMutationAcknowledgements':mutationChecks,'actualFinalBusinessList':lastList,'capturedDoneBRootSocket':rootEvents,'scope':'Exact test-owned history/state/packet evidence only; no database/vault/root-key/source-env copied. Compact status is not physical release proof; no all-root/provider acceptance.'}
(E/'api-004-preserved-business-and-origin.json').write_text(json.dumps(summary,indent=2)+'\n')
print(f'Owned evidence retained: {len(archived)} history files, {len(packetChecks)} saved packets; four compact mutations and final exact two-assignment business projection verified; three workspace sentinels intact.')
