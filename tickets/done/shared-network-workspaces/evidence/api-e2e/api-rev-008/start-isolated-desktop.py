from pathlib import Path
import os,subprocess as sp,json,time
E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());R=Path.cwd();home=S/'desktop-home';home.mkdir();tmp=S/'desktop-tmp';tmp.mkdir();codex=home/'.codex';codex.mkdir();env={'PATH':os.environ['PATH'],'HOME':str(home),'TMPDIR':str(tmp)+'/', 'LANG':'en_US.UTF-8','CODEX_HOME':str(codex),'CSC_IDENTITY_AUTO_DISCOVERY':'false','CI':'1'};argv=['pnpm','--silent','isolated-app','start','--build'];r={'argv':argv,'cwd':str(R),'environment':env,'inputHead':sp.check_output(['git','rev-parse','HEAD'],text=True).strip(),'result':'BuildingAndStarting'}
def save():(E/'desktop-start-result.json').write_text(json.dumps(r,indent=2)+'\n')
save();start=time.monotonic()
try:
 with (E/'desktop-build.log').open('w') as err,(E/'desktop-start.log').open('w') as out:
  p=sp.run(argv,env=env,cwd=R,stdout=out,stderr=err,timeout=1800)
 r['rc']=p.returncode;r['seconds']=round(time.monotonic()-start,3);r['response']=json.loads((E/'desktop-start.log').read_text());r['result']='Ready' if p.returncode==0 else 'Incomplete'
except BaseException as x:r['result']='Incomplete';r['error']=repr(x)
save();print(json.dumps({'result':r['result'],'rc':r.get('rc'),'error':r.get('error')}),flush=True)
