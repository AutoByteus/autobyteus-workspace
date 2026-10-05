from pathlib import Path
import json,hashlib,subprocess,socket,datetime
E=Path(__file__).resolve().parent
read=lambda n:json.loads((E/n).read_text())
i=read('api-013-instance.json')['result'];iid=i['instanceId'];assert i['ownsDataRoot']
before=read('api-013-instances-before.json')['result']['instances'];pre=read('api-013-instances-before-stop.json')['result']['instances'];after=read('api-013-instances-after.json')['result']['instances'];stop=read('api-013-stop.json')
pids=set(read('api-013-captured-own-pids.json')['capturedIds'])
for n in ['api-013-instance.json','api-013-restart.json','api-013-history-restart.json']:pids.add(read(n)['result']['pid'])
for n in ['api-013-round13-physical-recursive.json','api-013-native-agent-start.json','api-013-native-agent-reconnect-final.json','api-013-native-agent-done-b.json','api-013-native-agent-done-a-corrected.json']:
 if not (E/n).exists():continue
 j=read(n)
 for k in ['beforeProcesses','afterProcesses','scopeProcesses','processes']:
  if isinstance(j.get(k),list):pids.update(x['pid'] for x in j[k])
 if isinstance(j.get('exactDescendants'),list):
  pids.update(x if isinstance(x,int) else x['pid'] for x in j['exactDescendants'])
live={int(x.strip()) for x in subprocess.check_output(['ps','-axo','pid='],text=True).splitlines() if x.strip()};ports={}
for p in [i['controlPort'],i['serverPort']]:
 s=socket.socket()
 try:s.bind(('127.0.0.1',p));ports[str(p)]=True
 except OSError as e:ports[str(p)]=str(e)
 finally:s.close()
manifest=read('api-013-owned-evidence-manifest.json');bad=[]
for x in manifest['files']:
 p=Path(x['archive'])
 if not p.is_file() or p.stat().st_size!=x['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest()!=x['sha256']:bad.append(str(p))
foreign=lambda xs:{x['instanceId']:x for x in xs if x['instanceId']!=iid}
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':iid,'stop':stop,'recordAbsent':not any(x['instanceId']==iid for x in after),'dataRootAbsent':not Path(i['dataRoot']).exists(),'portsFreeBind':ports,'capturedOwnPids':sorted(pids),'capturedOwnPidsStillPresent':sorted(pids&live),'foreignRecordsUnchanged':foreign(before)==foreign(pre)==foreign(after),'archiveFilesVerified':len(manifest['files']),'archiveMismatches':bad,'observerInstalled':False,'scope':'Only captured own descendants and exact exclusive Task provider; no general PID absence/native per-Agent/sourceWork certificate.'}
(E/'api-013-cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n')
assert stop['ok'] and out['recordAbsent'] and out['dataRootAbsent'];assert all(x is True for x in ports.values()) and not out['capturedOwnPidsStillPresent'];assert out['foreignRecordsUnchanged'] and not bad
print({k:out[k] for k in ['recordAbsent','dataRootAbsent','portsFreeBind','capturedOwnPidsStillPresent','foreignRecordsUnchanged','archiveFilesVerified']})
