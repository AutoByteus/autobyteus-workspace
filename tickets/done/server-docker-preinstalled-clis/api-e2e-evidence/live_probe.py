"""Temporary production startup/recreate probe; only synthetic owned volumes."""
import importlib.util,json,subprocess,sys,time,uuid
from pathlib import Path
root=Path(__file__).resolve().parents[4]
spec=importlib.util.spec_from_file_location('smoke',root/'scripts/tests/server_docker_cli_smoke.py')
smoke=importlib.util.module_from_spec(spec);spec.loader.exec_module(smoke)
image=sys.argv[1];prefix='cli-api001-'+uuid.uuid4().hex[:10]
volumes=[];containers=[]
def cmd(*args,check=True,timeout=60):
 print('$ '+' '.join(args[:20]),flush=True)
 r=subprocess.run(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
 print(r.stdout,flush=True)
 if check:r.check_returncode()
 return r
try:
 mounts=[]
 for suffix,target in [('home','/root'),('data','/home/autobyteus/data'),('browser','/home/vncuser/.config/chromium')]:
  v=prefix+'-'+suffix
  cmd('docker','volume','create',v);volumes.append(v)
  mounts+=['--mount',f'type=volume,source={v},target={target}']
 seed=prefix+'-seed';containers.append(seed)
 cmd('docker','run','--pull=never','--rm','--name',seed,'--network','none','--entrypoint','/bin/bash',*mounts,image,'-c',smoke.SEED+'\nchown -R vncuser:vncuser /home/vncuser/.config/chromium')
 for iteration in [1,2]:
  name=prefix+'-'+str(iteration);containers.append(name)
  cmd('docker','run','--pull=never','-d','--name',name,'--network','none','--cap-add','SYS_ADMIN','--security-opt','seccomp=unconfined','-e','AUTOBYTEUS_SKIP_SYNC=1',*mounts,image)
  ready=False
  for attempt in range(36):
   r=cmd('docker','exec',name,'curl','-fsS','--max-time','3','http://127.0.0.1:8000/rest/health',check=False)
   if r.returncode==0 and json.loads(r.stdout).get('status')=='ok':ready=True;break
   time.sleep(5)
  cmd('docker','logs','--tail','100',name,check=False)
  cmd('docker','exec',name,'bash','-c','tail -100 /var/log/supervisor/autobyteus_server.err.log; tail -30 /var/log/supervisor/autobyteus_server.log',check=False)
  if not ready:raise AssertionError('Production server did not reach /rest/health readiness')
  cmd('docker','exec',name,'bash','-lc',smoke.PROBE+smoke.VERIFY)
  cmd('docker','exec',name,'curl','-fsS','--max-time','5','http://127.0.0.1:6080/')
  cmd('docker','exec',name,'curl','-fsS','--max-time','5','http://127.0.0.1:9223/json/version')
  url='http://127.0.0.1:8000/rest/health?cli-api001='+str(iteration)
  cmd('docker','exec',name,'timeout','20s','/usr/local/bin/open-vnc-browser-url.sh',url)
  time.sleep(3)
  tabs=cmd('docker','exec',name,'curl','-fsS','--max-time','5','http://127.0.0.1:9223/json/list').stdout
  assert any(tab.get('url')==url for tab in json.loads(tabs)), 'Bridge did not open URL in Chromium'
  cmd('docker','rm','-f',name)
 print('PASS full production startup/browser bridge/state recreate',flush=True)
finally:
 for name in containers:cmd('docker','rm','-f',name,check=False)
 for v in reversed(volumes):cmd('docker','volume','rm',v,check=False)
