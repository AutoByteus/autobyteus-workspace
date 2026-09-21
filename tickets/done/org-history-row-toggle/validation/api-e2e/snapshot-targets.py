#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]).resolve(); out=Path(sys.argv[2])
targets={
 'database':root/'db/production.db',
 'stoppedOrg':root/'memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e',
 'teamComparator':root/'memory/agent_teams/software_engineering_team_4dab4182f72849b989494754ad79f03a',
}
def hf(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while c:=f.read(8*1024*1024):h.update(c)
 return h.hexdigest()
def snap(p):
 if p.is_file():return {'kind':'file','size':p.stat().st_size,'sha256':hf(p)}
 rs=[]; agg=hashlib.sha256();total=0
 for f in sorted(x for x in p.rglob('*') if x.is_file()):
  rel=str(f.relative_to(p)); size=f.stat().st_size; digest=hf(f);total+=size
  agg.update(rel.encode()+b'\0'+str(size).encode()+b'\0'+digest.encode()+b'\n')
  rs.append({'path':rel,'size':size,'sha256':digest})
 return {'kind':'tree','fileCount':len(rs),'bytes':total,'aggregateSha256':agg.hexdigest(),'files':rs}
res={k:snap(v) for k,v in targets.items()}
out.write_text(json.dumps(res,indent=2)+'\n')
print(json.dumps({k:{kk:vv for kk,vv in v.items() if kk!='files'} for k,v in res.items()},indent=2))
