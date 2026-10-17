from pathlib import Path
import subprocess as sp,json,time
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','client-capacity-result.json');exec(s)
r['result']='Preparing'
try:
 r['before']=g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; df -B1 /; lsblk -b; command -v growpart; command -v resize2fs');save()
 try:g('sudo -n systemctl poweroff',check=False,timeout=10)
 except sp.TimeoutExpired:pass
 for i in range(45):
  q=cmd(['list','--format','json']);states=json.loads(q['stdout']);row=[x for x in states if x.get('Name')==V or x.get('name')==V];
  if row and str(row[0].get('State',row[0].get('state',''))).lower()=='stopped':break
  time.sleep(2)
 else:raise RuntimeError('Owned VM did not stop; no resize attempted')
 cmd(['set',V,'--disk-size','60','--memory','6144','--cpu','4'])
 f=(E/'linux-client-capacity-boot.log').open('w');proc=sp.Popen([tart,'run',V,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=f,stderr=sp.STDOUT,start_new_session=True);r['vmPid']=proc.pid;save()
 for i in range(60):
  try:
   q=g('id; lsblk -b; df -B1 /',check=False,timeout=5)
   if q.get('rc')==0:break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('Owned VM did not become ready')
 r['grow']=g('set -e; sudo -n growpart /dev/vda 1; sudo -n resize2fs /dev/vda1; df -B1 /; lsblk -b',timeout=60)
 r['result']='Ready';save()
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save()
print(json.dumps({'result':r['result'],'error':r.get('error'),'vmPid':r.get('vmPid')}),flush=True)
