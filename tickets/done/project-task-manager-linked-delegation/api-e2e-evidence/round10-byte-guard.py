from pathlib import Path
import json,hashlib,datetime,sys
E=Path(__file__).parent;i=json.loads((E/'api-010-round10-restart.json').read_text())['result'];assert i['instanceId']=='iso-63749-7f67' and i['ownsDataRoot'];root=Path(i['dataRoot']);mode=sys.argv[1];baseline=E/'api-010-round10-byte-baseline';sha=lambda b:hashlib.sha256(b).hexdigest();name=E/'api-010-round10-byte-before.json'
if mode=='before':
 assert not baseline.exists();out={'instanceId':i['instanceId'],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':[],'scope':'Full current physical Project array, private execution trees, raw history prefix, saved Task bytes and complete owned sentinel workspaces. No DB, keys, vault, env or native HOME.'}
 files=[root/'server-data/projects/projects.json']+list((root/'server-data/memory').rglob('*execution_tree.json'))+list((root/'server-data/memory').rglob('collaboration_tree.json'))+list((root/'server-data/memory').rglob('raw_traces_active.jsonl'))+list((root/'server-data/projects/task_context_files').rglob('*'))+list((root/'validation-workspace').rglob('*'))
 for p in sorted(set(files)):
  if not p.is_file():continue
  assert not p.is_symlink() and p.resolve().is_relative_to(root)
  if p.is_relative_to(root/'validation-workspace'):assert p.name=='protected-sentinel.txt'
  b=p.read_bytes();rel=str(p.relative_to(root));q=baseline/rel;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b);out['files'].append({'path':rel,'bytes':len(b),'sha256':sha(b),'mode':'prefix' if p.name=='raw_traces_active.jsonl' else 'exact'})
 assert isinstance(json.loads((root/'server-data/projects/projects.json').read_text()),list);name.write_text(json.dumps(out,indent=2)+'\n');print('Scoped Pass before snapshot '+str(len(out['files']))+' allowlisted owned exact/prefix files')
else:
 before=json.loads(name.read_text());checks=[]
 for x in before['files']:
  old=(baseline/x['path']).read_bytes();assert sha(old)==x['sha256'];p=root/x['path'];assert p.exists(),x['path'];now=p.read_bytes();assert (now.startswith(old) if x['mode']=='prefix' else now==old),x['path'];checks.append({**x,'afterSha256':sha(now),'addedBytes':len(now)-len(old),'passed':True})
 out={'instanceId':i['instanceId'],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Scoped Pass full Project/private trees/saved bytes/workspaces exact and raw history old-byte prefix after '+mode,'checks':checks};(E/('api-010-round10-byte-'+mode+'.json')).write_text(json.dumps(out,indent=2)+'\n');print(out['result']+' ('+str(len(checks))+' files)')
