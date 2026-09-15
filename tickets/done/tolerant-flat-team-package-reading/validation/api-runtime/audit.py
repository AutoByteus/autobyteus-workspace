from pathlib import Path
import json,hashlib,sqlite3,sys
E=Path(__file__).resolve().parent;W=E.parents[4];D=W/'autobyteus-server-ts/tests/.tmp/team-package-api001';S=Path('/Users/normy/autobyteus_org/autobyteus-agents')
label=sys.argv[1]
def snap(root):
 out={}
 for fam in ['agents','agent-teams','agent-orgs','applications']:
  p=root/fam
  if p.exists():
   for f in sorted(p.rglob('*')):
    if f.is_symlink():out[str(f.relative_to(root))]={'symlink':str(f.readlink())}
    elif f.is_file():out[str(f.relative_to(root))]={'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'size':f.stat().st_size}
 return out
before=json.loads((E/'authored-before.json').read_text());now={'owned':snap(D),'external':snap(S)}
assert now['external']==before['external'],'external changed'
assert all(now['owned'].get(k)==v for k,v in before['owned'].items()),'owned authored changed'
orgnames=sorted(f.name for f in (D/'agent-orgs').iterdir());assert orgnames==['api-untouched-org'],orgnames
fp=D/'memory/agent_teams/api-flat-history';flatbefore=json.loads((E/'flat-before.json').read_text());flatnow={f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'mtime_ns':f.stat().st_mtime_ns,'inode':f.stat().st_ino} for f in fp.iterdir() if f.is_file()}
assert flatnow['team_run_execution_tree.json']==flatbefore['team_run_execution_tree.json']
target=D/'memory/agent_orgs/api-migrated-org';tree=json.loads((target/'agent_org_run_execution_tree.json').read_text());assert tree['rootOrg']['orgRunId']=='api-migrated-org';assert not (D/'memory/agent_teams/api-migrated-org').exists()
trace=[json.loads(s) for s in (target/'api-migrated-direct/raw_traces_active.jsonl').read_text().splitlines()];old=next(t for t in trace if t['id']=='api-old-user');assert old['file_attachments'][0]['uri']=='/rest/agent-org-runs/api-migrated-org/agent-runs/api-migrated-worker/context-files/ctx_saved__retained-note.txt',old
assert (target/'api-migrated-mounted/api-migrated-worker/context_files/ctx_saved__retained-note.txt').read_text()=='MIGRATED-ATTACHMENT-ORANGE-915\nTest owned attachment only.\n'
db=sqlite3.connect('file:'+str(W/'autobyteus-server-ts/db/team-package-api001.db')+'?mode=ro',uri=True);db.row_factory=sqlite3.Row;rows=[dict(r) for r in db.execute('select * from app_data_migration_records')];db.close()
family=next(r for r in rows if r['migration_id']=='20260901_agent_org_flat_team_families_v1');assert family['status']=='SUCCEEDED',family
out={'label':label,'externalFilesUnchanged':len(before['external']),'ownedFilesUnchanged':len(before['owned']),'ownedAdditionalFiles':sorted(set(now['owned'])-set(before['owned'])),'orgDirectories':orgnames,'flatTreeExactUnchanged':True,'flatOtherFiles':flatnow,'migrationRows':rows,'tree':tree,'oldTrace':old,'history':json.loads((D/'memory/agent_org_run_history_index.json').read_text()),'telemetry':json.loads((E/'telemetry.json').read_text())}
(E/(label+'-audit.json')).write_text(json.dumps(out,indent=2));print(json.dumps({k:out[k] for k in ['externalFilesUnchanged','ownedFilesUnchanged','orgDirectories','flatTreeExactUnchanged']}));print('family',family['status'],'history',out['history'])
