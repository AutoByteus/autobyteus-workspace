"""Own-guest command runner: explicit guest/clean env, separate immutable receipt per attempt."""
from pathlib import Path
import subprocess as sp,json,time,sys
E=Path(__file__).resolve().parent
def run(osname,code,label,timeout=60,data=None,check=True):
 cfg=json.loads((E/'guests.json').read_text())['guests'][osname];home='/Users/admin' if osname=='mac' else '/home/admin'
 a=[cfg['tart'],'exec']+(['-i'] if data is not None else [])+[cfg['name'],'/usr/bin/env','-i','HOME='+home,'PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code]
 out=E/(label+'.json');assert not out.exists(),out;r={'node':cfg['name'],'os':osname,'argv':a,'result':'Running','started':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())};out.write_text(json.dumps(r,indent=2)+'\n');start=time.monotonic()
 try:
  p=sp.run(a,env=cfg['env'],input=data,capture_output=True,timeout=timeout);r.update(rc=p.returncode,stdout=p.stdout.decode(errors='replace'),stderr=p.stderr.decode(errors='replace'),result='Pass' if p.returncode==0 else 'Fail')
 except sp.TimeoutExpired as x:r.update(result='Timeout',stdout=(x.stdout or b'').decode(errors='replace'),stderr=(x.stderr or b'').decode(errors='replace'))
 r['seconds']=time.monotonic()-start;out.write_text(json.dumps(r,indent=2)+'\n')
 if check:assert r.get('rc')==0,r
 return r
if __name__=='__main__':
 r=run(sys.argv[1],sys.argv[3],sys.argv[2],int(sys.argv[4]) if len(sys.argv)>4 else 60,check=False);print(json.dumps(r));sys.exit(0 if r.get('rc')==0 else 1)
