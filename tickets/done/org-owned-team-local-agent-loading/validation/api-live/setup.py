from pathlib import Path
import socket,json,hashlib
w=Path(__file__).resolve().parents[5];r=w/'.local/api-org-local';assert not r.exists()
for port in [50681,50682,50683,50684]:
 with socket.socket() as s:s.bind(('127.0.0.1',port))
for name in ['home','data','external','workspace']:(r/name).mkdir(parents=True)
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(v if isinstance(v,str) else json.dumps(v,indent=2))
def agent(base,id,name,marker):
 p=base/'agents'/id;write(p/'agent.md',f'---\nname: {name}\ndescription: Synthetic test-only worker.\ncategory: validation\nrole: responder\n---\n\n{marker}\n');write(p/'agent-config.json',{'toolNames':[],'skillNames':[],'defaultLaunchConfig':None})
def team(base,id,name,local=True):
 p=base/'agent-teams'/id;write(p/'team.md',f'---\nname: {name}\ndescription: Synthetic test-only flat Team.\ncategory: validation\n---\n\nTEAM_INSTRUCTION_{name.replace(" ","_")}\n');write(p/'team-config.json',{'coordinatorMemberName':'lead','members':[{'memberName':'lead','ref':'worker' if local else 'shared-agent','refScope':'team_local' if local else 'shared'}],'handoffs':[],'avatarUrl':None,'defaultLaunchConfig':None});
 if local:agent(p,'worker',f'{name} Worker',f'AGENT_INSTRUCTION_{name.replace(" ","_")}')
def org(base,id,name,broken=False,shared=False):
 p=base/'agent-orgs'/id;members=[{'memberName':'guide','ref':f'agent-org-owned-agent:{id}:guide','refType':'agent','refScope':'org_local'},{'memberName':'group','ref':'shared-squad' if shared else f'agent-org-owned-team:{id}:squad','refType':'agent_team','refScope':'shared' if shared else 'org_local'}];write(p/'org.md',f'---\nname: {name}\ndescription: Synthetic ownership validation.\ncategory: validation\n---\n\nORG_INSTRUCTION_{id}\n');write(p/'org-config.json',{'members':members,'handoffs':[{'from':'/guide','to':'/group','rules':['Delegate only when explicitly asked.']}],'avatarUrl':None,'defaultLaunchConfig':None});agent(p,'guide',f'{name} Guide',f'DIRECT_{id}');
 if not shared:team(p,'squad',f'{name} Squad')
 if broken:
  for f in (p/'agent-teams/squad/agents/worker').iterdir():f.unlink()
  (p/'agent-teams/squad/agents/worker').rmdir()
agent(r/'data','shared-agent','Readfix Shared Agent','SHARED_AGENT_MARKER');team(r/'data','shared-squad','Readfix Shared Squad',False)
org(r/'data','readfix-alpha','Readfix Alpha');org(r/'data','readfix-shared-control','Readfix Shared Control',shared=True);org(r/'external','readfix-beta','Readfix Beta');org(r/'external','readfix-broken','Readfix Broken',broken=True)
write(r/'data/.env',f'APP_ENV=production\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:50682\nDB_TYPE=sqlite\nDATABASE_URL=file:{r}/data/db/production.db\nLOG_LEVEL=INFO\nDISABLE_HTTP_REQUEST_LOGS=false\n')
write(r/'seed-manifest.json',{str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in r.rglob('*') if p.is_file() and p.name!='.env'})
print(r)
