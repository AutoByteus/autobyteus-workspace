"""Continue exact owned partial public-image clone after original 900s download timeout.
No extra guest/host network configuration; retain original console and script.
"""
from pathlib import Path
import json,subprocess as sp,time
E=Path(__file__).resolve().parent;r=json.loads((E/'guests.json').read_text());row=r['guests']['linux'];tart=row['tart'];env=row['env'];name=row['name'];image=row['image'];attempt={'reason':'Public image download exceeded original 900s; resume same owned cache/clone with 1800s limit; command-only plan, no application sequence','commands':[],'result':'Running'}
def save():(E/'guest-command-only-result.json').write_text(json.dumps(attempt,indent=2)+'\n');(E/'guests.json').write_text(json.dumps(r,indent=2)+'\n')
def c(args,t=90):
 with (E/('guest-command-only-'+args[0]+'.log')).open('w') as f:p=sp.run([tart,*args],env=env,stdout=f,stderr=sp.STDOUT,timeout=t)
 attempt['commands'].append({'args':args,'rc':p.returncode,'log':'guest-command-only-'+args[0]+'.log'});save();assert p.returncode==0
try:
 c(['clone',image,name],1800);c(['set',name,'--cpu','4','--memory','8192','--disk-size','100'])
 with (E/'linux-command-only-boot.log').open('w') as f:p=sp.Popen([tart,'run',name,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories'],env=env,stdout=f,stderr=sp.STDOUT,start_new_session=True)
 row['pid']=p.pid;row['runArgv']=p.args;save()
 for i in range(90):
  assert p.poll() is None,'VM exited'
  try:
   z=sp.run([tart,'exec',name,'sh','-c','uname -a; id'],env=env,capture_output=True,text=True,timeout=5)
   if z.returncode==0:row['preflight']=z.stdout;break
  except sp.TimeoutExpired:pass
  time.sleep(2)
 else:raise RuntimeError('Guest not ready')
 row['ready']=True;r['result']='Ready';attempt['result']='Ready';save();(E/'linux-resource.json').write_text(json.dumps({'clone':name,'privateTartHome':env['TART_HOME'],'pid':p.pid,'image':image},indent=2)+'\n')
except BaseException as x:attempt['result']='Incomplete';attempt['error']=repr(x);save();raise
