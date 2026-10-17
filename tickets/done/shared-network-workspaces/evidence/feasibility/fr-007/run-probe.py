"""Designer-owned application-image feasibility, not product implementation/E2E signoff.

Two fresh AutoByteus nodes from the existing immutable image, with fresh private
volumes and a disposable NFS export. No existing node, model, credentials, host
mount, or separate physical computer is used. Run this file with python3; results
and cleanup receipts stay beside it. Image proof is NOT current-worktree proof.
"""
from pathlib import Path
import subprocess as sp
import json, time, uuid, socket, sys, urllib.request, urllib.parse

P = Path(__file__).resolve().parent
S = 'ab-sf-fr007-' + uuid.uuid4().hex[:8]
SERVICE_TAG = 'autobyteus-shared-feasibility:fr-007'
APP_IMAGE = 'sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a'
M = '/home/autobyteus/shared'
ROOT = M + '/project'
R = {'run': S, 'scope': 'two fresh existing-image AutoByteus application nodes in one Mac Docker Desktop VM; NOT real LAN/Mac-native or latest source proof', 'application_image': APP_IMAGE, 'commands': [], 'api': [], 'cases': [], 'cleanup': []}
containers, volumes, nfsvolumes, nodes = [], [], [], []
network = server = service_image = None

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
    return d('volume', 'create', '--label', 'org.autobyteus.task=shared-network-workspaces', '--label', 'org.autobyteus.probe=fr-007', *args, name).stdout.strip()

def start(name, image, *args):
    containers.append(name)
    return d('run', '-d', '--name', name, '--label', 'org.autobyteus.task=shared-network-workspaces', '--label', 'org.autobyteus.probe=fr-007', *args, image, timeout=80).stdout.strip()

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
    d('network', 'create', '--label', 'org.autobyteus.probe=fr-007', network)
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
    nonce=S+':native-a'
    def native_to_api():
        out=nodejs(a['name'],f"const f=require('fs'); const p={json.dumps(ROOT+'/native.txt')};const fd=f.openSync(p,'w');f.writeSync(fd,{json.dumps(nonce)});f.fsyncSync(fd);f.closeSync(fd);console.log(p)")
        assert content(b,'native.txt')==nonce
        result=write(b,'native.txt',S+':api-b')
        read=nodejs(a['name'],f"const f=require('fs');const x=f.readFileSync({json.dumps(ROOT+'/native.txt')},'utf8');if(x!=={json.dumps(S+':api-b')})throw Error('content mismatch');console.log(x)")
        return {'native_write':out,'api_b_write':result,'native_a_read':read}
    case('ordinary fs write in A -> application B reads/modifies -> ordinary A sees same file', native_to_api)
    def app_to_app():
        gql(a['port'],'mutation($id:String!){createFileOrFolder(workspaceId:$id,path:"from-api.txt",isFile:true)}',{'id':a['workspace']})
        write(a,'from-api.txt',S+':api-a')
        assert content(b,'from-api.txt')==S+':api-a'
        write(b,'from-api.txt',S+':api-b-updated')
        assert content(a,'from-api.txt')==S+':api-b-updated'
        return 'reciprocal content assertions via two real server APIs'
    case('application file APIs A -> B -> A use the common project, not copied attachments',app_to_app)
    def terminal_roundtrip():
        out_a=terminal(a,"printf 'from-terminal-a' > terminal.txt; pwd")
        assert ROOT in out_a
        assert content(b,'terminal.txt')=='from-terminal-a'
        out_b=terminal(b,"test \"$(cat terminal.txt)\" = from-terminal-a && printf 'from-terminal-b' > terminal.txt; pwd")
        assert ROOT in out_b
        assert content(a,'terminal.txt')=='from-terminal-b'
        return {'terminal_a':out_a,'terminal_b':out_b,'scope':'real application PTY; no model/agent invocation'}
    case('real application terminal shells in selected shared cwd write/read/modify across nodes',terminal_roundtrip)
    def refresh():
        query='query($id:String!){folderChildren(workspaceId:$id,folderPath:"")}'
        first=json.loads(gql(b['port'],query,{'id':b['workspace']})['folderChildren'])
        nodejs(a['name'],f"require('fs').writeFileSync({json.dumps(ROOT+'/remote-added.txt')},'remote-new')")
        second=json.loads(gql(b['port'],query,{'id':b['workspace']})['folderChildren'])
        assert 'remote-added.txt' in json.dumps(second),second
        assert content(b,'remote-added.txt')=='remote-new'
        return {'before':first,'after':second,'scope':'explicit API directory/content reload, not UI/watcher proof'}
    case('explicit fresh directory/content requests retrieve a file added by other node',refresh)
    def private_not_shared():
        nodejs(a['name'],f"require('fs').writeFileSync('/home/autobyteus/data/only-a-marker',{json.dumps(S)})")
        out=nodejs(b['name'],"if(require('fs').existsSync('/home/autobyteus/data/only-a-marker'))throw Error('private state leaked');console.log('B private data separate')")
        assert not Path('/home/autobyteus/data/only-a-marker').exists()
        return out
    case('node-private app data stays separate from shared project storage',private_not_shared)
    # Record exact selected compiled file hashes; this does not imply equality of
    # the complete image with current worktree source.
    files=['dist/api/graphql/types/workspace.js','dist/api/graphql/types/file-explorer.js','dist/api/websocket/terminal.js','dist/app.js','package.json']
    R['selected_image_files']=nodejs(a['name'],f"const f=require('fs'),c=require('crypto');console.log(JSON.stringify({json.dumps(files)}.map(p=>({{path:p,sha256:c.createHash('sha256').update(f.readFileSync(p)).digest('hex')}}))))")
    R['uncovered']=['native macOS mount/application', 'real separate LAN computer', 'one-command create/join setup', 'live Codex/Claude agents and skills', 'final permissions/security policy', 'latest worktree build and final executable validation']
except Exception as e:
    R['fatal']=repr(e)
    print('PROBE FAILURE',repr(e),flush=True)
finally:
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
