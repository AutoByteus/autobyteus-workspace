from pathlib import Path
import json,hashlib,subprocess,socket,datetime,shutil
E=Path(__file__).resolve().parent;W=E.parents[3]
read=lambda n:json.loads((E/n).read_text());i=read('api-017-history-restart.json')['result'];first=read('api-017-instance.json')['result'];j=read('api-017-claude-concrete-agent_org.json')
assert i['ownsDataRoot'] and i['instanceId']==first['instanceId'] and i['dataRoot']==first['dataRoot']
data=Path(i['dataRoot']);assert data.name.startswith('autobyteus-isolated-root-') and data.is_dir()
# Only this fresh validation's own document/trace/context bytes, never DB/vault/HOME.
allowed=[data/'server-data/projects/projects.json',data/i['logPath']] if False else [data/'server-data/projects/projects.json']
memory=data/'server-data/memory'
for p in memory.rglob('*'):
 if p.is_file() and p.name in ['raw_traces_active.jsonl','agent_org_run_execution_tree.json','agent_org_communication_messages.json','agent_run_collaboration_tree.json','agent_run_collaboration_communication_messages.json']:allowed.append(p)
context=data/'server-data/projects/task_context_files'
if context.exists():allowed.extend(p for p in context.rglob('*') if p.is_file())
allowed.extend(p for p in data.rglob('protected-sentinel.txt') if p.is_file())
archive=[];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for p in sorted(set(allowed)):
 assert p.is_relative_to(data)
 dest=E/'api-017-owned-data'/p.relative_to(data);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
 archive.append({'relative':str(p.relative_to(data)),'archive':str(dest),'sha256':sha(dest),'bytes':dest.stat().st_size})
(E/'api-017-owned-evidence-manifest.json').write_text(json.dumps({'instanceId':i['instanceId'],'files':archive,'exclusions':'No application database/vault/credential/home/unrelated instance data'},indent=2)+'\n')
p=subprocess.run(['pnpm','--silent','isolated-app','stop',i['instanceId']],cwd=W,capture_output=True,text=True);(E/'api-017-stop-stdout.json').write_text(p.stdout);assert p.returncode==0,(p.returncode,p.stderr)
stop=json.loads(p.stdout);assert stop['ok'];(E/'api-017-stop.json').write_text(json.dumps(stop,indent=2)+'\n')
p=subprocess.run(['pnpm','--silent','isolated-app','list'],cwd=W,capture_output=True,text=True);assert p.returncode==0;after=json.loads(p.stdout);(E/'api-017-instances-after.json').write_text(p.stdout)
before=read('api-017-instances-before.json')['result']['instances'];current={r['instanceId']:r for r in after['result']['instances']}
assert i['instanceId'] not in current and not data.exists()
foreign=[r['instanceId'] for r in before if current.get(r['instanceId'])!=r];assert not foreign,foreign
alive={int(x.strip()) for x in subprocess.check_output(['ps','-axo','pid='],text=True).splitlines() if x.strip()}
captured=read('api-017-captured-own-pids.json')['capturedIds'];left=sorted(set(captured)&alive);assert not left,left
ports={}
for port in [i['controlPort'],i['serverPort']]:
 with socket.socket() as s:s.bind(('127.0.0.1',port));ports[str(port)]=True
assert all(sha(Path(r['archive']))==r['sha256'] for r in archive)
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'recordAbsent':True,'dataRootAbsent':True,'capturedOwnPids':captured,'capturedOwnPidsStillPresent':left,'portsFreeBind':ports,'foreignRecordsUnchanged':True,'priorForeignIds':[r['instanceId'] for r in before],'independentlyNewForeignIds':[r for r in current if r not in {v['instanceId'] for v in before}],'archiveFiles':len(archive),'archiveHashesExact':True,'observerInstalled':False,'scope':'Own exact instance/profile/PIDs/ports only; cleanup is not Task DONE or original-failure repair.'}
(E/'api-017-cleanup-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
