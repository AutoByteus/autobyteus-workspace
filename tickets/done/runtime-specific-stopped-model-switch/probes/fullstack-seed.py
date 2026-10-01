import json, pathlib, urllib.request
p=pathlib.Path(__file__).resolve().parent
info=json.loads((p/'live-stack-info.json').read_text()); base=info['backendUrl']; root=pathlib.Path(info['runtimeRoot'])
for name in ['agent-claude','agent-codex','agent-native','team-claude','org-antigravity']:
 (root/'workspaces'/name).mkdir(parents=True,exist_ok=True)

def gql(query, variables={}):
 req=urllib.request.Request(base+'/graphql',data=json.dumps({'query':query,'variables':variables}).encode(),headers={'content-type':'application/json'})
 with urllib.request.urlopen(req,timeout=80) as response: return json.load(response)

def launch(kind,model,name):
 return {'runtimeKind':kind,'llmModelIdentifier':model,'llmConfig':None,'autoExecuteTools':False,'skillAccessMode':'PRELOADED_ONLY','workspaceRootPath':str(root/'workspaces'/name)}

out={}
agent='mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}'
stop_agent='mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}'
for name,kind,model in [('agent-claude','claude_agent_sdk','default'),('agent-codex','codex_app_server','gpt-6-astra'),('agent-native','autobyteus','gpt-6-astra')]:
 data=gql(agent,{'input':{'agentDefinitionId':'daily-assistant',**launch(kind,model,name)}});out[name]={'create':data}
 run=data.get('data',{}).get('createAgentRun',{}).get('runId') if data.get('data') else None
 if run: out[name]['runId']=run;out[name]['stop']=gql(stop_agent,{'id':run});out[name]['options']=gql('query($id:String!){agentRunModelOptions(agentRunId:$id){currentModelIdentifier replacements{llmModelIdentifier} unavailableReason}}',{'id':run})
 print(name,'created=',data.get('data',{}).get('createAgentRun') if data.get('data') else data.get('errors'))
team='mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}'
base_team=launch('claude_agent_sdk','claude-opus-4-7','team-claude')
team_input={'teamDefinitionId':'classroom-simulation-team','teamConfigs':[{'teamAddress':'/',**base_team}], 'memberConfigs':[{'memberAddress':f'/{name}','agentDefinitionId':f'team-local-agent:classroom-simulation-team:{name}',**base_team} for name in ['professor','student']]}
data=gql(team,{'input':team_input});out['team-claude']={'create':data};run=data.get('data',{}).get('createAgentTeamRun',{}).get('teamRunId') if data.get('data') else None
if run: out['team-claude']['runId']=run;out['team-claude']['stop']=gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}',{'id':run});out['team-claude']['options']=gql('query($id:String!){teamRunModelOptions(teamRunId:$id){scopeAddress currentModelIdentifier replacements{llmModelIdentifier} unavailableReason}}',{'id':run})
print('team-claude','created=',data.get('data',{}).get('createAgentTeamRun') if data.get('data') else data.get('errors'))
org='mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}'
data=gql(org,{'input':{'agentOrgDefinitionId':'software-development-department','rootConfiguration':launch('antigravity_cli','gemini-3.1-pro-high','org-antigravity'),'teamOverrides':[],'agentOverrides':[]}});out['org-antigravity']={'create':data};run=data.get('data',{}).get('createAgentOrgRun',{}).get('agentOrgRunId') if data.get('data') else None
if run: out['org-antigravity']['runId']=run;out['org-antigravity']['stop']=gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}',{'id':run});out['org-antigravity']['options']=gql('query($id:String!){agentOrgRunModelOptions(orgRunId:$id){scopeAddress currentModelIdentifier replacements{llmModelIdentifier} unavailableReason}}',{'id':run})
print('org-antigravity','created=',data.get('data',{}).get('createAgentOrgRun') if data.get('data') else data.get('errors'))
(p/'fullstack-seed-evidence.json').write_text(json.dumps(out,indent=2))
for k,v in out.items():
 opt=v.get('options',{}); d=opt.get('data'); print(k,'stopped=',v.get('stop'), 'options=',len(next(iter(d.values()))) if d and isinstance(next(iter(d.values())),list) else len(d.get('agentRunModelOptions',{}).get('replacements',[])) if d else opt.get('errors'))
