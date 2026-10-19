"""Sequential healthy close/open dependency probe; no cache flush or reader retry in product."""
from pathlib import Path
import os,time,json,hashlib,stat,sys,uuid
source=Path(sys.argv[1]);mounts=[Path(x) for x in sys.argv[2:4]];phase=sys.argv[4]
r={'phase':phase,'uid':os.getuid(),'gid':os.getgid(),'groups':os.getgroups(),'cases':[]}
def hash(b):return hashlib.sha256(b).hexdigest()
def write(p,b):
 with p.open('wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
def identity(p):
 s=p.stat();return [s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode)]
r['sourceIdentity']=identity(source);r['markers']=[(p/'.autobyteus-nfs/storage.json').read_text() for p in [source,*mounts]]
assert r['uid']==1000 and r['gid']==109 and r['groups']==[] and len(set(r['markers']))==1
cases=[('inplace-1024',1024,'inplace'),('inplace-1MiB',1048576,'inplace'),('atomic-replace',1024,'replace'),('create-after-negative',1024,'new')]
if phase!='candidate-zero':cases=cases[:1]
for label,size,kind in cases:
 name='sr022-'+phase+'-'+uuid.uuid4().hex;old=(b'OLD-'+name.encode())*(size//(4+len(name))+1);old=old[:size];new=(b'NEW-'+name.encode())*(size//(4+len(name))+1);new=new[:size]
 p=source/'project'/name;readers=[x/'project'/name for x in mounts]
 if kind!='new':
  write(p,old)
  for x in readers:assert x.read_bytes()==old
 else:
  for x in readers:assert not x.exists()
 before=identity(p) if p.exists() else None
 if kind=='replace':
  tmp=p.with_suffix('.tmp');write(tmp,new);os.replace(tmp,p);fd=os.open(p.parent,os.O_RDONLY);os.fsync(fd);os.close(fd)
 else:write(p,new)
 start=time.monotonic();c={'name':label,'file':name,'size':size,'kind':kind,'sourceBefore':before,'sourceAfter':identity(p),'sourceHash':hash(p.read_bytes()),'oldHash':hash(old),'newHash':hash(new),'observations':[],'firstExact':[None,None]}
 assert c['sourceHash']==c['newHash']
 while time.monotonic()-start<6:
  row={'startSeconds':time.monotonic()-start,'reads':[]}
  for i,x in enumerate(readers):
   st=time.monotonic()-start
   try:b=x.read_bytes();v={'sha256':hash(b),'size':len(b)}
   except FileNotFoundError:v={'missing':True}
   v['startSeconds']=st;v['endSeconds']=time.monotonic()-start;row['reads'].append(v)
   if v.get('sha256')==c['newHash'] and c['firstExact'][i] is None:c['firstExact'][i]=v['endSeconds']
  row['endSeconds']=time.monotonic()-start;c['observations'].append(row)
  if all(x is not None for x in c['firstExact']):break
  time.sleep(.1)
 c['withinFiveSeconds']=all(x is not None and x<=5 for x in c['firstExact']);r['cases'].append(c)
 # Don't unlink yet: keep exact source files/bytes for final preservation audit.
r['result']='Observed';print(json.dumps(r),flush=True)
