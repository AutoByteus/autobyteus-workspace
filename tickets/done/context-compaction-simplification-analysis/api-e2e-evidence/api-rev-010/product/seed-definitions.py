from api import *
model='api10-deterministic-32768:lmstudio@127.0.0.1:'+str(json.loads((p/'loopback-state.json').read_text())['port'])
default={'runtimeKind':'autobyteus','llmModelIdentifier':model}
ids={}
for name in ['API10 Reviewer','API10 Lead','API10 Peer']:
 d={'name':name,'description':'Owned API10 deterministic native fixture','instructions':'API10 fixture. Acknowledge the latest input. No remote work.','toolNames':['read_file'],'defaultLaunchConfig':default}
 r=gql('create-'+name.replace(' ','-'),'mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}',{'input':d})
 ids[name]=r['createAgentDefinition']['id']
team={'name':'API10 Team','description':'Owned API10 two-member native team','instructions':'API10 fixture team','coordinatorMemberName':'lead','nodes':[{'memberName':'lead','ref':ids['API10 Lead'],'refScope':'SHARED'},{'memberName':'peer','ref':ids['API10 Peer'],'refScope':'SHARED'}],'handoffs':[],'defaultLaunchConfig':default}
ids['API10 Team']=gql('create-team','mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id name}}',{'input':team})['createAgentTeamDefinition']['id']
(p/'definition-ids.json').write_text(json.dumps(ids,indent=2))
print(ids)
