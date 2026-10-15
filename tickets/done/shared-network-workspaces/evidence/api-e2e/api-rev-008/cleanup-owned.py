"""Exact API008 teardown after public drained detach; never global prune or user app stop."""
from pathlib import Path
import subprocess as sp,json,os,signal,time,shutil,socket,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parents[2];S=Path((E/'scratch-path.txt').read_text().strip());guest=json.loads((E/'guests.json').read_text())['guests']['linux'];V=guest['name'];env=guest['env'];tart=guest['tart'];r={'result':'Running','commands':[]}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def run(a,e=None,check=True,t=90):
 p=sp.run(a,env=e,capture_output=True,text=True,timeout=t);z={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(z);save()
 if check:assert p.returncode==0,z
 return z
assert json.loads((E/'LD-detach-result.json').read_text())['result']=='Pass'
desk=json.loads((E/'desktop-start-result.json').read_text());inst=desk['response']['result'];r['desktopStop']=run(['pnpm','--silent','isolated-app','stop',inst['instanceId']],desk['environment'],t=120);stop=json.loads(r['desktopStop']['stdout']);assert stop['ok'];r['desktopStopDetails']=stop
src='/home/admin/'+V+'-native-source';z=run([tart,'exec',V,'sh','-c','set -e; ! grep -E " nfs4? " /proc/mounts; test ! -e /var/lib/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; sha256sum '+src+'/project/preexisting.txt; cat '+src+'/.autobyteus-nfs/storage.json'],env);assert hashlib.sha256(b'ORIGINAL_API008').hexdigest() in z['stdout']
tun=json.loads((E/'guest-loopback-tunnel-result.json').read_text());p=run(['/bin/ps','-p',str(tun['pid']),'-o','command='],check=False)
if p['rc']==0:
 assert str(S/'api008-vm-ssh') in p['stdout'];os.kill(tun['pid'],signal.SIGTERM);time.sleep(.3)
r['tunnelGone']=run(['/bin/ps','-p',str(tun['pid']),'-o','command='],check=False)['rc']!=0;assert r['tunnelGone']
p=run(['/bin/ps','-p',str(guest['pid']),'-o','command=']);assert tart+' run '+V+' ' in p['stdout'];run([tart,'stop',V,'--timeout','15'],env);run([tart,'delete',V],env);r['vmGone']=run(['/bin/ps','-p',str(guest['pid']),'-o','command='],check=False)['rc']!=0;assert r['vmGone'];r['cloneGone']=not(Path(env['TART_HOME'])/'vms'/V).exists();assert r['cloneGone']
image='ab-nfs-api008-server:current';want=json.loads((E/'server-build-v2-result.json').read_text())['image'][0]['Id'];z=run(['/usr/local/bin/docker','image','inspect',image]);assert json.loads(z['stdout'])[0]['Id']==want;run(['/usr/local/bin/docker','image','rm',image]);r['hostTagGone']=run(['/usr/local/bin/docker','image','inspect',image],check=False)['rc']!=0;assert r['hostTagGone']
r['engineRetained']=all(Path(x['path']).exists() and hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256'] for x in json.loads((E/'build-result.json').read_text())['retainedVerification']);assert r['engineRetained']
r['priorPublicMacCacheRetained']=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK').is_dir();assert r['priorPublicMacCacheRetained']
r['priorBuildTreesPreserved']={x:(R/x).exists() for x in ['applications/brief-studio/dist','autobyteus-application-backend-sdk/dist','autobyteus-application-devkit/dist','autobyteus-application-frontend-sdk/dist','autobyteus-application-sdk-contracts/dist']};assert all(r['priorBuildTreesPreserved'].values())
assert S.name=='ab-nfs-api008-0frlwk0o' and S.is_dir();shutil.rmtree(S);r['scratchGone']=not S.exists();assert r['scratchGone']
ports=[inst['controlPort'],inst['serverPort'],int(tun['baseUrl'].rsplit(':',1)[1])];r['portsClosed']={}
for port in ports:
 with socket.socket() as sock:sock.settimeout(.2);r['portsClosed'][str(port)]=sock.connect_ex(('127.0.0.1',port))!=0
assert all(r['portsClosed'].values());r['result']='Complete';save()
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- R8-L26 Complete: exact VM/clone/guest resources, desktop/tunnel/ports, host image tag and scratch removed after public detach/source preservation. Prior engine/cache/build trees retained; E8/cleanup.json.\n')
