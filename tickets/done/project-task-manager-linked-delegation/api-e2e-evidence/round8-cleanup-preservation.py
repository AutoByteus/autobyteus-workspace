from pathlib import Path
import json,subprocess,socket,datetime,hashlib,os
E=Path('tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence');read=lambda n:json.loads((E/n).read_text());i=read('api-008-lifecycle-restart.json')['result'];own=i['instanceId'];assert own=='iso-55024-a24c'
before=read('api-008-instances-immediately-before-stop.json')['result']['instances'];after=read('api-008-instances-after.json')['result']['instances'];entry=read('api-008-instances-before.json')['result']['instances'];foreign=lambda a:{x['instanceId']:x for x in a if x['instanceId']!=own}
assert own not in foreign(after) and all(x['instanceId']!=own for x in after);assert foreign(before)==foreign(after)
currentPids={int(x.split(None,1)[0]) for x in subprocess.check_output(['ps','-axo','pid=,comm='],text=True).splitlines() if x.strip()};captured=read('api-008-owned-processes-before-stop.json')['allCaptured'];alive=[x for x in captured if x['pid'] in currentPids];assert not alive
free={}
for port in [55024,55025,9229]:
 s=socket.socket();
 try:s.bind(('127.0.0.1',port));free[str(port)]=True
 except OSError:free[str(port)]=False
 finally:s.close()
assert all(free.values());assert not Path(i['dataRoot']).exists();debug=[json.loads(x) for x in (E/'api-008-owner-debugger.jsonl').read_text().splitlines()];assert debug[-1]['event']=='detached'
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':own,'stop':read('api-008-stop.json'),'ownCapturedPidCount':len(captured),'ownAliveAfterStop':alive,'freeBind':free,'ownRootDatabaseImportedKeyRemoved':True,'foreignImmediatelyBeforeVsAfterExactlyUnchanged':len(foreign(after)),'entryForeignIDs':list(foreign(entry)),'foreignRemovedBeforeOwnCleanup':list(set(foreign(entry))-set(foreign(before))),'foreignExternalChangeLimit':'iso-54639-13b7 disappeared before own cleanup and default debug port became free; actor/cause unobserved. Agent did not signal/connect/stop that instance. Do not claim entry five exactly unchanged. Other four entry records exactly unchanged.','observerDetached':debug[-1],'scope':'OWN environment teardown only, NOT successful Task release or repair of failed authority.'};assert all(foreign(after)[k]==v for k,v in foreign(entry).items() if k in foreign(after));(E/'api-008-cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n')
manifest=json.loads((E.parent/'code-review-evidence/crr-007-package-fingerprints.json').read_text());assert len(manifest)==283;missing=[];changed=[]
for p,h in manifest.items():
 f=Path(p)
 if not f.exists():missing.append(p)
 elif hashlib.sha256(f.read_bytes()).hexdigest()!=h:changed.append(p)
assert not missing and not changed
raw=subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all','-z']);(E/'api-008-final-git-status.txt').write_text(subprocess.check_output(['git','status','--short','--untracked-files=all'],text=True));records=raw.decode().split('\0');paths=[];ix=0
while ix<len(records):
 row=records[ix];ix+=1
 if not row:continue
 p=row[3:];paths.append(p)
 if 'R' in row[:2] or 'C' in row[:2]:ix+=1
nonTicket=[p for p in paths if not p.startswith('tickets/')];extra=sorted(set(nonTicket)-set(manifest));assert set(manifest).issubset(nonTicket);assert extra==['autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts'];assert len(nonTicket)==284
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();branch=subprocess.check_output(['git','branch','--show-current'],text=True).strip();assert head=='806907faeb567d2b703e10fe984fcd01be0b41fd' and branch=='codex/project-task-manager-linked-delegation'
test=extra[0];beforeHash=hashlib.sha256((E/'api-008-http-oracle-before.ts').read_bytes()).hexdigest();currentHash=hashlib.sha256(Path(test).read_bytes()).hexdigest();assert beforeHash=='ddab050d17a0d6b74b42eaa4dcb742eda05795d904f6291db743069614308bb2' and currentHash=='c5f882bce2f35446d947a6ebee6f9dda9fe0723fc04543dd002cc78e8a841bd9'
check=subprocess.run(['git','diff','--check'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);(E/'api-016-round8-final-diffcheck.log').write_text(check.stdout+'\nPROCESS_EXIT_CODE='+str(check.returncode)+'\n');assert check.returncode==0
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reviewedPaths':len(manifest),'unchanged':len(manifest),'missing':missing,'changedReviewed':changed,'actualNonTicketDirtyPaths':len(nonTicket),'additionalIntentionalTest':extra,'baselineTestBeforeSha256':beforeHash,'baselineTestCurrentSha256':currentHash,'branch':branch,'head':head,'diffCheckExit':check.returncode,'scope':'All283 incoming reviewed source/template/test/SDK paths preserved byte-for-byte; one previously clean tracked baseline HTTP test intentionally updated. No production source edits by API.'};(E/'api-008-final-preservation.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'ownPidsGone':len(captured),'foreignContemporaneousUnchanged':len(foreign(after)),'foreignExternalChange':list(set(foreign(entry))-set(foreign(before))),'source283Unchanged':True,'dirtyCount':len(nonTicket),'diffCheckExit':check.returncode}))
