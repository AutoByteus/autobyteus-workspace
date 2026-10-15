"""API008 L07-L17. Actual two command-only containers, same kernel/NFS volume; no independent-client claim.
Run as ordinary guest admin; docker privilege only to enter our two disposable containers.
Each case emits its result before the next starts. Data operations run UID1000:GID109.
"""
import os,sys,json,subprocess as sp,time,hashlib,concurrent.futures,shlex
from pathlib import Path
mode,source,uuid=sys.argv[1:];root='/Volumes/autobyteus-shared';base=root+'/api008-'+mode+'-v2'
out={'mode':mode,'source':source,'storageId':uuid,'topology':'one Linux kernel; two generic Linux shell containers bind the proven native NFS mount; one kernel/cache, no application running','cases':[],'commands':[],'result':'Running'}
def save():Path('/home/admin/api008-files-'+mode+'-v2.json').write_text(json.dumps(out,indent=2)+'\n')
def argv(who,code,uid='1000:109'):
 if who=='source':return ['python3','-c',code]
 return ['sudo','-n','docker','exec','--user',uid,['ab-nfs-api008-cmd-a','ab-nfs-api008-cmd-b'][who],'env','-i','HOME=/tmp/api008-test-home','PATH=/usr/local/bin:/usr/bin:/bin','python3','-c',code]
def run(who,code,uid='1000:109',check=True):
 a=argv(who,code,uid);p=sp.run(a,capture_output=True,text=True,timeout=45)
 z={'actor':who,'uid':uid,'code':code,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};out['commands'].append(z);save()
 if check:assert p.returncode==0,z
 return p.stdout
def jrun(who,code,**kw):return json.loads(run(who,code,**kw))
def case(cid,fn):
 t=time.monotonic()
 try:v=fn();z={'id':cid,'status':'Pass','evidence':v}
 except BaseException as e:z={'id':cid,'status':'Fail','error':repr(e)};out['result']='Fail';raise
 finally:
  z['seconds']=time.monotonic()-t;out['cases'].append(z);save();print(json.dumps({'case':z}),flush=True)
def pj(who,rel=''):return (source if who=='source' else root)+'/api008-'+mode+'-v2'+rel
def commit(who,path,body,method='replace'):
 code="""import os,time,json,hashlib
from pathlib import Path
p=Path(PATH);data=BODY
q=p.with_name(p.name+'.tmp') if METHOD=='atomic' else p
with q.open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
if METHOD=='atomic':os.replace(q,p)
closed=time.monotonic()
print(json.dumps({'closed':closed,'sha256':hashlib.sha256(data).hexdigest(),'size':len(data)}))
""".replace('PATH',repr(path)).replace('BODY',body).replace('METHOD',repr(method))
 return jrun(who,code)
