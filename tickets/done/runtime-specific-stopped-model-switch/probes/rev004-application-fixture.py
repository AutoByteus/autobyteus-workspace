import json,pathlib,shutil,urllib.request
p=pathlib.Path(__file__).resolve().parent
info=json.loads((p/'live-stack-info.json').read_text());base=info['backendUrl']
def gql(q,v={}):
 req=urllib.request.Request(base+'/graphql',data=json.dumps({'query':q,'variables':v}).encode(),headers={'content-type':'application/json'})
 return json.load(urllib.request.urlopen(req))
src=pathlib.Path(__file__).resolve().parents[4]/'applications/brief-studio/dist/importable-package'
dst=pathlib.Path(info['runtimeRoot'])/'rev004-application-package';shutil.copytree(src,dst)
old=dst/'applications/brief-studio';new=dst/'applications/rev004-model-setup';old.rename(new)
f=new/'application.json';d=json.loads(f.read_text());d['id']='rev004-model-setup';d['name']='REV004 Model Setup';d['description']='Test-owned Application Setup exact-current fixture';team=d['executionResourceSlots'][0];team['required']=False;team.pop('defaultExecutionResourceRef',None);team['name']='Optional Team';agent={'slotKey':'agentSlot','name':'Optional Agent','description':'Saved exact-default Agent','allowedExecutionResourceKinds':['AGENT'],'allowedExecutionResourceSources':['shared'],'required':False,'supportedLaunchConfig':{'AGENT':{'runtimeKind':True,'llmModelIdentifier':True,'llmConfig':True,'workspaceRootPath':True}}};d['executionResourceSlots']=[agent,team];f.write_text(json.dumps(d,indent=2)+'\n')
result={'enable':gql('mutation{setApplicationsEnabled(enabled:true){enabled scope source}}'),'import':gql('mutation($input:ImportApplicationPackageInput!){importApplicationPackage(input:$input){packageId displayName applicationCount}}',{'input':{'sourceKind':'LOCAL_PATH','source':str(dst)}}),'catalog':gql('query{listApplications{id name executionResourceSlots{slotKey required}}}')}
app=next((a for a in result['catalog'].get('data',{}).get('listApplications',[]) if a['name']=='REV004 Model Setup'),None);result['applicationId']=app['id'] if app else None
if app:
 import urllib.parse
 u=base+'/rest/applications/'+urllib.parse.quote(app['id'],safe='')+'/execution-resource-configurations'
 try:
  r=urllib.request.urlopen(u);result['initialSetup']={'status':r.status,'body':json.load(r)}
 except Exception as e:result['initialSetup']={'error':str(e),'body':e.read().decode() if hasattr(e,'read') else ''}
(p/'rev004-application-fixture.json').write_text(json.dumps(result,indent=2));print('app',result['applicationId'],'readiness',result.get('initialSetup',{}).get('body',{}).get('readiness'),'errors',result['import'].get('errors'))
