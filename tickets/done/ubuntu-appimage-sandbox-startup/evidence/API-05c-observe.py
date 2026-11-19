from pathlib import Path
import json,os,hashlib,subprocess
out={}
for p in Path('/proc').glob('[0-9]*'):
 try:
  exe=os.readlink(p/'exe')
  if not exe.startswith('/tmp/.mount_'):continue
  name=Path(exe).name
  cmd=(p/'cmdline').read_bytes().replace(b'\0',b' ').split()
  if name=='AppRun':role='supervisor'
  elif name!='autobyteus': continue
  elif b'--type=renderer' in cmd:role='renderer'
  elif any(c.startswith(b'--type=') for c in cmd):continue
  elif any(c.endswith(b'/server/dist/app.js') for c in cmd):role='server'
  else:role='main'
  st=dict(l.split(':',1) for l in (p/'status').read_text().splitlines() if ':' in l)
  out.setdefault(role,[]).append({'pid':p.name,'ppid':st['PPid'].strip(),'exe':exe,'uid':st['Uid'].split()[0],'NoNewPrivs':st['NoNewPrivs'].strip(),'Seccomp':st['Seccomp'].strip(),'NSpid':st['NSpid'].split()})
 except OSError:pass
for name,path in [('file','/opt/autobyteus-desktop/1000/app/AutoByteus.AppImage'),('work','/home/witness/qa3-data/server-data/temp_workspace/qa3-note')]:
 with open(path,'rb') as f:out[name]=hashlib.file_digest(f,'sha256').hexdigest()
print(json.dumps(out))
