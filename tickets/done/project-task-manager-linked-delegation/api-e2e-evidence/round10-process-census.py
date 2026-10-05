from pathlib import Path
import subprocess,json,sys,datetime
E=Path(__file__).parent;mode=sys.argv[1];i=json.loads((E/('api-010-round10-history-restart.json' if mode=='before-stop' else 'api-010-round10-restart.json')).read_text())['result'];assert i['instanceId']=='iso-63749-7f67' and i['ownsDataRoot'];rows=[]
for line in subprocess.check_output(['ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
 x=line.strip().split(None,2)
 if len(x)==3:rows.append({'pid':int(x[0]),'ppid':int(x[1]),'comm':x[2]})
ids={i['pid']}
while True:
 new=ids|{x['pid'] for x in rows if x['ppid'] in ids}
 if new==ids:break
 ids=new
current=[x for x in rows if x['pid'] in ids];assert any(x['pid']==i['pid'] and x['comm']==i['executablePath'] for x in current)
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'current':current,'scope':'Own exact current app PID and ancestry only. Census/teardown not a Task release receipt.'};(E/('api-010-round10-processes-'+mode+'.json')).write_text(json.dumps(out,indent=2)+'\n');print('Scoped Pass own census '+str(len(current))+' PIDs')
