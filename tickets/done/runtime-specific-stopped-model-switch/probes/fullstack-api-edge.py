import json,pathlib,urllib.request
p=pathlib.Path(__file__).resolve().parent;info=json.loads((p/'live-stack-info.json').read_text());seed=json.loads((p/'fullstack-seed-evidence.json').read_text());url=info['backendUrl']+'/graphql'
def gql(q,v={}):
 req=urllib.request.Request(url,data=json.dumps({'query':q,'variables':v}).encode(),headers={'content-type':'application/json'})
 with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
out={}
ids={k:v['runId'] for k,v in seed.items()}
read_agent='query($id:String!){getAgentRunResumeConfig(runId:$id){runId isActive metadataConfig{llmModelIdentifier llmConfig}}}'
save_agent='mutation($input:UpdateStoppedAgentRunModelConfigInput!){updateStoppedAgentRunModelConfig(input:$input){success outcome message fieldErrors{path message} canonicalSelection{llmModelIdentifier llmConfig}}}'
for name,target,config in [('claude-removed','definitely-not-in-catalog',None),('claude-invalid-schema','claude-opus-4-7',{'unsupported_setting':True}),('native-smaller','claude-opus-4.8',None)]:
 k='agent-native' if name.startswith('native') else 'agent-claude';id=ids[k];before=gql(read_agent,{'id':id});saved=gql(save_agent,{'input':{'agentRunId':id,'llmModelIdentifier':target,'llmConfig':config}});after=gql(read_agent,{'id':id});out[name]={'before':before,'save':saved,'after':after};print(name,saved.get('data',{}).get('updateStoppedAgentRunModelConfig') if saved.get('data') else saved.get('errors'))
# A valid Org root patch and invalid linked scope must not partially commit.
org_id=ids['org-antigravity'];read_org='query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}';save_org='mutation($input:UpdateStoppedAgentOrgRunConfigInput!){updateStoppedAgentOrgRunConfig(input:$input){success outcome message fieldErrors{path message}}}'
before=gql(read_org,{'id':org_id});saved=gql(save_org,{'input':{'orgRunId':org_id,'modelPatches':[{'scopeKind':'CONFIGURED_TEAM','scopeAddress':'/software_engineering_team','llmModelIdentifier':'gemini-3.1-pro-high','llmConfig':None},{'scopeKind':'CONFIGURED_AGENT','scopeAddress':'/software_engineering_team/solution_designer','llmModelIdentifier':'definitely-not-in-catalog','llmConfig':None}],'teamWorkspacePatches':[]}});after=gql(read_org,{'id':org_id});out['org-atomic-invalid']={'before':before,'save':saved,'after':after};print('org-atomic-invalid',saved.get('data',{}).get('updateStoppedAgentOrgRunConfig') if saved.get('data') else saved.get('errors'))
# Contract must have ID-only option rows; removed numeric fields fail schema introspection.
out['contract']=gql('query{options:__type(name:"RunModelOptionsObject"){fields{name}} replacement:__type(name:"RunModelReplacementOptionObject"){fields{name}}}')
print('contract',out['contract'])
(p/'fullstack-api-edge-evidence.json').write_text(json.dumps(out,indent=2))
