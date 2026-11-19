import subprocess,os,signal,json,selectors
from pathlib import Path
image=Path('/home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5/fresh/autobyteus-web/electron-dist/AutoByteus_personal_linux-x64-1.5.13.AppImage')
env=dict(os.environ,ELECTRON_RUN_AS_NODE='1')
print('API-03 | 2026-11-18 | source 0df0c901e4 | Ubuntu26 x64, current AppImage de7e643e316a9593d63ce79f8eb0483f21460fded1fea61946f8d917927e4132',flush=True)
p=subprocess.run([str(image),'-e','console.log(JSON.stringify({argv:process.argv.slice(1),node:process.versions.node,exec:process.execPath}));process.exit(23)','--','space argument','--example'],env=env,capture_output=True,text=True,timeout=60)
print(p.stdout,p.stderr,'exit=',p.returncode,flush=True)
assert p.returncode==23
r=json.loads(p.stdout);assert r['argv']==['space argument','--example']
p=subprocess.Popen([str(image),'-e','process.on("SIGTERM",()=>process.exit(42));console.log("NODE_READY");setInterval(()=>{},1000)'],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,start_new_session=True)
try:
 sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ)
 assert sel.select(60),'Node not ready'
 assert p.stdout.readline().strip()=='NODE_READY'
 # Signal the entire owned AppImage group,
 # matching terminal group delivery. Direct ELF single-process signal tested below.
 os.killpg(p.pid,signal.SIGTERM)
 stdout,stderr=p.communicate(timeout=15)
 print('outer-group-signal exit=',p.returncode,'stderr=',stderr,flush=True)
finally:
 if p.poll() is None: os.killpg(p.pid,signal.SIGKILL);p.wait()
app=image.parent/'linux-unpacked/AppRun'
p=subprocess.Popen([str(app),'-e','process.on("SIGTERM",()=>process.exit(42));console.log("NODE_READY");setInterval(()=>{},1000)'],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
 sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);assert sel.select(10)
 assert p.stdout.readline().strip()=='NODE_READY'
 p.send_signal(signal.SIGTERM);p.communicate(timeout=10)
 assert p.returncode==42,p.returncode
 print('PASS current packaged real ELF receives SIGTERM and exits 42; argv and exit23 preserved',flush=True)
finally:
 if p.poll() is None:p.kill();p.wait()
