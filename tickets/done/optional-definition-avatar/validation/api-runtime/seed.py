from pathlib import Path
import json,base64,hashlib
w=Path(__file__).resolve().parents[5]; e=Path(__file__).resolve().parent
p=w/'autobyteus-server-ts/tests/.tmp/avatar-api001-package'
assert not p.exists(), 'never replace an existing dataset'
p.mkdir(parents=True)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#146b48"/><text x="10" y="42" fill="white" font-size="30">AV</text></svg>'
url='data:image/svg+xml;base64,'+base64.b64encode(svg.encode()).decode()
def write(root,family,id,name,c):
 d=root/({'agent':'agents','team':'agent-teams','org':'agent-orgs'}[family])/id; d.mkdir(parents=True,exist_ok=True)
 (d/(family+'.md')).write_text(f'---\nname: {name}\ndescription: API owned optional avatar {id}\n---\n\nYou are an isolated API fixture.\n')
 (d/(family+'-config.json')).write_text(json.dumps(c,indent=2)+'\n')
 return d
for mode in ['omitted','null','supplied']:
 av={} if mode=='omitted' else {'avatarUrl':None if mode=='null' else url}
 aid='avatar-agent-'+mode;tid='avatar-team-'+mode;oid='avatar-org-'+mode
 write(p,'agent',aid,'Avatar Agent '+mode,av)
 team={'coordinatorMemberName':'lead','members':[{'memberName':'lead','ref':'worker','refScope':'team_local'}],'handoffs':[],**av}
 td=write(p,'team',tid,'Avatar Team '+mode,team)
 write(td,'agent','worker','Avatar Local Worker '+mode,av)
 direct=f'agent-org-owned-agent:{oid}:direct'; owned=f'agent-org-owned-team:{oid}:owned-team'
 od=write(p,'org',oid,'Avatar Org '+mode,{'members':[{'memberName':'direct','ref':direct,'refType':'agent','refScope':'org_local'},{'memberName':'owned','ref':owned,'refType':'agent_team','refScope':'org_local'},{'memberName':'mounted','ref':tid,'refType':'agent_team','refScope':'shared'}],'handoffs':[],'defaultLaunchConfig':None,**av})
 write(od,'agent','direct','Avatar Owned Direct '+mode,av)
 write(od,'team','owned-team','Avatar Owned Team '+mode,{'coordinatorMemberName':'lead','members':[{'memberName':'lead','ref':aid,'refScope':'shared'}],'handoffs':[],**av})
write(p,'team','avatar-team-invalid','Avatar Team Invalid',{'coordinatorMemberName':'lead','members':[{'memberName':'lead','ref':'avatar-agent-omitted','refScope':'shared'}],'handoffs':[],'avatarUrl':42})
write(p,'org','avatar-org-invalid','Avatar Org Invalid',{'members':[{'memberName':'direct','ref':'avatar-agent-omitted','refType':'agent','refScope':'shared'}],'handoffs':[],'defaultLaunchConfig':None,'avatarUrl':42})
(p/'avatar.svg').write_text(svg)
def hashes(root):
 return {str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(root.rglob('*')) if f.is_file() and not any(x in ['.git','node_modules'] for x in f.relative_to(root).parts)}
ext=Path('/Users/normy/autobyteus_org/autobyteus-agents')
(e/'hashes-before.json').write_text(json.dumps({'external':hashes(ext),'fixture':hashes(p)},indent=2))
(e/'fixture-info.json').write_text(json.dumps({'path':str(p),'avatarUrl':url,'files':len(hashes(p))},indent=2))
print(p)
