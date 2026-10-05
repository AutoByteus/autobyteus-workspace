from pathlib import Path
import subprocess,json,datetime
E=Path(__file__).resolve().parent;W=E.parents[3]
old=json.loads((E/'api-017-instance.json').read_text())['result'];assert old['ownsDataRoot']
p=subprocess.run(['pnpm','--silent','isolated-app','restart',old['instanceId']],cwd=W,capture_output=True,text=True)
(E/'api-017-history-restart-stdout.json').write_text(p.stdout);assert p.returncode==0,(p.returncode,p.stderr)
j=json.loads(p.stdout);assert j['ok'];new=j['result'];assert new['ownsDataRoot']
assert all(old[k]==new[k] for k in ['instanceId','dataRoot','databaseUrl','backendUrl','graphqlUrl','controlEndpoint','executablePath'])
(E/'api-017-history-restart.json').write_text(json.dumps(j,indent=2)+'\n')
before=next(x for x in json.loads((E/'api-017-captured-own-pids.json').read_text())['captures'] if x['phase']=='before-normal-restart')
current={int(x.split()[0]) for x in subprocess.check_output(['ps','-axo','pid='],text=True).splitlines() if x.strip()};ids=[x['pid'] for x in before['current']]
assert not set(ids)&current,(set(ids)&current);assert new['pid'] in current and old['pid']!=new['pid']
o={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':new['instanceId'],'sameOwnedProfilePortsExecutable':True,'oldAppPid':old['pid'],'newAppPid':new['pid'],'oldCapturedPids':ids,'allOldCapturedPidsGone':True,'scope':'Actual ordinary quiescent whole-app restart, not renderer reload or Task DONE/initial-cause repair. No inspector was enabled.'}
(E/'api-017-whole-app-restart-proof.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps(o))
