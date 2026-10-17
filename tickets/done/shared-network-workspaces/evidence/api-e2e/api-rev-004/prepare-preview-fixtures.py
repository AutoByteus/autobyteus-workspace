"""Deterministic owned preview fixtures, not agent-completed artifacts or provider evidence."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,tarfile,io,struct,zlib,wave,math
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','preview-fixture-result.json'))
prior=json.loads((E/'native-client-v2-result.json').read_text());assert prior['result']=='Pass';SRC=prior['source'];r['source']=SRC;r['connection']=prior['connection'];r['binary']=json.loads((E/'build-result.json').read_text())
p=S/'previews-api004';p.mkdir()
(p/'notes.txt').write_text('API004 healthy mounted preview original\n')
(p/'README.md').write_text('# API004 Markdown\n\n**Mounted** content and [relative HTML](index.html).\n')
(p/'index.html').write_text('<!doctype html><title>API004 mounted HTML</title><h1>API004 relative assets</h1><img src="image.png" width="64" height="32"><link rel="stylesheet" href="style.css">')
(p/'style.css').write_text('h1 {color: rgb(12, 120, 60)}')
def chunk(t,d):return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
(p/'image.png').write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',64,32,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+bytes([20,140,70])*64)*32))+chunk(b'IEND',b''))
with wave.open(str(p/'tone.wav'),'wb') as w:
 w.setparams((1,2,16000,0,'NONE','not compressed'));w.writeframes(b''.join(struct.pack('<h',int(1600*math.sin(2*math.pi*440*i/16000))) for i in range(16000*4)))
q=sp.run(['/opt/homebrew/bin/ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:s=160x90:r=10:d=4','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(p/'clip.mp4')],env=env,capture_output=True,text=True,timeout=30);r['ffmpeg']={'rc':q.returncode,'stdout':q.stdout,'stderr':q.stderr};assert q.returncode==0
objs=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
stream=b'BT /F1 18 Tf 20 120 Td (API004 mounted PDF) Tj ET';objs.append(b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream');pdf=b'%PDF-1.4\n';offs=[0]
for i,o in enumerate(objs,1):offs.append(len(pdf));pdf+=str(i).encode()+b' 0 obj\n'+o+b'\nendobj\n'
x=len(pdf);pdf+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(('%010d 00000 n \n'%o).encode() for o in offs[1:])+b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+str(x).encode()+b'\n%%EOF\n';(p/'document.pdf').write_bytes(pdf)
r['files']={f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'size':f.stat().st_size} for f in p.iterdir()}
b=io.BytesIO()
with tarfile.open(fileobj=b,mode='w') as tf:
 for f in p.iterdir():tf.add(f,arcname='previews-api004/'+f.name)
cmd(['exec','-i',V,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/bin:/bin','/bin/sh','-c','test ! -e '+SRC+'/previews-api004 && tar -xf - -C '+SRC],data=b.getvalue())
r['mountedProof']=g('sudo -n docker exec autobyteus-server-0 sh -c '+shlex.quote('sha256sum '+ROOT+'/previews-api004/*; cat '+ROOT+'/.autobyteus-nfs/storage.json'))
assert all(v['sha256'] in r['mountedProof']['stdout'] for v in r['files'].values());r['result']='Pass';save();event('V04 deterministic healthy mounted fixtures bytes verified in actual managed node; no actual-agent completed artifact claim')
