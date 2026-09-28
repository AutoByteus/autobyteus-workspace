import datetime,subprocess,time,sys
from pathlib import Path
root=Path.cwd(); p=root/'tickets/in-progress/server-docker-preinstalled-clis'; evidence=p/'api-e2e-evidence'
ledger=p/'api-e2e-test-case-ledger.md'
def event(case,text):
 with ledger.open('a') as f:f.write(f'- {datetime.datetime.now(datetime.timezone.utc).isoformat()} {case} {text}\n')
 print(case,text,flush=True)
def run(case,command,path,limit):
 event(case,'Started: '+' '.join(command))
 with path.open('w') as log:
  log.write('$ '+' '.join(command)+'\n');log.flush()
  process=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT)
  start=time.monotonic()
  while True:
   try:code=process.wait(timeout=60);break
   except subprocess.TimeoutExpired:
    event(case,f'Checkpoint: running {int(time.monotonic()-start)} seconds; evidence {path.name}.')
    if time.monotonic()-start>limit:
     process.terminate()
     try:process.wait(timeout=15)
     except subprocess.TimeoutExpired:process.kill();process.wait()
     code=124;break
  log.write(f'\nEXEC_EXIT={code}\n')
 event(case,f'Completed {"Pass" if code==0 else "Fail"}: exit {code}; evidence api-e2e-evidence/{path.name}.')
 if code:raise SystemExit(code)
for variant,arch in [('zh','arm64'),('default','amd64'),('zh','amd64')]:
 name=f'{variant}-{arch}';image=f'autobyteus-cli-api001:{name}'
 if len(sys.argv)>1 and name not in sys.argv[1:]:continue
 run('CASE-BUILD-'+name,['docker','buildx','build','--builder','desktop-linux','--progress','plain','--platform','linux/'+arch,'--load','--build-arg','CLI_INSTALL_CACHE_BUSTER=api001-a','--build-arg','BASE_IMAGE_TAG='+('latest' if variant=='default' else 'zh'),'-f','autobyteus-server-ts/docker/Dockerfile.monorepo','-t',image,'.'],evidence/f'build-{name}.log',2400)
 run('CASE-CLI-'+name,['python3','scripts/tests/server_docker_cli_smoke.py','--image',image,'--platform','linux/'+arch],evidence/f'cli-{name}.log',600)
 run('CASE-LIVE-'+name,['python3',str(evidence/'live_probe.py'),image],evidence/f'live-{name}.log',600)
