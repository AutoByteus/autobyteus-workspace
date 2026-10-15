"""IR002 Mac-arm64 local cross-compile/version self-check; no privileged action.
GO_BINARY optionally overrides the task-owned toolchain recorded beside this file.
Foreign binaries are compiled only, not executed or qualified.
"""
import os,json,hashlib,pathlib,subprocess,tempfile
root=pathlib.Path.cwd(); evidence=pathlib.Path(__file__).resolve().parent
go=pathlib.Path(os.environ.get('GO_BINARY',str(pathlib.Path(json.loads((evidence/'go-toolchain.json').read_text())['root'])/'go/bin/go')))
receipt={'scope':'local compile + native version/refusal smoke, not OS hosting qualification','toolchain':subprocess.check_output([str(go),'version'],text=True).strip(),'outputs':[]}
with tempfile.TemporaryDirectory(prefix='nfs-cross-build-') as tmp, (evidence/'go-cross-build-final2.log').open('w') as log:
 receipt['temporaryOutput']=tmp;out=pathlib.Path(tmp);log.write(receipt['toolchain']+'\n');log.flush()
 for target in ['darwin-arm64','darwin-amd64','linux-arm64','linux-amd64']:
  goos,arch=target.split('-');env={**os.environ,'GOTOOLCHAIN':'local','CGO_ENABLED':'0','GOOS':goos,'GOARCH':arch}
  command=[str(go),'build','-trimpath','-o',str(out/target),'./cmd/autobyteus-nfs']
  log.write('CGO_ENABLED=0 GOOS='+goos+' GOARCH='+arch+' '+repr(command)+'\n');log.flush()
  subprocess.run(command,cwd=root/'autobyteus-nfs',env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
  subprocess.run(['file',str(out/target)],stdout=log,stderr=subprocess.STDOUT,check=True)
  receipt['outputs'].append({'target':target,'sha256':hashlib.sha256((out/target).read_bytes()).hexdigest(),'bytes':(out/target).stat().st_size})
 binary=str(out/'darwin-arm64')
 assert subprocess.check_output([binary,'version'],text=True).strip()=='development-unqualified'
 result=subprocess.run([binary,'verify-release',str(root/'autobyteus-nfs/cmd/autobyteus-nfs/release.json')],stdout=log,stderr=subprocess.STDOUT)
 assert result.returncode!=0,'unqualified release accepted'
 log.write('PASS native version; unqualified release refused; four cross-targets compiled (foreign binaries not executed)\n')
receipt['cleanupConfirmed']=not pathlib.Path(receipt['temporaryOutput']).exists()
(evidence/'go-build-receipt-final2.json').write_text(json.dumps(receipt,indent=2)+'\n')