def fresh(who,path,c):
 return jrun(who,"""import time,json,hashlib
from pathlib import Path
p=Path(PATH);closed=CLOSED;expected=EXPECTED;rows=[]
while True:
 try:b=p.read_bytes();h=hashlib.sha256(b).hexdigest()
 except FileNotFoundError:h=None
 elapsed=time.monotonic()-closed;rows.append({'seconds':elapsed,'sha256':h})
 if h==expected:break
 if elapsed>5:break
 time.sleep(.05)
print(json.dumps({'elapsed':elapsed,'observations':rows,'expected':expected,'exact':h==expected}))
assert h==expected and elapsed<=5,rows
""".replace('PATH',repr(path)).replace('CLOSED',repr(c['closed'])).replace('EXPECTED',repr(c['sha256'])))
try:
 def identities():
  Path(pj('source')).mkdir()
  result={}
  for who in [0,1]:
   result[str(who)]=jrun(who,"""import os,json
from pathlib import Path
root=Path('/Volumes/autobyteus-shared')
assert (root/'project/preexisting.txt').read_bytes()==b'ORIGINAL_API008'
marker=json.loads((root/'.autobyteus-nfs/storage.json').read_text());assert marker=={'storageId':UUID}
print(json.dumps({'uid':os.getuid(),'gid':os.getgid(),'marker':marker,'mountinfo':[x for x in Path('/proc/self/mountinfo').read_text().splitlines() if 'autobyteus-shared' in x]}))
""".replace('UUID',repr(uuid)))
   assert result[str(who)]['uid']==1000 and any(' nfs4 ' in x for x in result[str(who)]['mountinfo'])
   c=commit(who,pj(who,'/nonce-'+str(who)),repr(('API008_'+mode+'_'+str(who)).encode()))
   result['nonce'+str(who)]={'peer':fresh(1-who,pj(1-who,'/nonce-'+str(who)),c),'source':fresh('source',pj('source','/nonce-'+str(who)),c)}
  return result
 case('FS01',identities)
 def crud():
  evidence=[]
  for who in [0,1]:
   for name,body in [('empty',"b''"),('text',"b'line one\\nline two'"),('unicode',"'雪 café 🚀'.encode('utf-8')"),('binary',"bytes(range(256))*4"),('1MiB',"bytes(range(256))*4096")]:
    path='/crud-'+str(who)+'-'+name;c=commit(who,pj(who,path),body)
    evidence.append({'writer':who,'fixture':name,'commit':c,'peer':fresh(1-who,pj(1-who,path),c)})
    # append through the other shell process, then read back through original writer.
    c=jrun(1-who,"import pathlib,os,time,json,hashlib;p=pathlib.Path("+repr(pj(1-who,path))+");f=p.open('ab');f.write(b'APPEND');f.flush();os.fsync(f.fileno());f.close();t=time.monotonic();b=p.read_bytes();print(json.dumps({'closed':t,'sha256':hashlib.sha256(b).hexdigest(),'size':len(b)}))")
    evidence.append({'appendWriter':1-who,'peer':fresh(who,pj(who,path),c)})
  return evidence
 case('FS02-FS03',crud)
 def directories():
  r=[]
  for who in [0,1]:
   p=pj(who,'/nested-'+str(who))
   r.append(run(who,"from pathlib import Path;p=Path("+repr(p)+");(p/'one'/'two').mkdir(parents=True);(p/'one'/'two'/'file').write_bytes(b'DIRECTORY');(p/'one'/'two'/'file').rename(p/'one'/'two'/'renamed');(p/'one').rename(p/'moved');print('created and renamed nested tree')"))
   r.append(run(1-who,"from pathlib import Path;p=Path("+repr(p)+");assert sorted(x.name for x in p.iterdir())==['moved'];assert (p/'moved'/'two'/'renamed').read_bytes()==b'DIRECTORY';(p/'moved'/'two'/'renamed').unlink();(p/'moved'/'two').rmdir();(p/'moved').rmdir();p.rmdir();print('peer listed/read/removed tree')"))
   r.append(run(who,"from pathlib import Path;p=Path("+repr(p)+");assert not p.exists();\ntry:p.read_bytes();raise AssertionError('missing read succeeded')\nexcept FileNotFoundError:print('expected ENOENT')"))
  return r
 case('FS05',directories)
 def metadata():
  rows=[]
  for who in [0,1]:
   p=pj(who,'/exec-'+str(who));run(who,"import pathlib,os;p=pathlib.Path("+repr(p)+");p.write_bytes(b'#!/bin/sh\\nprintf API008_EXEC');p.chmod(0o755);p.with_name(p.name+'.link').symlink_to(p.name)")
   rows.append(jrun(1-who,"import pathlib,os,stat,subprocess,json;p=pathlib.Path("+repr(p)+");s=p.stat();link=p.with_name(p.name+'.link');assert os.readlink(link)==p.name;assert link.read_bytes()==p.read_bytes();assert subprocess.check_output([str(link)])==b'API008_EXEC';assert stat.S_IMODE(s.st_mode)==0o755;print(json.dumps({'uid':s.st_uid,'gid':s.st_gid,'mode':stat.S_IMODE(s.st_mode),'size':s.st_size,'inode':s.st_ino,'mtime_ns':s.st_mtime_ns}))"))
  for who in [0,1]:
   rows.append(jrun('source',"import pathlib,stat,json;p=pathlib.Path("+repr(pj('source','/exec-'+str(who)))+");s=p.stat();assert (s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode))==(1000,109,0o755);print(json.dumps({'backingUid':s.st_uid,'backingGid':s.st_gid,'mode':stat.S_IMODE(s.st_mode)}))"))
  return rows
 case('FS11-metadata',metadata)
 def visibility():
  rows=[]
  for who,reader in [(0,1),(1,0),('source',0),('source',1)]:
   for size in [1024,1048576]:
    for method in ['replace','atomic','new']:
     name='/vis-'+str(who)+'-'+str(reader)+'-'+str(size)+'-'+method;wpath=pj(who,name);rpath=pj(reader,name)
     if method!='new':commit(who,wpath,"b'OLD'*341")
     run(reader,"from pathlib import Path;p=Path("+repr(rpath)+");"+("assert not p.exists()" if method=='new' else "assert p.read_bytes()==b'OLD'*341"))
     c=commit(who,wpath,'bytes(range(256))*'+str(size//256),method)
     z=fresh(reader,rpath,c);rows.append({'writer':who,'reader':reader,'size':size,'method':method,'commit':c,'read':z})
  return {'samples':rows,'maxSeconds':max(x['read']['elapsed'] for x in rows),'clock':'same kernel CLOCK_MONOTONIC; includes process-launch overhead after successful fsync/close and atomic rename; fresh-open exact SHA256'}
 case('FS06',visibility)
 def independent():
  start=time.monotonic()+1
  code="""import os,time,json,hashlib
from pathlib import Path
p=Path(PATH);p.mkdir()
while time.monotonic()<START:time.sleep(.005)
begin=time.monotonic();rows=[]
for i in range(40):
 b=(str(i)+' actor '+str(ACTOR)).encode()*100
 with (p/str(i)).open('xb') as f:f.write(b);f.flush();os.fsync(f.fileno())
 rows.append({'file':str(i),'sha256':hashlib.sha256(b).hexdigest()});time.sleep(.03)
print(json.dumps({'begin':begin,'end':time.monotonic(),'files':rows}))
"""
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   f=[pool.submit(jrun,a,code.replace('PATH',repr(pj(a,'/parallel-'+str(a)))).replace('START',repr(start)).replace('ACTOR',str(a))) for a in [0,1]];rows=[x.result() for x in f]
  assert max(x['begin'] for x in rows)<min(x['end'] for x in rows)
  for reader in [0,1,'source']:
   for writer in [0,1]:
    run(reader,"import pathlib,hashlib;p=pathlib.Path("+repr(pj(reader,'/parallel-'+str(writer)))+");rows="+repr(rows[writer]['files'])+";assert sorted(x.name for x in p.iterdir())==sorted(x['file'] for x in rows);assert all(hashlib.sha256((p/x['file']).read_bytes()).hexdigest()==x['sha256'] for x in rows);print('complete committed manifest exact')")
  return {'writers':rows,'actualOverlap':True,'files':80}
 case('FS07',independent)
 def git():
  p=pj(0,'/git');run(0,"from pathlib import Path;p=Path("+repr(p)+");p.mkdir();(p/'shared.txt').write_text('A initial\\n')")
  code="""import subprocess,json,os
p=PATH
env=dict(os.environ,GIT_CONFIG_COUNT='1',GIT_CONFIG_KEY_0='safe.directory',GIT_CONFIG_VALUE_0=p)
def g(*args):return subprocess.check_output(['git','-C',p,'-c','user.name=API008','-c','user.email=api008@example.invalid',*args],stderr=subprocess.STDOUT,env=env).decode()
ACTION
print(json.dumps({'head':g('rev-parse','HEAD').strip(),'status':g('status','--porcelain'),'globalConfigExists':os.path.exists('/tmp/api008-test-home/.gitconfig')}))
""".replace('PATH',repr(p))
  a=jrun(0,code.replace('ACTION',"g('init','-q');g('add','.');g('commit','-qm','A initial')"))
  b=jrun(1,code.replace('ACTION',"from pathlib import Path\nassert g('rev-parse','HEAD').strip()=="+repr(a['head'])+"\nassert Path(p+'/shared.txt').read_text()=='A initial\\n'\nPath(p+'/shared.txt').write_text('B coordinated edit\\n');g('add','shared.txt');g('commit','-qm','B edit')"))
  c=jrun(0,code.replace('ACTION',"from pathlib import Path\nassert g('rev-parse','HEAD').strip()=="+repr(b['head'])+"\nassert Path(p+'/shared.txt').read_text()=='B coordinated edit\\n'\nPath(p+'/shared.txt').write_text('A coordinated followup\\n');g('add','shared.txt');g('commit','-qm','A followup')"))
  for x in [a,b,c]:assert x['status']=='' and not x['globalConfigExists']
  run(1,"from pathlib import Path;assert Path("+repr(p+'/shared.txt')+").read_text()=='A coordinated followup\\n';print('coordinated final bytes')")
  return [a,b,c]
 case('FS12-Git',git)
 def exclusive():
  start=time.monotonic()+1;path=pj(0,'/exclusive')
  code="""import time,json,os
while time.monotonic()<START:time.sleep(.003)
try:
 with open(PATH,'xb') as f:f.write(DATA);f.flush();os.fsync(f.fileno())
 result='winner'
except FileExistsError:result='exists'
print(json.dumps({'result':result,'actor':ACTOR}))
"""
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   f=[pool.submit(jrun,a,code.replace('START',repr(start)).replace('PATH',repr(path)).replace('DATA',repr(('writer'+str(a)).encode())).replace('ACTOR',str(a))) for a in [0,1]];rows=[x.result() for x in f]
  assert sorted(x['result'] for x in rows)==['exists','winner'];winner=next(x['actor'] for x in rows if x['result']=='winner')
  for a in [0,1]:run(a,"from pathlib import Path;assert Path("+repr(path)+").read_bytes()=="+repr(('writer'+str(winner)).encode())+";print('exact winning bytes')")
  return rows
 case('FS09',exclusive)
 def lock():
  path=pj(0,'/lock');code="import fcntl,time;f=open("+repr(path)+",'a+b');fcntl.lockf(f,fcntl.LOCK_EX);print('LOCKED',flush=True);time.sleep(3)"
  p=sp.Popen(argv(0,code),stdout=sp.PIPE,stderr=sp.PIPE,text=True)
  assert p.stdout.readline().strip()=='LOCKED'
  contender="import fcntl;f=open("+repr(path)+",'a+b');\ntry:fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB);raise AssertionError('lock unexpectedly acquired')\nexcept BlockingIOError:print('CONTENDED')"
  try:denied=run(1,contender);p.wait(timeout=10);assert p.returncode==0
  finally:
   if p.poll() is None:p.terminate();p.wait(timeout=10)
  acquired=run(1,"import fcntl;f=open("+repr(path)+",'a+b');fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB);print('ACQUIRED_AFTER_RELEASE')")
  return {'contender':denied,'afterRelease':acquired,'limit':'same Linux kernel NFSv4 POSIX locks, not independent-host lock-manager qualification'}
 case('FS10',lock)
 def permissions():
  rows=[]
  for a in [0,1]:
   p=pj(a,'/rootmap-'+str(a));run(a,"from pathlib import Path;Path("+repr(p)+").write_text('ROOT_MAPALL')",uid='0:0')
   rows.append(jrun('source',"import pathlib,json;p=pathlib.Path("+repr(pj('source','/rootmap-'+str(a)))+");s=p.stat();assert (s.st_uid,s.st_gid)==(1000,109);print(json.dumps({'uid':s.st_uid,'gid':s.st_gid}))"))
  denied=Path(pj('source','/denied'));denied.mkdir();(denied/'secret').write_text('DENIED');denied.chmod(0)
  try:
   for a in [0,1]:rows.append(run(a,"from pathlib import Path;\ntry:Path("+repr(pj(a,'/denied/secret'))+").read_bytes();raise AssertionError('read should be denied')\nexcept PermissionError:print('EACCES')"))
  finally:denied.chmod(0o700)
  for a in [0,1]:
   rows.append(run(a,"from pathlib import Path;p=Path('/Volumes/autobyteus-shared');assert not (p/'root/.codex/api008-sentinel').exists();assert not (p/'home/autobyteus/data/api008-sentinel').exists();print('node private directories not exported')"))
  return rows
 case('FS11-permissions',permissions)
 def shell(who,script,check=True):
  a=['sudo','-n','docker','exec','--user','1000:109',['ab-nfs-api008-cmd-a','ab-nfs-api008-cmd-b'][who],'env','-i','HOME=/tmp/api008-test-home','PATH=/usr/local/bin:/usr/bin:/bin','sh','-ec',script]
  p=sp.run(a,capture_output=True,text=True,timeout=45);z={'actor':who,'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};out['commands'].append(z);save()
  if check:assert p.returncode==0,z
  return z
 def shell_operations():
  rows=[]
  for a in [0,1]:
   p=pj(a,'/shell-'+str(a));qp=shlex.quote(p)
   rows.append(shell(a,'mkdir '+qp+'; cd '+qp+"; printf 'first\\nsecond\\n' > '雪 space.txt'; cat '雪 space.txt'; sha256sum '雪 space.txt'; printf 'third\\n' >> '雪 space.txt'; sed -i 's/second/changed/' '雪 space.txt'; printf 'first\\nchanged\\nthird\\n' > expected; cmp '雪 space.txt' expected; truncate -s 5 '雪 space.txt'; printf first > expected; cmp '雪 space.txt' expected; wc -c '雪 space.txt'; cp '雪 space.txt' temporary; mv temporary published; mkdir nested; touch nested/file; if rmdir nested 2>rmdir-error; then exit 20; fi; grep -q 'not empty' rmdir-error; stat -c '%s:%a' published"))
   rows.append(shell(1-a,'cd '+qp+"; printf first > peer-expected; cmp published peer-expected; cmp '雪 space.txt' peer-expected; cat published; sha256sum published; find nested -type f; rm nested/file; rmdir nested; rm published; test ! -e published"))
  return rows
 case('FS03-FS04-FS05 shell updates names truncate nonempty-directory',shell_operations)
 def atomic_reader():
  rows=[]
  for writer,reader in [(0,1),(1,0)]:
   path=pj(writer,'/atomic-reader-'+str(writer));commit(writer,path,"b'A'*1048576")
   code="""import pathlib,hashlib,time,json
p=pathlib.Path(PATH);allowed={hashlib.sha256(b'A'*1048576).hexdigest(),hashlib.sha256(b'B'*1048576).hexdigest()};counts={};print('READY',flush=True);start=time.monotonic()
while time.monotonic()-start<3:
 b=p.read_bytes();h=hashlib.sha256(b).hexdigest();assert h in allowed and len(b)==1048576,(len(b),h);counts[h]=counts.get(h,0)+1
print(json.dumps({'start':start,'end':time.monotonic(),'counts':counts,'reads':sum(counts.values())}),flush=True)
""".replace('PATH',repr(path))
   p=sp.Popen(argv(reader,code),stdout=sp.PIPE,stderr=sp.PIPE,text=True);assert p.stdout.readline().strip()=='READY'
   try:
    w=jrun(writer,"import pathlib,os,time,json;p=pathlib.Path("+repr(path)+");start=time.monotonic();\nfor i in range(100):\n q=p.with_name(p.name+'.tmp');f=q.open('wb');f.write((b'B' if i%2==0 else b'A')*1048576);f.flush();os.fsync(f.fileno());f.close();os.replace(q,p);time.sleep(.01)\nprint(json.dumps({'start':start,'end':time.monotonic(),'replacements':100}))")
    so,se=p.communicate(timeout=10);assert p.returncode==0,(so,se);v=json.loads(so);assert v['reads']>1 and len(v['counts'])==2 and v['start']<w['end'] and w['start']<v['end'];rows.append({'writer':writer,'reader':reader,'write':w,'read':v,'readerCode':code})
   finally:
    if p.poll() is None:p.terminate();p.wait(timeout=10)
  return rows
 case('FS08 atomic replacement concurrent complete-reader',atomic_reader)
 def git_index_lock():
  p=pj(0,'/git');q=shlex.quote(p);prefix='git -c safe.directory='+q+' -C '+q
  a=shell(0,'printf HELD > '+q+'/.git/index.lock')
  try:
   b=shell(1,prefix+' add shared.txt',check=False);assert b['rc']!=0 and 'index.lock' in b['stderr'] and ('exists' in b['stderr'] or 'another git process' in b['stderr'].lower()),b
  finally:shell(0,'rm '+q+'/.git/index.lock')
  c=shell(1,prefix+' add shared.txt; '+prefix+' status --porcelain');assert c['stdout']==''
  return [a,b,c]
 case('FS12 Git index-lock refusal and after-release success',git_index_lock)
 out['result']='Pass';save();print(json.dumps({'result':'Pass','mode':mode}),flush=True)
except BaseException as e:out['result']='Fail';out['fatal']=repr(e);save();print(json.dumps({'result':'Fail','fatal':repr(e)}),flush=True);sys.exit(1)
