import json,urllib.request,sys
from pathlib import Path
q='''query { agentTeamDefinitions { id name avatarUrl nodes {memberName ref refScope} } agentOrgDefinitions {id name avatarUrl members {memberName ref refType refScope}} agentDefinitions {id name avatarUrl ownershipScope} definitionAdmissionDiagnostics {subjectKind definitionId code reason} }'''
r=urllib.request.Request('http://127.0.0.1:50561/graphql',data=json.dumps({'query':q}).encode(),headers={'Content-Type':'application/json'})
d=json.load(urllib.request.urlopen(r));assert not d.get('errors'),d
(Path(__file__).parent/(sys.argv[1]+'.json')).write_text(json.dumps(d,indent=2))
print([(x['id'],x['name']) for x in d['data']['agentTeamDefinitions']]);print(d['data']['definitionAdmissionDiagnostics'])
