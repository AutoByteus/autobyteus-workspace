from pathlib import Path
import subprocess as sp,json,hashlib,tarfile,os,time
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parents[2];S=Path((E/'scratch-path.txt').read_text().strip());env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'GOTOOLCHAIN':'local','LANG':'en_US.UTF-8','LC_ALL':'en_US.UTF-8','CI':'1','PYTHONDONTWRITEBYTECODE':'1'};r={'commands':[],'scratch':str(S)}
def save():(E/'prepare-result.json').write_text(json.dumps(r,indent=2)+'\n')
def run(args,timeout=180,cwd=R):
 start=time.monotonic();p=sp.run(args,cwd=cwd,env=env,capture_output=True,text=True,timeout=timeout);row={'argv':args,'cwd':str(cwd),'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(row);save();return p
try:
 for host in ['https://go.dev/dl/','https://dl.google.com/go/']:
  p=run(['curl','--fail','--location','--connect-timeout','10','--max-time','90','--output',str(S/'go.tar.gz'),host+'go1.27.2.darwin-arm64.tar.gz'],timeout=100)
  if p.returncode==0:break
 else:raise RuntimeError('Pinned official toolchain acquisition failed; see retained bounded attempts')
 sha=hashlib.sha256((S/'go.tar.gz').read_bytes()).hexdigest();assert sha=='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5',sha
 with tarfile.open(S/'go.tar.gz') as tf:
  for m in tf.getmembers():assert not m.name.startswith('/') and '..' not in Path(m.name).parts and not m.issym() and not m.islnk()
  tf.extractall(S)
 go=str(S/'go/bin/go');assert run([go,'version']).returncode==0
 p=run([go,'build','-trimpath','-o',str(S/'autobyteus-nfs'),'./cmd/autobyteus-nfs'],cwd=R/'autobyteus-nfs');assert p.returncode==0
 version=run([str(S/'autobyteus-nfs'),'version']);assert version.returncode==0
 rec={'path':str(S/'autobyteus-nfs'),'sha256':hashlib.sha256((S/'autobyteus-nfs').read_bytes()).hexdigest(),'sourceHead':sp.check_output(['git','rev-parse','HEAD'],text=True).strip(),'metadata':'unchanged development-unqualified','sourceFix':'174e480bd0cfaee29f22fd46b1922afbb274e56b'};(E/'binary.json').write_text(json.dumps(rec,indent=2)+'\n');r['result']='Pass';r['toolchainSHA256']=sha
except BaseException as e:r['result']='Blocked';r['error']=repr(e);raise
finally:save();print(json.dumps({'result':r.get('result'),'error':r.get('error')}),flush=True)
