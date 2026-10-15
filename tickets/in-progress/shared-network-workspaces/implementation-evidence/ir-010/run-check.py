from pathlib import Path
import os,sys,subprocess,tempfile,shutil,json,time
r=Path(__file__).resolve().parents[5]; e=Path(__file__).resolve().parent
name=sys.argv[1]; cmd=sys.argv[2:]; scratch=Path(tempfile.mkdtemp(prefix='ab-ir010-check-'))
(scratch/'home').mkdir(); (scratch/'tmp').mkdir()
env={'PATH':os.environ['PATH'],'HOME':str(scratch/'home'),'TMPDIR':str(scratch/'tmp'),'LANG':'en_US.UTF-8','CI':'1','NO_COLOR':'1'}
result={'argv':cmd,'cwd':str(r),'envKeys':list(env),'scratch':str(scratch)}; start=time.time()
try:
 with (e/(name+'.log')).open('w') as out: result['exitCode']=subprocess.run(cmd,cwd=r,env=env,stdout=out,stderr=subprocess.STDOUT,timeout=300).returncode
except Exception as ex: result['exception']=repr(ex)
finally:
 shutil.rmtree(scratch); result['cleanup']=not scratch.exists(); result['seconds']=round(time.time()-start,2)
 (e/(name+'.json')).write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result))
