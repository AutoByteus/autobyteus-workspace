"""Actual native NFS opens + actual managed product HTTP, timer AFTER fsync/close.
Measurement polls only; no cache/config/mount modification or product retry.
Run as selected nonroot UID1000:GID109 with no supplementary groups.
"""
import os,json,time,uuid,hashlib,urllib.request,urllib.error,threading,sys,stat
from pathlib import Path
source=Path(sys.argv[1]); mount=Path('/Volumes/autobyteus-shared'); phase=sys.argv[2]
src=source/'project';mnt=mount/'project';base='http://127.0.0.1:8001'
def h(b):return hashlib.sha256(b).hexdigest()
def identity(p):
 s=p.stat();return [s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode)]
before=identity(source);marker=json.loads((source/'.autobyteus-nfs/storage.json').read_text())
assert os.getuid()==1000 and os.getgid()==109 and os.getgroups()==[]
payload={'query':'mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}','variables':{'input':{'rootPath':str(mnt)}}}
req=urllib.request.Request(base+'/graphql',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
with urllib.request.urlopen(req,timeout=10) as f:response=json.load(f)
assert not response.get('errors'),response
wid=response['data']['createWorkspace']['workspaceId'];url=base+'/rest/workspaces/'+wid+'/content?path='
def native(n):return (mnt/n).read_bytes()
def http(n):
 with urllib.request.urlopen(url+n,timeout=4) as f:
  assert f.status==200;return f.read()
def write(p,b,mode='wb'):
 with p.open(mode) as f:
  assert f.write(b)==len(b);f.flush();os.fsync(f.fileno())
def dirsync(p):
 fd=os.open(p,os.O_RDONLY)
 try:os.fsync(fd)
 finally:os.close(fd)
results=[]
for size in [1024,1048576]:
 for kind in ['inplace','inplace','inplace','atomic','new']:
  name='visibility-'+uuid.uuid4().hex+'.bin';p=src/name;initial=os.urandom(size);expected=os.urandom(size);file_before=None
  if kind!='new':
   write(p,initial);dirsync(src)
   for _ in range(3):assert native(name)==initial and http(name)==initial
   file_before=identity(p)
  else:
   try:native(name);raise AssertionError('native path existed')
   except FileNotFoundError:pass
   try:http(name);raise AssertionError('HTTP path existed')
   except urllib.error.HTTPError as x:assert x.code==404,x.code
  if kind=='atomic':
   temp=src/(name+'.tmp');write(temp,expected);os.replace(temp,p);dirsync(src)
  else:
   write(p,expected,'r+b' if kind=='inplace' else 'xb')
   if kind=='new':dirsync(src)
  closed=time.monotonic();readers={}
  def observe(label,reader):
   rows=[];first=None
   while time.monotonic()-closed<6:
    start=time.monotonic()
    try:
     data=reader(name);elapsed=time.monotonic()-closed;row={'seconds':round(elapsed,6),'readSeconds':round(time.monotonic()-start,6),'sha256':h(data),'size':len(data)}
     if data==expected:first=elapsed;rows.append(row);break
    except (FileNotFoundError,urllib.error.HTTPError,TimeoutError) as x:row={'seconds':round(time.monotonic()-closed,6),'error':repr(x)}
    rows.append(row);time.sleep(.1)
   readers[label]={'firstExactSeconds':first,'rows':rows,'result':'Pass' if first is not None and first<=5 else 'Fail'}
  threads=[threading.Thread(target=observe,args=(label,reader)) for label,reader in [('native',native),('http',http)]]
  for t in threads:t.start()
  for t in threads:t.join()
  after=identity(p);assert p.read_bytes()==expected
  if kind=='inplace':assert file_before==after
  if kind=='atomic':assert file_before[1]!=after[1]
  row={'phase':phase,'kind':kind,'file':name,'size':size,'initialSHA256':h(initial) if kind!='new' else None,'expectedSHA256':h(expected),'sourceSHA256':h(p.read_bytes()),'sourceIdentityBefore':file_before,'sourceIdentityAfter':after,'readers':readers,'result':'Pass' if all(x['result']=='Pass' for x in readers.values()) else 'Fail'}
  results.append(row);print(json.dumps({'case':row}),flush=True)
assert identity(source)==before
assert marker==json.loads((mount/'.autobyteus-nfs/storage.json').read_text())==json.loads((source/'.autobyteus-nfs/storage.json').read_text())
print(json.dumps({'result':'Pass' if all(x['result']=='Pass' for x in results) else 'Fail','cases':results,'workspaceId':wid,'source':str(source),'sourceIdentity':before,'marker':marker,'uid':os.getuid(),'gid':os.getgid(),'groups':os.getgroups()}),flush=True)
