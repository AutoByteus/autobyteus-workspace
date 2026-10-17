from pathlib import Path
import json,shutil,subprocess as sp,sys,hashlib,time,tarfile
sys.dont_write_bytecode=True
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());r={'commands':[],'result':'Preparing'}
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save():(E/'build-result.json').write_text(json.dumps(r,indent=2)+'\n')
env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','PYTHONDONTWRITEBYTECODE':'1'}
def cmd(a,cwd=R,t=150,extra=None):
 e=env.copy();e.update(extra or {});start=time.monotonic();p=sp.run(a,cwd=cwd,env=e,capture_output=True,text=True,timeout=t);row={'argv':a,'cwd':str(cwd),'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(row);save();assert p.returncode==0,row;return row
try:
 retained=json.loads((T/'implementation-evidence/ir-005/retained-candidate.json').read_text());r['retainedVerification']=[]
 for x in retained['files']:
  p=Path(x['path']);assert p.stat().st_size==x['size'] and h(p)==x['sha256'];r['retainedVerification'].append(x)
 candidate=Path(retained['root'])/'engine-candidate';sys.path.insert(0,str(R/'autobyteus-nfs/packaging/engine'));import manifest
 m=json.loads((candidate/'engine-manifest.json').read_text());manifest.validate(m);manifest.verify_files(m['architectures']['arm64'],candidate/'arm64');r['engine']=m;save()
 cmd(['curl','-4','--fail','--location','--connect-timeout','10','--max-time','180','--output',str(S/'go.tar.gz'),'https://go.dev/dl/go1.27.2.darwin-arm64.tar.gz'])
 r['toolchainSHA256']=h(S/'go.tar.gz');assert r['toolchainSHA256']=='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5'
 with tarfile.open(S/'go.tar.gz') as t:t.extractall(S)
 go=str(S/'go/bin/go');cmd([go,'version'])
 copy=S/'candidate-source';shutil.copytree(R/'autobyteus-nfs',copy,ignore=shutil.ignore_patterns('out','__pycache__'))
 manifest.embed(m,candidate,'arm64',copy/'internal/backend/engine-assets')
 q=cmd(['python3','autobyteus-nfs/packaging/release.py','--tag','v'+json.loads((R/'autobyteus-web/package.json').read_text())['version'],'--engine-manifest',str(candidate/'engine-manifest.json')]);meta=json.loads(q['stdout']);assert meta['qualifiedTargets']==[] and meta['sourceHash']=='a6ef7dee582e9b4ba0edd7449bac4d292acfb944073502f0fb63bd8356653342';r['metadata']=meta
 (copy/'cmd/autobyteus-nfs/release.json').write_text(json.dumps(meta,indent=2)+'\n')
 r['copiedSourceDelta']=[]
 for p in sorted(copy.rglob('*')):
  if p.is_file():
   rel=p.relative_to(copy);orig=R/'autobyteus-nfs'/rel
   if not orig.exists() or h(orig)!=h(p):r['copiedSourceDelta'].append(str(rel))
 assert len(r['copiedSourceDelta'])==3 and 'cmd/autobyteus-nfs/release.json' in r['copiedSourceDelta']
 cmd([go,'build','-trimpath','-o',str(S/'autobyteus-nfs-linux-arm64'),'./cmd/autobyteus-nfs'],cwd=copy,extra={'GOOS':'linux','GOARCH':'arm64','CGO_ENABLED':'0'})
 b=S/'autobyteus-nfs-linux-arm64';r['binary']={'path':str(b),'sha256':h(b),'size':b.stat().st_size};assert b.stat().st_size<=100*1024*1024
 r['result']='Ready';r['qualification']='Build-only local arm64 candidate; exact retained engine pair, no engine rebuild/publish/qualification/tracked mutation';save();print(json.dumps({'result':r['result'],'binary':r['binary'],'sourceHash':meta['sourceHash']}),flush=True)
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();raise
