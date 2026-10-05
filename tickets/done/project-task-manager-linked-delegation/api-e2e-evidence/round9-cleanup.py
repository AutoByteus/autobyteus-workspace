from pathlib import Path
import json,subprocess,socket,datetime,sys
E=Path(__file__).parent;read=lambda n:json.loads((E/n).read_text());i=read('api-009-round9-recovery-restart.json')['result'];own=i['instanceId'];assert own=='iso-58861-449a' and i['ownsDataRoot'];mode=sys.argv[1]
def rows():
 out=[]
 for l in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
  x=l.strip().split(None,2)
  if len(x)==3:out.append({'pid':int(x[0]),'ppid':int(x[1]),'comm':x[2]})
 return out
if mode=='before':
 all=rows();ids={i['pid']}
 while True:
  new=ids|{x['pid'] for x in all if x['ppid'] in ids}
  if new==ids:break
  ids=new
 current=[x for x in all if x['pid'] in ids];assert any(x['pid']==i['pid'] and x['comm']==i['executablePath'] for x in current)
 capture={x['pid']:x for x in current}
 def visit(x):
  if isinstance(x,list):
   for a in x:visit(a)
  elif isinstance(x,dict):
   if isinstance(x.get('pid'),int) and isinstance(x.get('comm'),str):capture.setdefault(x['pid'],{k:x[k] for k in ['pid','ppid','comm','cwd'] if k in x})
   for v in x.values():visit(v)
 for p in E.glob('api-009-round9-*.json'):
  if 'instances' in p.name or 'cleanup' in p.name:continue
  try:visit(json.loads(p.read_text()))
  except (json.JSONDecodeError,UnicodeDecodeError):pass
 for n in ['instance','restart','recovery-restart']:
  a=read('api-009-round9-'+n+'.json')['result'];capture.setdefault(a['pid'],{'pid':a['pid'],'comm':a['executablePath']})
 out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':own,'current':current,'allCaptured':list(capture.values()),'scope':'Actual current OWN app ancestry and prior OWN censuses; no foreign instance/process inspected or signaled. Teardown only, not product release acceptance.'};(E/'api-009-round9-owned-processes-before-stop.json').write_text(json.dumps(out,indent=2)+'\n');print('Current own'+str(len(current))+' / all captured '+str(len(capture)))
else:
 before=read('api-009-round9-instances-immediately-before-stop.json')['result']['instances'];after=read('api-009-round9-instances-after.json')['result']['instances'];entry=read('api-009-round9-instances-before.json')['result']['instances'];foreign=lambda a:{x['instanceId']:x for x in a if x['instanceId']!=own};assert not any(x['instanceId']==own for x in after);assert foreign(before)==foreign(after);assert foreign(entry)==foreign(after)
 all=rows();pids={x['pid']:x for x in all};captured=read('api-009-round9-owned-processes-before-stop.json');alive=[x for x in captured['allCaptured'] if x['pid'] in pids];assert not alive,alive
 free={}
 for port in [i['controlPort'],i['serverPort'],9229]:
  s=socket.socket()
  try:s.bind(('127.0.0.1',port));free[str(port)]=True
  except OSError:free[str(port)]=False
  finally:s.close()
 assert all(free.values());assert not Path(i['dataRoot']).exists();debug=[json.loads(x) for x in (E/'api-009-round9-owner-debugger.jsonl').read_text().splitlines()];assert debug[-1]['event']=='detached'
 out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':own,'stop':read('api-009-round9-stop.json'),'ownCurrentPidCount':len(captured['current']),'ownCapturedPidCount':len(captured['allCaptured']),'ownAliveAfterStop':alive,'freeBind':free,'ownRootDatabaseImportedKeyRemoved':True,'foreignImmediatelyBeforeVsAfterExactlyUnchanged':len(foreign(after)),'entryFourForeignRecordsExactlyUnchanged':foreign(entry)==foreign(after),'observerDetached':debug[-1],'scope':'OWN app teardown after evidence only; never successful Task-release or history facade repair. Generated build and allowlisted evidence retained; no foreign/user app/data/profile mutation.'};(E/'api-009-round9-cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['stop','observerDetached']}))
