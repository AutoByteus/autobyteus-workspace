from pathlib import Path
import json,hashlib,shutil,datetime
E=Path(__file__).parent;i=json.loads((E/'api-011r-restart.json').read_text())['result'];assert i['ownsDataRoot'];root=Path(i['dataRoot']);files=[];allowed={'raw_traces_active.jsonl','run_metadata.json','collaboration_tree.json','communication_messages.json','team_communication_messages.json','team_run_execution_tree.json','agent_org_communication_messages.json','agent_org_run_execution_tree.json'}
def copy(p):
 assert not p.is_symlink() and p.resolve().is_relative_to(root);q=E/'api-011r-owned-data'/p.relative_to(root);q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q);files.append({'relative':str(p.relative_to(root)),'archive':str(q.resolve()),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size})
for p in (root/'server-data/memory').rglob('*'):
 if p.is_file() and p.name in allowed:copy(p)
for p in (root/'server-data/projects/task_context_files').rglob('*'):
 if p.is_file():copy(p)
for p in (root/'validation-workspace').rglob('*'):
 if p.is_file():assert p.name=='protected-sentinel.txt';copy(p)
copy(root/'server-data/projects/projects.json');(E/'api-011r-owned-evidence-manifest.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'files':files,'scope':'Allowlisted own history/tree/messages/metadata/saved packets/Project/sentinels only. No env/vault/key/DB/native HOME.'},indent=2)+'\n');print('Archived',len(files),'hash-verified allowlisted own files')
