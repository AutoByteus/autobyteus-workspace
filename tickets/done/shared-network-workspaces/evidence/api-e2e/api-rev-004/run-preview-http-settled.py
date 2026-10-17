from pathlib import Path
import json,urllib.request,hashlib,time
E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());base=json.loads((E/'guest-loopback-tunnel-result.json').read_text())['baseUrl'];id='agent_ws_acd2adb3f1ecb577c2c71043e0e315aafdf71d10dd6921d0788c219f19036c1d';r={'base':base,'workspaceId':id,'commands':[],'result':'Running'}
def save():(E/'preview-http-settled-result.json').write_text(json.dumps(r,indent=2)+'\n')
def get(url,headers={}):
 with urllib.request.urlopen(urllib.request.Request(base+url,headers=headers),timeout=15) as res:b=res.read();q={'url':base+url,'requestHeaders':headers,'status':res.status,'headers':dict(res.headers),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()};r['commands'].append(q);save();return q,b
try:
 for p in sorted((S/'previews-api004').iterdir()):
  q,b=get('/rest/workspaces/'+id+'/content?path='+p.name);assert q['status']==200 and b==p.read_bytes()
 for name in ['index.html','style.css','image.png']:
  q,b=get('/rest/workspaces/'+id+'/static/'+name);assert q['status']==200 and b==(S/'previews-api004'/name).read_bytes()
 q,b=get('/rest/workspaces/'+id+'/content?path=clip.mp4',{'Range':'bytes=0-31'});assert q['status']==206 and b==(S/'previews-api004/clip.mp4').read_bytes()[:32]
 data=json.dumps({'query':'query($id:String!,$path:String!){fileContent(workspaceId:$id,filePath:$path)}','variables':{'id':id,'path':'notes.txt'}}).encode()
 with urllib.request.urlopen(urllib.request.Request(base+'/graphql',data=data,headers={'Content-Type':'application/json'}),timeout=15) as res:r['graphql']={'status':res.status,'body':json.loads(res.read())}
 assert r['graphql']['body']=={'data':{'fileContent':'API004 healthy mounted preview original\n'}};r['result']='Pass'
except BaseException as x:r['result']='Fail';r['error']=repr(x)
save();print(json.dumps({'result':r['result'],'error':r.get('error')}))
