"""One-round Delivery read-only metadata/private backup preparation; no live config edits."""
import os,json,subprocess,hashlib,datetime,pathlib,tempfile,urllib.request
ROOT=pathlib.Path.cwd(); P=ROOT/'tickets/in-progress/docker-node2-prisma-engine-mismatch'; E=P/'delivery-evidence/dr-001'
BASE=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-private-backups')
if not BASE.exists(): BASE.mkdir(mode=0o700)
D=BASE/'docker-node2-prisma-o1-_p9x5ye3'; assert D.is_dir() and (D.stat().st_mode & 0o777)==0o700
CONF='/etc/supervisor/conf.d/supervisor-autobyteus-server.conf'
PAIR={'PRISMA_QUERY_ENGINE_LIBRARY':'/app/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-linux-arm64-openssl-3.0.x.so.node','PRISMA_SCHEMA_ENGINE_BINARY':'/app/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/schema-engine-linux-arm64-openssl-3.0.x'}
def run(cmd):
 r=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode: raise RuntimeError('read-only command failed: '+cmd[0]+' exit '+str(r.returncode))
 return r.stdout
fmt='{"id":{{json .Id}},"name":{{json .Name}},"image":{{json .Image}},"started":{{json .State.StartedAt}},"running":{{json .State.Running}},"mounts":{{json .Mounts}},"ports":{{json .NetworkSettings.Ports}}}'
ids={}
for n in ['autobyteus-server-2','autobyteus-server-0','autobyteus-server-1','buildx_buildkit_multi-platform-builder0']:
 ids[n]=json.loads(run(['docker','inspect','--format',fmt,n])); ids[n]['mounts'].sort(key=lambda x:x['Destination'])
