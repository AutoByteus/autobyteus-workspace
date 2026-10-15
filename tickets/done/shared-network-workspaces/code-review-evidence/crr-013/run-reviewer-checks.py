from pathlib import Path
import tempfile,os,urllib.request,hashlib,tarfile,json,subprocess as sp,time,shutil
R=Path.cwd();E=Path(__file__).resolve().parent
S=Path(tempfile.mkdtemp(prefix='ab-nfs-crr013-'));(E/'scratch-path.txt').write_text(str(S)+'\n')
for p in [S,S/'home',S/'tmp']:
 p.mkdir(exist_ok=True);os.chown(p,-1,os.getgid())
url='https://go.dev/dl/go1.27.2.darwin-arm64.tar.gz';archive=S/'go.tar.gz'
rows=[]
try:
 urllib.request.urlretrieve(url,archive);h=hashlib.sha256(archive.read_bytes()).hexdigest()
 assert h=='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5'
 with tarfile.open(archive) as t:t.extractall(S)
 (E/'toolchain.json').write_text(json.dumps({'url':url,'sha256':h,'bytes':archive.stat().st_size,'uid':os.getuid(),'gid':os.getgid(),'scratch':str(S)},indent=2)+'\n')
 env={'PATH':str(S/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','PYTHONDONTWRITEBYTECODE':'1'}
 def run(name,args,cwd=R,extra=None,expected=0):
  start=time.monotonic();p=sp.run(list(map(str,args)),cwd=cwd,env=env|(extra or {}),capture_output=True,text=True,timeout=360)
  (E/(name+'.log')).write_text(p.stdout+p.stderr);rows.append({'name':name,'argv':list(map(str,args)),'cwd':str(cwd),'rc':p.returncode,'expected':expected,'seconds':round(time.monotonic()-start,3)})
  (E/'checks-result.json').write_text(json.dumps(rows,indent=2)+'\n');print(name,p.returncode,flush=True);assert p.returncode==expected,(name,p.stdout[-1000:],p.stderr[-1000:]);return p.stdout
 go=S/'go/bin/go';N=R/'autobyteus-nfs'
 run('go-version',[go,'version'])
 run('go-race',[go,'test','-race','-count=1','-v','./...'],N)
 run('go-vet',[go,'vet','./...'],N)
 run('python-packaging',['python3','-m','unittest','scripts/tests/test_nfs_engine_packaging.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_nfs_packaging_and_launcher.py','scripts/tests/test_nfs_release_workflow.py','-v'])
 run('publish-refusal',['python3','autobyteus-nfs/packaging/release.py','--check-publish'],expected=1)
 run('source-hash',['python3','autobyteus-nfs/packaging/release.py','--source-hash'])
 for system,arch in [('darwin','amd64'),('linux','arm64'),('linux','amd64')]:
  dest=S/(system+'-'+arch);dest.mkdir()
  run('test-compile-'+system+'-'+arch,[go,'test','-c','-o',str(dest)+'/', './...'],N,{'GOOS':system,'GOARCH':arch,'CGO_ENABLED':'0'})
 # Targeted non-production mutation controls in copied module, not product edits.
 mutations=[('binding-save','internal/setup/apply.go','return s.SaveIntent(*p)','return nil','./internal/setup','TestCreatedSourceBindingSurvivesProbeFailure'),('correlation','internal/platform/source_darwin.go','after != observed || current != observed || currentMount != mount','false && (after != observed || current != observed || currentMount != mount)','./internal/platform','TestSourceCaptureCorrelationAndClosure'),('duplicate','internal/platform/volume_plist.go','if _, exists := v.fields[name]; exists {','if _, exists := v.fields[name]; false && exists {','./internal/platform','TestVolumePlistStrictIdentity')]
 for name,file,old,new,pkg,test in mutations:
  copy=S/('mutation-'+name);shutil.copytree(N,copy,ignore=shutil.ignore_patterns('out','.git'))
  f=copy/file;src=f.read_text();assert src.count(old)==1;(f).write_text(src.replace(old,new))
  run('mutation-'+name,[go,'test','-count=1','-run',test,pkg],copy,expected=1)
 print('all scoped checks completed',flush=True)
finally:
 shutil.rmtree(S)
 (E/'cleanup.json').write_text(json.dumps({'scratch':str(S),'removed':not S.exists(),'resources':'No privileged child, mount, VM, Docker, desktop, API, provider or host config created; test-owned dirs only'},indent=2)+'\n')
