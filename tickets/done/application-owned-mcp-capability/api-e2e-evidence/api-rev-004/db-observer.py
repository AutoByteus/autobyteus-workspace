import sqlite3,json,time,datetime,sys
from pathlib import Path
DB=Path('.autobyteus/api-e2e-004/applications/bundle-app__brief-studio__308117954720f6e58a3b1422c1b93a2dadc96910ab03e466aad2a63f78ff5bd8/db/app.sqlite')
OUT=Path('tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004/db-state-transitions.jsonl')
BRIEF='brief-2263879a-640f-4606-8e92-d01e53a18dd5'
def rows(c,q): return [dict(r) for r in c.execute(q,(BRIEF,)).fetchall()]
def snap():
 c=sqlite3.connect(DB,timeout=0); c.row_factory=sqlite3.Row
 try:
  return {'briefs':rows(c,'select * from briefs where brief_id=? order by brief_id'),'bindings':rows(c,'select * from brief_bindings where brief_id=? order by binding_id'),'artifacts':rows(c,'select * from brief_artifacts where brief_id=? order by artifact_kind'),'revisions':rows(c,'select * from brief_artifact_revisions where brief_id=? order by published_at'),'pending':rows(c,'select * from pending_launch_requests where brief_id=? order by created_at')}
 finally:c.close()
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
initial={'observedAt':now(),'databasePath':str(DB),'briefId':BRIEF,**snap()}
Path('tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004/before-launch-db.json').write_text(json.dumps(initial,indent=2))
last=None; deadline=time.time()+900
with OUT.open('w') as f:
 while time.time()<deadline:
  rec={'observedAt':now(),'epochMs':int(time.time()*1000)}
  try: rec['state']=snap()
  except Exception as e: rec['readError']=repr(e)
  key=json.dumps(rec.get('state',rec.get('readError')),sort_keys=True)
  if key!=last:
   f.write(json.dumps(rec,separators=(',',':'))+'\n');f.flush();print(rec['observedAt'],'state' if 'state' in rec else rec['readError'],flush=True);last=key
  s=rec.get('state',{});bs=s.get('briefs',[]);arts=s.get('artifacts',[])
  if bs and bs[0].get('status')=='in_review' and any(a.get('artifact_kind')=='writer' for a in arts): print('OBSERVER_TERMINAL_SUCCESS',flush=True);sys.exit(0)
  time.sleep(.02)
print('OBSERVER_TIMEOUT',flush=True);sys.exit(2)
