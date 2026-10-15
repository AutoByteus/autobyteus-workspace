"""Existing-release Mac backend public API/WS and native CLI feasibility.

All targets, data, credentials, model calls and cleanup owned by this round.
Mac server/client package copied read-only from installed public app/CLI; not
launched on host, not changed source/GUI/final delivery proof. Files are created
ONLY by instructed native agents, not this controller or a scripted runtime.
"""
import hashlib,shutil,shlex
exec((P/'mount-identity.py').read_text(),globals())
mac_task='/Users/admin/.ab-sf-'+S
MACAPP=mac_task+'/AutoByteus.app'
MACBIN=MACAPP+'/Contents/MacOS/AutoByteus'
MACSERVER=MACAPP+'/Contents/Resources/server'
mac_backend_pid=None
host_driver=SCRATCH/('driver-'+S)

def agent_cleanup():
    for agent in list(active_agents):
        try:terminate(agent)
        except Exception as e:R.setdefault('termination_errors',[]).append(repr(e))
    if mac_backend_pid:
        try:
            log=vmsh('tail -100 '+mac_task+'/backend.log',check=False).stdout
            (P/'mac-backend.log').write_text(log)
            vmsh('kill -TERM '+str(mac_backend_pid)+'; sleep 3; kill -0 '+str(mac_backend_pid)+' 2>/dev/null && kill -KILL '+str(mac_backend_pid)+' || true',check=False)
            R['cleanup'].append({'exactGuestBackendPidSignalled':mac_backend_pid})
        except Exception as e:R['cleanup'].append({'macBackendStopError':repr(e)})
    try:
        assert mac_task.startswith('/Users/admin/.ab-sf-ab-sf-fr023-')
        vmsh('test -f '+mac_task+'/owned-marker && /bin/rm -rf '+mac_task,check=False)
        absent=vmsh('test ! -e '+mac_task,check=False).returncode==0
        R['cleanup'].append({'guestPrivatePackageDataAndCredentialRootAbsent':absent,'path':mac_task})
    except Exception as e:R['cleanup'].append({'guestPrivateCleanupError':repr(e)})
    if host_driver and host_driver.exists():shutil.rmtree(host_driver)
    R['cleanup'].append({'hostPrivateWebsocketDriverAbsent':not host_driver.exists()});save()

def stream(argv,args,label,timeout=180):
    source=sp.Popen(argv,stdout=sp.PIPE,stderr=sp.PIPE)
    target=sp.Popen([T,'exec','-i',VM,*args],env=ENV,stdin=source.stdout,stdout=sp.PIPE,stderr=sp.PIPE)
    source.stdout.close();out,err=target.communicate(timeout=timeout);rc=source.wait(timeout=20);sourceerr=source.stderr.read()
    assert rc==0 and target.returncode==0,label+' transfer failed (no contents logged)'
    R.setdefault('transfers',[]).append({'label':label,'sourceCommandWithoutContent':argv,'target':VM,'sourceExit':rc,'targetExit':target.returncode,'hostIntermediateFile':False,'payloadLogged':False});save()

vmsh('test ! -e '+mac_task+' && umask 077 && mkdir -p '+mac_task+'/home '+mac_task+'/data '+mac_task+'/cli-home '+mac_task+'/tools; printf OWNED > '+mac_task+'/owned-marker')
def package():
    stream(['tar','--exclude=*.env','--exclude=.env*','-C','/Applications','-cf','-','AutoByteus.app'],['/usr/bin/tar','-C',mac_task,'-xf','-'],'read-only installed public Mac application package')
    stream(['tar','-h','-C','/Users/normy/.local/bin','-cf','-','codex'],['/usr/bin/tar','-C',mac_task+'/tools','-xf','-'],'read-only native Darwin Codex executable')
    script='#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec '+shlex.quote(MACBIN)+' "$@"\n'
    q=sp.run([T,'exec','-i',VM,'/bin/sh','-c','cat > '+mac_task+'/tools/node; chmod 0700 '+mac_task+'/tools/node'],env=ENV,input=script.encode(),capture_output=True,timeout=20);assert q.returncode==0
    return {'node':VM,'publicPackage':'installed AutoByteus1.5.3-beta.1/server0.1.1, copied, not host launch or current build','nativeVersions':vmsh(mac_task+'/tools/codex --version; '+mac_task+'/tools/node --version; uname -sm').stdout,'hostFolderShare':False}
