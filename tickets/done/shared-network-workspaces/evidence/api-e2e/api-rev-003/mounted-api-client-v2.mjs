// Real running product HTTP/GraphQL/WebSocket client; no backend module/reader mocks.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire('/app/autobyteus-server-ts/package.json');const WebSocket=require('ws');
const base='http://127.0.0.1:8000',root='/Volumes/autobyteus-shared/api-scenario';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const html='<html><body><h1>API003 mounted HTML</h1><img src="assets/diagram%20one.png"></body></html>';
const hash=b=>createHash('sha256').update(b).digest('hex');const out={cases:[],root};
async function gql(query,variables={}) {const r=await fetch(base+'/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});assert.equal(r.status,200);const j=await r.json();assert.equal(j.errors,undefined,JSON.stringify(j));return j.data;}
const created=await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}',{input:{rootPath:root}});out.workspaceId=created.createWorkspace.workspaceId;const id=encodeURIComponent(out.workspaceId);
const content=await gql('query($id:String!,$path:String!){fileContent(workspaceId:$id,filePath:$path)}',{id:out.workspaceId,path:'preexisting.txt'});assert.equal(content.fileContent,'API003_INITIAL');
const children=await gql('query($id:String!,$path:String!){folderChildren(workspaceId:$id,folderPath:$path)}',{id:out.workspaceId,path:''});assert.match(children.folderChildren,/index\.html/);out.cases.push({name:'public workspace create/fileContent/folderChildren on mounted project',result:'Pass'});
const pageUrl=base+`/rest/workspaces/${id}/static/index.html`;let r=await fetch(pageUrl);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/html/);assert.equal(await r.text(),html);
const imageUrl=new URL('assets/diagram%20one.png',pageUrl);r=await fetch(imageUrl);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/png/);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(png));
r=await fetch(base+`/rest/workspaces/${id}/content?path=assets%2Fdiagram%20one.png`);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(png));out.cases.push({name:'healthy HTML static relative asset and image content APIs return exact NFS bytes',result:'Pass'});
let before;try{before=hash(await fs.readFile('/root/.gitconfig'));}catch(e){assert.equal(e.code,'ENOENT');before=null;}
const url=new URL(base.replace('http:','ws:')+'/ws/terminal/api003-mounted-git');url.searchParams.set('cwd',root);const socket=new WebSocket(url);
try {
 await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);setTimeout(()=>reject(Error('terminal open timeout')),15000).unref();});
 let combined='';const receipt=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('terminal receipt timeout: '+combined.slice(-1200))),15000);socket.on('message',raw=>{let p;try{p=JSON.parse(raw.toString());}catch{return;}if(p.type==='error'){clearTimeout(timer);reject(Error(JSON.stringify(p)));return;}if(p.type!=='output')return;combined+=Buffer.from(p.data,'base64').toString();const m=combined.match(/(?:^|[\r\n])API003_RECEIPT:(\{[^\r\n]*\})/);if(m){clearTimeout(timer);resolve(JSON.parse(m[1]));}});});
 const py=`import os,subprocess,json; p=subprocess.run(['git','status','--porcelain'],capture_output=True,text=True); g=subprocess.run(['git','rev-parse','--show-toplevel'],capture_output=True,text=True); print('API003_'+'RECEIPT:'+json.dumps({'cwd':os.getcwd(),'uid':os.getuid(),'gitRc':p.returncode,'gitErr':p.stderr,'gitTop':g.stdout.strip(),'count':os.getenv('GIT_CONFIG_COUNT'),'key0':os.getenv('GIT_CONFIG_KEY_0'),'value0':os.getenv('GIT_CONFIG_VALUE_0')}))`;
 socket.send(JSON.stringify({type:'input',data:Buffer.from('python3 -c '+"'"+py.replaceAll("'","'\\''")+"'\n").toString('base64')}));const v=await receipt;assert.equal(v.cwd,root);assert.equal(v.uid,0);assert.equal(v.gitRc,0,v.gitErr);assert.equal(v.gitTop,root);assert.equal(v.count,'1');assert.equal(v.key0,'safe.directory');assert.equal(v.value0,root);out.terminal=v;out.cases.push({name:'actual WebSocket PTY enters mounted cwd and grants only exact child Git path',result:'Pass'});
} finally {socket.close();await new Promise(resolve=>{socket.once('close',resolve);setTimeout(resolve,2000).unref();});}
let after;try{after=hash(await fs.readFile('/root/.gitconfig'));}catch(e){assert.equal(e.code,'ENOENT');after=null;}assert.equal(after,before);assert.equal(process.env.GIT_CONFIG_COUNT,undefined);out.globalGitConfig={before,after,unchanged:true};out.result='Pass';console.log(JSON.stringify(out));
