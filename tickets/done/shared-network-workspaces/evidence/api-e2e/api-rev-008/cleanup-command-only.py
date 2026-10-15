"""Final exact owned cleanup; no user's app, Docker objects, host network or credentials."""
from pathlib import Path
import subprocess as sp,json,shutil,socket,hashlib,time
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parents[2];S=Path((E/'scratch-path.txt').read_text().strip());guest=json.loads((E/'guests.json').read_text())['guests']['linux'];V=guest['name'];env=guest['env'];tart=guest['tart'];r={'result':'Running','commands':[]}
def save():(E/'command-cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def run(a,e=None,check=True,t=90):
 p=sp.run(a,env=e,capture_output=True,text=True,timeout=t);z={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(z);save()
 if check:assert p.returncode==0,z
 return z
for mode in ['LN','LD']:
 for suffix in ['commands-result.json','command-detach-result.json']:assert json.loads((E/(mode+'-'+suffix)).read_text())['result']=='Pass'
assert json.loads((E/'command-carried-evidence.json').read_text())['result']=='Pass'
src='/home/admin/'+V+'-native-source'
z=run([tart,'exec',V,'sh','-c','set -e; ! grep -E " nfs4? " /proc/mounts; test ! -e /var/lib/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; sha256sum '+src+'/project/preexisting.txt; cat '+src+'/.autobyteus-nfs/storage.json; sudo -n docker ps -a --format "{{.Names}} {{.Image}} {{.Command}}"'],env);assert hashlib.sha256(b'ORIGINAL_API008').hexdigest() in z['stdout'];assert 'ab-nfs-api008-cmd-a' not in z['stdout'] and 'ab-nfs-api008-cmd-b' not in z['stdout']
r['applicationNotStartedInGuest']='autobyteus-server-' not in z['stdout'];assert r['applicationNotStartedInGuest']
p=run(['/bin/ps','-p',str(guest['pid']),'-o','command=']);assert tart+' run '+V+' ' in p['stdout'];run([tart,'stop',V,'--timeout','15'],env);run([tart,'delete',V],env);r['vmGone']=run(['/bin/ps','-p',str(guest['pid']),'-o','command='],check=False)['rc']!=0;assert r['vmGone'];r['cloneGone']=not(Path(env['TART_HOME'])/'vms'/V).exists();assert r['cloneGone']
image='ab-nfs-api008-server:current';want=json.loads((E/'server-build-v2-result.json').read_text())['image'][0]['Id'];z=run(['/usr/local/bin/docker','image','inspect',image]);assert json.loads(z['stdout'])[0]['Id']==want;run(['/usr/local/bin/docker','image','rm',image]);r['unusedHostApplicationTagGone']=run(['/usr/local/bin/docker','image','inspect',image],check=False)['rc']!=0;assert r['unusedHostApplicationTagGone']
r['engineRetained']=all(Path(x['path']).exists() and hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256'] for x in json.loads((E/'build-result.json').read_text())['retainedVerification']);assert r['engineRetained']
r['priorPublicMacCacheRetained']=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK').is_dir();assert r['priorPublicMacCacheRetained']
r['priorBuildTreesPreserved']={x:(R/x).exists() for x in ['applications/brief-studio/dist','autobyteus-application-backend-sdk/dist','autobyteus-application-devkit/dist','autobyteus-application-frontend-sdk/dist','autobyteus-application-sdk-contracts/dist']};assert all(r['priorBuildTreesPreserved'].values())
old=json.loads((E/'scope-change-stop.json').read_text());r['desktopStoppedNormally']=json.loads(old['desktopStop']['stdout'])['result'];assert not r['desktopStoppedNormally']['forced'] and r['desktopStoppedNormally']['dataRootRemoved']
r['portsClosed']={}
for port in [64733,64734]:
 with socket.socket() as sock:sock.settimeout(.2);r['portsClosed'][str(port)]=sock.connect_ex(('127.0.0.1',port))!=0
assert all(r['portsClosed'].values())
assert S.name=='ab-nfs-api008-0frlwk0o' and S.is_dir();shutil.rmtree(S);r['scratchAndPrivateCacheGone']=not S.exists();assert r['scratchAndPrivateCacheGone']
r['sharedCaches']='No global Docker build-cache prune; preexisting worktree generated build outputs retained. Exact owned VM/private cache/scratch and host image tag removed.';r['result']='Complete';save()
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- FS17 Pass: exact VM/clone/guest command containers/storage/registry, private cache/toolchain/scratch and unused host application tag removed; desktop previously stopped normally and ports remain closed. Source/marker proved before disposable VM retirement. Prior engine/public Mac cache/build trees preserved. E8/command-cleanup.json.\n')
print(json.dumps({'result':r['result']}))
