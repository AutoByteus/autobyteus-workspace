"""Expanded implementation self-checks requested by user; not API/E2E signoff.
Uses clean environment/temporary homes, leaves all RUN_* / provider gates unset,
serializes builds and checks. No agents are delegated and no live NFS/Docker is used.
"""
import os,pathlib,json,subprocess,tempfile,time,signal
root=pathlib.Path.cwd();evidence=pathlib.Path(__file__).resolve().parent
steps=[
 ('core-unit-all',['pnpm','-C','autobyteus-ts','exec','vitest','run','tests/unit','--no-watch','--maxWorkers=2']),
 ('web-unit-all',['pnpm','-C','autobyteus-web','test:nuxt','--run','--maxWorkers=2']),
 ('electron-unit-all',['pnpm','-C','autobyteus-web','test:electron','--run','--maxWorkers=2']),
 ('web-build',['pnpm','-C','autobyteus-web','build']),
 ('integration-prepare',['pnpm','-C','autobyteus-server-ts','test:integration:prepare']),
 ('changed-boundary-integration',['pnpm','-C','autobyteus-server-ts','exec','vitest','run',
  'tests/integration/agent-execution/agent-run-manager.integration.test.ts',
  'tests/integration/agent-execution/agent-run-service.integration.test.ts',
  'tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts',
  'tests/integration/skills/skill-integration.test.ts',
  'tests/integration/file-explorer/file-explorer.integration.test.ts',
  'tests/integration/file-explorer/file-name-indexer.integration.test.ts',
  'tests/integration/file-explorer/file-search.integration.test.ts',
  'tests/integration/file-explorer/file-system-watcher.integration.test.ts',
  'tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts',
  '--no-watch','--maxWorkers=1']),
]
report={'scope':'expanded implementation checks; live/provider/API-E2E gates unset','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'steps':[]}
output=evidence/'expanded-local-checks-result.json'
for name,command in steps:
 entry={'name':name,'command':command,'startedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())};report['steps'].append(entry);output.write_text(json.dumps(report,indent=2)+'\n')
 if name=='changed-boundary-integration' and report['steps'][-2].get('exitCode')!=0:
  entry['skipped']='integration prerequisites failed';continue
 with tempfile.TemporaryDirectory(prefix='nfs-expanded-'+name+'-') as home:
  entry['temporaryHome']=home
  env={'PATH':os.environ['PATH'],'HOME':home,'TMPDIR':home,'LANG':'en_US.UTF-8','LC_ALL':'en_US.UTF-8','CI':'1','COREPACK_ENABLE_DOWNLOAD_PROMPT':'0'}
  with (evidence/(name+'.log')).open('w') as log:
   log.write('COMMAND '+json.dumps(command)+'\nCLEAN_ENV keys='+','.join(sorted(env))+'\n');log.flush()
   started=time.monotonic();proc=subprocess.Popen(command,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
   entry['pid']=proc.pid;output.write_text(json.dumps(report,indent=2)+'\n')
   entry['exitCode']=proc.wait();entry['seconds']=round(time.monotonic()-started,3)
   try:
    os.killpg(proc.pid,0);entry['leftoverOwnProcessGroup']=True;os.killpg(proc.pid,signal.SIGTERM);time.sleep(0.5)
    try:os.killpg(proc.pid,signal.SIGKILL)
    except ProcessLookupError:pass
   except ProcessLookupError:entry['leftoverOwnProcessGroup']=False
 entry['temporaryHomeRemoved']=not pathlib.Path(entry['temporaryHome']).exists()
 output.write_text(json.dumps(report,indent=2)+'\n');print(name,entry.get('exitCode'),flush=True)
