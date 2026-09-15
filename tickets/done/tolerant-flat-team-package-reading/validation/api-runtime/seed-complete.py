from pathlib import Path
import json,hashlib,base64,copy
E=Path(__file__).resolve().parent/'complete'; E.mkdir(exist_ok=True); W=E.parents[5]; D=W/'autobyteus-server-ts/tests/.tmp/team-package-complete-api001'; S=Path('/Users/normy/autobyteus_org/autobyteus-agents')
assert not D.exists(), 'Never reseed existing runtime'
D.mkdir(parents=True); (D/'temp_workspace').mkdir()
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n')
def authored(root,family,id,cfg,body='Respond briefly only to the human request. Do not initiate work, messages or tasks. Do not inspect unrelated files.'):
 p=root/('agents' if family=='agent' else 'agent-'+family+'s')/id;p.mkdir(parents=True,exist_ok=True)
 (p/(family+'.md')).write_text('---\nname: '+id+'\ndescription: Test owned package reading fixture\n---\n\n'+body+'\n')
 write(p/(family+'-config.json'),cfg);(p/'asset.bin').write_bytes(bytes([0,255,31,10]))
 return p
agent='api-reading-agent';authored(D,'agent',agent,{'toolNames':['read_file'],'avatarUrl':None})
def team():return {'coordinatorMemberName':'lead','members':[{'memberName':'lead','ref':agent,'refScope':'shared','refType':'agent','extra':'ignored'}],'handoffs':[],'avatarUrl':None,'unused':'preserve bytewise'}
for name,defaults in [('api-absent',...),('api-null',None),('api-valid',{'runtimeKind':'autobyteus','llmModelIdentifier':'qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234','llmConfig':{'temperature':0}}),('api-invalid',False)]:
 c=team()
 if defaults is not ...:c['defaultLaunchConfig']=defaults
 authored(D,'team',name,c)
nested=team();nested['members'].append({'memberName':'mounted','ref':'child','refScope':'team_local','refType':'agent_team'})
parent=authored(D,'team','api-unconverted-parent',nested);authored(parent,'team','child',team())
authored(D,'org','api-untouched-org',{'schemaVersion':1,'members':[],'handoffs':[],'avatarUrl':None,'defaultLaunchConfig':None})
model='qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234'
lc={'runtimeKind':'autobyteus','llmModelIdentifier':model,'llmConfig':None,'autoExecuteTools':False,'skillAccessMode':'PRELOADED_ONLY','workspaceRootPath':str(D/'temp_workspace')}
def member(address,id):return {'address':address,'agentDefinitionId':agent,'role':None,'description':None,'agentRunId':id,'platformAgentRunId':id,'launchConfiguration':lc}
rid='api-migrated-org';drid='api-migrated-direct';mrid='api-migrated-worker';trid='api-migrated-mounted'
tree={'schemaVersion':2,'createdAt':'2026-09-01T00:00:00.000Z','archivedAt':None,'applicationBinding':None,'handoffs':[], 'rootTeam':{'address':'/','teamDefinitionId':'api-unconverted-parent','teamDefinitionName':'API Migrated History','teamRunId':rid,'coordinatorAddress':'/direct','defaultLaunchConfiguration':lc,'members':[member('/direct',drid),{'address':'/mounted','teamDefinitionId':'api-no-current-child-definition','role':None,'description':None,'teamRunId':trid,'coordinatorAddress':'/mounted/lead','defaultLaunchConfiguration':lc,'members':[member('/mounted/lead',mrid)],'taskExecutions':[]}],'taskExecutions':[]}}
def package(id,tree):
 p=D/'memory/agent_teams'/id;write(p/'team_run_execution_tree.json',tree);write(p/'task_delegation_records.json',{'schemaVersion':1,'rootTeamRunId':id,'records':[]});write(p/'team_communication_messages.json',{'schemaVersion':1,'rootTeamRunId':id,'messages':[]});return p
p=package(rid,tree); f=p/trid/mrid/'context_files/ctx_saved__retained-note.txt';f.parent.mkdir(parents=True);f.write_text('MIGRATED-ATTACHMENT-ORANGE-915\nTest owned attachment only.\n')
uri='/rest/team-runs/'+trid+'/members/%2Fmounted%2Flead/context-files/'+f.name
traces=[{'id':'api-old-user','ts':1788220800,'turn_id':'api-old-turn','seq':1,'trace_type':'user','content':'Remember the secret word BLUEBERRY-915 for the next message. This is test history.','source_event':'AgentRun.postUserMessage','file_attachments':[{'uri':uri,'file_type':'text','file_name':'retained-note.txt'}]}, {'id':'api-old-reply','ts':1788220801,'turn_id':'api-old-turn','seq':2,'trace_type':'assistant','content':'I will remember BLUEBERRY-915.','source_event':'LLMCompleteResponseReceivedEvent'}]
(p/drid).mkdir();(p/drid/'raw_traces_active.jsonl').write_text(''.join(json.dumps(t)+'\n' for t in traces))
flat=copy.deepcopy(tree);flat['rootTeam'].update(teamRunId='api-flat-history',teamDefinitionId='api-absent',teamDefinitionName='API Flat History',coordinatorAddress='/lead',members=[member('/lead','api-flat-lead')]);fp=package('api-flat-history',flat)
write(D/'memory/team_run_history_index.json',[{'teamRunId':rid,'teamDefinitionId':'api-unconverted-parent','teamDefinitionName':'API Migrated History','workspaceRootPath':str(D/'temp_workspace'),'summary':'Remember BLUEBERRY-915','createdAt':tree['createdAt'],'archivedAt':None,'terminatedAt':'2026-09-01T00:00:02.000Z'}])
inv=json.loads((E.parents[2]/'package-inventory.json').read_text());assert all(hashlib.sha256(Path(r['path']).read_bytes()).hexdigest()==r['sha256'] for r in inv['teams'])
def snapshot(root):
 out={}
 for family in ['agents','agent-teams','agent-orgs','applications']:
  p=root/family
  if p.exists():
   for f in sorted(p.rglob('*')):
    if f.is_symlink():out[str(f.relative_to(root))]={'symlink':str(f.readlink())}
    elif f.is_file():out[str(f.relative_to(root))]={'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'size':f.stat().st_size}
 return out
write(E/'authored-before.json',{'external':snapshot(S),'owned':snapshot(D)})
write(E/'flat-before.json',{f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'mtime_ns':f.stat().st_mtime_ns,'inode':f.stat().st_ino} for f in fp.iterdir()})
write(E/'seed-info.json',{'runtimeRoot':str(D),'source':str(S),'model':model,'rootId':rid,'directId':drid,'mountedId':mrid,'attachment':uri,'note':'Synthetic historical data, not captured prior provider conversation; actual continuation still required.'})
print(D)
