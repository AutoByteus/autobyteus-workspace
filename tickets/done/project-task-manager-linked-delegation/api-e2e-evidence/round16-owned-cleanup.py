from pathlib import Path
import json,hashlib,subprocess,shutil,socket,datetime,sys
E=Path(__file__).resolve().parent;W=E.parents[3]
def load(n):return json.loads((E/n).read_text())
def sh(cmd):return subprocess.check_output(cmd,cwd=W).decode()
def parseLog(n):
 s=(E/n).read_text();return json.loads(s[s.index('{'):s.index('\nINNER_EXIT=')])
i=load('api-016-instance.json')['result'];r=load('api-016-restart.json')['result'];assert r['dataRoot']==i['dataRoot'] and r['instanceId']==i['instanceId'];root=Path(i['dataRoot']);mode=sys.argv[1]
if mode=='archive':
 d=load('api-016-ambiguity.json');assert load('api-016-ambiguity-settled-corrected.json')['result'].startswith('Pass')
 paths=[root/'server-data/projects/projects.json',root/'api016-ambiguity-workspace/protected-sentinel.txt'];agent=root/'server-data/memory/agents'/d['hostRunId'];assert agent.is_dir()
 allowed={'raw_traces_active.jsonl','run_metadata.json','collaboration_tree.json','communication_messages.json'}
 paths.extend(p for p in agent.rglob('*') if p.is_file() and p.name in allowed)
 rows=[]
 for p in paths:
  rel=p.relative_to(root);target=E/'api-016-owned-archive'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target);rows.append({'relative':str(rel),'archive':str(target),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 ps=[line.split(None,2) for line in sh(['ps','-axo','pid=,ppid=,comm=']).splitlines() if line.strip()];ids={i['pid'],r['pid']};again=True
 while again:
  old=len(ids);ids.update(int(pid) for pid,ppid,_ in ps if int(ppid) in ids);again=len(ids)>old
 out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'files':rows,'capturedOwnPids':sorted(ids),'scope':'Only own Project, workspace sentinel and allowlisted history/tree/messages/metadata; no env/vault/keys/database/nativeHOME'}
 (E/'api-016-owned-evidence-manifest.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'allowlistedFiles':len(rows),'capturedOwnPids':len(ids)}))
else:
 a=load('api-016-owned-evidence-manifest.json');before=parseLog('API-019@round16-list-before.log')['result']['instances'];after=parseLog('API-019@round16-list-after.log')['result']['instances'];afterById={v["instanceId"]:v for v in after};assert all(afterById.get(v["instanceId"])==v for v in before);addedForeign=[v["instanceId"] for v in after if v["instanceId"] not in {v["instanceId"] for v in before}]
 assert not root.exists();assert not any(v['instanceId']==i['instanceId'] for v in after)
 current={int(v) for v in sh(['ps','-axo','pid=']).split()};present=sorted(set(a['capturedOwnPids'])&current);assert not present,present
 binds={}
 for port in [i['controlPort'],i['serverPort']]:
  s=socket.socket();s.bind(('127.0.0.1',port));s.close();binds[str(port)]=True
 assert all(hashlib.sha256(Path(v['archive']).read_bytes()).hexdigest()==v['sha256'] for v in a['files'])
 out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'recordAbsent':True,'dataRootAbsent':True,'foreignRecordsUnchanged':True,'meaning':'All three pre-existing foreign records byte-for-field unchanged; independent added foreign record not operated on','independentlyAddedForeignIds':addedForeign,'capturedOwnPidsStillPresent':present,'portsFreeBind':binds,'archiveFilesVerified':len(a['files']),'observerInstalled':False}
 (E/'api-016-cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
