from pathlib import Path
import json,hashlib,datetime,sys
E=Path(__file__).parent; i=json.loads((E/'api-011-restart.json').read_text())['result'];assert i['ownsDataRoot'];root=Path(i['dataRoot']);mode=sys.argv[1];assert mode in ['before','stored','restored','final'];sha=lambda b:hashlib.sha256(b).hexdigest();snap=E/'api-011-byte-before.json'
if mode=='before':
 files=[root/'server-data/projects/projects.json']
 for base in ['server-data/memory','server-data/projects/task_context_files','validation-workspace']:
  for p in (root/base).rglob('*'):
   if p.is_file() and (p.name in ['raw_traces_active.jsonl','collaboration_tree.json','team_run_execution_tree.json','agent_org_run_execution_tree.json','protected-sentinel.txt'] or 'task_context_files' in p.parts):files.append(p)
 out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'files':[]}
 for p in files:
  assert not p.is_symlink() and p.resolve().is_relative_to(root);b=p.read_bytes();out['files'].append({'relative':str(p.relative_to(root)),'bytes':len(b),'sha256':sha(b),'prefixOnly':p.name=='raw_traces_active.jsonl'})
 snap.write_text(json.dumps(out,indent=2)+'\n');print('Scoped Pass before',len(files),'allowlisted own files')
else:
 before=json.loads(snap.read_text());assert before['instanceId']==i['instanceId'];out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'mode':mode,'files':[]}
 for x in before['files']:
  p=root/x['relative'];assert not p.is_symlink();b=p.read_bytes();assert len(b)>=x['bytes'];check=b[:x['bytes']] if x['prefixOnly'] else b;assert sha(check)==x['sha256'],x['relative'];out['files'].append({**x,'actualBytes':len(b),'addedBytes':len(b)-x['bytes'],'unchangedProtectedBytes':True})
 (E/('api-011-byte-'+mode+'.json')).write_text(json.dumps(out,indent=2)+'\n');print('Scoped Pass',mode,len(out['files']),'whole Project/private trees/packets/workspace and raw-prefix protection; addedbytes',sum(x['addedBytes'] for x in out['files']))
