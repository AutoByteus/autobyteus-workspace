from pathlib import Path
import tempfile,json,urllib.request,hashlib,subprocess as sp,os,time
E=Path(__file__).resolve().parent;S=Path(tempfile.mkdtemp(prefix='ab-nfs-api007-'));os.chmod(S,0o700);(S/'home').mkdir();(E/'scratch-path.txt').write_text(str(S)+'\n')
r={'scratch':str(S),'commands':[],'result':'Preparing'}
def save():(E/'environment.json').write_text(json.dumps(r,indent=2)+'\n')
save()
u='https://github.com/openai/tart/releases/download/2.41.0/tart.tar.gz';a=S/'tart.tar.gz';urllib.request.urlretrieve(u,a);h=hashlib.sha256(a.read_bytes()).hexdigest();assert h=='07faafc77acc668fcfb2fbe97811622567fb89c650db401a470f72e7c4ddc560';r['toolDownload']={'url':u,'sha256':h};save();(S/'tools').mkdir();sp.run(['tar','-xzf',str(a),'-C',str(S/'tools')],check=True)
tart=str(S/'tools/tart.app/Contents/MacOS/tart');env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':str(S/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
for args in [['--version'],['run','--help']]:
 p=sp.run([tart,*args],env=env,capture_output=True,text=True,check=True);r['commands'].append({'args':args,'stdout':p.stdout,'stderr':p.stderr});save()
assert '--net-fd' in r['commands'][-1]['stdout'],'released tool has no net-fd';r['result']='Tool ready';save();print(json.dumps({'scratch':str(S),'result':r['result']}),flush=True)
