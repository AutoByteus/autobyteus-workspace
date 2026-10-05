from pathlib import Path
import json,hashlib,datetime
E=Path(__file__).parent;i=json.loads((E/'api-009-round9-recovery-restart.json').read_text())['result'];assert i['instanceId']=='iso-58861-449a' and i['ownsDataRoot'];root=Path(i['dataRoot']);before=json.loads((E/'api-009-round9-byte-preservation-before.json').read_text());checks=[];sha=lambda b:hashlib.sha256(b).hexdigest()
for f in before['files']:
 old=(E/'api-009-round9-byte-baseline'/f['path']).read_bytes();assert sha(old)==f['sha256'];now=(root/f['path']).read_bytes();assert now.startswith(old) if f['mode']=='prefix' else now==old,f['path'];checks.append({'path':f['path'],'beforeSha256':f['sha256'],'afterSha256':sha(now),'addedBytes':len(now)-len(old),'mode':f['mode'],'passed':True})
d=json.loads((E/'api-009-round9-final-a.json').read_text());c=d['cases'][0];assert c['kind']=='agent_team' and 'TIMEOUT Exact A genuine terminal' in c['error'];snap=next(f for f in c['frames'] if f['type']=='TEAM_EXECUTION_VIEW_SNAPSHOT');assert next(x for x in snap['payload']['agent_statuses'] if x['agent_run_id']==c['targetId'])['status']=='offline';assert sum(x['trace_type']=='tool_call' and x.get('tool_name')=='create_or_update_task' and x.get('tool_args',{}).get('task_id')==c['taskId'] and x['tool_args']['status']=='DONE' for x in c['turn'])==1;assert c['afterTree']==c['beforeTree']
state=json.loads((root/'server-data/projects/projects.json').read_text());oldl=[l for p in before['projectState'] for l in p.get('taskLifetimes',[])];newl=[l for p in state for l in p.get('taskLifetimes',[])];assert len(newl)==len(oldl)
for l in oldl:
 n=next(x for x in newl if x['lifetimeId']==l['lifetimeId'])
 if l['taskId']!=c['taskId']:assert n==l
 else:assert n['completedAt'] and all(e['cleanup']=='released' for e in n['executions']);assert len(n['executions'])==len(l['executions'])
for p in before['projectState']:
 if 'tasks' not in p:continue
 q=next(x for x in state if x.get('projectId')==p.get('projectId'))
 for t in p['tasks']:
  n=next(x for x in q['tasks'] if x['taskId']==t['taskId']);assert n['description']==t['description'];assert n['contextFiles']==t['contextFiles'];assert n['status']==('DONE' if t['taskId']==c['taskId'] else t['status'])
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'result':'Scoped Pass data preservation + already-offline Team A once-DONE exact released lifetime. Not three-root final A or new live terminal proof. Original temporary oracle failures retained.','initialATerminalSnapshot':next(x for x in snap['payload']['agent_statuses'] if x['agent_run_id']==c['targetId']),'newGenuineTargetTerminalCount':sum(f['type']=='AGENT_STATUS' and f['payload'].get('agent_run_id')==c['targetId'] and f['payload']['status']=='offline' for f in c['frames']),'checks':checks,'finalProjectState':state,'held':'Final Org A unstarted; final Agent A unsent. New FAPI009 history projection failure holds new runtime cases.'};(E/'api-009-round9-partial-byte-preservation.json').write_text(json.dumps(out,indent=2)+'\n');print(out['result']+' '+str(len(checks))+' exact bytes/prefix checks.')
