from pathlib import Path
import json,hashlib,subprocess,socket,datetime,time
E=Path(__file__).resolve().parent;W=E.parents[3];read=lambda n:json.loads((E/n).read_text())
i=read('api-017-history-restart.json')['result'];assert i['ownsDataRoot'];stop=read('api-017-stop.json');assert stop['ok']
p=subprocess.run(['pnpm','--silent','isolated-app','list'],cwd=W,capture_output=True,text=True);assert p.returncode==0;after=json.loads(p.stdout);(E/'api-017-instances-after-final.json').write_text(p.stdout)
before=read('api-017-instances-before.json')['result']['instances'];current={r['instanceId']:r for r in after['result']['instances']}
assert i['instanceId'] not in current and not Path(i['dataRoot']).exists();assert all(current.get(r['instanceId'])==r for r in before)
alive={int(x.strip()) for x in subprocess.check_output(['ps','-axo','pid='],text=True).splitlines() if x.strip()}
captured=read('api-017-captured-own-pids.json')['capturedIds'];assert not set(captured)&alive
ports={};waits=[];deadline=time.monotonic()+180
for port in [i['controlPort'],i['serverPort']]:
 while True:
  try:
   with socket.socket() as s:s.bind(('127.0.0.1',port));ports[str(port)]=True
   break
  except OSError as err:
   listener=subprocess.run(['lsof','-nP','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],capture_output=True,text=True)
   assert not listener.stdout.strip(),'Unexpected live listener; do not signal foreign process'
   waits.append({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'port':port,'bindErrno':err.errno,'listenerAbsent':True});assert time.monotonic()<deadline;time.sleep(2)
archive=read('api-017-owned-evidence-manifest.json')['files'];assert all(hashlib.sha256(Path(r['archive']).read_bytes()).hexdigest()==r['sha256'] for r in archive)
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'recordAbsent':True,'dataRootAbsent':True,'capturedOwnPids':captured,'capturedOwnPidsStillPresent':[],'portsFreeBind':ports,'plainBindWaits':waits,'foreignRecordsUnchanged':True,'priorForeignIds':[r['instanceId'] for r in before],'independentlyNewForeignIds':[r for r in current if r not in {v['instanceId'] for v in before}],'archiveFiles':len(archive),'archiveHashesExact':True,'observerInstalled':False,'scope':'Own exact app stopped once; final read-only verification after transient plain-bind EADDRINUSE, no additional stop/signal/REUSEADDR. Cleanup is not Task DONE/repair.'}
(E/'api-017-cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
