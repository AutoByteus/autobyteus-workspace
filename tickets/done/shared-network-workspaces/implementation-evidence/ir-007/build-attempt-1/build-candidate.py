"""Current CLI + metadata build; reuses unchanged IR005 pair, never rebuilds engine."""
from pathlib import Path
import json,shutil,subprocess as sp,sys,hashlib,time
sys.dont_write_bytecode=True
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());r={'commands':[]}
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','PYTHONDONTWRITEBYTECODE':'1'}
def save():(E/'build-result.json').write_text(json.dumps(r,indent=2)+'\n')
def run(args,cwd=R,extra=None):
 start=time.monotonic();q=sp.run([str(a) for a in args],cwd=cwd,env=env|(extra or {}),capture_output=True,text=True,timeout=180)
 r['commands'].append({'argv':[str(a) for a in args],'cwd':str(cwd),'rc':q.returncode,'stdout':q.stdout,'stderr':q.stderr,'seconds':round(time.monotonic()-start,3)});save();assert q.returncode==0;return q.stdout
retained=json.loads((T/'implementation-evidence/ir-005/retained-candidate.json').read_text())
for x in retained['files']:assert h(Path(x['path']))==x['sha256'] and Path(x['path']).stat().st_size==x['size']
r['retainedEngineInputsVerified']=retained['files']
engine=Path(retained['root'])/'engine-candidate'
sys.path.insert(0,str(R/'autobyteus-nfs/packaging/engine'));import manifest
m=json.loads((engine/'engine-manifest.json').read_text());manifest.validate(m);manifest.verify_files(m['architectures']['arm64'],engine/'arm64')
copy=S/'candidate-source';shutil.copytree(R/'autobyteus-nfs',copy,ignore=shutil.ignore_patterns('out','__pycache__'))
manifest.embed(m,engine,'arm64',copy/'internal/backend/engine-assets')
meta=json.loads(run(['python3','autobyteus-nfs/packaging/release.py','--tag','v'+json.loads((R/'autobyteus-web/package.json').read_text())['version'],'--engine-manifest',engine/'engine-manifest.json']))
assert meta['qualifiedTargets']==[];r['metadata']=meta
(copy/'cmd/autobyteus-nfs/release.json').write_text(json.dumps(meta,indent=2)+'\n')
r['copiedSourceDelta']=[]
for p in sorted(copy.rglob('*')):
 if p.is_file():
  rel=p.relative_to(copy);orig=R/'autobyteus-nfs'/rel
  if not orig.exists() or h(orig)!=h(p):r['copiedSourceDelta'].append(str(rel))
assert len(r['copiedSourceDelta'])==3 and 'cmd/autobyteus-nfs/release.json' in r['copiedSourceDelta']
out=R/'autobyteus-nfs/out/ir007-local-candidate';out.mkdir(exist_ok=False)
r['files']=[]
for target in ['linux-arm64','darwin-arm64']:
 system,arch=target.split('-');p=out/('autobyteus-nfs-'+target)
 run([S/'go/bin/go','build','-trimpath','-o',p,'./cmd/autobyteus-nfs'],copy,{'GOOS':system,'GOARCH':arch,'CGO_ENABLED':'0'})
 r['files'].append({'path':str(p),'sha256':h(p),'size':p.stat().st_size})
run([out/'autobyteus-nfs-darwin-arm64','version'])
assert meta['sourceHash'] in r['commands'][-1]['stdout']
(out/'release.json').write_text(json.dumps(meta,indent=2)+'\n')
(out/'README.txt').write_text('IR007 current-source local CLI candidate, unqualified/unpublished. Linux arm64 embeds exact IR005 engine pair; no engine rebuild. Engine artifacts/source/notices remain at '+str(engine)+'. No Docker image identity assigned here; API must build/bind its current owned image before Docker-hosting checks.\n')
for name in ['release.json','README.txt']:
 p=out/name;r['files'].append({'path':str(p),'sha256':h(p),'size':p.stat().st_size})
r['result']='Build-only candidate ready; not runtime/API/release qualification';save();print(json.dumps({'result':r['result'],'sourceHash':meta['sourceHash'],'files':r['files']}))
