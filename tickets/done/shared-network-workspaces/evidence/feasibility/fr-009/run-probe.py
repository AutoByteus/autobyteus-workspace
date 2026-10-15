"""Designer-owned application-image feasibility, not product implementation/E2E signoff.

Two fresh AutoByteus image nodes, real native Codex/Claude and isolated copies of
only their OAuth credential files streamed from a read-only source. Native models
are invoked because the user explicitly requires actual-agent proof. No live node
agent is used, no host mount, no current source/GUI/separate-computer claim.
"""
from pathlib import Path
import subprocess as sp
import json, time, uuid, socket, sys, urllib.request, urllib.parse

P = Path(__file__).resolve().parent
S = 'ab-sf-fr009-' + uuid.uuid4().hex[:8]
SERVICE_TAG = 'autobyteus-shared-feasibility:fr-009'
APP_IMAGE = 'sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a'
M = '/home/autobyteus/shared'
ROOT = M + '/project'
R = {'run': S, 'scope': 'two fresh existing-image AutoByteus application nodes in one Mac Docker Desktop VM; real instructed native-runtime agents; NOT LAN/Mac-native/GUI/latest-source/setup proof', 'application_image': APP_IMAGE, 'commands': [], 'api': [], 'cases': [], 'cleanup': []}
containers, volumes, nfsvolumes, nodes = [], [], [], []
network = server = service_image = None
active_agents = []

def save():
    (P/'probe-result.json').write_text(json.dumps(R, indent=2))

def run(*argv, timeout=45, check=True):
    t = time.monotonic()
    try:
        q = sp.run(argv, text=True, capture_output=True, timeout=timeout)
        row = {'argv': list(argv), 'rc': q.returncode, 'seconds': round(time.monotonic()-t, 3), 'stdout': q.stdout, 'stderr': q.stderr}
    except sp.TimeoutExpired as e:
        R['commands'].append({'argv': list(argv), 'timeout': timeout, 'stdout': str(e.stdout), 'stderr': str(e.stderr)})
        save()
        raise
    R['commands'].append(row)
    save()
    if check and q.returncode:
        raise RuntimeError(f'{argv[:3]} rc={q.returncode}: {q.stderr[-1800:]}')
    return q

def d(*argv, **kw):
    return run('docker', *argv, **kw)

def freeport():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def volume(name, *args):
    volumes.append(name)
    return d('volume', 'create', '--label', 'org.autobyteus.task=shared-network-workspaces', '--label', 'org.autobyteus.probe=fr-009', *args, name).stdout.strip()

def start(name, image, *args):
    containers.append(name)
    return d('run', '-d', '--name', name, '--label', 'org.autobyteus.task=shared-network-workspaces', '--label', 'org.autobyteus.probe=fr-009', *args, image, timeout=80).stdout.strip()

def case(name, action):
    t = time.monotonic()
    row = {'name': name}
    try:
        row.update(status='PASS', result=action())
        print('PASS', name, flush=True)
    except Exception as e:
        row.update(status='FAIL', error=repr(e))
        print('FAIL', name, repr(e), flush=True)
        raise
    finally:
        row['seconds'] = round(time.monotonic()-t, 3)
        R['cases'].append(row)
        save()

def gql(port, query, variables=None):
    req = urllib.request.Request(f'http://127.0.0.1:{port}/graphql', data=json.dumps({'query': query, 'variables': variables or {}}).encode(), headers={'Content-Type': 'application/json'})
    t = time.monotonic()
    with urllib.request.urlopen(req, timeout=12) as res:
        result = json.load(res)
    R['api'].append({'port': port, 'query': query, 'variables': variables, 'result': result, 'seconds': round(time.monotonic()-t, 3)})
    save()
    assert not result.get('errors'), result
    return result['data']

def nodejs(n, code):
    return d('exec', '-w', '/app/autobyteus-server-ts', n, 'node', '-e', code).stdout.strip()

