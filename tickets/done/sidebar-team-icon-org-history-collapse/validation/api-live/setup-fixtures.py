from pathlib import Path
import json,socket,struct,zlib,hashlib
w=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/sidebar-team-icon-org-history-collapse');r=w/'.local/api-sidebar';assert not r.exists()
for port in [50581,50582,50583]:
 with socket.socket() as s:s.bind(('127.0.0.1',port))
for n in ['home','data','external','workspace','assets']:(r/n).mkdir(parents=True)
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s if isinstance(s,str) else json.dumps(s,indent=2))
def png(rgb):
 def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',48,48,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+bytes(rgb)*48)*48))+chunk(b'IEND',b'')
for name,rgb in [('avatar-blue.png',(20,80,190)),('avatar-green.png',(25,150,80))]:(r/'assets'/name).write_bytes(png(rgb))
ac=json.loads((w/'test-support/fixtures/lazy-configured-restore/agents/aorg-validation-agent/agent-config.json').read_text());ac['toolNames']=[]
def agent(base,id,name):
 p=base/'agents'/id;write(p/'agent.md',f'---\nname: {name}\ndescription: Disposable sidebar test agent.\ncategory: validation\nrole: responder\n---\n\nReply only to explicit test messages. No tools or automatic work.\n');write(p/'agent-config.json',ac)
def team(base,id,name,avatar):
 p=base/'agent-teams'/id;write(p/'team.md',f'---\nname: {name}\ndescription: Disposable flat team.\ncategory: validation\n---\n\nNo automatic forwarding.\n');write(p/'team-config.json',{'coordinatorMemberName':'lead','members':[{'memberName':'lead','ref':'sidebar-shared-agent','refScope':'shared'},{'memberName':'worker','ref':'sidebar-shared-agent','refScope':'shared'}],'handoffs':[],'avatarUrl':avatar,'defaultLaunchConfig':None})
base=r/'data';agent(base,'sidebar-shared-agent','Sidebar Shared Agent')
for id,name,av in [('sidebar-team-image','Sidebar Image Team','http://127.0.0.1:50582/fixtures/avatar-blue.png'),('sidebar-team-empty','Sidebar Empty Team',None),('sidebar-team-broken','Sidebar Broken Team','http://127.0.0.1:50582/fixtures/missing.png')]:team(base,id,name,av)
def org(base,id,name,av,owned=False):
 p=base/'agent-orgs'/id;members=[{'memberName':'direct','ref':'sidebar-shared-agent','refType':'agent','refScope':'shared'},{'memberName':'team','ref':'sidebar-team-image','refType':'agent_team','refScope':'shared'}]
 if owned:
  agent(p,'owned-worker','Sidebar Owned Worker');team(p,'owned-team','Sidebar Owned Team',None)
  members += [{'memberName':'owned','ref':f'agent-org-owned-agent:{id}:owned-worker','refType':'agent','refScope':'org_local'},{'memberName':'ownedteam','ref':f'agent-org-owned-team:{id}:owned-team','refType':'agent_team','refScope':'org_local'}]
 write(p/'org.md',f'---\nname: {name}\ndescription: Disposable current-schema fixture.\ncategory: keep-hidden-category\n---\n\nPreserve these hidden instructions verbatim.\n')
 write(p/'org-config.json',{'members':members,'handoffs':[],'avatarUrl':av,'defaultLaunchConfig':None})
org(base,'sidebar-edit-org','Sidebar Authoring Org',None,True)
org(base,'sidebar-image-org','Sidebar Image Org','http://127.0.0.1:50582/fixtures/avatar-blue.png')
org(base,'sidebar-broken-org','Sidebar Broken Org','http://127.0.0.1:50582/fixtures/missing.png')
org(r/'external','sidebar-readonly-org','Sidebar Readonly Org',None)
write(base/'.env',f'APP_ENV=production\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:50582\nDATABASE_URL=file:{base}/db/production.db\nDB_TYPE=sqlite\nLOG_LEVEL=INFO\nDISABLE_HTTP_REQUEST_LOGS=false\nAUTOBYTEUS_AGENT_PACKAGE_ROOTS={r}/external\n')
manifest={str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in r.rglob('*') if p.is_file() and p.name!='.env'};write(r/'seed-manifest.json',manifest)
print(r,len(manifest))
