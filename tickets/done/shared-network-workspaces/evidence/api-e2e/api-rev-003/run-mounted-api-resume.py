from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','mounted-api-resume-result.json');exec(s)
node='autobyteus-server-0';assert json.loads((E/'linux-managed-client-confirm-result.json').read_text())['result']=='Pass'
try:
 seed='''from pathlib import Path
import base64
p=Path(SOURCE)/'api-scenario';p.mkdir();(p/'assets').mkdir();(p/'preexisting.txt').write_text('API003_INITIAL');(p/'index.html').write_text('<html><body><h1>API003 mounted HTML</h1><img src="assets/diagram%20one.png"></body></html>');(p/'assets/diagram one.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='))
'''.replace('SOURCE',repr(SRC))
 r['seedEvidence']='mounted-api-result.json';save()
 raw=(E/'mounted-api-client-v2.mjs').read_bytes();r['clientSHA256']=hashlib.sha256(raw).hexdigest();save()
 q=case('actual running product HTTP GraphQL image HTML and PTY Git',lambda:cmd(['exec','-i',V,'sudo','-n','docker','exec','-i',node,'node','--input-type=module'],data=raw,timeout=90));result=json.loads(q['stdout']);assert result['result']=='Pass';r['api']=result;r['result']='Pass';save();event('Mounted HTTP/GraphQL/relative static bytes and actual WebSocket PTY exact scoped Git/cwd Pass; not desktop rendering/model tools/independent peer')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Mounted API case Fail/incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
