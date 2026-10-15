"""L26. Remove only exact API007 resources; preserve prior engine/cache/build trees."""
from pathlib import Path
import json,subprocess as sp,os,shutil,time,signal,hashlib,socket
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parents[2];S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-resource.json').read_text());resume=json.loads((E/'linux-resume.json').read_text());V=cfg['clone'];tart=resume['guest']['tart'];env=resume['guest']['env'];C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');r={'result':'Running','commands':[],'scope':'Only API007 one owned Linux VM, exact server image tag, isolated desktop/tunnel and own scratch. No host mount/firewall/live application/node/credential changes.'}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def run(a,e=None,check=True):
 p=sp.run(a,env=e,capture_output=True,text=True,timeout=90);z={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(z);save()
 if check:assert p.returncode==0,z
 return z
assert json.loads((E/'LN-source-detach-resume-result.json').read_text())['result']=='Pass'
assert json.loads((E/'LD-source-detach-result.json').read_text())['result']=='Pass'
assert json.loads((E/'desktop-stop-result.json').read_text())['desktopStop']['rc']==0
source='/home/admin/'+V+'-native-source'
r['guestFinal']=run([tart,'exec',V,'/bin/sh','-c','set -e; sudo -n test ! -e /var/lib/autobyteus-nfs/attachment.json; sudo -n test ! -e /etc/systemd/system/autobyteus-nfs.service; ! grep -E " nfs4? " /proc/mounts; cat '+source+'/.autobyteus-nfs/storage.json; sha256sum '+source+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+source+'; sudo -n docker ps -a --format "{{.Names}} {{.Status}}"'],env)
assert hashlib.sha256(b'ORIGINAL_API007').hexdigest() in r['guestFinal']['stdout']
pid=resume['pid'];z=run(['/bin/ps','-p',str(pid),'-o','command=']);assert tart+' run '+V+' ' in z['stdout']
run([tart,'stop',V,'--timeout','15'],env);run([tart,'delete',V],env);r['vmInventoryAfter']=run([tart,'list','--format','json'],env)
r['vmPidAbsent']=run(['/bin/ps','-p',str(pid),'-o','command='],check=False)['rc']!=0;r['cloneAbsent']=not (Path(cfg['privateTartHome'])/'vms'/V).exists();assert r['vmPidAbsent'] and r['cloneAbsent']
t=json.loads((E/'guest-loopback-tunnel-result.json').read_text());p=run(['/bin/ps','-p',str(t['pid']),'-o','command='],check=False)
if p['rc']==0:
 assert str(S/'api007-vm-ssh') in p['stdout'];os.kill(t['pid'],signal.SIGTERM);time.sleep(.2)
r['ownedTunnelAbsent']=run(['/bin/ps','-p',str(t['pid']),'-o','command='],check=False)['rc']!=0;assert r['ownedTunnelAbsent']
image='ab-nfs-api007-server:current';z=run(['/usr/local/bin/docker','image','inspect',image]);assert json.loads(z['stdout'])[0]['Id']==resume['serverImage'];run(['/usr/local/bin/docker','image','rm',image]);r['hostImageAbsent']=run(['/usr/local/bin/docker','image','inspect',image],check=False)['rc']!=0;assert r['hostImageAbsent']
r['retainedEngineVerified']=all(Path(x['path']).is_file() and hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256'] for x in json.loads((E/'build-result.json').read_text())['retainedVerification']);assert r['retainedEngineVerified']
r['publicMacCacheRetained']=C.exists();assert r['publicMacCacheRetained']
r['generatedDirectoriesRetained']={p:(R/p).exists() for p in ['applications/brief-studio/dist','autobyteus-application-backend-sdk/dist','autobyteus-application-devkit/dist','autobyteus-application-frontend-sdk/dist','autobyteus-application-sdk-contracts/dist']};assert all(r['generatedDirectoriesRetained'].values())
assert S.name=='ab-nfs-api007-ejvzqfh7' and S.is_dir();shutil.rmtree(S);r['scratchAbsent']=not S.exists();assert r['scratchAbsent']
r['portsClosed']={}
for port in [63125,63126,63567]:
 with socket.socket() as sock:sock.settimeout(.2);r['portsClosed'][str(port)]=sock.connect_ex(('127.0.0.1',port))!=0
assert all(r['portsClosed'].values())
r['result']='Complete';save()
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- Round7 L26 cleanup Complete: exact VM/clone/private cache, server tag, owned desktop/tunnel/ports and scratch removed; original source/marker/private bytes proved before disposable VM retirement; previous public Mac cache/engine candidate/generated directories retained. `evidence/api-e2e/api-rev-007/cleanup.json`.\n')
