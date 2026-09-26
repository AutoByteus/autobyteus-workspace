import json,pathlib,urllib.request
p=pathlib.Path(__file__).resolve().parent
info=json.loads((p/'live-stack-info.json').read_text());base=info['backendUrl'];root=pathlib.Path(info['runtimeRoot'])
def gql(query,variables={}):
 req=urllib.request.Request(base+'/graphql',data=json.dumps({'query':query,'variables':variables}).encode(),headers={'content-type':'application/json'})
 with urllib.request.urlopen(req,timeout=100) as r:return json.load(r)
def launch(kind,model,name):
 path=root/'workspaces'/name;path.mkdir(parents=True,exist_ok=True)
 return {'runtimeKind':kind,'llmModelIdentifier':model,'llmConfig':None,'autoExecuteTools':False,'skillAccessMode':'PRELOADED_ONLY','workspaceRootPath':str(path)}
choice='llmModelIdentifier providerName displayName canonicalName description configSchema recommended'
agent_q='query($id:String!){agentRunModelOptions(agentRunId:$id){currentModelIdentifier currentModel{'+choice+'} replacements{'+choice+'} unavailableReason}}'
team_q='query($id:String!){teamRunModelOptions(teamRunId:$id){scopeAddress currentModelIdentifier currentModel{'+choice+'} replacements{'+choice+'} unavailableReason}}'
org_q='query($id:String!){agentOrgRunModelOptions(orgRunId:$id){scopeAddress currentModelIdentifier currentModel{'+choice+'} replacements{'+choice+'} unavailableReason}}'
out={'import':gql('mutation($input:ImportAgentPackageInput!){importAgentPackage(input:$input){packageId path sharedAgentCount agentTeamCount}}',{'input':{'sourceKind':'LOCAL_PATH','source':'/Users/normy/autobyteus_org/autobyteus-agents'}})}
for name,kind,model in [('agent-claude-default','claude_agent_sdk','default'),('agent-codex','codex_app_server','gpt-6-astra'),('agent-native','autobyteus','gpt-6-astra')]:
 data=gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',{'input':{'agentDefinitionId':'daily-assistant',**launch(kind,model,name)}});run=data.get('data',{}).get('createAgentRun',{}).get('runId')
 out[name]={'create':data,'runId':run}
 if run:
  out[name]['stop']=gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}',{'id':run})
  out[name]['options']=gql(agent_q,{'id':run})
for name,definition,kind,model,members in [('team-claude-default','classroom-simulation-team','claude_agent_sdk','default',['professor','student'])]:
 base_launch=launch(kind,model,name)
 inp={'teamDefinitionId':definition,'teamConfigs':[{'teamAddress':'/',**base_launch}], 'memberConfigs':[{'memberAddress':'/'+m,'agentDefinitionId':f'team-local-agent:{definition}:{m}',**base_launch} for m in members]}
 data=gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',{'input':inp});run=data.get('data',{}).get('createAgentTeamRun',{}).get('teamRunId')
 out[name]={'create':data,'runId':run}
 if run:
  out[name]['stop']=gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}',{'id':run})
  out[name]['options']=gql(team_q,{'id':run})
for name,definition,kind,model in [('org-claude-default','software-development-department','claude_agent_sdk','default')]:
 data=gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',{'input':{'agentOrgDefinitionId':definition,'rootConfiguration':launch(kind,model,name),'teamOverrides':[],'agentOverrides':[]}});run=data.get('data',{}).get('createAgentOrgRun',{}).get('agentOrgRunId')
 out[name]={'create':data,'runId':run}
 if run:
  out[name]['stop']=gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}',{'id':run})
  out[name]['options']=gql(org_q,{'id':run})
(p/'rev004-seed-evidence.json').write_text(json.dumps(out,indent=2))
for key,val in out.items():
 if key=='import':continue
 opts=val.get('options',{}).get('data',{})
 row=next(iter(opts.values()),None)
 if isinstance(row,list):row=row[0] if row else None
 print(key,'run',val.get('runId'),'current',row.get('currentModelIdentifier') if row else None,'descriptor',row.get('currentModel',{}).get('llmModelIdentifier') if row and row.get('currentModel') else None,'replacements',len(row.get('replacements',[])) if row else None,'errors',val.get('create',{}).get('errors'))
