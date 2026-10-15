from pathlib import Path
import json,urllib.request,hashlib,time,shlex,struct,zlib
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','preview-external-change-result.json'))
SRC=json.loads((E/'native-client-v2-result.json').read_text())['source'];base=json.loads((E/'guest-loopback-tunnel-result.json').read_text())['baseUrl'];id='agent_ws_acd2adb3f1ecb577c2c71043e0e315aafdf71d10dd6921d0788c219f19036c1d'
def fetch(name):
 with urllib.request.urlopen(base+'/rest/workspaces/'+id+'/content?path='+name,timeout=5) as q:return q.read()
def chunk(t,d):return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
b=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',64,32,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+bytes([180,30,20])*64)*32))+chunk(b'IEND',b'')
try:
 r['imageBefore']=hashlib.sha256(fetch('image.png')).hexdigest();r['notesBefore']=fetch('notes.txt').decode();assert r['notesBefore']=='API004 healthy mounted preview original\n'
 code="import os;from pathlib import Path;p=Path("+repr(SRC+'/previews-api004')+");f=(p/'image.png').open('wb');f.write(bytes.fromhex("+repr(b.hex())+"));f.flush();os.fsync(f.fileno());f.close();(p/'notes.txt').write_text('API004 EXTERNAL SOURCE CHANGE\\n');(p/'external-added.txt').write_text('API004 EXTERNAL NEW FILE\\n');print('closed synced image and other source files')"
 g('python3 -c '+shlex.quote(code));start=time.monotonic();r['imageExpected']=hashlib.sha256(b).hexdigest();r['observations']=[]
 while True:
  got=fetch('image.png');elapsed=time.monotonic()-start;r['observations'].append({'secondsAfterWriterReturn':round(elapsed,3),'sha256':hashlib.sha256(got).hexdigest()});save()
  if got==b:break
  if elapsed>=5:raise AssertionError('healthy binary update not visible within approved5s after source close/fsync')
  time.sleep(.25)
 r['visibilitySeconds']=round(elapsed,3);assert elapsed<=5;r['result']='Pass';save();event('V04 healthy source-actor synced binary update visible through mounted node HTTP <=5s; desktop unsaved buffer not yet rechecked; not independent peer')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('V04 external-change check '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal'),'visibilitySeconds':r.get('visibilitySeconds')}))
