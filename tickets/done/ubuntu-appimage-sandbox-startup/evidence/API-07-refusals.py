from pathlib import Path
import os,subprocess,json,time
os.environ['DISPLAY']=':91'
side=Path('feed/AutoByteus/autobyteus-workspace/releases/download/v1.5.13/AutoByteus_personal_linux-x64-1.5.13.AppImage.release.json')
original=side.read_bytes()
results=[]
def command(*args):return subprocess.run(args,check=True,capture_output=True,text=True,timeout=60)
for mode in ['cancel','404','oversize']:
 try:
  if mode=='404':side.unlink()
  if mode=='oversize':side.write_bytes(b'x'*4097)
  p=subprocess.Popen(['dbus-run-session','--','bash','guest-gui.sh'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  try:
   for attempt in range(100):
    if subprocess.run(['xdotool','getdisplaygeometry'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:break
    time.sleep(0.1)
   command('xdotool','search','--sync','--onlyvisible','--name','^Install AutoByteus$')
   command('import','-window','root',f'{mode}-consent.png')
   command('xdotool','mousemove','500' if mode=='cancel' else '778','583','click','1')
   command('xdotool','search','--sync','--onlyvisible','--name','^AutoByteus installation$')
   command('import','-window','root',f'{mode}-error.png')
   command('xdotool','key','Return')
   output=p.communicate(timeout=20)[0]
   log=Path('current-app.log').read_text();feed=Path('feed.log').read_text()
   Path(f'{mode}-app.log').write_text(log);Path(f'{mode}-feed.log').write_text(feed)
   assert 'Ubuntu will request one-shot authorization' not in log,log
   assert not Path('/opt/autobyteus-desktop/1000').exists()
   if mode=='cancel':assert 'installation cancelled' in log and 'GET ' not in feed
   if mode=='404':assert 'HTTP 404' in log
   if mode=='oversize':assert 'release sidecar read or size refused' in log
   results.append({'case':mode,'result':'pass','exit':p.returncode,'sidecarGets':feed.count('GET '),'authorization':False,'hostInstallState':False})
  finally:
   if p.poll() is None:p.terminate();p.communicate(timeout=15)
 finally:side.write_bytes(original)
Path('refusal-results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
