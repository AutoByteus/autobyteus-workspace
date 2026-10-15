"""Designer native ACP discovery probe; private no-auth homes, no prompt/inference.
Only initialize and read-only skills/list; exact subprocess killed/waited at cleanup.
"""
from pathlib import Path
import tempfile,subprocess,json,shutil,selectors,time,os
p=Path(__file__).resolve().parent;h=Path(tempfile.mkdtemp(prefix='ab-sf-fr057-'));w=h/'project';b=h/'plugin';w.mkdir();(h/'home').mkdir();(h/'grok').mkdir();(b/'.claude-plugin').mkdir(parents=True);(b/'skills/private-proof').mkdir(parents=True)
(b/'.claude-plugin/plugin.json').write_text(json.dumps({'name':'autobyteus-configured','version':'1.0.0','description':'Owned private skill discovery fixture'}));(b/'skills/private-proof/SKILL.md').write_text('---\nname: private-proof\ndescription: Owned discovery probe\n---\nUse private support.txt.\n');(b/'skills/private-proof/support.txt').write_text('PRIVATE_NOT_PROJECT')
env={'HOME':str(h/'home'),'GROK_HOME':str(h/'grok'),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','TERM':'dumb','GROK_SUBAGENTS':'0','GROK_WORKFLOWS':'0','GROK_ASK_USER_QUESTION':'0'};r={'scope':'native Grok ACP read-only private plugin discovery; no prompt/inference, mount or production changes','frames':[],'cases':[]};proc=None;sel=selectors.DefaultSelector();buffers={}
def request(i,method,params):
 msg={'jsonrpc':'2.0','id':i,'method':method,'params':params};r['frames'].append({'sent':msg});proc.stdin.write((json.dumps(msg)+'\n').encode());proc.stdin.flush();end=time.monotonic()+20
 while time.monotonic()<end:
  for key,_ in sel.select(.2):
   data=os.read(key.fd,65536)
   if not data:sel.unregister(key.fileobj);continue
   if key.data=='stderr':r['stderr']=r.get('stderr','')+data.decode(errors='replace');continue
   buffers['stdout']=buffers.get('stdout',b'')+data
   while b'\n' in buffers['stdout']:
    line,buffers['stdout']=buffers['stdout'].split(b'\n',1)
    if not line:continue
    try:v=json.loads(line)
    except Exception:r['nonJson']=r.get('nonJson',[])+[line.decode(errors='replace')];continue
    r['frames'].append({'received':v})
    if v.get('id')==i:
     assert 'error' not in v,v
     return v.get('result')
  assert proc.poll() is None, r.get('stderr')
 raise TimeoutError(method)
try:
 a=['/Users/normy/.grok/bin/grok','agent','--no-leader','--plugin-dir',str(b),'stdio'];r['argv']=a;proc=subprocess.Popen(a,cwd=w,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE);sel.register(proc.stdout,selectors.EVENT_READ,'stdout');sel.register(proc.stderr,selectors.EVENT_READ,'stderr')
 v=request(1,'initialize',{'protocolVersion':1,'clientInfo':{'name':'ab-owned-discovery','version':'1'},'clientCapabilities':{}});r['initialization']=v
 v=request(2,'_x.ai/skills/list',{'cwd':str(w),'refresh':True});r['skills']=v
 text=json.dumps(v);assert 'private-proof' in text and str(b) in text,text
 assert not list(w.iterdir()),'project mutated'
 r['cases'].append({'name':'native ACP discovers exact private plugin skill without project writes','status':'PASS'})
except Exception as e:r['fatal']=repr(e)
finally:
 if proc:
  proc.stdin.close()
  try:proc.wait(timeout=3)
  except subprocess.TimeoutExpired:
   proc.terminate()
   try:proc.wait(timeout=3)
   except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=3)
  r['processExit']=proc.returncode
 sel.close();shutil.rmtree(h);r['cleanup']={'ownedScratchRemoved':not h.exists(),'exactProcessExited':proc is None or proc.poll() is not None};(p/'probe-result.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'passes':len(r['cases']),'fatal':r.get('fatal')}));raise SystemExit(1 if r.get('fatal') else 0)
