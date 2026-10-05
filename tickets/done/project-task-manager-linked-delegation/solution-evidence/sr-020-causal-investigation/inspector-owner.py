from pathlib import Path
import json,subprocess,socket,os,signal,time,hashlib
w=Path.cwd();e=w/'tickets/in-progress/project-task-manager-linked-delegation/solution-evidence/sr-020-causal-investigation';i=json.loads((e/'sr-020-instance.json').read_text())['result'];assert i['ownsDataRoot'] and i['instanceId']==json.loads((e/'sr-020-instance.json').read_text())['result']['instanceId']
rows=[]
for l in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
 p=l.strip().split(None,2)
 if len(p)==3:rows.append({'pid':int(p[0]),'ppid':int(p[1]),'comm':p[2]})
ids={i['pid']}
for _ in rows:
 for r in rows:
  if r['ppid'] in ids:ids.add(r['pid'])
listener=subprocess.check_output(['lsof','-nP','-iTCP:'+str(i['serverPort']),'-sTCP:LISTEN','-Fp'],text=True).splitlines();pids={int(x[1:]) for x in listener if x.startswith('p')};assert len(pids)==1;pid=pids.pop();assert pid in ids and pid!=i['pid']
r=next(r for r in rows if r['pid']==pid);cwd=next(x[1:] for x in subprocess.check_output(['lsof','-a','-p',str(pid),'-d','cwd','-Fn'],text=True).splitlines() if x.startswith('n'));r['cwd']=cwd;assert cwd.startswith(str(w/'autobyteus-web/electron-dist/')) and (Path(cwd)/'dist/app.js').is_file()
with socket.socket() as s:s.bind(('127.0.0.1',9229))
hashes={}
for f in ['agent-execution/backends/codex/thread/codex-thread.js','agent-execution/backends/codex/backend/codex-agent-run-backend.js','agent-execution/backends/codex/events/codex-turn-event-converter.js','agent-execution/domain/agent-run.js','agent-execution/input/agent-run-input-admission-state.js','agent-execution/services/agent-run-manager.js','agent-team-execution/local/flat-team-execution-manager.js','agent-team-execution/local/owned-flat-team-runtime-release.js']:
 a=w/'autobyteus-server-ts/dist'/f;b=Path(cwd)/'dist'/f;sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();assert sha(a)==sha(b),f;hashes[f]={'currentDist':sha(a),'packaged':sha(b)}
(e/'sr-020-built-boundary-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n');o={'instance':i,'backend':r,'ancestryRows':[r for r in rows if r['pid'] in ids],'inspectorPort':9229,'freeBindBeforeSignal':True,'signal':'SIGUSR1','at':time.time()};(e/'sr-020-inspector-owner.json').write_text(json.dumps(o,indent=2)+'\n');os.kill(pid,signal.SIGUSR1)
for _ in range(100):
 p=subprocess.run(['lsof','-nP','-iTCP:9229','-sTCP:LISTEN','-Fp'],capture_output=True,text=True)
 got={int(x[1:]) for x in p.stdout.splitlines() if x.startswith('p')}
 if got:
  assert got=={pid};print(json.dumps({'instanceId':i['instanceId'],'ownBackendPid':pid,'cwd':cwd,'bound9229ToExactOwner':True}));break
 time.sleep(.1)
else:raise RuntimeError('Own backend inspector did not start')
