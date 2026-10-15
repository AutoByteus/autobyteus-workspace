"""Designer-only selected UNFS3 permission/identity probe on isolated Linux storage.
No host mounts, providers, user nodes, public ports or production changes.
"""
from pathlib import Path
import subprocess as sp, json, uuid, tempfile, shutil, time, os
P=Path(__file__).resolve().parent
S='ab-sf-fr048-'+uuid.uuid4().hex[:8]
APP='sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1'
ENGINE='sha256:951795d5b29890feada3af4e2773690404a85a37065bd89eb0729327a13f2b60'
M='/Volumes/autobyteus-shared'; ROOT=M+'/project'
scratch=Path(tempfile.mkdtemp(prefix='ab-sf-fr048-owned-'))
config=scratch/'config';config.mkdir()
net=S+'-net';store=S+'-source';server=S+'-server'
containers=[];volumes=[];networks=[]
R={'run':S,'scope':'isolated Linux UNFS3 permission/identity contract, one physical Mac Docker VM; no agents, native Mac serving, physical LAN or product setup proof',
   'engineImage':ENGINE,'engineCommit':'ec1660ba33c80d5c67131e163e68834c1a10e243','mount':M,'project':ROOT,'commands':[],'cases':[],'cleanup':[]}
def save():(P/'probe-result.json').write_text(json.dumps(R,indent=2))
def d(*args,check=True,timeout=45):
    a=['docker',*args];z=sp.run(a,capture_output=True,text=True,timeout=timeout)
    R['commands'].append({'argv':a,'rc':z.returncode,'stdout':z.stdout,'stderr':z.stderr});save()
    if check and z.returncode:raise RuntimeError(z.stderr[-1600:])
    return z
def node(n,code,user=None):
    a=['exec']+(['--user',user] if user else [])+[n,'node','-e',code]
    return d(*a).stdout.strip()
def ip(n):return d('inspect',n,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}').stdout.strip()
def case(name,fn):
    row={'name':name};start=time.monotonic()
    try:row.update(status='PASS',result=fn());print('PASS',name,flush=True)
    except Exception as e:row.update(status='FAIL',error=repr(e));raise
    finally:row['seconds']=round(time.monotonic()-start,3);R['cases'].append(row);save()
