"""Implementation-scoped native capability check; no model/session turn or auth.
Run: python3 <this-file> <absolute-grok-binary> <fresh-result-json>
Only initialize and _x.ai/skills/list. A regular directory is the positive control.
Owns and removes exact child and temporary HOME/GROK_HOME/plugin/project/source.
"""
from pathlib import Path
import tempfile, subprocess, json, shutil, selectors, time, os, sys, hashlib
binary=Path(sys.argv[1]).resolve(strict=True)
output=Path(sys.argv[2]).resolve()
if output.exists(): raise RuntimeError('Evidence output must be fresh')
root=Path(tempfile.mkdtemp(prefix='ab-nfs-ir002-grok-')).resolve()
project=root/'project'; plugin=root/'plugin'; source=root/'source'/'linked-proof'
for directory in [project, root/'home', root/'grok', plugin/'.claude-plugin', source, plugin/'skills'/'directory-control']:
 directory.mkdir(parents=True,exist_ok=True)
(plugin/'.claude-plugin'/'plugin.json').write_text(json.dumps({'name':'autobyteus-configured','version':'1.0.0','description':'Owned linked capability check'}))
for name,directory in [('linked-proof',source),('directory-control',plugin/'skills'/'directory-control')]:
 (directory/'SKILL.md').write_text(f'---\nname: {name}\ndescription: Owned native discovery check\n---\nRead support.txt.\n')
 (directory/'support.txt').write_text('test-owned-support-'+name+'\n')
(plugin/'skills'/'linked-proof').symlink_to(source,target_is_directory=True)
record={'scope':'current native Grok linked discovery only; no inference, credentials or NFS', 'binary':str(binary), 'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest(), 'source':str(source),'link':str(plugin/'skills'/'linked-proof'),'frames':[],'cases':[]}
process=None; selector=selectors.DefaultSelector(); buffer=b''
def request(i,method,params):
 global buffer
 frame={'jsonrpc':'2.0','id':i,'method':method,'params':params}
 record['frames'].append({'sent':frame}); process.stdin.write((json.dumps(frame)+'\n').encode());process.stdin.flush()
 deadline=time.monotonic()+25
 while time.monotonic()<deadline:
  for key,_ in selector.select(.1):
   data=os.read(key.fd,65536)
   if not data: selector.unregister(key.fileobj); continue
   if key.data=='stderr': record['stderr']=record.get('stderr','')+data.decode(errors='replace');continue
   buffer+=data
   while b'\n' in buffer:
    line,buffer=buffer.split(b'\n',1)
    if not line: continue
    try: response=json.loads(line)
    except ValueError: record.setdefault('nonJson',[]).append(line.decode(errors='replace'));continue
    record['frames'].append({'received':response})
    if response.get('id')==i:
     if 'error' in response: raise RuntimeError(str(response))
     return response.get('result')
  if process.poll() is not None: raise RuntimeError('Native process exited before response')
 raise TimeoutError(method)
try:
 env={'HOME':str(root/'home'),'GROK_HOME':str(root/'grok'),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','TERM':'dumb','GROK_SUBAGENTS':'0','GROK_WORKFLOWS':'0','GROK_ASK_USER_QUESTION':'0'}
 argv=[str(binary),'agent','--no-leader','--plugin-dir',str(plugin),'stdio'];record['argv']=argv
 process=subprocess.Popen(argv,cwd=project,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 record['pid']=process.pid
 selector.register(process.stdout,selectors.EVENT_READ,'stdout');selector.register(process.stderr,selectors.EVENT_READ,'stderr')
 init=request(1,'initialize',{'protocolVersion':1,'clientInfo':{'name':'ab-nfs-owned-linked-check','version':'1'},'clientCapabilities':{}})
 record['version']=init.get('_meta',{}).get('agentVersion')
 skills=request(2,'_x.ai/skills/list',{'cwd':str(project),'refresh':True});record['skills']=skills
 serialized=json.dumps(skills)
 control='directory-control' in serialized;linked='linked-proof' in serialized
 record['cases']=[{'name':'positive directory control discovered','pass':control},{'name':'private directory symlink discovered','pass':linked},{'name':'project unmodified','pass':not list(project.iterdir())},{'name':'source support intact','pass':(source/'support.txt').read_text()=='test-owned-support-linked-proof\n'}]
 if not control: raise AssertionError('Positive control was not discovered; linked outcome not interpretable')
 if not linked: raise AssertionError('Native Grok discovers directory control but not private linked skill')
except Exception as error: record['failure']=repr(error)
finally:
 if process:
  process.stdin.close()
  try: process.wait(timeout=3)
  except subprocess.TimeoutExpired:
   process.terminate()
   try: process.wait(timeout=3)
   except subprocess.TimeoutExpired: process.kill();process.wait(timeout=3)
  record['processExit']=process.returncode
 selector.close();shutil.rmtree(root)
 record['cleanup']={'exactChildExited':process is None or process.poll() is not None,'scratchRemoved':not root.exists()}
 output.write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'cases':record['cases'],'failure':record.get('failure'),'cleanup':record['cleanup']}))
sys.exit(1 if record.get('failure') else 0)
