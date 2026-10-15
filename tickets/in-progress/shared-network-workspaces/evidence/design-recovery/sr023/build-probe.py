from pathlib import Path
import subprocess as s,json,hashlib
E=Path(__file__).resolve().parent;r=json.loads((E/'resource.json').read_text());S=Path(r['scratch']);go=str(S/'go/bin/go');rows=[]
for arch in ['arm64','amd64']:
 out=S/('identity-probe-'+arch);env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S),'GOCACHE':str(S/'go-cache'),'GOPATH':str(S/'go-path'),'GOTOOLCHAIN':'local','GOOS':'darwin','GOARCH':arch,'CGO_ENABLED':'0'}
 p=s.run([go,'build','-o',str(out),str(E/'identity-probe.go')],env=env,capture_output=True,text=True,timeout=180);rows.append({'argv':p.args,'env':env,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr});(E/'probe-build.json').write_text(json.dumps(rows,indent=2)+'\n');assert p.returncode==0,p.stderr;rows[-1]['sha256']=hashlib.sha256(out.read_bytes()).hexdigest();rows[-1]['bytes']=out.stat().st_size
(E/'probe-build.json').write_text(json.dumps(rows,indent=2)+'\n');print('both CGO_ENABLED=0 probe builds pass')
