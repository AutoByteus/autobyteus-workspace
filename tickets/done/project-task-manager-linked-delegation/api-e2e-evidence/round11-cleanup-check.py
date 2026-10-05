from pathlib import Path
import json,hashlib,subprocess,socket,datetime
E=Path(__file__).resolve().parent
def read(n): return json.loads((E/n).read_text())
inst=read('api-011-instance.json')['result']; iid=inst['instanceId']
before=read('api-011-instances-before.json')['result']['instances']
pre=read('api-011-instances-before-stop.json')['result']['instances']
after=read('api-011-instances-after.json')['result']['instances']
stop=read('api-011-stop.json')
pids={inst['pid']}
for n in ['api-011-restart.json','api-011-history-restart.json']:
 pids.add(read(n)['result']['pid'])
for n in ['api-011-native-concrete-agent_org.json','api-011-codex-concrete-agent_team.json']:
 pids.update(v['pid'] for v in read(n)['finalProcesses'])
pids.update(v['pid'] for v in read('api-011-processes-before-stop.json')['current'])
live={int(l.split()[0]) for l in subprocess.check_output(['ps','-axo','pid='],text=True).splitlines() if l.strip()}
ports={}
for p in [inst['controlPort'],inst['serverPort']]:
 s=socket.socket()
 try: s.bind(('127.0.0.1',p)); ports[str(p)]=True
 except OSError as e: ports[str(p)]=str(e)
 finally:s.close()
manifest=read('api-011-owned-evidence-manifest.json')
bad=[]
for row in manifest['files']:
 p=Path(row['archive'])
 if not p.is_file() or p.stat().st_size!=row['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:bad.append(str(p))
foreign=lambda rows:{r['instanceId']:r for r in rows if r['instanceId']!=iid}
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':iid,'stop':stop,
 'recordAbsent':not any(r['instanceId']==iid for r in after),'dataRootAbsent':not Path(inst['dataRoot']).exists(),
 'portsFreeBind':ports,'capturedOwnPids':sorted(pids),'capturedOwnPidsStillPresent':sorted(pids & live),
 'scope':'Captured own process census only; not a per-Agent native physical/sourceWork certificate.',
 'foreignRecordsUnchanged':foreign(before)==foreign(pre)==foreign(after),
 'archiveFilesVerified':len(manifest['files']),'archiveMismatches':bad,'observerInstalled':False}
(E/'api-011-cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n')
assert stop['ok'] and out['recordAbsent'] and out['dataRootAbsent']
assert all(v is True for v in ports.values()) and not out['capturedOwnPidsStillPresent']
assert out['foreignRecordsUnchanged'] and not bad
print(json.dumps({k:out[k] for k in ['recordAbsent','dataRootAbsent','portsFreeBind','capturedOwnPidsStillPresent','foreignRecordsUnchanged','archiveFilesVerified']}))
