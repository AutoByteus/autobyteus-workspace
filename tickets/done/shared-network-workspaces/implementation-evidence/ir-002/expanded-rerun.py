"""Historical candidate-only diagnostic rerun. Candidate is NOT in current NFS source."""
import os,pathlib,tempfile,json,subprocess,time,hashlib
root=pathlib.Path.cwd();e=pathlib.Path(__file__).resolve().parent
disposition=json.loads((e/'updater-candidate-disposition.json').read_text())
if any(hashlib.sha256((root/f['path']).read_bytes()).hexdigest()!=f['candidateSha256'] for f in disposition['files']):
 raise SystemExit('Candidate-only harness: current source does not contain the historical updater experiment. Use normal suite commands for current-source validation.')
steps=[('electron-unit-all-rerun',['pnpm','-C','autobyteus-web','test:electron','--run','--maxWorkers=2']),
 ('electron-typecheck',['pnpm','-C','autobyteus-web','transpile-electron']),
 ('web-unit-all-rerun',['pnpm','-C','autobyteus-web','test:nuxt','--run','--maxWorkers=2'])]
report={'scope':'implementation self-checks; no live/provider gates','steps':[]};out=e/'expanded-rerun-result.json'
for name,cmd in steps:
 entry={'name':name,'command':cmd};report['steps'].append(entry);out.write_text(json.dumps(report,indent=2)+'\n')
 with tempfile.TemporaryDirectory(prefix='nfs-expanded-rerun-') as home,(e/(name+'.log')).open('w') as log:
  entry['temporaryHome']=home;env={'PATH':os.environ['PATH'],'HOME':home,'TMPDIR':home,'LANG':'en_US.UTF-8','LC_ALL':'en_US.UTF-8','CI':'1','COREPACK_ENABLE_DOWNLOAD_PROMPT':'0'}
  log.write('COMMAND '+json.dumps(cmd)+'\nCLEAN_ENV keys='+','.join(sorted(env))+'\n');log.flush();start=time.monotonic()
  p=subprocess.Popen(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True);entry['pid']=p.pid;out.write_text(json.dumps(report,indent=2)+'\n');entry['exitCode']=p.wait();entry['seconds']=round(time.monotonic()-start,3)
 entry['temporaryHomeRemoved']=not pathlib.Path(home).exists();out.write_text(json.dumps(report,indent=2)+'\n');print(name,entry['exitCode'],flush=True)
