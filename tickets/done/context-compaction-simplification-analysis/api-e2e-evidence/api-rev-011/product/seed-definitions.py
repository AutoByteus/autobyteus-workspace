from api import *
model='api11-deterministic-32768:lmstudio@127.0.0.1:'+str(json.loads((p/'loopback-state.json').read_text())['port'])
default={'runtimeKind':'autobyteus','llmModelIdentifier':model}
ids={}
for name in ['API11 Reviewer','API11 Lead','API11 Peer']:
 d={'name':name,'description':'Owned API11 deterministic native fixture','instructions':'API11 fixture. Acknowledge the latest input. No remote work.','toolNames':['read_file'],'defaultLaunchConfig':default}
 r=gql('create-'+name.replace(' ','-'),'mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}',{'input':d})
 ids[name]=r['createAgentDefinition']['id']
team={'name':'API11 Team','description':'Owned API11 two-member native team','instructions':'API11 fixture team','coordinatorMemberName':'lead','nodes':[{'memberName':'lead','ref':ids['API11 Lead'],'refScope':'SHARED'},{'memberName':'peer','ref':ids['API11 Peer'],'refScope':'SHARED'}],'handoffs':[],'defaultLaunchConfig':default}
ids['API11 Team']=gql('create-team','mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id name}}',{'input':team})['createAgentTeamDefinition']['id']
(p/'definition-ids.json').write_text(json.dumps(ids,indent=2))
print(ids)
