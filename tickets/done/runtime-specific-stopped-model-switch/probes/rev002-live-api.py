import json,pathlib,urllib.request
p=pathlib.Path(__file__).resolve().parent;info=json.loads((p/'live-stack-info.json').read_text());seed=json.loads((p/'rev002-seed-evidence.json').read_text());url=info['backendUrl']+'/graphql'
def gql(q,v={}):
 req=urllib.request.Request(url,data=json.dumps({'query':q,'variables':v}).encode(),headers={'content-type':'application/json'})
 with urllib.request.urlopen(req,timeout=90) as r:return json.load(r)
out={}
choice='llmModelIdentifier providerName displayName canonicalName description configSchema recommended'
out['snapshot']=gql('query{providerModelCatalogSnapshots(runtimeKind:"claude_agent_sdk"){runtimeKind llmModels{modelIdentifier canonicalName name configSchema}}}')
out['exact']=gql('query{runtimeCurrentModelDescriptors(runtimeKind:"claude_agent_sdk",identifiers:["default","opus","missing"]){identifier model{modelIdentifier canonicalName name configSchema}}}')
for key,kind,query in [('agent-claude-default','agent','agentRunModelOptions(agentRunId:$id)'),('team-claude-default','team','teamRunModelOptions(teamRunId:$id)'),('org-claude-default','org','agentOrgRunModelOptions(orgRunId:$id)')]:
 id=seed[key]['runId'];fields=('scopeKind scopeAddress ' if kind!='agent' else '')+'currentModelIdentifier currentModel{'+choice+'} replacements{'+choice+'} unavailableReason'
 out[key+'-options']=gql('query($id:String!){'+query+'{'+fields+'}}',{'id':id})
config={'reasoning_effort':'high'}
# Same exact saved-default settings writes on independent test-owned runs; no user local records touched.
agent=seed['agent-claude-default']['runId'];read_agent='query($id:String!){getAgentRunResumeConfig(runId:$id){runId isActive metadataConfig{llmModelIdentifier llmConfig runtimeReference{runtimeKind sessionId threadId}}}}'
save_agent='mutation($input:UpdateStoppedAgentRunModelConfigInput!){updateStoppedAgentRunModelConfig(input:$input){success outcome message fieldErrors{path message} canonicalSelection{llmModelIdentifier llmConfig}}}'
out['agent-before']=gql(read_agent,{'id':agent});out['agent-unchanged-save']=gql(save_agent,{'input':{'agentRunId':agent,'llmModelIdentifier':'default','llmConfig':config}});out['agent-after']=gql(read_agent,{'id':agent})
team=seed['team-claude-default']['runId'];read_team='query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree}}';save_team='mutation($input:UpdateStoppedTeamRunModelConfigsInput!){updateStoppedTeamRunModelConfigs(input:$input){success outcome message fieldErrors{path message}}}'
out['team-before']=gql(read_team,{'id':team});out['team-unchanged-save']=gql(save_team,{'input':{'teamRunId':team,'patches':[{'scopeKind':'CONFIGURED_TEAM','scopeAddress':'/','llmModelIdentifier':'default','llmConfig':config}]}});out['team-after']=gql(read_team,{'id':team})
org=seed['org-claude-default']['runId'];read_org='query($id:String!){getAgentOrgRunConfig(orgRunId:$id){orgRunId isActive executionTree}}';save_org='mutation($input:UpdateStoppedAgentOrgRunConfigInput!){updateStoppedAgentOrgRunConfig(input:$input){success outcome message fieldErrors{path message}}}'
out['org-before']=gql(read_org,{'id':org});out['org-unchanged-save']=gql(save_org,{'input':{'orgRunId':org,'modelPatches':[{'scopeKind':'CONFIGURED_ORG','scopeAddress':'/','llmModelIdentifier':'default','llmConfig':config}],'teamWorkspacePatches':[]}});out['org-after']=gql(read_org,{'id':org})
out['schema']=gql('query{options:__type(name:"RunModelOptionsObject"){fields{name}} choice:__type(name:"RunModelOptionObject"){fields{name}} exact:__type(name:"RuntimeCurrentModelDescriptorObject"){fields{name}}}')
(p/'rev002-live-api-evidence.json').write_text(json.dumps(out,indent=2))
rows=out['snapshot']['data']['providerModelCatalogSnapshots'][0]['llmModels'];print('snapshot',len(rows),'default',any(x['modelIdentifier']=='default' for x in rows),'opus',any(x['modelIdentifier']=='opus' for x in rows))
for k in ['agent-claude-default','team-claude-default','org-claude-default']:
 rows=next(iter(out[k+'-options']['data'].values()));rows=rows if isinstance(rows,list) else [rows]
 print(k,'scopes',len(rows),'all-exact-default',all(r['currentModel']['llmModelIdentifier']=='default' for r in rows),'replacement-default',any(any(c['llmModelIdentifier']=='default' for c in r['replacements']) for r in rows))
for k in ['agent','team','org']:
 print(k+' unchanged',out[k+'-unchanged-save'].get('data'),out[k+'-unchanged-save'].get('errors'))
