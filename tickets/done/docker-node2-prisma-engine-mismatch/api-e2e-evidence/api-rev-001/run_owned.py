"""O1 owned unchanged-image validation. No user node or shared volumes touched."""
import datetime,json,os,pathlib,subprocess,tempfile,time,urllib.request,uuid,traceback
R=pathlib.Path.cwd();P=R/'tickets/in-progress/docker-node2-prisma-engine-mismatch';E=P/'api-e2e-evidence/api-rev-001';L=P/'api-e2e-test-case-ledger.md'
image='sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1'
inp=json.loads((P/'implementation-evidence/ir-001/operational-input.json').read_text()); q=inp['PRISMA_QUERY_ENGINE_LIBRARY']; s=inp['PRISMA_SCHEMA_ENGINE_BINARY']
name='api-o1-prisma-'+uuid.uuid4().hex[:12]; cfg='/etc/supervisor/conf.d/supervisor-autobyteus-server.conf'; owned=False;case='API-001'; logs=[];results={};env={'PATH':'/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin','HOME':os.environ['HOME']}
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def event(c,kind,expected,observed,filename):
 with L.open('a') as f:f.write(f'| {stamp()} | {c} | {kind} | {expected} | {observed} | {filename} |\n')
def run(args,check=True,timeout=30,input=None):
 r=subprocess.run(args,cwd=R,env=env,text=True,input=input,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
 logs.append({'command':args,'exit':r.returncode,'output':r.stdout})
 (E/(case+'.json')).write_text(json.dumps(logs,indent=2)+'\n')
 if check and r.returncode:raise RuntimeError(f'Command failed {args}: {r.stdout}')
 return r.stdout

def start(c,expected):
 global case,logs
 case=c;logs=[];event(c,'Started',expected,'Pending',c+'.json')
def finish(observed):
 results[case]={'result':'Pass','observed':observed};(E/'results.json').write_text(json.dumps(results,indent=2)+'\n');event(case,'Completed','As planned','Pass: '+observed,case+'.json');print(case,'Pass',observed,flush=True)
def ctl(*args,check=True):return run(['docker','exec',name,'supervisorctl',*args],check=check)
def pids():
 status=ctl('status',check=False);out={}
 for line in status.splitlines():
  fields=line.split()
  if len(fields)>3 and fields[1]=='RUNNING':out[fields[0]]=fields[3].rstrip(',')
 return out

def health(port):
 observations=[]
 for attempt in range(90):
  try:
   with urllib.request.urlopen(f'http://127.0.0.1:{port}/rest/health',timeout=3) as response:
    body=json.load(response);assert response.status==200 and body['status']=='ok';observations.append({'utc':stamp(),'status':200,'body':body})
    (E/(case+'-health.json')).write_text(json.dumps(observations,indent=2)+'\n')
    if len(observations)==3:return observations
  except Exception as ex:
   if attempt%10==0:event(case,'Checkpoint','Repeated health','Not ready yet: '+type(ex).__name__,case+'.json')
  time.sleep(2)
 raise RuntimeError('Normal startup never reached3 health200/statusok observations')

with tempfile.TemporaryDirectory(prefix='api-o1-owned-') as tmp:
 tmp=pathlib.Path(tmp)
 try:
  start('API-001','No source delta; exact proposal/applicable O1 boundary')
  assert not run(['git','diff','a609de982a22925299d550bea4084e578cc5cd60','HEAD','--','.',':!tickets']).strip()
  original=(R/'autobyteus-server-ts/docker/supervisor-autobyteus-server.conf').read_text();candidate=(P/'implementation-evidence/ir-001/supervisor-template.pinned.conf').read_text()
  addition=f',PRISMA_QUERY_ENGINE_LIBRARY="{q}",PRISMA_SCHEMA_ENGINE_BINARY="{s}"'
  assert candidate.replace(addition,'')==original
  info=json.loads(run(['docker','image','inspect',image,'--format','{{json .}}']))
  assert info['Id']==image and info['Architecture']=='arm64'
  # Save only public image identity/config safety metadata, no environment dump.
  (E/'image.json').write_text(json.dumps({k:info.get(k) for k in ['Id','Architecture','Os','Created']},indent=2)+'\n')
  # image inspect . stdout includes env defaults, not user state, but retain filtered only.
  logs[-1]['output']=json.dumps({'Id':info['Id'],'Architecture':info['Architecture'],'user_mounts':False});(E/(case+'.json')).write_text(json.dumps(logs,indent=2)+'\n')
  finish('Zero shipped delta; exact two-value proposal; pinned local arm64 image')
  start('API-002','Owned signed-out native605 pair/RPC and complete override')
  cid=run(['docker','create','--pull','never','--name',name,'--label','autobyteus.api-o1=docker-node2-prisma-engine-mismatch','-p','127.0.0.1::8000','--tmpfs','/root:rw,mode=0700','--tmpfs','/home/autobyteus/data:rw,mode=0700','-e','AUTOBYTEUS_SKIP_SYNC=1',image]).strip();owned=True
  run(['docker','cp',name+':'+cfg,str(tmp/'original.conf')]); installed=(tmp/'original.conf').read_text();assert installed==original,'Image config differs from reviewed public template'
  (tmp/'paused.conf').write_text(installed.replace('autostart=true','autostart=false'));run(['docker','cp',str(tmp/'paused.conf'),name+':'+cfg]);run(['docker','start',name])
  run(['docker','exec','-e','PRISMA_QUERY_ENGINE_LIBRARY='+q,'-e','PRISMA_SCHEMA_ENGINE_BINARY='+s,'-i',name,'node'],input=(E/'native.cjs').read_text())
  mount=json.loads(run(['docker','inspect',name,'--format','{{json .Mounts}}']));assert all(m['Type']=='tmpfs' for m in mount),mount
  tmpfs=json.loads(run(['docker','inspect',name,'--format','{{json .HostConfig.Tmpfs}}']));assert set(tmpfs)=={'/root','/home/autobyteus/data'},tmpfs
  signedout=json.loads(run(['docker','exec',name,'node','-e',"const f=require('fs'); const p=['/root/.gemini/antigravity-cli/antigravity-oauth-token','/root/.codex/auth.json','/root/.claude/.credentials.json'];console.log(JSON.stringify(p.map(x=>({path:x,exists:f.existsSync(x)}))))"]));assert all(not v['exists'] for v in signedout),signedout
  (E/'private-fixture.json').write_text(json.dumps({'tmpfs':tmpfs,'signInFilesAbsent':signedout},indent=2)+'\n')
  (E/'ownership.json').write_text(json.dumps({'container':name,'id':cid,'image':image,'mounts':mount,'signedOutPrivateHome':True,'userVolumes':False},indent=2)+'\n')
  finish('Installed5.22 native605 query/schema/RPC listMigrationDirectories and existing-env/canonical DB checks Pass; only tmpfs mounts')
  start('API-003','Normal startup via installed reread/named update, repeated HTTP and sibling PID continuity')
  for _ in range(30):
   state=ctl('status','autobyteus_server',check=False)
   if 'STOPPED' in state:break
   time.sleep(1)
  assert 'STOPPED' in state,state
  for _ in range(20):
   before=pids()
   if len(before)>=7:break
   time.sleep(1)
  assert len(before)>=7 and 'autobyteus_server' not in before, before
  final=installed.replace('\nenvironment=', '\nenvironment=',1).rstrip('\n')+addition+'\n' # environment is last line; preserve exact original newline
  assert final.replace(addition,'')==installed
  (tmp/'pinned.conf').write_text(final);run(['docker','cp',str(tmp/'pinned.conf'),name+':'+cfg])
  run(['docker','exec',name,'supervisorctl','version'])
  reread=ctl('reread');assert 'autobyteus_server: changed' in reread,reread
  assert 'STOPPED' in ctl('status','autobyteus_server',check=False)
  unchanged=pids();assert all(unchanged.get(k)==v for k,v in before.items()),(before,unchanged)
  ctl('update','autobyteus_server')
  port=json.loads(run(['docker','inspect',name,'--format','{{json .NetworkSettings.Ports}}']))['8000/tcp'][0];assert port['HostIp']=='127.0.0.1';port=int(port['HostPort'])
  health(port)
  after=pids();assert 'autobyteus_server' in after,after;assert all(after.get(k)==v for k,v in before.items()),(before,after)
  process_script="import json; p='"+after['autobyteus_server']+"'; pairs=dict(x.split('=',1) for x in open('/proc/'+p+'/environ','rb').read().decode().split('\\0') if '=' in x);print(json.dumps({k:pairs.get(k) for k in ['PRISMA_QUERY_ENGINE_LIBRARY','PRISMA_SCHEMA_ENGINE_BINARY']}))"
  effective=json.loads(run(['docker','exec',name,'python3','-c',process_script]));assert effective=={'PRISMA_QUERY_ENGINE_LIBRARY':q,'PRISMA_SCHEMA_ENGINE_BINARY':s},effective
  log=run(['docker','exec',name,'cat','/var/log/supervisor/autobyteus_server.log']);assert 'Using Prisma engine overrides from existing-env' in log and 'Database migrations completed successfully' in log
  (E/'supervisor-continuity.json').write_text(json.dumps({'before':before,'afterReread':unchanged,'afterUpdate':after,'effectivePair':effective,'port':port},indent=2)+'\n')
  finish('reread no start; named update starts actual normal backend;3 HTTP200/statusok; existing-env/migrations; sibling PIDs unchanged')
  start('API-004','Repeat only owned backend normal startup on same owned data; repeated readiness; cleanup')
  ctl('restart','autobyteus_server');health(port)
  log=run(['docker','exec',name,'cat','/var/log/supervisor/autobyteus_server.log']);assert log.count('Using Prisma engine overrides from existing-env')>=2
  now=pids();assert all(now.get(k)==v for k,v in before.items()),(before,now)
  finish('Same-container owned backend repeat startup/3 health observations; sibling PIDs retained; cleanup follows')
 except Exception as exc:
  if owned:
   run(['docker','logs','--tail','120',name],check=False)
   run(['docker','exec',name,'sh','-c','tail -100 /var/log/supervisor/autobyteus_server.log /var/log/supervisor/autobyteus_server.err.log'],check=False)
  (E/'failure.txt').write_text(traceback.format_exc());event(case,'Completed','As planned','Fail: '+str(exc).replace('|','/').replace('\n',' '),case+'.json');results[case]={'result':'Fail','reason':str(exc)};(E/'results.json').write_text(json.dumps(results,indent=2)+'\n');raise
 finally:
  if owned:
   cleanup=run(['docker','rm','-f','-v',name],check=False)
   absent=subprocess.run(['docker','inspect',name],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode!=0
   (E/'cleanup.json').write_text(json.dumps({'container':name,'removed':cleanup.strip()==name,'absent':absent,'onlyOwnedResources':True},indent=2)+'\n');assert absent
