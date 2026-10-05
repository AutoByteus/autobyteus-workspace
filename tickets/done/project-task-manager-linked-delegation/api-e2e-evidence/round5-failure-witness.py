from pathlib import Path
import json,hashlib,os,subprocess,datetime,shutil
E=Path('tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence')
def read(n):return json.loads((E/n).read_text())
i=read('api-005-restart-after-import.json')['result'];p=read('api-005-physical-recursive.json');r=read('api-005-failed-helper-retry.json');root=Path(i['dataRoot']).resolve()
assert i['instanceId']=='iso-65323-9445' and root.name=='autobyteus-isolated-root-PtD6ip' and i['ownsDataRoot']
state=json.loads((root/'server-data/projects/projects.json').read_text())
def life(a,id):return next(l for x in a if 'taskLifetimes' in x for l in x['taskLifetimes'] if l['lifetimeId']==id)
before=r['beforeLife'];after=life(state,before['lifetimeId']);assert before==after
assert [x['cleanup'] for x in after['executions']]==['released','released','failed']
assert after['executions'][-1]['error']=={'code':'TASK_RELEASE_FAILED','message':'Exact Task execution cleanup failed.'}
b=life(state,p['lifeB']['lifetimeId']);assert b['completedAt'] is None and b['executions'][0]['cleanup']=='not_requested'
memory=root/'server-data/memory/agent_orgs'/p['rootId'];tree=json.loads((memory/'agent_org_run_execution_tree.json').read_text());assert tree==r['beforeTree']
raw=[json.loads(x) for x in (memory/p['managerRunId']/'raw_traces_active.jsonl').read_text().splitlines() if x]
u=next(x for x in raw if x.get('trace_type')=='user' and r['nonce'] in x.get('content',''));turn=[x for x in raw if x.get('turn_id')==u['turn_id']]
calls=[x for x in turn if x.get('trace_type')=='tool_call' and x.get('tool_name')=='create_or_update_task'];assert len(calls)==1
ack=next(x for x in turn if x.get('trace_type')=='tool_result' and x.get('tool_call_id')==calls[0]['tool_call_id']);assert ack['tool_result']=={'task':{'projectId':p['project']['projectId'],'taskId':p['tasks']['A']['taskId'],'status':'DONE'}}
final=next(x for x in turn if x.get('trace_type')=='assistant' and x.get('source_event')=='SEGMENT_END' and r['nonce'] in x.get('content',''))
listing=next(x['tool_result'] for x in turn if x.get('tool_name')=='list_project_tasks' and x.get('trace_type')=='tool_result')
assert len(listing['tasks'])==2 and [len(t['assignments']) for t in listing['tasks']]==[2,1]
assert all(set(t)=={'projectId','taskId','description','status','contextFiles','assignments'} for t in listing['tasks'])
assert all(set(a)=={'root','execution','ingressAgentRunId','dispatchOutcome'} for t in listing['tasks'] for a in t['assignments'])
# Query only process IDs/parent IDs/command names, not arguments/environment; retain own ancestry only.
rows=[]
for line in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
 s=line.strip().split(None,2)
 if len(s)==3:rows.append({'pid':int(s[0]),'ppid':int(s[1]),'comm':s[2]})
ids={i['pid']}
for _ in rows:
 for x in rows:
  if x['ppid'] in ids:ids.add(x['pid'])
own=[x for x in rows if x['pid'] in ids]
for x in own:
 if x['comm']=='codex' or x['comm'].endswith('/codex'):
  try:x['cwd']=next(l[1:] for l in subprocess.check_output(['lsof','-a','-p',str(x['pid']),'-d','cwd','-Fn'],text=True).splitlines() if l.startswith('n'))
  except (StopIteration,subprocess.CalledProcessError):x['cwd']=None
live={x['pid'] for x in rows};remaining=[x for x in p['exactDescendants'] if x['pid'] in live];assert not remaining
assert all(x['pid'] in live for x in p['protectedProviders'])
assert not any(x.get('cwd')==p['w2'] for x in own)
inspection=read('api-005-physical-retry-current-inspection.json')['data']['getAgentOrgRunInspection'];assert inspection['root_org']['is_active']
status=inspection['root_org']['agent_statuses'];assert next(x for x in status if x['agent_run_id']==p['managerRunId'])['status']=='idle'
checks=[]
project=next(x for x in state if x.get('projectId')==p['project']['projectId'])
for k,t in p['tasks'].items():
 current=next(x for x in project['tasks'] if x['taskId']==t['taskId']);assert current['description']==t['description']
 packet=root/'server-data/projects/task_context_files'/project['projectId']/t['taskId']/current['contextFiles'][0]['storedFilename'];assert packet.read_text()==t['marker']+'\n'
 checks.append({'task':k,'descriptionUnchanged':True,'packetSha256':hashlib.sha256(packet.read_bytes()).hexdigest(),'status':current['status']})
