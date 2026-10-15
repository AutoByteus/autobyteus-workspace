"""Healthy source close/fsync -> distinct NFS fresh opens, no outage or cache manipulation."""
from pathlib import Path
import json,shlex,time
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','visibility-repro-result.json'))
SRC=json.loads((E/'native-client-v2-result.json').read_text())['source'];r['source']=SRC;r['result']='Running'
try:
 r['configuration']=g('sudo -n cat /var/lib/autobyteus-nfs/ganesha/ganesha.conf; findmnt -n -o SOURCE,FSTYPE,OPTIONS /Volumes/autobyteus-shared; sudo -n docker inspect autobyteus-server-0; sudo -n docker volume ls --format "{{.Name}}"; sudo -n systemctl is-active autobyteus-nfs-ganesha.service autobyteus-nfs.service; cat /sys/module/nfsv4/parameters/directory_delegations');save()
 code=r"""import os,json,time,uuid,hashlib,subprocess,urllib.request
from pathlib import Path
src=Path(SOURCE)/'previews-api004';mnt=Path('/Volumes/autobyteus-shared/previews-api004');base='http://127.0.0.1:8001/rest/workspaces/agent_ws_acd2adb3f1ecb577c2c71043e0e315aafdf71d10dd6921d0788c219f19036c1d/content?path='
def h(b):return hashlib.sha256(b).hexdigest()
def write(p,b):
 with p.open('wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
def http(n):
 with urllib.request.urlopen(base+n,timeout=3) as f:return f.read()
results=[]
for trial in range(2):
 n='visibility-'+uuid.uuid4().hex+'.bin';p=src/n;a=bytes(range(256))*4;b=a[::-1];write(p,a)
 assert (mnt/n).read_bytes()==a and http(n)==a
 s=p.stat();write(p,b);t=time.monotonic();rows=[];fresh={}
 while time.monotonic()-t<70:
  direct=(mnt/n).read_bytes();api=http(n);row={'seconds':round(time.monotonic()-t,3),'nativeSHA':h(direct),'httpSHA':h(api)};rows.append(row)
  if direct==b:fresh.setdefault('native',row['seconds'])
  if api==b:fresh.setdefault('http',row['seconds'])
  if len(fresh)==2:break
  time.sleep(.5)
 now=p.stat();result={'trial':trial+1,'file':n,'size':len(b),'initialSHA':h(a),'expectedSHA':h(b),'sourceSHAAfter':h(p.read_bytes()),'sourceFileInodeUnchanged':s.st_ino==now.st_ino,'sourceMtimeNsBefore':s.st_mtime_ns,'sourceMtimeNsAfter':now.st_mtime_ns,'freshAtSeconds':fresh,'rows':rows,'result':'Pass' if len(fresh)==2 and max(fresh.values())<=5 else 'Fail'};results.append(result);print(json.dumps({'trialResult':result}),flush=True)
print(json.dumps({'result':'Pass' if all(x['result']=='Pass' for x in results) else 'Fail','trials':results,'sourceMarker':json.loads((src.parent/'.autobyteus-nfs/storage.json').read_text()),'mountedMarker':json.loads((mnt.parent/'.autobyteus-nfs/storage.json').read_text())}),flush=True)
""".replace('SOURCE',repr(SRC))
 q=g('python3 -u -c '+shlex.quote(code),timeout=160);r['reproduction']=json.loads(q['stdout'].splitlines()[-1]);r['result']=r['reproduction']['result'];save();event('V04 unique-fixture healthy visibility reproduction '+r['result'])
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save();event('Visibility reproduction incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
