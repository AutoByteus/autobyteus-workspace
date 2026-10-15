from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='ui-peer-change-result.json';exec((E/'common.py').read_text())
code="""from pathlib import Path
import os,json,hashlib
p=Path('/Volumes/autobyteus-shared/previews-api007')
assert (p/'notes.txt').read_text()=='API007 healthy mounted preview original\\n'
rows={}
for name,data in [('notes.txt',b'API007_PEER_B_COMMITTED\\n'),('peer-created.txt',b'API007_NEW_FROM_NODE_B\\n')]:
 with (p/name).open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
 rows[name]=hashlib.sha256(data).hexdigest()
print(json.dumps(rows))
"""
try:
 z=g('sudo -n docker exec --user 1000:109 autobyteus-server-1 python3 -c '+shlex.quote(code));r['write']=z
 r['nativeAndNodeA']=g('sha256sum '+SRC+'/previews-api007/notes.txt; sudo -n docker exec autobyteus-server-0 cat '+ROOT+'/previews-api007/notes.txt');assert 'API007_PEER_B_COMMITTED' in r['nativeAndNodeA']['stdout'];r['result']='Pass';save();event('L23 real node B committed text/create; native and node A independently see bytes. UI unsaved-buffer/reload evidence next.')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();raise