case('Mac release backend/native client installed only into fresh private guest test root',package)

mac_port=freeport();mac_node={'name':VM,'host':vm_ip,'port':mac_port,'platform':'darwin','workspace':None}
server_env={'HOME':mac_task+'/home','PATH':mac_task+'/tools:/usr/bin:/bin:/usr/sbin:/sbin','ELECTRON_RUN_AS_NODE':'1','AUTOBYTEUS_WORKSPACE_ROOT':MACSERVER,'AUTOBYTEUS_DATA_DIR':mac_task+'/data','AUTOBYTEUS_BIND_HOST':'0.0.0.0','AUTOBYTEUS_SERVER_PORT':str(mac_port),'APP_ENV':'production','NODE_ENV':'production','DB_TYPE':'sqlite','DATABASE_URL':'file:'+mac_task+'/data/test.db','AUTOBYTEUS_SKIP_SYNC':'1','AUTOBYTEUS_TEMP_WORKSPACE_DIR':mac_task+'/temp','CODEX_HOME':mac_task+'/cli-home','LOG_LEVEL':'INFO'}
cmd='cd '+shlex.quote(MACSERVER)+'; nohup /usr/bin/env -i '+' '.join(shlex.quote(k+'='+v) for k,v in server_env.items())+' '+shlex.quote(MACBIN)+' dist/app.js > '+mac_task+'/backend.log 2>&1 < /dev/null & echo $!'
q=vmsh(cmd);mac_backend_pid=int(q.stdout.strip().splitlines()[-1]);R['macBackend']={'node':VM,'pid':mac_backend_pid,'dataRoot':mac_task+'/data','CODEX_HOME':mac_task+'/cli-home','environmentKeys':list(server_env),'port':mac_port,'privateNATOnly':True,'currentSourceBuild':False};save()
def mac_ready():
    last=None
    for _ in range(100):
        try:return gql(mac_port,'{__typename}')
        except Exception as e:last=repr(e);time.sleep(1)
    raise RuntimeError('owned Mac backend unavailable: '+str(last))
case('actual Mac release backend serves separate GraphQL endpoint on private VM',mac_ready)
q=gql(mac_port,'mutation($root:String!){createWorkspace(input:{rootPath:$root}){workspaceId workspaceRootPath kind isTemp}}',{'root':ROOT})['createWorkspace'];assert q['workspaceRootPath']==ROOT and not q['isTemp'];mac_node['workspace']=q['workspaceId'];R['macNode']=mac_node;save()

# WS controller is host-only JS and read-only public ws dependency. No project IO.
host_driver.mkdir(mode=0o700);(host_driver/'node_modules').mkdir();(host_driver/'node_modules/ws').symlink_to(Path('/Applications/AutoByteus.app/Contents/Resources/server/node_modules/ws').resolve(),target_is_directory=True);shutil.copy(P/'agent-turn.mjs',host_driver/'agent-turn.mjs')
def auth():
    stream(['docker','exec','autobyteus-server-0','tar','-C','/root/.codex','-cf','-','auth.json'],['/usr/bin/tar','-C',mac_task+'/cli-home','-xf','-'],'necessary read-only source Codex OAuth to owned private Mac CLI home',timeout=30)
    vmsh('chmod 0600 '+mac_task+'/cli-home/auth.json')
    src=sp.Popen(['docker','exec','autobyteus-server-0','tar','-C','/root','-cf','-','.codex/auth.json'],stdout=sp.PIPE,stderr=sp.PIPE)
    dest=sp.Popen(['docker','exec','-i',a['name'],'tar','-C','/root','-xf','-'],stdin=src.stdout,stdout=sp.PIPE,stderr=sp.PIPE);src.stdout.close();dest.communicate(timeout=20);assert src.wait(timeout=10)==0 and dest.returncode==0
    key=sp.run(['security','find-generic-password','-s','Claude Code-credentials','-w'],capture_output=True,timeout=15);assert key.returncode==0,'exact native Claude OAuth source unavailable'
    data=json.loads(key.stdout);assert data.get('claudeAiOauth',{}).get('accessToken'),'Claude OAuth shape missing'
    p=sp.run(['docker','exec','-i',b['name'],'sh','-c','umask 077; mkdir -p /root/.claude; cat > /root/.claude/.credentials.json'],input=key.stdout,capture_output=True,timeout=15);assert p.returncode==0
    del key,data
    R['authSafety']={'MacCodexTarget':mac_task+'/cli-home','LinuxCodexTarget':a['name'],'LinuxClaudeTarget':b['name'],'readOnlySources':True,'hostSecretFilesCreated':False,'secretValuesLogged':False,'noSharedCLIHome':True};save();return R['authSafety']
