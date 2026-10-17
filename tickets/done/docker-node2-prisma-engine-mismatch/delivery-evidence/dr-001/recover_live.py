"""Authorized O1 operational recovery only: consistent private backup, exact backend pair, named update."""
import pathlib,subprocess,json,hashlib,os,tarfile,sqlite3,time,re,urllib.request,datetime
P=pathlib.Path('tickets/in-progress/docker-node2-prisma-engine-mismatch'); E=P/'delivery-evidence/dr-001'; state=json.loads((E/'live-preflight.json').read_text()); D=pathlib.Path(state['privateBackupDir']); cid=state['node2']['id']; CONF='/etc/supervisor/conf.d/supervisor-autobyteus-server.conf'; pair=state['pair']; events=[]
def event(stage,**data):
 events.append({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stage':stage,**data}); (E/'operation-events.json').write_text(json.dumps(events,indent=2)+'\n'); print(stage, json.dumps(data),flush=True)
def command(args,stdin=None,allow=(0,)):
 r=subprocess.run(['docker']+args,input=stdin,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode not in allow: raise RuntimeError('Docker '+args[0]+' exit'+str(r.returncode))
 return r.stdout
fmt='{"id":{{json .Id}},"name":{{json .Name}},"image":{{json .Image}},"started":{{json .State.StartedAt}},"running":{{json .State.Running}},"mounts":{{json .Mounts}},"ports":{{json .NetworkSettings.Ports}}}'
def identity(name):
 x=json.loads(command(['inspect','--format',fmt,name]));x['mounts'].sort(key=lambda x:x['Destination']);return x
assert identity('autobyteus-server-2')==state['node2'],'Target changed before backup'
assert (D.stat().st_mode&0o777)==0o700
original=(D/'original-supervisor.conf').read_bytes(); assert command(['exec',cid,'cat',CONF])==original
quiesce=r'''
import pathlib,os,re,json
p=pathlib.Path('/home/autobyteus/data/db/production.db');active=[];writefds=[]
for proc in pathlib.Path('/proc').iterdir():
 if not proc.name.isdigit():continue
 try:
  if any(x.endswith(b'dist/app.js') for x in (proc/'cmdline').read_bytes().split(b'\0')):active.append(proc.name)
  for fd in (proc/'fd').iterdir():
   try:
    if os.readlink(fd) in [str(p),str(p)+'-wal',str(p)+'-shm']:
     f=int(re.search(r'^flags:\s*(\d+)',(proc/'fdinfo'/fd.name).read_text(),re.M).group(1),8)
     if f&3 in (1,2):writefds.append({'pid':proc.name,'fd':fd.name})
   except (OSError,FileNotFoundError):pass
 except (OSError,FileNotFoundError):pass
assert not active and not writefds,'Writer active; no backup/start allowed'
print(json.dumps({'backendPids':active,'databaseWriteFds':writefds}))
'''
assert state['paths']['dbPath']=='/home/autobyteus/data/db/production.db'; assert state['paths']['rootKeyPath']==state['paths']['dbPath']+'.secret.key'; assert state['paths']['dataDir']=='/home/autobyteus/data'
q=json.loads(command(['exec',cid,'python3','-c',quiesce]));event('Writer quiescence confirmed',**q)
archive=D/'affected-state.tar'; assert not archive.exists()
fd=os.open(archive,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
with os.fdopen(fd,'wb') as out:
 r=subprocess.run(['docker','exec',cid,'tar','--numeric-owner','--acls','--xattrs','-cpf','-','-C','/','home/autobyteus/data','etc/supervisor/conf.d/supervisor-autobyteus-server.conf'],stdout=out,stderr=subprocess.PIPE)
 assert r.returncode==0,'Archive failed before live writes'
 out.flush();os.fsync(out.fileno())
q2=json.loads(command(['exec',cid,'python3','-c',quiesce])); assert q2==q
assert identity('autobyteus-server-2')==state['node2']; assert command(['exec',cid,'cat',CONF])==original
# Validate archive by reading copied DB/settings/key/config, not live records or a live DB operation.
expected=['home/autobyteus/data/.env','home/autobyteus/data/db/production.db','home/autobyteus/data/db/production.db.secret.key','etc/supervisor/conf.d/supervisor-autobyteus-server.conf']; extracted=D/'validation-copy'; extracted.mkdir(mode=0o700)
with tarfile.open(archive,'r:') as t:
 members=t.getmembers(); count=sum(m.isfile() for m in members)
 for path in expected+['home/autobyteus/data/db/production.db-wal','home/autobyteus/data/db/production.db-shm']:
  try:m=t.getmember(path)
  except KeyError:
   assert path not in expected;continue
  assert m.isfile(); data=t.extractfile(m).read(); dest=extracted/pathlib.Path(path).name; dest.write_bytes(data);os.chmod(dest,0o600)
  if path.endswith('.env') or path.endswith('.secret.key'):
   assert hashlib.sha256(data).hexdigest()==state['paths']['protected']['/'+path]['sha256']
  if path.endswith('supervisor-autobyteus-server.conf'): assert data==original
copydb=extracted/'production.db'
conn=sqlite3.connect(copydb.as_uri()+'?mode=ro',uri=True); check=[row[0] for row in conn.execute('PRAGMA quick_check')];conn.close();assert check==['ok'],'Private snapshot DB integrity failed; no live edit'
receipt={'privateDirectory':str(D),'directoryMode':'0700','archive':str(archive),'archiveMode':oct(archive.stat().st_mode&0o777),'archiveBytes':archive.stat().st_size,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'archivedRegularFiles':count,'scope':'Entire actual /home/autobyteus/data including canonical DB + any WAL/SHM, root-key/.env/settings/memory/app-data migration inputs; actual original Supervisor file/permissions. No root-home/browser/workspace copies or edits. Custom workspace/package roots recorded and retained as original binds.','canonicalDataPathProvenBy':'Actual existing program + daemon/login shell filtered path metadata + dotenv parsed settings + installed AppConfig/database-location contract; not defaults alone','dbPath':state['paths']['dbPath'],'rootKeyPath':state['paths']['rootKeyPath'],'snapshotQuickCheck':check,'consistency':'No backend/DB writer before and after tar; copied SQLite checked read-only; target identity/config unchanged','settingsAndRootKeyHashesMatchBefore':True,'automaticRestoreAuthorized':False}
(D/'backup-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');os.chmod(D/'backup-receipt.json',0o600);(E/'backup-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');event('Private affected-state backup verified',archiveBytes=archive.stat().st_size,snapshotQuickCheck=check,privateDirectory=str(D))
text=original.decode(); lines=text.splitlines(keepends=True); section=None; indices=[]
for i,line in enumerate(lines):
 if line.startswith('['):section=line.strip()
 if section=='[program:autobyteus_server]' and line.startswith('environment='):indices.append(i)
assert len(indices)==1;i=indices[0]; added=','.join(k+'="'+v+'"' for k,v in pair.items()); oldline=lines[i]; newline=oldline.rstrip('\r\n')+','+added+'\n';lines[i]=newline;candidate=''.join(lines).encode(); assert candidate.replace((','+added).encode(),b'',1)==original
(D/'candidate-supervisor.conf').write_bytes(candidate);os.chmod(D/'candidate-supervisor.conf',0o600)
# Atomic same-directory replacement, CAS-protected old bytes/digest + original owner/mode. Nothing else altered.
atomic=r'''
import pathlib,hashlib,sys,os,tempfile,stat,json
p=pathlib.Path('/etc/supervisor/conf.d/supervisor-autobyteus-server.conf'); before=p.read_bytes(); expected=sys.argv[1]; assert hashlib.sha256(before).hexdigest()==expected,'Concurrent config drift'
st=p.stat(); candidate=sys.stdin.buffer.read(); fragment=bytes.fromhex(sys.argv[2]);assert candidate.replace(fragment,b'',1)==before and candidate.count(fragment)==1
fd,name=tempfile.mkstemp(prefix='.delivery-prisma-o1-',dir=p.parent)
try:
 os.fchmod(fd,stat.S_IMODE(st.st_mode));os.fchown(fd,st.st_uid,st.st_gid)
 with os.fdopen(fd,'wb') as f:f.write(candidate);f.flush();os.fsync(f.fileno())
 os.replace(name,p); directory=os.open(p.parent,os.O_DIRECTORY);os.fsync(directory);os.close(directory)
finally:
 if os.path.exists(name):os.unlink(name)
print(json.dumps({'oldSha256':expected,'newSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mode':stat.S_IMODE(p.stat().st_mode),'uid':p.stat().st_uid,'gid':p.stat().st_gid,'onlyTwoEnvironmentValuesAdded':True,'atomicSameDirectory':True}))
'''
write=json.loads(command(['exec','-i',cid,'python3','-c',atomic,hashlib.sha256(original).hexdigest(),(','+added).encode().hex()],candidate));event('ONLY backend two-value pin applied',**write)
reread=command(['exec',cid,'supervisorctl','reread']).decode();assert reread.strip()=='autobyteus_server: changed', 'Unexpected changed programs after reread; do not update';event('Supervisor reread',output=reread.strip())
update=command(['exec',cid,'supervisorctl','update','autobyteus_server']).decode();event('ONLY named backend update',output=update.strip(),duplicateRestart=False)
health=[]
for attempt in range(90):
 try:
  with urllib.request.urlopen('http://127.0.0.1:8003/rest/health',timeout=3) as r:
   body=json.load(r); assert r.status==200 and body.get('status')=='ok';health.append({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':r.status,'body':body})
  if len(health)>=3:break
 except Exception:pass
 time.sleep(2)
(E/'live-health8003.json').write_text(json.dumps(health,indent=2)+'\n')
status=command(['exec',cid,'supervisorctl','status'],allow=(0,3)).decode();(E/'supervisor-after.txt').write_text(status)
stdout=command(['exec',cid,'cat','/var/log/supervisor/autobyteus_server.log']);stderr=command(['exec',cid,'cat','/var/log/supervisor/autobyteus_server.err.log']);
for name,data in [('after-backend.log',stdout),('after-backend.err.log',stderr)]: (D/name).write_bytes(data);os.chmod(D/name,0o600)
assert len(health)>=3 and re.search(r'^autobyteus_server\s+RUNNING\s+pid (\d+)',status,re.M), 'Actual backend not ready; preserve backup/state/config and report blocker'
pid=re.search(r'^autobyteus_server\s+RUNNING\s+pid (\d+)',status,re.M).group(1)
selected=r'''
import pathlib,sys,json,hashlib
pid=sys.argv[1]; env=dict(x.split('=',1) for x in (pathlib.Path('/proc')/pid/'environ').read_bytes().decode().split('\0') if '=' in x); keys=['PRISMA_QUERY_ENGINE_LIBRARY','PRISMA_SCHEMA_ENGINE_BINARY','DATABASE_URL','AUTOBYTEUS_DATA_DIR','AUTOBYTEUS_MEMORY_DIR'];print(json.dumps({k:env.get(k) for k in keys}))
'''
effective=json.loads(command(['exec',cid,'python3','-c',selected,pid]));assert all(effective[k]==v for k,v in pair.items()),'Live login environment drift'
lines=stdout.decode(errors='replace').splitlines(); selectedlogs=[x for x in lines if 'Using Prisma engine overrides from existing-env:' in x or x in ['Running Prisma migrations...','Database migrations completed successfully.','Baseline migration resolved; database migrations completed.'] or x.startswith(('APP DATA DIRECTORY:','DB DIRECTORY:','MEMORY DIRECTORY:','Secret vault initialized','App-data migration','Application data migration'))]; assert any('existing-env' in x for x in selectedlogs)
(E/'normal-startup-facts.json').write_text(json.dumps({'backendPid':pid,'effectivePair':{k:effective[k] for k in pair},'normalStartupSelectedLines':selectedlogs[-20:],'privateFullLogRetention':str(D),'HTTPProvesNormalLifecycleNotOnlySchema':True},indent=2)+'\n')
# Check current protected files without contents; current data DB may legitimately have ordinary startup writes.
checks=r'''
import pathlib,hashlib,json,sys
paths=json.loads(sys.argv[1]); print(json.dumps({p:{'sha256':hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest(),'bytes':pathlib.Path(p).stat().st_size,'uid':pathlib.Path(p).stat().st_uid,'gid':pathlib.Path(p).stat().st_gid,'mode':oct(pathlib.Path(p).stat().st_mode&0o777)} for p in paths}))
'''
protected=json.loads(command(['exec',cid,'python3','-c',checks,json.dumps(list(state['paths']['protected']))]));assert protected==state['paths']['protected'],'Settings/root-key changed; preserve evidence, investigate without reset'
controls={n:identity(n) for n in state['controls']};assert controls==state['controls'],'Container identity/mount/control drift'
controlstatus={}
for n,x in controls.items():
 if n.startswith('autobyteus-server-'):controlstatus[n]=command(['exec',x['id'],'supervisorctl','status'],allow=(0,3)).decode()
def pids(status):return {n:pid for n,pid in re.findall(r'^(\S+)\s+RUNNING\s+pid (\d+)',status,re.M)}
beforep=pids(state['supervisorBefore']['autobyteus-server-2']['output']);afterp=pids(status);assert len(beforep)==8 and all(afterp.get(k)==v for k,v in beforep.items()),'Sibling process continuity not preserved'
for n in ['autobyteus-server-0','autobyteus-server-1']:
 assert pids(state['supervisorBefore'][n]['output'])==pids(controlstatus[n]),'Other node process drift'
with urllib.request.urlopen('http://127.0.0.1:8001/rest/health',timeout=10) as r: health1={'status':r.status,'body':json.load(r)};assert r.status==200 and health1['body']['status']=='ok'
preservation={'node2AndAllControlsIdentityStartImageMountsUnchanged':True,'node2EightSiblingPidsUnchanged':True,'otherNodeSupervisorPidsUnchanged':True,'settingsAndRootKeyUnchanged':True,'protected':protected,'health8001':health1,'node2LeftRunning':True,'backupKept':str(D),'pinLifetime':'Same container restart only; recreation from unfixed image loses it; O2 still required','backendPid':pid,'effectivePair':{k:effective[k] for k in pair},'readiness8003':health,'supervisorWholeStatus':'Actual node2 RUNNING siblings/browser; startup helper EXITED, not all-program Pass','dataByteIdentityNotClaimed':'Normal shipped startup/migration writes allowed; no records/ledger/reset/migration bypass'}
(E/'live-preservation.json').write_text(json.dumps(preservation,indent=2)+'\n');event('Actual node2 readiness and preservation verified',http200Count=len(health),backendPid=pid,otherNodesUntouched=True,backupKept=str(D),next='Explicit user usability verification; O1 receipt to Solution Designer, O2 remains open')
