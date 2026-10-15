from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='ui-peer-preview-update.json';exec((E/'common.py').read_text())
code='''from pathlib import Path
import struct,zlib,os,json,hashlib
p=Path('/Volumes/autobyteus-shared/previews-api007')
def chunk(t,d):return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
a=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('!2I5B',64,32,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\\0'+bytes([200,20,30])*64)*32))+chunk(b'IEND',b'')
for name,data in [('image.png',a),('index.html',b'<!doctype html><title>API007 updated HTML</title><h1>API007 node B updated HTML</h1><img src="image.png"><link rel="stylesheet" href="style.css">')]:
 with (p/name).open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
 print(name,hashlib.sha256(data).hexdigest())
(p/'peer-created.txt').unlink();(p/'peer-created-second.txt').unlink()
print('deleted both peer-created files')
'''
r['peerWrites']=g('sudo -n docker exec --user 1000:109 autobyteus-server-1 python3 -c '+shlex.quote(code));r['sourceHashes']=g('sha256sum '+SRC+'/previews-api007/image.png '+SRC+'/previews-api007/index.html');assert all(x.split()[1] in r['sourceHashes']['stdout'] for x in r['peerWrites']['stdout'].splitlines()[:2]);r['result']='Pass';save();event('L23 peer B changed PNG and HTML and deleted both own-created entries; exact hashes independently read at original source. UI reload/reopen next.')