case('necessary native OAuth copied privately without host files, source edits or shared homes',auth)
choices={}
for runtime,n in [('codex_app_server',mac_node),('claude_agent_sdk',b)]:
    groups=gql(n['port'],'query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}',{'r':runtime})['providerModelCatalogSnapshots'];ids=[m['modelIdentifier'] for g in groups for m in g['llmModels']];assert ids
    prefs=['gpt-5.6-luna','gpt-5.4-mini','gpt-5.1-codex-mini'] if runtime=='codex_app_server' else ['haiku']
    choices[runtime]=next((x for x in prefs if x in ids),ids[0])
R['models']=choices;save()

def create_agent(n,runtime):
    definition=gql(n['port'],'mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',{'i':{'name':S+'-'+runtime+'-'+uuid.uuid4().hex[:5],'role':'assistant','description':'Owned cross-OS native filesystem feasibility','instructions':'Use real native terminal/Bash/read/write tools for the requested ordinary project file. Never simulate. Work only in selected workspace, never read home/config/credentials or environment, never call network/delegation or MCP filesystem/sharing tools. Print pwd and actual file contents when requested.','category':'filesystem-feasibility','toolNames':[],'skillNames':[]}})['createAgentDefinition']['id']
    r=gql(n['port'],'mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',{'i':{'agentDefinitionId':definition,'workspaceRootPath':ROOT,'workspaceId':n['workspace'],'llmModelIdentifier':choices[runtime],'autoExecuteTools':True,'runtimeKind':runtime}})['createAgentRun'];assert r['success'] and r['runId'],r
    actor={'node':n,'runtime':runtime,'runId':r['runId'],'definition':definition};active_agents.append(actor)
    metadata=gql(n['port'],'query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{workspaceRootPath runtimeKind llmModelIdentifier autoExecuteTools}}}',{'id':actor['runId']})['getAgentRunResumeConfig']['metadataConfig'];assert metadata['workspaceRootPath']==ROOT and metadata['runtimeKind']==runtime;actor['metadata']=metadata;return actor

def terminate(actor):
    r=gql(actor['node']['port'],'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}',{'id':actor['runId']})['terminateAgentRun'];assert r['success'],r;active_agents.remove(actor);return r

