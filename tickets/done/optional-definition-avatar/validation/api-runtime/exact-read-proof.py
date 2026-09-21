from pathlib import Path
import urllib.request,json
p=Path(__file__).parent;results={}
for mode in ['omitted','null','supplied']:
 oid='avatar-org-'+mode
 ids={'direct':f'agent-org-owned-agent:{oid}:direct','owned':f'agent-org-owned-team:{oid}:owned-team','local':f'team-local-agent:avatar-team-{mode}:worker'}
 q='query($direct:String!,$owned:String!,$local:String!){direct:agentDefinition(id:$direct){id name avatarUrl ownershipScope ownerOrgId} owned:agentTeamDefinition(id:$owned){id name avatarUrl ownershipScope ownerOrgId nodes{memberName ref refScope}} local:agentDefinition(id:$local){id name avatarUrl ownershipScope ownerTeamId}}'
 r=urllib.request.Request('http://127.0.0.1:50561/graphql',data=json.dumps({'query':q,'variables':ids}).encode(),headers={'Content-Type':'application/json'})
 d=json.load(urllib.request.urlopen(r));assert not d.get('errors'),d
 for k,v in d['data'].items():
  assert v['id']==ids[k],v
  assert v['avatarUrl']==(json.loads((p/'fixture-info.json').read_text())['avatarUrl'] if mode=='supplied' else None),v
 results[mode]=d['data']
(p/'exact-owned-proof.json').write_text(json.dumps(results,indent=2)); print('9 exact owned/local definitions, modes and identities Pass')
