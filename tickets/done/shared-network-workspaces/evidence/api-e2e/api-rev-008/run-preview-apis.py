from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-preview-api-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
fixtures=json.loads((E/'preview-fixture-result.json').read_text());assert fixtures['result']=='Pass';r['mode']=MODE
client="""
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const fixtures=FIXTURES,base='http://127.0.0.1:8000';const out={files:[]};
const r=await fetch(base+'/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}',variables:{input:{rootPath:'/Volumes/autobyteus-shared/previews-api008'}}})});assert.equal(r.status,200);const j=await r.json();assert.equal(j.errors,undefined);out.workspaceId=j.data.createWorkspace.workspaceId;
const url=base+'/rest/workspaces/'+encodeURIComponent(out.workspaceId);
const mime={'image.png':'image/png','index.html':'text/html','document.pdf':'application/pdf','tone.wav':'audio/','clip.mp4':'video/mp4','notes.txt':'text/plain','README.md':'text/'};
for(const [name,expected] of Object.entries(fixtures)){
 const a=await fetch(url+'/content?path='+encodeURIComponent(name));assert.equal(a.status,200);const bytes=Buffer.from(await a.arrayBuffer());const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,expected.sha256);if(mime[name])assert.ok(a.headers.get('content-type').includes(mime[name]),name+':'+a.headers.get('content-type'));out.files.push({name,status:a.status,mime:a.headers.get('content-type'),size:bytes.length,sha256:hash});
}
for(const name of ['index.html','image.png','style.css']){const a=await fetch(url+'/static/'+name);assert.equal(a.status,200);assert.equal(createHash('sha256').update(Buffer.from(await a.arrayBuffer())).digest('hex'),fixtures[name].sha256);}
out.result='Pass';console.log(JSON.stringify(out));
""".replace('FIXTURES',json.dumps(fixtures['files']))
try:
 for node in ['autobyteus-server-0','autobyteus-server-1']:
  def check():
   z=cmd(['exec','-i',V,'sudo','-n','docker','exec','-i',node,'node','--input-type=module'],data=client.encode(),timeout=60);v=json.loads(z['stdout']);assert v['result']=='Pass';return v
  case('L23 '+MODE+' '+node+' all healthy media text HTML-relative assets exact API bytes/MIME',check)
 r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();raise