for workspace in [p['w1'],p['w2']]:assert (Path(workspace)/'protected-sentinel.txt').read_text()=='API005_PHYSICAL_PROTECT\n'
def terminals(frames):return [{'sequence':x['payload'].get('change_sequence'),'agentRunId':x['payload']['event']['agent_run_id']} for x in frames if x.get('type')=='ROOT_EXECUTION_EVENT' and x['payload'].get('event',{}).get('message',{}).get('type')=='AGENT_STATUS' and x['payload']['event']['message']['payload'].get('status')=='offline']
summary={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'rootRunId':p['rootId'],'managerRunId':p['managerRunId'],'failingCase':'API-010 / FAPI-007','classification':'Unclear — actual helper-Team cleanup failure cause and exact retry ownership need focused review','beforeLife':before,'afterLife':after,'sameClosedLifetimeAndAllExactAuthorityFields':True,'sameDurableTree':True,'protectedOtherTaskLife':b,'actualRetryTurn':turn,'actualCompactAck':ack['tool_result'],'actualBusinessFinal':final['content'],'helperAbsentFromBusinessAssignments':True,'ownedWorkerIds':p['ownedIds'],'firstCapturedOfflineEvents':terminals(p['frames']),'retryCapturedOfflineEvents':terminals(r['frames']),'publicStatusBeforeRetry':next(x for x in r['frames'] if x['type']=='ROOT_EXECUTION_VIEW_SNAPSHOT')['payload']['root_org']['agent_statuses'],'currentPublicStatuses':status,'managerRootActive':True,'exactExclusiveW2ScopePids':p['exactDescendants'],'remainingExactScopePids':remaining,'protectedW1ProvidersPresent':p['protectedProviders'],'noExclusiveW2ProviderAtFinalSample':True,'protectedFiles':checks,'workspacesAndSentinelsUnchanged':True,'limitations':['First stream did not capture helper coordinator offline; retry snapshot already reports it offline. No claim that its PID remained active or that all five workers failed physical stop.','Exclusive W2 provider and seven captured native children physically gone. Catalog Leaf/helper Team use shared W1 provider; retaining it is not a leak or complete five-worker release proof.','Generic TASK_RELEASE_FAILED aggregate omits underlying cause. Empty selected runtime log extract supplies no causal proof.','Current Task B public offline after normal idle interval is not proof of being stopped by A DONE; B lifetime remains open, shared provider/root/Manager preserved.','Current state/archive checks are read-only failure evidence, not a source patch or additional full acceptance.']}
(E/'api-005-fapi-007-witness.json').write_text(json.dumps(summary,indent=2)+'\n');(E/'api-005-owned-processes-before-stop.json').write_text(json.dumps(own,indent=2)+'\n')
# Refresh only previously allowlisted archive paths, preserving no vault/key/DB/env.
manifest=read('api-005-owned-evidence-manifest.json');allowed={'raw_traces_active.jsonl','run_metadata.json','collaboration_tree.json','communication_messages.json','team_run_execution_tree.json','team_communication_messages.json','agent_org_run_execution_tree.json','agent_org_communication_messages.json','projects.json'}
for item in manifest:
 source=root/item['sourceRelative'];target=Path(item['archive'])
 assert source.resolve().is_relative_to(root) and not source.is_symlink()
 assert source.name in allowed or (source.suffix=='.txt' and source.is_relative_to(root/'server-data/projects/task_context_files'))
 shutil.copyfile(source,target);item['sha256']=hashlib.sha256(target.read_bytes()).hexdigest();item['bytes']=target.stat().st_size
(E/'api-005-owned-evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Confirmed same failed helper/lifetime/tree after one actual compact business retry; 8 exact W2 PIDs absent, W1 retained. Refreshed '+str(len(manifest))+' allowlisted owned files. '+str(len(own))+' own process records retained before exact cleanup.')