def content(n, filename):
    out = gql(n['port'], 'query($id:String!,$p:String!){fileContent(workspaceId:$id,filePath:$p)}', {'id': n['workspace'], 'p': filename})
    return out['fileContent']

def write(n, filename, text):
    return gql(n['port'], 'mutation($id:String!,$p:String!,$c:String!){writeFileContent(workspaceId:$id,filePath:$p,content:$c)}', {'id': n['workspace'], 'p': filename, 'c': text})

def terminal(n, command):
    # Attach output before sending. A split completion token prevents echoed input
    # from masquerading as execution; content is asserted independently afterward.
    marker = 'EXEC_' + uuid.uuid4().hex
    shell = command + "; printf '\\n%s%s\\n' '" + marker[:5] + "' '" + marker[5:] + "'\n"
    url = 'ws://127.0.0.1:8000/ws/terminal/' + S + '-' + uuid.uuid4().hex[:6] + '?cwd=' + urllib.parse.quote(ROOT, safe='')
    code = f'''import WebSocket from 'ws';
const socket=new WebSocket({json.dumps(url)}); let out=''; let done=false;
const timer=setTimeout(()=>{{console.error('terminal timeout '+JSON.stringify(out.slice(-1200)));socket.terminate();process.exitCode=1;}},12000);
socket.on('open',()=>setTimeout(()=>socket.send(JSON.stringify({{type:'input',data:Buffer.from({json.dumps(shell)}).toString('base64')}})),350));
socket.on('message',raw=>{{let v;try{{v=JSON.parse(raw.toString());}}catch{{return;}} if(v.type==='output'){{out+=Buffer.from(v.data,'base64').toString('utf8');if(out.includes({json.dumps(marker)})){{done=true;clearTimeout(timer);console.log(out);socket.close();}}}}}});
socket.on('error',e=>{{clearTimeout(timer);console.error(e.message);process.exitCode=1;}});
socket.on('close',()=>{{clearTimeout(timer);if(!done){{console.error('closed before completion '+JSON.stringify(out));process.exitCode=1;}}}});
'''
    return d('exec', '-w', '/app/autobyteus-server-ts', n['name'], 'node', '--input-type=module', '-e', code, timeout=20).stdout