try:
    d('network','create','--label','org.autobyteus.probe=fr-048',net);networks.append(net)
    gateway=d('network','inspect',net,'--format','{{(index .IPAM.Config 0).Gateway}}').stdout.strip()
    d('volume','create','--label','org.autobyteus.probe=fr-048',store);volumes.append(store)
    init=S+'-init';containers.append(init)
    d('run','--name',init,'--label','org.autobyteus.probe=fr-048','--user','0:0','--network',net,
      '--entrypoint','sh','--mount','type=volume,src='+store+',dst=/export,volume-nocopy',APP,'-c',
      'mkdir -p /export/project /export/private; printf KEEP > /export/project/preexisting.txt; '
      'printf DENIED > /export/private/secret.txt; chown -R 10001:10001 /export/project; '
      'chown 10001:10001 /export; chmod 755 /export; chmod 700 /export/private')
    peers=[]
    for suffix in ['allowed','excluded']:
        n=S+'-'+suffix;containers.append(n);peers.append(n)
        d('run','-d','--name',n,'--label','org.autobyteus.probe=fr-048','--network',net,
          '--entrypoint','tail',APP,'-f','/dev/null')
        d('cp',str(P/'rpc-mount.mjs'),n+':/tmp/rpc-mount.mjs')
    allowed,excluded=peers
    (config/'exports').write_text('/export '+gateway+'(rw,all_squash,anonuid=10001,anongid=10001,insecure) '+ip(allowed)+'(rw,all_squash,anonuid=10001,anongid=10001,insecure)\n')
    R['exports']=(config/'exports').read_text();containers.append(server)
    d('run','-d','--name',server,'--label','org.autobyteus.probe=fr-048','--network',net,'--user','10001:10001',
      '--mount','type=volume,src='+store+',dst=/export,volume-nocopy',
      '--mount','type=bind,src='+str(config)+',dst=/config,readonly',ENGINE,
      '-d','-s','-p','-t','-n','2049','-m','2049','-e','/config/exports')
    server_ip=ip(server);R['nodes']={'server':server,'allowedDirectPeer':allowed,'excludedDirectPeer':excluded,'serverIp':server_ip,'daemonGateway':gateway}
    def authorization():
        a=json.loads(d('exec',allowed,'node','/tmp/rpc-mount.mjs',server_ip,'/export').stdout)
        b=json.loads(d('exec',excluded,'node','/tmp/rpc-mount.mjs',server_ip,'/export').stdout)
        assert a['mountStatus']==0 and b['mountStatus']==13,(a,b)
        return {'allowed':a,'excluded':b,'authorizationIsHostNotIndividualUser':True}
    case('direct MOUNT3 accepts exact allowed network peer and denies reachable excluded peer',authorization)
    clients=[]
    for suffix,uid in [('a','10001:10001'),('b','501:20')]:
        v=S+'-nfs-'+suffix;volumes.append(v)
        opts='addr='+server_ip+',vers=3,proto=tcp,mountproto=tcp,mountvers=3,port=2049,mountport=2049,nolock,hard,timeo=50,retrans=2,actimeo=1,nosharecache'
        d('volume','create','--label','org.autobyteus.probe=fr-048','--driver','local','--opt','type=nfs','--opt','device=:/export','--opt','o='+opts,v)
        n=S+'-client-'+suffix;containers.append(n);clients.append(n)
        d('run','-d','--name',n,'--label','org.autobyteus.probe=fr-048','--network',net,'--user',uid,
          '--entrypoint','tail','--mount','type=volume,src='+v+',dst='+M+',volume-nocopy',APP,'-f','/dev/null',timeout=60)
    a,b=clients;R['nodes']['mountedClients']=[{'node':a,'uid':10001},{'node':b,'uid':501}]
    def owner():
        node(a,"require('fs').writeFileSync("+json.dumps(ROOT+'/owner.txt')+",'LINUX_OWNER')")
        values=[json.loads(node(n,"console.log(JSON.stringify({uid:process.getuid(),presentedOwner:require('fs').statSync("+json.dumps(ROOT+'/owner.txt')+").uid,data:require('fs').readFileSync("+json.dumps(ROOT+'/owner.txt')+",'utf8')}))")) for n in clients]
        source=json.loads(node(server,"console.log(JSON.stringify({processUid:process.getuid(),owner:require('fs').statSync('/export/project/owner.txt').uid,preexisting:require('fs').readFileSync('/export/project/preexisting.txt','utf8')}))"))
        assert all(x['uid']==x['presentedOwner'] and x['data']=='LINUX_OWNER' for x in values),values
        assert source=={'processUid':10001,'owner':10001,'preexisting':'KEEP'},source
        return {'clients':values,'actualSource':source,'noChownToClientIds':True}
    case('different mounted client UIDs see local owner presentation but source remains nonroot owner',owner)
    def root_denied():
        x=json.loads(node(a,"const f=require('fs');let denied=false;try{f.readFileSync("+json.dumps(M+'/private/secret.txt')+")}catch(e){denied=e.code==='EACCES'};f.writeFileSync("+json.dumps(ROOT+'/client-root.txt')+",'SQUASHED');console.log(JSON.stringify({clientUid:process.getuid(),denied}))",user='0:0'))
        owner=int(node(server,"console.log(require('fs').statSync('/export/project/client-root.txt').uid)"))
        assert x['clientUid']==0 and x['denied'] and owner==10001,(x,owner)
        return {**x,'serverCreatedOwner':owner,'privateBytesUntouched':True}
    case('client root cannot read server-root private directory and creates only squashed nonroot files',root_denied)
    def atomic_exclusion():
        code="const f=require('fs');try{f.writeFileSync("+json.dumps(ROOT+'/race-lock')+",process.argv[1],{flag:'wx'});console.log('WON')}catch(e){if(e.code!=='EEXIST')throw e;console.log('EXISTS')}"
        procs=[sp.Popen(['docker','exec',n,'node','-e',code,n],stdout=sp.PIPE,stderr=sp.PIPE,text=True) for n in clients]
        results=[]
        for n,p in zip(clients,procs):
            out,err=p.communicate(timeout=20);R['commands'].append({'argv':['docker','exec',n,'node','-e',code,n],'rc':p.returncode,'stdout':out,'stderr':err});assert p.returncode==0,err;results.append(out.strip())
        assert sorted(results)==['EXISTS','WON'],results
        content=node(server,"console.log(require('fs').readFileSync('/export/project/race-lock','utf8'))")
        assert content in clients,content
        return {'outcomes':results,'winningExactNode':content,'nolockNotAdvertisedAsFcntl':True}
    case('simultaneous independent mounted exclusive-create attempts have exactly one winner',atomic_exclusion)
    def git():
        d('exec',a,'git','-C',ROOT,'init','--quiet')
        for n,msg in [(a,'First'),(b,'Second')]:
            node(n,"require('fs').appendFileSync("+json.dumps(ROOT+'/preexisting.txt')+",' '+msg+'')")
            d('exec',n,'git','-C',ROOT,'add','preexisting.txt')
            d('exec',n,'git','-C',ROOT,'-c','user.name=Probe','-c','user.email=probe@example.invalid','commit','--quiet','-m',msg)
        commits=[d('exec',n,'git','-C',ROOT,'rev-parse','HEAD').stdout.strip() for n in clients]
        assert len(set(commits))==1 and len(commits[0])==40,commits
        return {'sameCommit':commits[0],'differentUidSequentialGit':True,'safeDirectoryOverride':False}
    case('Linux native-source ownership supports coordinated different-UID Git without global trust override',git)
    R['uncovered']=['native Linux OS service installation/reboot','macOS nfsd participant policy','Docker Desktop LAN ingress original-IP restrictions','physical Mac/Linux LAN','packaged one-command create/connect and product/private-runtime integration']
