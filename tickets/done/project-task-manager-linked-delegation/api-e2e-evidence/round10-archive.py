from pathlib import Path
import json,hashlib,shutil,datetime
E=Path(__file__).parent;i=json.loads((E/'api-010-round10-history-restart.json').read_text())['result'];assert i['instanceId']=='iso-63749-7f67' and i['ownsDataRoot'];root=Path(i['dataRoot']);allowed={'raw_traces_active.jsonl','run_metadata.json','collaboration_tree.json','communication_messages.json','team_communication_messages.json','team_run_execution_tree.json','agent_org_communication_messages.json','agent_org_run_execution_tree.json'};files=[]
def copy(p,q):
 assert not p.is_symlink() and p.resolve().is_relative_to(root);q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q);files.append({'sourceRelative':str(p.relative_to(root)),'archive':str(q.resolve()),'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),'bytes':q.stat().st_size})
for p in (root/'server-data/memory').rglob('*'):
 if p.is_file() and p.name in allowed:copy(p,E/'api-010-round10-owned-history'/p.relative_to(root/'server-data/memory'))
for p in (root/'server-data/projects/task_context_files').rglob('*'):
 if p.is_file():copy(p,E/'api-010-round10-owned-saved-packets'/p.relative_to(root/'server-data/projects/task_context_files'))
for p in (root/'validation-workspace').rglob('*'):
 if p.is_file():
  assert p.name=='protected-sentinel.txt';copy(p,E/'api-010-round10-owned-workspace'/p.relative_to(root/'validation-workspace'))
copy(root/'server-data/projects/projects.json',E/'api-010-round10-owned-project-array.json')
out={'instanceId':i['instanceId'],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'scope':'Allowlisted actual OWN raw history/tree/communication/run metadata, all OWN saved Task packets/current array and complete owned sentinel workspace files. No DB, encrypted vault, key, env or native HOME history.'};(E/'api-010-round10-owned-evidence-manifest.json').write_text(json.dumps(out,indent=2)+'\n');print('Retained '+str(len(files))+' allowlisted OWN files')