try:
    # Inspect selected public metadata only, not image environment values.
    fmt = '{"id":{{json .Id}},"repo_digests":{{json .RepoDigests}},"created":{{json .Created}},"entrypoint":{{json .Config.Entrypoint}}}'
    R['application_metadata'] = json.loads(d('image', 'inspect', APP_IMAGE, '--format', fmt).stdout)
    service_image = json.loads(d('image', 'inspect', SERVICE_TAG).stdout)[0]['Id']
    R['service_image'] = service_image
    network = S+'-net'
    d('network', 'create', '--label', 'org.autobyteus.probe=fr-009', network)
    net = json.loads(d('network', 'inspect', network).stdout)[0]['IPAM']['Config'][0]
    R['network'] = net
    data = S+'-storage'
    volume(data)
    pseudo = '/'+S
    config = P/'ganesha.conf'
    config.write_text(f'''NFS_CORE_PARAM {{ Protocols = 4; Enable_NLM = false; Enable_UDP = false; mount_path_pseudo = true; }}
NFSv4 {{ Grace_Period = 30; Lease_Lifetime = 30; }}
EXPORT {{ Export_Id = 17; Path = /export; Pseudo = {pseudo}; Protocols = 4; Transports = TCP; SecType = sys;
 Access_Type = None; Squash = All_Squash; Anonymous_UID = 10001; Anonymous_GID = 10001;
 CLIENT {{ Clients = {net['Gateway']}; Access_Type = RW; Protocols = 4; }} FSAL {{ Name = VFS; }} }}
LOG {{ Components {{ ALL = EVENT; }} }}
''')
    server = S+'-storage-server'
    start(server, service_image, '--network', network, '--cap-add', 'DAC_READ_SEARCH', '--mount', f'type=volume,src={data},dst=/export', '--mount', f'type=bind,src={config},dst=/etc/ganesha/ganesha.conf,readonly')
    d('exec', server, 'sh', '-c', 'chown 10001:10001 /export; chmod 0770 /export; mkdir -p /run/ganesha /var/lib/nfs/ganesha /run/dbus; rpcbind -w; dbus-daemon --system --fork; ganesha.nfsd -F -L /tmp/ganesha.log -f /etc/ganesha/ganesha.conf >/tmp/ganesha-console.log 2>&1 &')
    time.sleep(7)
    ip = json.loads(d('inspect', server).stdout)[0]['NetworkSettings']['Networks'][network]['IPAddress']
    R['storage_server_ip'] = ip
    for label in ['a', 'b']:
        nv = S+'-nfs-'+label
        nfsvolumes.append(nv)
        volume(nv, '--driver', 'local', '--opt', 'type=nfs', '--opt', f'device=:{pseudo}', '--opt', f'o=addr={ip},rw,nfsvers=4.1,proto=tcp,hard,timeo=50,retrans=2,actimeo=1,nosharecache')
        name = S+'-app-'+label
        private = []
        for suffix, dest in [('data','/home/autobyteus/data'), ('root-home','/root'), ('workspace','/home/autobyteus/workspace'), ('legacy-workspace','/app/autobyteus-server-ts/workspace'), ('chromium','/home/autobyteus/.config/chromium')]:
            v = S+'-'+label+'-'+suffix
            volume(v)
            private += ['--mount', f'type=volume,src={v},dst={dest}']
        port = freeport()
        node = {'name': name, 'port': port, 'nfs_volume': nv}
        nodes.append(node)
        # Match existing launcher's image privileges; no mount command in nodes.
        start(name, APP_IMAGE, '--network', network, '--cap-add', 'SYS_ADMIN', '--security-opt', 'seccomp=unconfined', '-p', f'127.0.0.1:{port}:8000', '-e', 'AUTOBYTEUS_WORKSPACE_ROOT=/app', '-e', 'AUTOBYTEUS_DATA_DIR=/home/autobyteus/data', '-e', 'AUTOBYTEUS_BIND_HOST=0.0.0.0', '-e', 'AUTOBYTEUS_SERVER_PORT=8000', '-e', 'APP_ENV=production', '-e', 'DB_TYPE=sqlite', '-e', 'LOG_LEVEL=INFO', '-e', 'AUTOBYTEUS_SKIP_SYNC=1', '-e', 'AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace', '--mount', f'type=volume,src={nv},dst={M},volume-nocopy', *private)
    R['nodes'] = nodes
    def ready():
        rows = []
        for n in nodes:
            starttime = time.monotonic()
            last = None
            for _ in range(90):
                try:
                    result = gql(n['port'], '{__typename}')
                    rows.append({'name': n['name'], 'seconds': round(time.monotonic()-starttime,3), 'graphql': result})
                    break
                except Exception as e:
                    last = repr(e)
                    time.sleep(1)
            else:
                raise RuntimeError('application readiness '+str(last))
        return rows
    case('two fresh real application-image nodes serve independent GraphQL endpoints', ready)
    a,b = nodes
    def topology():
        results=[]
        for n in nodes:
            results.append({'node':n['name'], 'mount':d('exec',n['name'],'sh','-c',f'grep " {M} " /proc/mounts; id; grep CapEff /proc/self/status').stdout,'image_version':nodejs(n['name'],"console.log(require('./package.json').version)"),'cli_home':d('exec',n['name'],'sh','-c','for f in /root/.codex/auth.json /root/.claude/.credentials.json; do test ! -f "$f" || exit 1; done; echo no-user-cli-credentials').stdout})
        return results
    case('daemon mounts one export into both application nodes; private state and credentials isolated', topology)
    nodejs(a['name'],f"const f=require('fs');f.mkdirSync({json.dumps(ROOT)},{{recursive:true}})")
    def register():
        for n in nodes:
            result=gql(n['port'],'mutation($root:String!){createWorkspace(input:{rootPath:$root}){workspaceId workspaceRootPath kind isTemp}}',{'root':ROOT})['createWorkspace']
            assert result['workspaceRootPath']==ROOT and not result['isTemp'],result
            n['workspace']=result['workspaceId']
        return nodes
    case('each application registers the ordinary mounted project through its public workspace API', register)
    # Native credentials are streamed directly to owned homes; no token output,
    # host scratch file, user's config copy, or live-node CLI invocation.
    def auth_transfer():
        receipts=[]
        for n in nodes:
            source=sp.Popen(['docker','exec','autobyteus-server-0','tar','-C','/root','-cf','-','.codex/auth.json'],stdout=sp.PIPE,stderr=sp.PIPE)
            target=sp.Popen(['docker','exec','-i',n['name'],'tar','-C','/root','-xf','-'],stdin=source.stdout,stdout=sp.PIPE,stderr=sp.PIPE)
            source.stdout.close()
            out,err=target.communicate(timeout=20)
            sourceerr=source.stderr.read();rc=source.wait(timeout=10)
            assert rc==0 and target.returncode==0, 'Codex credential transfer failed (content not logged)'
            # Mac native Claude login is in one exact Keychain item. Read it into
            # memory and stream only that JSON to the owned Linux home. No secret
            # value or temporary host credential file is recorded; Keychain is
            # never modified. FR-008 expired node-0 login failure stays retained.
            key=sp.run(['security','find-generic-password','-s','Claude Code-credentials','-w'],capture_output=True,timeout=10)
            assert key.returncode==0, 'native Claude Keychain credential unavailable'
            parsed=json.loads(key.stdout)
            assert parsed.get('claudeAiOauth',{}).get('accessToken'), 'not a usable OAuth shape'
            injection=sp.run(['docker','exec','-i',n['name'],'sh','-c','umask 077; mkdir -p /root/.claude; cat > /root/.claude/.credentials.json'],input=key.stdout,capture_output=True,timeout=10)
            assert injection.returncode==0, 'Claude isolated credential injection failed (values not logged)'
            R.setdefault('auth_metadata',[]).append({'target':n['name'],'claude_source':'Mac exact Claude Code-credentials Keychain item (read-only)','expiresAt':parsed['claudeAiOauth'].get('expiresAt'),'credentials_logged':False,'host_credential_file_created':False})
            del parsed,key
            d('exec',n['name'],'sh','-c','chmod 0600 /root/.codex/auth.json /root/.claude/.credentials.json; codex --version; claude --version')
            d('cp',str(P/'agent-turn.mjs'),n['name']+':/app/autobyteus-server-ts/shared-probe-agent-turn.mjs')
            receipts.append({'source':'node-0 Codex credential stream and exact Mac Claude Keychain credential stream; read-only sources','target':n['name']+':fresh private root home','archive_saved':False,'tokens_logged':False,'rc':rc,'target_rc':target.returncode})
        R['credential_transfer']=receipts
        return receipts
    case('isolated native CLI authentication and versions, source untouched',auth_transfer)
    choices={}
    for runtime in ['codex_app_server','claude_agent_sdk']:
        models=gql(a['port'],'query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}',{'r':runtime})['providerModelCatalogSnapshots']
        ids=[m['modelIdentifier'] for group in models for m in group['llmModels']]
        preferred=['gpt-5.4-mini','gpt-5.1-codex-mini','gpt-5.3-codex'] if runtime=='codex_app_server' else ['haiku']
        assert ids, 'no models available for '+runtime
        choices[runtime]=next((x for x in preferred if x in ids),ids[0])
    R['models']=choices
    skill='shared-probe-'+S.rsplit('-',1)[-1]
    skillmarker='SKILL_'+uuid.uuid4().hex
    for n in nodes:
        gql(n['port'],'mutation($i:CreateSkillInput!){createSkill(input:$i){name}}',{'i':{'name':skill,'description':'Read this configured skill when explicitly asked during shared-storage feasibility.','content':'# Shared storage probe skill\nRead this SKILL.md using an actual native tool when asked. The fixture marker is '+skillmarker+'.\nWork only on the requested file in the selected shared project. Use native terminal/Bash/read/write tools, never a special sharing API.\n'}})
    def create_agent(n,runtime,skills):
        definition=gql(n['port'],'mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',{'i':{'name':S+'-'+runtime+'-'+uuid.uuid4().hex[:5],'role':'assistant','description':'Isolated real-model shared-filesystem probe','instructions':'Perform the real requested native filesystem tool operations. Do not simulate results. Restrict all project operations to the selected workspace. Never open home/config/credential files or make network calls. Use native terminal/Bash/Read/Write tools rather than MCP filesystem tools. Return exact file content when asked.','category':'filesystem-feasibility','toolNames':[],'skillNames':skills}})['createAgentDefinition']['id']
        result=gql(n['port'],'mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',{'i':{'agentDefinitionId':definition,'workspaceRootPath':ROOT,'workspaceId':n['workspace'],'llmModelIdentifier':choices[runtime],'autoExecuteTools':True,'runtimeKind':runtime}})['createAgentRun']
        assert result['success'] and result['runId'],result
        agent={'node':n,'runtime':runtime,'runId':result['runId'],'definition':definition,'skills':skills}
        active_agents.append(agent)
        metadata=gql(n['port'],'query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{workspaceRootPath runtimeKind llmModelIdentifier autoExecuteTools}}}',{'id':agent['runId']})['getAgentRunResumeConfig']['metadataConfig']
        assert metadata['workspaceRootPath']==ROOT and metadata['runtimeKind']==runtime,metadata
        agent['metadata']=metadata
        return agent
    def turn(agent,prompt,label):
        driver=nodes[0]['name']
        target=agent['node']['name']
        url='ws://'+target+':8000/ws/agent/'+agent['runId']
        command=S+'-'+label+'-'+uuid.uuid4().hex[:6]
        q=d('exec','-w','/app/autobyteus-server-ts',driver,'node','shared-probe-agent-turn.mjs',url,prompt,command,timeout=195,check=False)
        assert q.stdout.strip(), 'missing turn receipt: '+q.stderr[-900:]
        receipt=json.loads(q.stdout.strip().splitlines()[-1])
        (P/(label+'-turn.json')).write_text(json.dumps(receipt,indent=2))
        assert q.returncode==0 and not receipt.get('error'),receipt.get('error') or q.stderr
        assert receipt['tools']>0 and receipt['succeeded']>0,receipt
        # Do not equate a model's final answer alone with a filesystem read.
        assert any(e['type']=='TOOL_EXECUTION_SUCCEEDED' for e in receipt['events'])
        return receipt
    def bytes_snapshot(filename):
        records=[]
        for n in nodes:
            records.append(json.loads(nodejs(n['name'],"const f=require('fs'),c=require('crypto');const p="+json.dumps(ROOT+'/'+filename)+";const z=f.readFileSync(p);console.log(JSON.stringify({path:p,text:z.toString(),sha256:c.createHash('sha256').update(z).digest('hex')}))")))
        backing=json.loads(d('exec',server,'python3','-c',"from pathlib import Path;import json,hashlib;p=Path('/export/project/')/"+repr(filename)+";z=p.read_bytes();print(json.dumps({'path':str(p),'text':z.decode(),'sha256':hashlib.sha256(z).hexdigest()}))").stdout)
        assert records[0]['sha256']==records[1]['sha256']==backing['sha256']
        return {'a':records[0],'b':records[1],'backing':backing}
    def terminate(agent):
        result=gql(agent['node']['port'],'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}',{'id':agent['runId']})['terminateAgentRun']
        assert result['success'],result
        active_agents.remove(agent)
        return result
    pairs=[('codex_app_server','claude_agent_sdk',False),('claude_agent_sdk','codex_app_server',True),('codex_app_server','codex_app_server',True),('claude_agent_sdk','claude_agent_sdk',True)]
    R['agent_rounds']=[]
    for number,(runtime_a,runtime_b,use_skill) in enumerate(pairs,1):
        label='pair'+str(number)
        print('START',label,runtime_a,'->',runtime_b,'skills='+str(use_skill),flush=True)
        agent_a=create_agent(a,runtime_a,[skill] if use_skill else [])
        agent_b=create_agent(b,runtime_b,[skill] if use_skill else [])
        row={'pair':label,'a':{'runId':agent_a['runId'],'runtime':runtime_a,'metadata':agent_a['metadata']},'b':{'runId':agent_b['runId'],'runtime':runtime_b,'metadata':agent_b['metadata']},'configured_skill':use_skill}
        R['agent_rounds'].append(row)
        filename=label+'-'+uuid.uuid4().hex[:8]+'.txt'
        one='A_'+uuid.uuid4().hex
        two='B_'+uuid.uuid4().hex
        prefix=('Use your configured $'+skill+' skill: open its SKILL.md using a native tool and report its fixture marker. ' if use_skill else '')
        writeprompt=prefix+'In your selected workspace, use your native terminal/Bash tool to print pwd, then create '+filename+' containing exactly '+one+' followed by one newline. Use normal filesystem operations, flush/fsync and close the file before reporting completion. Do not use any MCP filesystem/sharing tool. Do not touch any other file.'
        readprompt=prefix+'In your selected workspace, use native terminal/Bash or native file-read tools to print pwd and freshly read '+filename+'. Report its exact content. The contents are deliberately not included here. Do not guess from memory or use a special sharing API.'
        modprompt='Use a native tool to append exactly '+two+' followed by one newline to the existing '+filename+' in your selected workspace, preserving its existing bytes. Flush/fsync and close it. Print pwd. Do not overwrite, simulate, or use MCP filesystem tools.'
        rereadprompt='Freshly open '+filename+' in your selected workspace using native tools. Print pwd and report its full exact contents; another node has modified it. Do not answer from memory. No new file contents are supplied here.'
        assert one not in readprompt and two not in rereadprompt
        def write_check():
            receipt=turn(agent_a,writeprompt,label+'-a-write')
            snap=bytes_snapshot(filename)
            assert snap['a']['text']==one+'\n',snap
            if use_skill: assert skillmarker in json.dumps(receipt['events']), 'configured skill was not observed read'
            row['written_snapshot']=snap
            return {'receipt_file':label+'-a-write-turn.json','snapshot':snap}
        case(label+' actual workspace-selected A native write',write_check)
        def read_check():
            receipt=turn(agent_b,readprompt,label+'-b-read')
            assert one in json.dumps(receipt['events']), 'B did not expose read value through observed tool/stream'
            if use_skill: assert skillmarker in json.dumps(receipt['events']), 'B configured skill was not observed read'
            return {'receipt_file':label+'-b-read-turn.json','expected_value_not_in_prompt':True,'snapshot':bytes_snapshot(filename)}
        case(label+' B native read without copied content or attachments',read_check)
        def modify_check():
            receipt=turn(agent_b,modprompt,label+'-b-modify')
            snap=bytes_snapshot(filename)
            assert snap['a']['text']==one+'\n'+two+'\n',snap
            row['modified_snapshot']=snap
            return {'receipt_file':label+'-b-modify-turn.json','snapshot':snap}
        case(label+' B native modification preserves existing bytes',modify_check)
        def reopen_check():
            receipt=turn(agent_a,rereadprompt,label+'-a-reopen')
            assert two in json.dumps(receipt['events']), 'A fresh native read did not expose B value'
            return {'receipt_file':label+'-a-reopen-turn.json','new_value_not_in_prompt':True,'snapshot':bytes_snapshot(filename)}
        case(label+' A fresh native read observes B modification',reopen_check)
        row['terminated_a']=terminate(agent_a)
        if use_skill:
            post=turn(agent_b,prefix+'Freshly read '+filename+' with native tools after the other agent was terminated. Report its exact contents.',label+'-b-after-peer-stop')
            assert two in json.dumps(post['events']) and skillmarker in json.dumps(post['events'])
            row['peer_stop_skill_read_receipt']=label+'-b-after-peer-stop-turn.json'
        row['terminated_b']=terminate(agent_b)
        save()
    # Record exact selected compiled file hashes; this does not imply equality of
    # the complete image with current worktree source.
    files=['dist/api/graphql/types/workspace.js','dist/api/graphql/types/file-explorer.js','dist/api/websocket/terminal.js','dist/app.js','package.json']
    R['selected_image_files']=nodejs(a['name'],f"const f=require('fs'),c=require('crypto');console.log(JSON.stringify({json.dumps(files)}.map(p=>({{path:p,sha256:c.createHash('sha256').update(f.readFileSync(p)).digest('hex')}}))))")
    R['uncovered']=['native macOS mount/application','real separate LAN computer','one-command create/join setup','rendered workspace-selection UI','final permissions/security policy','latest worktree build and final executable validation']
