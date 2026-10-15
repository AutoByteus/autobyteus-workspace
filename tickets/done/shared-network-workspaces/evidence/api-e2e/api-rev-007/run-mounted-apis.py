from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-mounted-api-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
assert json.loads((E/(MODE+('-files-v2-result.json' if MODE=='LD' else '-files-result.json'))).read_text())['result']=='Pass'
scenario='api-scenario-'+MODE;q=shlex.quote
def script(node,code):return g('sudo -n docker exec '+node+' node --input-type=module -e '+q(code),timeout=45)
try:
 seed="""from pathlib import Path
import base64
p=Path(SOURCE)/SCENARIO;p.mkdir();(p/'assets').mkdir();(p/'preexisting.txt').write_text('API007_INITIAL');(p/'index.html').write_text('<html><body><h1>API007 mounted HTML</h1><img src="assets/diagram%20one.png"></body></html>');(p/'assets/diagram one.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='))
""".replace('SOURCE',repr(SRC)).replace('SCENARIO',repr(scenario))
 case('L22 '+MODE+' deterministic mounted project and non-global Git fixture',lambda:nongroups('python3 -c '+q(seed)+' && git -C '+SRC+'/'+scenario+' init -q && git -C '+SRC+'/'+scenario+' add . && git -C '+SRC+'/'+scenario+' -c user.name=API007 -c user.email=api007@example.invalid commit -qm fixture'))
 raw=(E/'mounted-api-client.mjs').read_text().replace('/api-scenario','/'+scenario)
 r['api']={}
 for n in ['autobyteus-server-0','autobyteus-server-1']:
  def full():
   z=cmd(['exec','-i',V,'sudo','-n','docker','exec','-i',n,'node','--input-type=module'],data=raw.encode(),timeout=90)
   v=json.loads(z['stdout']);assert v['result']=='Pass';r['api'][n]=v;save();return v
  case('L22 '+MODE+' '+n+' actual GraphQL REST HTML-relative-image and WebSocket PTY scoped Git',full)
 # Both directions: one node writes exact bytes and removes them, other actual product serves them.
 for writer,reader in [('autobyteus-server-1','autobyteus-server-0'),('autobyteus-server-0','autobyteus-server-1')]:
  name='peer-'+writer+'.bin';path=ROOT+'/'+scenario+'/'+name;id=r['api'][reader]['workspaceId']
  write="import fs from 'node:fs/promises';const f=await fs.open("+json.dumps(path)+",'w');await f.writeFile(Buffer.from(Array.from({length:1024},(_,i)=>i%256)));await f.sync();await f.close();console.log('committed');"
  read="import assert from 'node:assert/strict';let r=await fetch('http://127.0.0.1:8000/rest/workspaces/'+encodeURIComponent("+json.dumps(id)+")+'/content?path='+encodeURIComponent("+json.dumps(name)+"));assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),Buffer.from(Array.from({length:1024},(_,i)=>i%256)));console.log('exact peer HTTP bytes');"
  case('L22 '+MODE+' '+writer+' to '+reader+' actual content API peer change',lambda:[script(writer,write),script(reader,read)])
  delete="import fs from 'node:fs/promises';await fs.unlink("+json.dumps(path)+");console.log('deleted')"
  errors="import assert from 'node:assert/strict';const base='http://127.0.0.1:8000/rest/workspaces/'+encodeURIComponent("+json.dumps(id)+");for(const path of ["+json.dumps(name)+",'../outside','/etc/passwd']){const r=await fetch(base+'/content?path='+encodeURIComponent(path));assert.ok([400,403,404].includes(r.status),path+':'+r.status);console.log(JSON.stringify({path,status:r.status}));}"
  case('L22 '+MODE+' peer delete and traversal/absolute authorization refusals',lambda:[script(writer,delete),script(reader,errors)])
 r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();raise
