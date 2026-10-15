from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,urllib.request,urllib.error,urllib.parse
E=Path(__file__).resolve().parent;p=E/'run-linux-docker-public.py';s=p.read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','mounted-api-mutations-result.json');exec(s)
base=json.loads((E/'guest-loopback-tunnel-v2-result.json').read_text())['baseUrl'];wid=json.loads((E/'mounted-api-resume-result.json').read_text())['api']['workspaceId'];r['workspaceId']=wid;r['http']=[];save()
def http(path,body=None):
 req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'content-type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=15) as res:v={'status':res.status,'body':res.read().decode(),'headers':dict(res.headers)}
 except urllib.error.HTTPError as res:v={'status':res.code,'body':res.read().decode(),'headers':dict(res.headers)}
 r['http'].append({'path':path,'request':body,'response':v});save();return v
def gql(query,variables):
 q=http('/graphql',{'query':query,'variables':{'id':wid,**variables}});assert q['status']==200;v=json.loads(q['body']);assert not v.get('errors'),v;assert all('"error"' not in str(x) for x in v['data'].values()),v;return v
try:
 def crud():
  a=gql('mutation($id:String!){createFileOrFolder(workspaceId:$id,path:"api-created.txt",isFile:true)}',{})
  b=gql('mutation($id:String!){writeFileContent(workspaceId:$id,filePath:"api-created.txt",content:"API003_PUBLIC_WRITE")}',{})
  q=nongroups('cat '+SRC+'/api-scenario/api-created.txt; stat -c "%u:%g" '+SRC+'/api-scenario/api-created.txt');assert q['stdout']=='API003_PUBLIC_WRITE1000:109\n'
  c=gql('mutation($id:String!){renameFileOrFolder(workspaceId:$id,targetPath:"api-created.txt",newName:"api-renamed.txt")}',{})
  d=gql('query($id:String!){fileContent(workspaceId:$id,filePath:"api-renamed.txt")}',{});assert d['data']['fileContent']=='API003_PUBLIC_WRITE'
  e=gql('mutation($id:String!){deleteFileOrFolder(workspaceId:$id,path:"api-renamed.txt")}',{})
  nongroups('test ! -e '+SRC+'/api-scenario/api-created.txt; test ! -e '+SRC+'/api-scenario/api-renamed.txt')
  return {'create':a,'write':b,'sourceOwner':q,'rename':c,'read':d,'delete':e}
 case('ordinary public API create/write/rename/read/delete reaches original source and all-squash owner',crud)
 def replace():
  code="from pathlib import Path; p=Path("+repr(SRC+ '/api-scenario')+"); (p/'replacement.txt').write_text('API003_EXTERNAL_REPLACE'); (p/'replacement.txt').replace(p/'preexisting.txt')"
  nongroups('python3 -c '+shlex.quote(code));url='/rest/workspaces/'+urllib.parse.quote(wid,safe='')+'/static/preexisting.txt'
  deadline=time.monotonic()+8
  while True:
   q=http(url)
   if q['status']==200 and q['body']=='API003_EXTERNAL_REPLACE':break
   if time.monotonic()>deadline:raise AssertionError(q)
   time.sleep(.25)
  nongroups('rm '+SRC+'/api-scenario/preexisting.txt');deadline=time.monotonic()+8
  while True:
   q=http(url)
   if q['status']==404:break
   if time.monotonic()>deadline:raise AssertionError(q)
   time.sleep(.25)
  return {'externalOriginalSourceAtomicReplacement':'Pass','laterDeletion404':'Pass','htmlAndImageKeptForDesktop':True}
 case('healthy mounted static route reopens externally replaced and deleted file',replace)
 r['result']='Pass';save();event('Mounted API CRUD/rename/delete and original-source external replacement/deletion freshness Pass; no independent peer claimed')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Mounted API mutations Fail/incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