except Exception as e:
    R['fatal']=repr(e)
    print('PROBE FAILURE',repr(e),flush=True)
finally:
    for agent in list(active_agents):
        try:
            terminate(agent)
        except Exception as e:
            R.setdefault('termination_errors',[]).append(repr(e))
    for n in nodes:
        d('logs','--tail','160',n['name'],check=False)
        d('exec',n['name'],'sh','-c','tail -120 /var/log/supervisor/autobyteus_server.log /var/log/supervisor/autobyteus_server.err.log 2>/dev/null',check=False)
    if server:
        d('exec',server,'cat','/tmp/ganesha.log',check=False)
    for n in reversed([x for x in containers if x!=server]):
        q=d('rm','-f','-v',n,check=False)
        R['cleanup'].append({'container':n,'rc':q.returncode})
    # Keep storage service available until daemon unmounts client volumes.
    for v in reversed(nfsvolumes):
        q=d('volume','rm',v,check=False)
        R['cleanup'].append({'volume':v,'rc':q.returncode})
    if server:
        q=d('rm','-f','-v',server,check=False)
        R['cleanup'].append({'container':server,'rc':q.returncode})
    for v in reversed([x for x in volumes if x not in nfsvolumes]):
        q=d('volume','rm',v,check=False)
        R['cleanup'].append({'volume':v,'rc':q.returncode})
    if network:
        q=d('network','rm',network,check=False)
        R['cleanup'].append({'network':network,'rc':q.returncode})
    for kind,names in [('container',containers),('volume',volumes),('network',[network] if network else [])]:
        for name in names:
            q=d(kind,'inspect',name,check=False)
            R['cleanup'].append({'absence_kind':kind,'name':name,'absent':q.returncode!=0})
    if service_image:
        current=d('image','inspect',SERVICE_TAG,'--format','{{.Id}}',check=False)
        if current.returncode==0 and current.stdout.strip()==service_image:
            q=d('image','rm',SERVICE_TAG,check=False)
            R['cleanup'].append({'image_tag':SERVICE_TAG,'expected_id':service_image,'rc':q.returncode})
        else:
            R['cleanup'].append({'image_tag':SERVICE_TAG,'status':'RETAINED','reason':'identity changed or inspection unavailable'})
    save()
print(json.dumps({'run':S,'passes':sum(x['status']=='PASS' for x in R['cases']),'fatal':R.get('fatal'),'cleanup_ok':all(x.get('rc',0)==0 and x.get('absent',True) for x in R['cleanup'])}),flush=True)
sys.exit(1 if R.get('fatal') or not all(x.get('rc',0)==0 and x.get('absent',True) for x in R['cleanup']) else 0)
