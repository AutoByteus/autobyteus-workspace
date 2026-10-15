"""Prepare a copied current CLI and narrow package-owner fixture from measured bytes.
Not a published release; leaves canonical metadata/assets untouched.
"""
from pathlib import Path
import json,shutil,subprocess as sp,sys,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip())
sys.path.insert(0,str(R/'autobyteus-nfs/packaging/engine'));import manifest
m=json.loads((E/'built-engine-manifest.json').read_text());manifest.validate(m)
candidate=S/'engine-candidate';candidate.mkdir();shutil.copytree(S/'engine-artifacts',candidate/'arm64')
(candidate/'engine-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
bundle=m['architectures']['arm64'];records=bundle['packages']+[bundle['correspondingSource'],bundle['buildInventory']]
(candidate/'arm64/SHA256SUMS').write_text(''.join(p['sha256']+'  '+p['file']+'\n' for p in records))
copy=S/'install-check-source';shutil.copytree(R/'autobyteus-nfs',copy,ignore=shutil.ignore_patterns('__pycache__'))
manifest.embed(m,candidate,'arm64',copy/'internal/backend/engine-assets')
meta=json.loads(sp.check_output(['python3','autobyteus-nfs/packaging/release.py','--tag','v'+json.loads((R/'autobyteus-web/package.json').read_text())['version'],'--engine-manifest',str(candidate/'engine-manifest.json')],cwd=R))
assert meta['qualifiedTargets']==[]
(copy/'cmd/autobyteus-nfs/release.json').write_text(json.dumps(meta,indent=2)+'\n')
helper=copy/'cmd/install-fixture';helper.mkdir()
(helper/'release.json').write_text(json.dumps(meta))
(helper/'main.go').write_text('''package main
import (
 _ "embed"
 "encoding/json"
 "fmt"
 "os"
 "github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/setup"
 "github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/backend"
 "github.com/AutoByteus/autobyteus-workspace/autobyteus-nfs/internal/platform"
)
//go:embed release.json
var metadata []byte
func main(){
 if len(os.Args)!=2 || os.Args[1]!="--owned-vm-install-only" || os.Geteuid()!=0 {panic("isolated fixture invocation required")}
 var release setup.Release
 if err:=json.Unmarshal(metadata,&release);err!=nil {panic(err)}
 root:="/var/lib/autobyteus-nfs"
 if err:=platform.RootDirectory(root,0700);err!=nil {panic(err)}
 lock,err:=platform.Lock(root);if err!=nil {panic(err)};defer lock.Close()
 if err:=backend.InstallUbuntuPackages(platform.Commands{Lock:lock},release.Packages,release.Engine,true,root);err!=nil {fmt.Fprintln(os.Stderr,err);os.Exit(1)}
 fmt.Println("Production package owner completed; no NFS setup/export/mount executed")
}
''')
env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'go-home'),'TMPDIR':str(S/'go-tmp'),'GOTOOLCHAIN':'local','GOOS':'linux','GOARCH':'arm64','CGO_ENABLED':'0'}
commands=[]
for name,target in [('current-cli','./cmd/autobyteus-nfs'),('package-fixture','./cmd/install-fixture')]:
 argv=[str(S/'go/bin/go'),'build','-trimpath','-o',str(S/name),target];sp.run(argv,env=env,cwd=copy,check=True);commands.append(argv)
 paths=[S/name]
# Malformed embedded release must fail before package commands; use a distinct fixture.
bad=json.loads((helper/'release.json').read_text());bad['engine']['architectures']['arm64']['packages'][0]['sha256']='0'*64;(helper/'release.json').write_text(json.dumps(bad))
argv=[str(S/'go/bin/go'),'build','-trimpath','-o',str(S/'bad-package-fixture'),'./cmd/install-fixture'];sp.run(argv,env=env,cwd=copy,check=True);commands.append(argv)
(helper/'release.json').write_text(json.dumps(meta))
report={'scope':'current copied CLI + package-owner fixture only; no qualified release','metadata':meta,'commands':commands,'copy':str(copy),'binaries':[{'name':name,'sha256':hashlib.sha256((S/name).read_bytes()).hexdigest(),'size':(S/name).stat().st_size} for name in ['current-cli','package-fixture','bad-package-fixture']]}
assert all(x['size']<=100*1024*1024 for x in report['binaries'])
(E/'install-check-binaries.json').write_text(json.dumps(report,indent=2)+'\n')
print('Prepared audited binaries without altering tracked release/assets')
