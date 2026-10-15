"""Retire only exact SR022 private guest/cache/scratch, never retained public caches."""
from pathlib import Path
import json,subprocess as sp,shutil,os,time
E=Path(__file__).resolve().parent;cfg=json.loads((E/'resource.json').read_text());S=Path(cfg['scratch']);V=cfg['vm'];env=cfg['env'];tart=cfg['tart'];r={'vm':V,'scratch':str(S),'commands':[],'result':'Incomplete'}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a):
 p=sp.run([tart,*a],env=env,capture_output=True,text=True,timeout=60);q={'argv':[tart,*a],'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save();return q
try:
 assert V=='ab-nfs-sr022-4d97877e' and str(S).endswith('/ab-nfs-sr022-ls5vlmt7') and str(S) not in ['/','/tmp','/private/tmp']
 assert env['TART_HOME']==str(S/'tart')
 q=cmd(['stop',V]);r['stopRC']=q['rc']
 for _ in range(50):
  try:os.kill(cfg['vmPid'],0)
  except ProcessLookupError:break
  time.sleep(.2)
 else:raise RuntimeError('owned VM pid not confirmed absent')
 assert cmd(['delete',V])['rc']==0
 q=cmd(['list','--format','json']);assert q['rc']==0 and V not in q['stdout']
 shutil.rmtree(S);assert not S.exists();r['vmPidAbsent']=True;r['privateScratchAbsent']=True
 for pycache in E.rglob('__pycache__'):
  shutil.rmtree(pycache)
 r['result']='Complete';r['limits']='Owned disposable VM only; no user VM/source/node/mount/provider or retained IR005/IR007/public-Mac-cache change. Public guest drained detach outcome is in prototype-result, not inferred from VM disposal.'
except BaseException as x:r['error']=repr(x)
finally:save();print(json.dumps(r),flush=True)
