"""CRR004 reviewer-only local checks. No OS service/VM/provider operations.
Fresh owned official toolchain/home/cache removed in finally; no production edits.
Run from assigned worktree root with /usr/bin/python3; command logs retained here.
"""
from pathlib import Path
import tempfile,urllib.request,json,hashlib,tarfile,subprocess as sp,time,shutil,datetime
R=Path.cwd();E=Path(__file__).resolve().parent
root=Path(tempfile.mkdtemp(prefix='ab-nfs-crr004-'))
record={'timestampUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputHead':sp.check_output(['git','rev-parse','HEAD']).decode().strip(),'ownedRoot':str(root),'commands':[]}
def save(): (E/'checks-result.json').write_text(json.dumps(record,indent=2)+'\n')
def run(name,args,cwd):
 t=time.monotonic()
 with (E/(name+'.log')).open('w') as log:p=sp.run(args,cwd=cwd,env=env,stdout=log,stderr=sp.STDOUT,timeout=300)
 record['commands'].append({'name':name,'argv':args,'cwd':str(cwd),'exitCode':p.returncode,'seconds':round(time.monotonic()-t,3)});save()
 print(name,p.returncode,flush=True);assert p.returncode==0
try:
 filename='go1.27.2.darwin-arm64.tar.gz';expected='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5'
 url='https://dl.google.com/go/'+filename;archive=root/filename
 with urllib.request.urlopen(url,timeout=30) as response, archive.open('wb') as out: shutil.copyfileobj(response,out)
 actual=hashlib.sha256(archive.read_bytes()).hexdigest();assert actual==expected,(actual,expected)
 record['toolchain']={'url':url,'sha256':actual,'sourceOfExpectedHash':'IR004/toolchain.json official Go distribution record'}
 with tarfile.open(archive) as t:
  for m in t.getmembers():
   p=Path(m.name);assert p.parts[0]=='go' and not p.is_absolute() and '..' not in p.parts
   assert not m.issym() and not m.islnk()
  t.extractall(root)
 (root/'home').mkdir();(root/'gocache').mkdir();(root/'gomodcache').mkdir()
 env={'PATH':str(root/'go/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(root/'home'),'TMPDIR':str(root),'GOTOOLCHAIN':'local','GOCACHE':str(root/'gocache'),'GOMODCACHE':str(root/'gomodcache'),'GOPROXY':'off','GOSUMDB':'off','PYTHONDONTWRITEBYTECODE':'1','LANG':'C','LC_ALL':'C'}
 record['environment']=env;save();go=str(root/'go/bin/go')
 run('go-version',[go,'version'],R)
 run('go-backend-race',[go,'test','-race','-count=1','-v','./internal/backend'],R/'autobyteus-nfs')
 run('go-vet',[go,'vet','./...'],R/'autobyteus-nfs')
 record['result']='Pass'
except BaseException as ex:
 record['result']='Fail';record['error']=repr(ex);raise
finally:
 shutil.rmtree(root);record['cleanup']={'ownedRootAbsent':not root.exists(),'noVMServiceMountDockerProviderOperations':True};save()