def turn(actor,prompt,label):
    n=actor['node'];host=n.get('host','127.0.0.1');url=f"ws://{host}:{n['port']}/ws/agent/{actor['runId']}"
    env={'HOME':str(host_driver),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','ELECTRON_RUN_AS_NODE':'1'}
    p=sp.run(['/Applications/AutoByteus.app/Contents/MacOS/AutoByteus',str(host_driver/'agent-turn.mjs'),url,prompt,S+'-'+label],env=env,capture_output=True,text=True,timeout=195)
    assert p.stdout.strip(),'no actual turn receipt: '+p.stderr[-500:]
    receipt=json.loads(p.stdout.strip().splitlines()[-1]);(P/(label+'-turn.json')).write_text(json.dumps({'node':n,'actorRunId':actor['runId'],'runtime':actor['runtime'],'receipt':receipt},indent=2)+'\n')
    assert p.returncode==0 and not receipt.get('error'),receipt.get('error') or p.stderr
    assert receipt['tools']>0 and receipt['succeeded']>0
    return receipt

def snapshot(filename,expected):
    out=[]
    for n in nodes:
        s=content(n,filename);assert s==expected,(n['name'],s,expected);out.append({'node':n['name'],'sha256':hashlib.sha256(s.encode()).hexdigest(),'path':ROOT+'/'+filename})
    s=vmsh('/bin/cat '+ROOT+'/'+filename).stdout;assert s==expected,(VM,s,expected);out.append({'node':VM,'sha256':hashlib.sha256(s.encode()).hexdigest(),'path':ROOT+'/'+filename})
    s=d('exec',server,'cat','/export/project/'+filename).stdout;assert s==expected
    return {'clients':out,'backingNode':server,'backingSha256':hashlib.sha256(s.encode()).hexdigest()}

A=create_agent(mac_node,'codex_app_server');B=create_agent(a,'codex_app_server');C=create_agent(b,'claude_agent_sdk');R['actors']=[A,B,C];save()
filename='mac-linux-agents-'+uuid.uuid4().hex[:8]+'.txt';one='MAC_AGENT_'+uuid.uuid4().hex;two='LINUX_B_'+uuid.uuid4().hex;three='LINUX_C_'+uuid.uuid4().hex

def write_a():
    r=turn(A,'Print pwd using native terminal tools. Create '+filename+' in your selected workspace containing exactly '+one+' followed by one LF newline. Use ordinary filesystem commands, fsync and close before completion; no special sharing/MCP API. Touch no other file.','mac-a-write');s=snapshot(filename,one+'\n');return {'node':VM,'runId':A['runId'],'receipt':'mac-a-write-turn.json','snapshot':s}
case('actual workspace-selected Mac agent writes through native Codex filesystem tools',write_a)
def modify_b():
    prompt='Print pwd and freshly read '+filename+' using native tools; report the exact existing content, which is not supplied here. Append exactly '+two+' followed by one LF newline, preserving previous bytes, fsync and close. Do not copy another prompt or use a sharing API.'
    assert one not in prompt;r=turn(B,prompt,'linux-b-read-modify');assert one in json.dumps(r['events']);return {'node':a['name'],'runId':B['runId'],'receipt':'linux-b-read-modify-turn.json','writerContentAbsentFromPrompt':True,'snapshot':snapshot(filename,one+'\n'+two+'\n')}
case('independent Linux Codex agent reads Mac-created unknown bytes and modifies same file',modify_b)
def modify_c():
    prompt='Print pwd and freshly read '+filename+' with native tools; report its complete content, not provided here. Append exactly '+three+' followed by one LF newline without overwriting prior bytes. Fsync and close using normal filesystem tools, not MCP/sharing APIs.'
    assert one not in prompt and two not in prompt;r=turn(C,prompt,'linux-c-read-modify');assert one in json.dumps(r['events']) and two in json.dumps(r['events']);return {'node':b['name'],'runId':C['runId'],'receipt':'linux-c-read-modify-turn.json','previousValuesAbsentFromPrompt':True,'snapshot':snapshot(filename,one+'\n'+two+'\n'+three+'\n')}
case('independent Linux Claude agent reads both unknown previous values and modifies same file',modify_c)
def reread_a():
    prompt='Print pwd; freshly open '+filename+' with native filesystem tools and report its full exact contents. Other nodes modified it. No new values are supplied here; do not answer from memory.'
    assert two not in prompt and three not in prompt;r=turn(A,prompt,'mac-a-reopen');assert two in json.dumps(r['events']) and three in json.dumps(r['events']);return {'node':VM,'runId':A['runId'],'receipt':'mac-a-reopen-turn.json','newValuesAbsentFromPrompt':True,'snapshot':snapshot(filename,one+'\n'+two+'\n'+three+'\n')}
case('originating Mac native agent fresh reopen sees both Linux-node modifications',reread_a)
R['uncovered']=['configured-skill production adaptation and Mac skill/concurrent lifecycle','Git default ownership/trust and Mac/Linux lock/binary/outage cases','complete public one-command setup/normal user OS-approval/disruption/rerun lifecycle','separate physical Linux computer/LAN','rendered workspace-selection UI','current-source build/independent review/validation/merge/user verification'];save()
for actor in list(active_agents):terminate(actor)
