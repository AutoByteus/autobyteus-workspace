from api import *
model='api9-deterministic-32768:lmstudio@127.0.0.1:57269'
default={'runtimeKind':'autobyteus','llmModelIdentifier':model}
ids={}
for name in ['API9 Reviewer','API9 Lead','API9 Peer']:
 d={'name':name,'description':'Owned API9 deterministic native fixture','instructions':'API9 fixture. Acknowledge the latest input. No remote work.','toolNames':['read_file'],'defaultLaunchConfig':default}
 r=gql('create-'+name.replace(' ','-'),'mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}',{'input':d})
 ids[name]=r['createAgentDefinition']['id']
team={'name':'API9 Team','description':'Owned API9 two-member native team','instructions':'API9 fixture team','coordinatorMemberName':'lead','nodes':[{'memberName':'lead','ref':ids['API9 Lead'],'refScope':'SHARED'},{'memberName':'peer','ref':ids['API9 Peer'],'refScope':'SHARED'}],'handoffs':[],'defaultLaunchConfig':default}
ids['API9 Team']=gql('create-team','mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id name}}',{'input':team})['createAgentTeamDefinition']['id']
(p/'definition-ids.json').write_text(json.dumps(ids,indent=2))
print(ids)
