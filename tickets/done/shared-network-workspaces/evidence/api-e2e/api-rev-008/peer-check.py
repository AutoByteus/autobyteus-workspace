"""Independent real node B input / A, B and backing-source evidence for original L23.
Usage: peer-check.py MODE label read|write relativeFilename expectedText
No DOM/store mutation; writes use UID1000:GID109, flush/fsync/close.
"""
from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE,label,action,name,expected=sys.argv[1:];assert MODE in ['LN','LD'] and action in ['read','write'];assert name in ['notes.txt','README.md','index.html'];RESULT=MODE+'-'+label+'-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text());r.update(mode=MODE,label=label,action=action,expected=expected,file=name)
try:
 if action=='write':
  code="from pathlib import Path;import os;p=Path("+repr(ROOT+'/previews-api008/'+name)+");f=p.open('wb');f.write("+repr(expected.encode())+");f.flush();os.fsync(f.fileno());f.close();print('closed')"
  case('B independent committed peer write',lambda:g('sudo -n docker exec --user 1000:109 autobyteus-server-1 python3 -c '+shlex.quote(code)))
 for n in ['autobyteus-server-0','autobyteus-server-1']:
  z=case(n+' fresh actual mounted read',lambda:g('sudo -n docker exec --user 1000:109 '+n+' cat '+ROOT+'/previews-api008/'+name));assert z['stdout']==expected
  receipt=json.loads((E/(MODE+'-preview-api-result.json')).read_text());workspace=next(x['evidence']['workspaceId'] for x in receipt['cases'] if n in x['name'])
  code="import assert from 'node:assert/strict';const r=await fetch('http://127.0.0.1:8000/rest/workspaces/'+encodeURIComponent("+json.dumps(workspace)+")+'/content?path='+encodeURIComponent("+json.dumps(name)+"));assert.equal(r.status,200);const body=await r.text();assert.equal(body,"+json.dumps(expected)+");console.log(JSON.stringify({status:r.status,body,mime:r.headers.get('content-type')}));"
  case(n+' public content API committed exact bytes',lambda:g('sudo -n docker exec '+n+' node --input-type=module -e '+shlex.quote(code)))
 z=case('original backing source exact bytes',lambda:g('cat '+SRC+'/previews-api008/'+name));assert z['stdout']==expected
 r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['error']=repr(x);save();raise