except Exception as e:R['fatal']=repr(e);print('PROBE FAILURE',repr(e),flush=True);save()
finally:
    # Detach client mounts while storage is healthy; do not stop server first.
    for n in reversed([n for n in containers if n!=server]):
        z=d('rm','-f','-v',n,check=False);R['cleanup'].append({'container':n,'rc':z.returncode})
    for v in [v for v in reversed(volumes) if v!=store]:
        z=d('volume','rm',v,check=False);R['cleanup'].append({'volume':v,'rc':z.returncode})
    if server in containers:
        R['serverLog']=d('logs',server,check=False).stdout
        z=d('rm','-f','-v',server,check=False);R['cleanup'].append({'container':server,'rc':z.returncode})
    if store in volumes:
        z=d('volume','rm',store,check=False);R['cleanup'].append({'volume':store,'rc':z.returncode})
    for n in networks:
        z=d('network','rm',n,check=False);R['cleanup'].append({'network':n,'rc':z.returncode})
    for kind,names in [('container',containers),('volume',volumes),('network',networks)]:
        for n in names:
            z=d(kind,'inspect',n,check=False);R['cleanup'].append({'kind':kind,'name':n,'absent':z.returncode!=0})
    assert scratch.name.startswith('ab-sf-fr048-owned-') and scratch.parent==Path(tempfile.gettempdir())
    shutil.rmtree(scratch);R['cleanup'].append({'ownedHostScratchRemoved':not scratch.exists()});save()
print(json.dumps({'run':S,'passes':sum(c['status']=='PASS' for c in R['cases']),'fatal':R.get('fatal')}),flush=True)
raise SystemExit(1 if R.get('fatal') else 0)
