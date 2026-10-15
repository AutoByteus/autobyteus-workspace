"""Documented full worktree server Docker build, clean tracked-only context."""
from pathlib import Path
import subprocess as sp,json,tarfile,io,time,hashlib
from urllib.parse import urlparse
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());context=S/'server-build-context-v2';context.mkdir();tag='ab-nfs-api003-server:current';r={'tag':tag,'context':str(context),'inputHead':sp.check_output(['git','rev-parse','HEAD'],text=True).strip(),'result':'Preparing'}
def save():(E/'server-build-v2-result.json').write_text(json.dumps(r,indent=2)+'\n')
paths=['.dockerignore','pnpm-workspace.yaml','pnpm-lock.yaml','package.json','LICENSE','LICENSING.md','NOTICE','autobyteus-ts','autobyteus-application-sdk-contracts','autobyteus-application-backend-sdk','autobyteus-agent-presentation-contracts','autobyteus-collaboration-stream-contracts','autobyteus-team-stream-contracts','autobyteus-server-ts','autobyteus-web']
files=sp.check_output(['git','ls-files','--',*paths],text=True).splitlines();r['trackedContextCount']=len(files);r['credentialNamedFiles']=[x for x in files if Path(x).name in ['.env','.env.local','.env.production','auth.json','credentials.json']];assert set(r['credentialNamedFiles'])=={'autobyteus-web/.env','autobyteus-web/.env.production'}
r['publicConfigAudit']=[]
for f in r['credentialNamedFiles']:
 raw=sp.check_output(['git','show','HEAD:'+f]);keys=[]
 for line in raw.decode().splitlines():
  line=line.strip()
  if not line or line.startswith('#'):continue
  key,value=line.split('=',1);u=urlparse(value.strip().strip('"').strip("'"))
  assert key.startswith(('BACKEND_','NUXT_PUBLIC_')) and u.scheme in ('http','ws') and u.hostname=='localhost' and u.port==8000 and not any([u.username,u.password,u.query,u.fragment]),(f,key)
  keys.append(key)
 r['publicConfigAudit'].append({'path':f,'sha256':hashlib.sha256(raw).hexdigest(),'keys':keys,'classification':'Tracked public loopback-only endpoint defaults; no credentials'})
r['archivePaths']=paths
raw=sp.check_output(['git','archive','HEAD','--',*paths]);r['contextArchiveSHA256']=hashlib.sha256(raw).hexdigest()
with tarfile.open(fileobj=io.BytesIO(raw)) as t:
 for m in t.getmembers():assert not Path(m.name).is_absolute() and '..' not in Path(m.name).parts
 t.extractall(context)
save();args=['docker','build','--platform','linux/arm64','-f','autobyteus-server-ts/docker/Dockerfile.monorepo','-t',tag,'.'];r['argv']=args;r['result']='Building';save();start=time.monotonic()
try:
 with (E/'server-build-v2.log').open('w') as f:p=sp.run(args,cwd=context,stdout=f,stderr=sp.STDOUT,timeout=1800)
 r['rc']=p.returncode;r['seconds']=round(time.monotonic()-start,3);r['result']='Ready' if p.returncode==0 else 'BuildFailed'
 if p.returncode==0:
  p=sp.run(['docker','image','inspect',tag],capture_output=True,text=True,check=True);r['image']=json.loads(p.stdout)
except BaseException as x:r['result']='Incomplete';r['error']=repr(x)
save();print(json.dumps({'result':r['result'],'rc':r.get('rc'),'seconds':r.get('seconds'),'error':r.get('error')}),flush=True)