target=ids['autobyteus-server-2']; cid=target['id']; assert target['running'] and target['image']=='sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1'
mounts=target['mounts']; assert {m['Name'] for m in mounts if m['Type']=='volume'}=={'autobyteus-server-2-'+x for x in ['workspace','data','root-home','chromium-profile']}
assert len([m for m in mounts if m['Type']=='bind'])==2
assert any(p['HostPort']=='8003' for p in target['ports']['8000/tcp'])
def statuses(cid):
 r=subprocess.run(['docker','exec',cid,'supervisorctl','status'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 assert r.returncode in [0,3]
 return {'exit':r.returncode,'output':r.stdout}
control={n:statuses(x['id']) for n,x in ids.items() if n.startswith('autobyteus-server-')}; current=control['autobyteus-server-2']['output']; assert 'autobyteus_server                FATAL' in current,current
original=run(['docker','exec',cid,'cat',CONF]); (D/'original-supervisor.conf').write_bytes(original); os.chmod(D/'original-supervisor.conf',0o600)
script=r'''
import os,json,pathlib,configparser,csv,subprocess,stat,hashlib
p=pathlib.Path('/etc/supervisor/conf.d/supervisor-autobyteus-server.conf'); raw=p.read_text(); c=configparser.RawConfigParser(); c.read_string(raw); sec=c['program:autobyteus_server']; env={}
# Exact quoted environment assignment parser; reject shape drift/duplicates.
import re
s=sec['environment']; pat=re.compile(r'([A-Za-z_][A-Za-z0-9_]*)="([^"\\]*(?:\\.[^"\\]*)*)"')
end=0
for m in pat.finditer(s):
 assert s[end:m.start()].strip() in ('',','); k,v=m.groups(); assert k not in env; env[k]=v; end=m.end()
assert not s[end:].strip(); assert 'PRISMA_QUERY_ENGINE_LIBRARY' not in env and 'PRISMA_SCHEMA_ENGINE_BINARY' not in env
expected="/bin/bash -lc 'cd /app/autobyteus-server-ts && exec node dist/app.js --host \"${AUTOBYTEUS_BIND_HOST:-0.0.0.0}\" --port \"${AUTOBYTEUS_SERVER_PORT:-8000}\" --data-dir \"${AUTOBYTEUS_DATA_DIR:-/home/autobyteus/data}\"'"
assert sec['command']==expected and sec['directory']=='/app/autobyteus-server-ts' and sec['user']=='root' and sec['autostart']=='true'
superpid=subprocess.check_output(['supervisorctl','pid']).decode().strip()
base=dict(x.split('=',1) for x in pathlib.Path('/proc/'+superpid+'/environ').read_bytes().decode().split('\0') if '=' in x); base.update(env)
# Login shell evaluation gives ACTUAL nonsecret effective path input, not a default-path guess.
js="""const fs=require('fs'),path=require('path'),dotenv=require('/app/autobyteus-server-ts/node_modules/dotenv');const root='/app/autobyteus-server-ts',data=process.env.AUTOBYTEUS_DATA_DIR||'/home/autobyteus/data';if(!path.isAbsolute(data))throw Error('Nonabsolute data');const file=path.join(data,'.env'),parsed=dotenv.parse(fs.readFileSync(file));const keys=['DATABASE_URL','DB_TYPE','APP_ENV','AUTOBYTEUS_DATA_DIR','AUTOBYTEUS_MEMORY_DIR','AUTOBYTEUS_LOG_DIR','AUTOBYTEUS_TEMP_WORKSPACE_DIR','AUTOBYTEUS_AGENT_DEFINITION_DIRS','AUTOBYTEUS_AGENT_TEAM_DEFINITION_DIRS','AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS','AUTOBYTEUS_AGENT_PACKAGE_ROOTS','PRISMA_QUERY_ENGINE_LIBRARY','PRISMA_SCHEMA_ENGINE_BINARY'];const selected={};for(const k of keys){const v=process.env[k]??parsed[k];if(v!==undefined)selected[k]=v;} if(selected.DATABASE_URL&&!selected.DATABASE_URL.startsWith('file:'))throw Error('nonSQLite target');console.log(JSON.stringify({dataDir:data,configPath:file,appRoot:root,selected}));"""
cmd=['/bin/bash','-lc','cd /app/autobyteus-server-ts && exec node -e '+__import__('shlex').quote(js)]
r=subprocess.run(cmd,env=base,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True); assert r.returncode==0,'Narrow path lookup failed'
obj=json.loads(r.stdout); sel=obj['selected']; assert sel.get('DB_TYPE','sqlite')=='sqlite'
data=pathlib.Path(obj['dataDir']); url=sel.get('DATABASE_URL'); app=pathlib.Path(obj['appRoot'])
if url:
 assert '?' not in url and '#' not in url and url.startswith('file:') and not url[5:].startswith('//')
 q=url[5:]; db=pathlib.Path(q) if pathlib.Path(q).is_absolute() else app/q
else: db=data/'db'/('test.db' if sel.get('APP_ENV')=='test' else 'production.db')
db=db.resolve(strict=True); key=pathlib.Path(str(db)+'.secret.key')
assert data.resolve(strict=True)==data and (data/'memory').is_dir() and (data/'.env').is_file() and db.is_file() and key.is_file()
# No running backend or inherited database writer: inspect process identities/FD references, never argv/environ dumps.
backend=[]; writers=[]
for proc in pathlib.Path('/proc').iterdir():
 if not proc.name.isdigit():continue
 try:
  argv=(proc/'cmdline').read_bytes().split(b'\0')
  if any(x.endswith(b'dist/app.js') for x in argv):backend.append(proc.name)
  for fd in (proc/'fd').iterdir():
   try:
    target=os.readlink(fd)
    if target in [str(db),str(db)+'-wal',str(db)+'-shm']:
     flags=int(re.search(r'^flags:\s*(\d+)',(proc/'fdinfo'/fd.name).read_text(),re.M).group(1),8)
     if flags&3 in (1,2):writers.append({'pid':proc.name,'fd':fd.name})
   except (FileNotFoundError,PermissionError,OSError):pass
 except (FileNotFoundError,PermissionError,ProcessLookupError,OSError):pass
assert not backend and not writers, 'Active backend/database writer; quiescence required'
protected={}
for x in [data/'.env',key]:
 st=x.stat(); protected[str(x)]={'sha256':hashlib.sha256(x.read_bytes()).hexdigest(),'bytes':st.st_size,'uid':st.st_uid,'gid':st.st_gid,'mode':oct(stat.S_IMODE(st.st_mode))}
st=p.stat(); obj.update({'dbPath':str(db),'rootKeyPath':str(key),'memoryPath':str(data/'memory'),'configStat':{'mode':stat.S_IMODE(st.st_mode),'uid':st.st_uid,'gid':st.st_gid},'configSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'environmentNames':list(env),'commandMatchesReviewedContract':True,'backendPids':backend,'databaseWriteFds':writers,'protected':protected})
print(json.dumps(obj))
'''
meta=json.loads(run(['docker','exec',cid,'python3','-c',script])); assert hashlib.sha256(original).hexdigest()==meta['configSha256']
# Any engine inputs from login environment must be absent before this pin; reject unexpected existing override/profile interference.
assert not any(k in meta['selected'] for k in PAIR)
revision=run(['docker','exec',cid,PAIR['PRISMA_SCHEMA_ENGINE_BINARY'],'--version']).decode().strip(); assert revision=='schema-engine-cli 605197351a3c8bdd595af2d2a9bc3025bca48ea2'
qjs="const e=require('/app/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-linux-arm64-openssl-3.0.x.so.node');console.log(JSON.stringify(e.version())));"
# API independently established native query revision; runtime recheck both installed files' metadata via DB-free native getVersion.
qjs=qjs.replace('())));','()));') if False else "const e=require('/app/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-linux-arm64-openssl-3.0.x.so.node');console.log(JSON.stringify(e.version()));"
query=json.loads(run(['docker','exec',cid,'node','-e',qjs])); assert '605197351a3c8bdd595af2d2a9bc3025bca48ea2' in json.dumps(query)
health=json.load(urllib.request.urlopen('http://127.0.0.1:8001/rest/health',timeout=10)); assert health['status']=='ok'
state={'privateBackupDir':str(D),'node2':target,'controls':ids,'supervisorBefore':control,'paths':meta,'pair':PAIR,'schemaVersion':revision,'queryVersion':query,'health8001':health,'originalConfigPrivate':'original-supervisor.conf','integration':{'candidateBefore':'f1bd242b7c3e9b7f4fcd84956c2f59049c4b2eac','base':'a609de982a22925299d550bea4084e578cc5cd60','latest':'d9bccf2550b918ab138e30486ef4dbf1d5e9d1ff','integrated':'5508a275704ed5465ab731f4b0cebfa7d8751991','O1StartupConfigDockerDiff':'empty'}}
(E/'live-preflight.json').write_text(json.dumps(state,indent=2)+'\n'); (D/'metadata.json').write_text(json.dumps(state,indent=2)+'\n'); os.chmod(D/'metadata.json',0o600)
print(json.dumps({'privateBackupDir':str(D),'targetId':cid,'state':'FATAL; no backend or DB writers; exact6mounts retained','paths':meta,'schemaVersion':revision,'queryVersion':query,'health8001':health},indent=2))
