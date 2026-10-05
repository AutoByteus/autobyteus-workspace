from pathlib import Path
import json,datetime,subprocess,socket,hashlib
E=Path(__file__).parent;read=lambda n:json.loads((E/n).read_text());i=read('api-010-round10-history-restart.json')['result'];own=i['instanceId'];assert own=='iso-63749-7f67' and i['ownsDataRoot'];before=read('api-010-round10-instances-before-stop.json')['result']['instances'];after=read('api-010-round10-instances-after.json')['result']['instances'];entry=read('api-010-instances-before.json')['result']['instances'];foreign=lambda a:{x['instanceId']:x for x in a if x['instanceId']!=own};assert own not in [x['instanceId'] for x in after];assert foreign(before)==foreign(after)==foreign(entry)
rows={}
for line in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
 a=line.strip().split(None,2)
 if len(a)==3:rows[int(a[0])]={'pid':int(a[0]),'ppid':int(a[1]),'comm':a[2]}
captured={}
for mode in ['before-restart','before-stop']:
 for x in read('api-010-round10-processes-'+mode+'.json')['current']:captured[x['pid']]=x
for mode in ['instance','restart','history-restart']:
 x=read('api-010-round10-'+mode+'.json')['result'];captured.setdefault(x['pid'],{'pid':x['pid'],'comm':x['executablePath']})
alive=[x for x in captured.values() if x['pid'] in rows];assert not alive,alive;free={}
for port in [i['controlPort'],i['serverPort']]:
 s=socket.socket()
 try:s.bind(('127.0.0.1',port));free[str(port)]=True
 except OSError:free[str(port)]=False
 finally:s.close()
assert all(free.values());assert not Path(i['dataRoot']).exists();manifest=read('api-010-round10-owned-evidence-manifest.json');assert all(hashlib.sha256(Path(x['archive']).read_bytes()).hexdigest()==x['sha256'] for x in manifest['files'])
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':own,'stop':read('api-010-round10-stop.json'),'capturedOwnedPidCount':len(captured),'aliveAfterStop':alive,'portsFreeBind':free,'ownRootRemoved':True,'foreignRecordsExactlyUnchanged':len(foreign(after)),'archiveFilesVerified':len(manifest['files']),'scope':'Only fresh own instance teardown, not product Task release. No debugger/observer was installed this round; no foreign instance/profile/old endpoint touched.'};(E/'api-010-round10-cleanup-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('Scoped Pass own cleanup: '+str(len(captured))+' captured PIDs absent;2 ports free;root removed;'+str(len(foreign(after)))+' foreign records exact;'+str(len(manifest['files']))+' allowlisted archives hash-verified')
