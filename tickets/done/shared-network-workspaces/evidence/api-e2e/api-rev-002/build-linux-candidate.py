from pathlib import Path
import json,hashlib,shutil,os,subprocess as sp,time
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());copy=S/'nfs-candidate';shutil.copytree(R/'autobyteus-nfs',copy)
version='v'+json.loads((R/'autobyteus-web/package.json').read_text())['version'];cmd=['python3','autobyteus-nfs/packaging/release.py','--tag',version,'--output',str(copy/'cmd/autobyteus-nfs/release.json')];sp.run(cmd,check=True)
meta=json.loads((copy/'cmd/autobyteus-nfs/release.json').read_text());assert meta['qualifiedTargets']==[] and meta['engineImage']==''
changed=[]
for p in (R/'autobyteus-nfs').rglob('*'):
 if p.is_file() and p.read_bytes()!=(copy/p.relative_to(R/'autobyteus-nfs')).read_bytes():changed.append(str(p.relative_to(R/'autobyteus-nfs')))
assert changed==['cmd/autobyteus-nfs/release.json'],changed
env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','GOOS':'linux','GOARCH':'arm64','CGO_ENABLED':'0'};build=[str(S/'go/bin/go'),'build','-trimpath','-o',str(S/'autobyteus-nfs-linux'),'./cmd/autobyteus-nfs'];start=time.monotonic();p=sp.run(build,cwd=copy,env=env,capture_output=True,text=True);r={'metadataCommand':cmd,'metadata':meta,'buildCommand':build,'buildCwd':str(copy),'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout,'stderr':p.stderr,'copiedTreeDelta':changed,'qualification':'Local build-only candidate metadata from reference pins; no release tag created/publication/qualification/source patch. Mirrors documented release.py generation in disposable source copy.'}
if p.returncode==0:r['binary']={'path':str(S/'autobyteus-nfs-linux'),'sha256':hashlib.sha256((S/'autobyteus-nfs-linux').read_bytes()).hexdigest()}
(E/'linux-candidate-build.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r),flush=True);raise SystemExit(p.returncode)
