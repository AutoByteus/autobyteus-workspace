from pathlib import Path
import json,hashlib,datetime,sys,shutil
E=Path(__file__).parent;i=json.loads((E/'api-009-round9-recovery-restart.json').read_text())['result'];assert i['ownsDataRoot'] and i['instanceId']=='iso-58861-449a';root=Path(i['dataRoot']);mode=sys.argv[1];name=E/'api-009-round9-byte-preservation-before.json';baseline=E/'api-009-round9-byte-baseline';array=root/'server-data/projects/projects.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
if mode=='before':
 assert not baseline.exists();out={'instanceId':i['instanceId'],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'projectState':json.loads(array.read_text()),'files':[],'scope':'Only actual OWN raw histories/trees, saved Task attachments and complete workspace bytes. Natural raw trace append permitted; exact old bytes must remain prefix. No DB/key/vault/env or native HOME files.'}
 sources=list((root/'server-data/memory').rglob('raw_traces_active.jsonl'))+list((root/'server-data/memory').rglob('*execution_tree.json'))+list((root/'server-data/memory').rglob('collaboration_tree.json'))+list((root/'server-data/projects/task_context_files').rglob('*'))+list((root/'validation-workspace').rglob('*'))
 for p in sorted(set(sources)):
  if not p.is_file():continue
  if p.is_relative_to(root/'validation-workspace'):assert p.name=='protected-sentinel.txt'
  b=p.read_bytes();rel=str(p.relative_to(root));target=baseline/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b);out['files'].append({'path':rel,'sha256':sha(b),'bytes':len(b),'mode':'prefix' if p.name=='raw_traces_active.jsonl' else 'exact'})
 assert sum(f['path'].startswith('validation-workspace/') for f in out['files'])==8
 name.write_text(json.dumps(out,indent=2)+'\n');print('Scoped before-byte snapshot '+str(len(out['files']))+' OWN files/all8 complete workspace files')
else:
 before=json.loads(name.read_text());checks=[]
 for f in before['files']:
  p=root/f['path'];assert p.exists(),f['path'];old=(baseline/f['path']).read_bytes();assert sha(old)==f['sha256'];now=p.read_bytes();assert now.startswith(old) if f['mode']=='prefix' else now==old,f['path'];checks.append({'path':f['path'],'beforeSha256':f['sha256'],'afterSha256':sha(now),'mode':f['mode'],'addedBytes':len(now)-len(old),'passed':True})
 state=json.loads(array.read_text());aids=set()
 for k in ['agent_team','agent_org']:aids.add(json.loads((E/('api-009-round9-concrete-'+k+'.json')).read_text())['tasks']['A']['taskId'])
 aids.add(json.loads((E/'api-009-round9-live-setup.json').read_text())['tasks']['A']['taskId'])
 oldl=[l for p in before['projectState'] for l in p.get('taskLifetimes',[])];newl=[l for p in state for l in p.get('taskLifetimes',[])];assert len(newl)==len(oldl)
 for l in oldl:
  n=next(x for x in newl if x['lifetimeId']==l['lifetimeId'])
  if l['taskId'] not in aids:assert n==l
  else:assert n['completedAt'] and all(e['cleanup']=='released' for e in n['executions']);assert len(n['executions'])==len(l['executions'])
 for p in before['projectState']:
  if 'tasks' not in p:continue
  q=next(x for x in state if x.get('projectId')==p.get('projectId'))
  for t in p['tasks']:
   n=next(x for x in q['tasks'] if x['taskId']==t['taskId']);assert n['description']==t['description'];assert n['contextFiles']==t['contextFiles'];assert n['status']==('DONE' if t['taskId'] in aids else t['status'])
 out={'instanceId':i['instanceId'],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Scoped Pass exact raw old-byte prefix/full raw tree/packet/all8 complete workspace bytes/full persisted Task descriptions+context metadata and all other lifetimes preserved across final three-root A release; natural raw append not called mutation/loss','checks':checks,'finalProjectState':state,'closedTargetAIds':sorted(aids)};(E/'api-009-round9-byte-preservation-after.json').write_text(json.dumps(out,indent=2)+'\n');print('Scoped Pass '+str(len(checks))+' exact bytes/prefix checks and preserved full metadata/other lifetimes')
