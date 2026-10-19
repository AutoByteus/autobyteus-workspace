"""A/B/A experiment on exact retained engine. Changes only own VM config, not production."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent;R=E.parents[5];cfg=json.loads((E/'resource.json').read_text());assert cfg['result']=='Ready'
V=cfg['vm'];env=cfg['env'];tart=cfg['tart'];SRC='/home/admin/'+V+'-source';B='/home/admin/sr022-cli';M='/Volumes/autobyteus-shared';N='/mnt/sr022-other';P='/var/lib/autobyteus-nfs/ganesha/ganesha.conf';BIN=R/'autobyteus-nfs/out/ir007-local-candidate/autobyteus-nfs-linux-arm64';SHA='0036ccef0bbb2a2510064f2e882b692687a2288eb25563d89f9c4ac9150c860c'
r={'scope':'Dependency config comparison, native Linux storage and two same-kernel native mount instances; not managed Docker or product signoff','vm':V,'source':SRC,'binary':{'path':str(BIN),'sha256':SHA},'commands':[],'phases':[],'result':'Running'}
def save():(E/'prototype-result.json').write_text(json.dumps(r,indent=2)+'\n')
def cmd(a,timeout=45,data=None,check=True):
 start=time.monotonic()
 try:
  p=sp.run([tart,*a],env=env,input=data,capture_output=True,timeout=timeout);q={'argv':[tart,*a],'rc':p.returncode,'seconds':time.monotonic()-start,'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as x:
  q={'argv':[tart,*a],'timeout':timeout,'stdout':(x.stdout or b'').decode(errors='replace'),'stderr':(x.stderr or b'').decode(errors='replace')};r['commands'].append(q);save();raise
 r['commands'].append(q);save()
 if check:assert q['rc']==0,q
 return q
def g(code,**kw):return cmd(['exec',V,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def ng(code,**kw):return g('sudo -n setpriv --reuid=1000 --regid=109 --clear-groups /usr/bin/env -i HOME=/home/admin PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin LANG=C /bin/sh -c '+shlex.quote(code),**kw)
def rootpy(code):return g('sudo -n python3 -c '+shlex.quote(code))
def unmount():g('set -e; sudo -n umount '+N+'; sudo -n umount '+M)
def mount():
 c=r['connection'];src=c['endpoint']+':'+c['export'];opts='hard,tcp,vers=4.1,actimeo=1,timeo=50,retrans=2'
 g('set -e; sudo -n mkdir -p '+N+'; sudo -n mount -t nfs -o '+opts+' '+src+' '+M+'; sudo -n mount -t nfs -o '+opts+',nosharecache '+src+' '+N,timeout=60)
def phase(label):
 q=ng('python3 /home/admin/sr022-visibility.py '+SRC+' '+M+' '+N+' '+label,timeout=180);v=json.loads(q['stdout']);(E/(label+'.json')).write_text(json.dumps(v,indent=2)+'\n');r['phases'].append(v);save();print(label+': '+str([c['firstExact'] for c in v['cases']]),flush=True)
try:
 data=BIN.read_bytes();assert hashlib.sha256(data).hexdigest()==SHA
 cmd(['exec','-i',V,'/bin/sh','-c','umask 077; cat > '+B+'; chmod 755 '+B],data=data)
 cmd(['exec','-i',V,'/bin/sh','-c','cat > /home/admin/sr022-visibility.py'],data=(E/'guest-visibility.py').read_bytes())
 r['freshAbsence']=g('set -e; test ! -e /var/lib/autobyteus-nfs/attachment.json; if dpkg-query -W -f=\'${Status}\' nfs-ganesha 2>/dev/null | grep -q "install ok installed"; then exit 81; fi; test -z "$(findmnt -rn -t nfs,nfs4)"; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_SR022 > '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC)
 ip=[x['local'] for n in json.loads(g('ip -4 -j addr show scope global')['stdout']) for x in n['addr_info'] if x['family']=='inet'][0]
 q=ng(B+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes none --yes --json',timeout=300);v=json.loads(q['stdout']);assert v['status']['hostReady'];r['connection']=v['connection'];save()
 r['initial']=g('set -e; sudo -n cat '+P+'; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; dpkg-query -W -f=\'${Package} ${Version} ${Architecture}\\n\' nfs-ganesha nfs-ganesha-vfs; cat /sys/module/nfsv4/parameters/directory_delegations; uname -a; findmnt -n -o SOURCE,FSTYPE,OPTIONS '+M+'; stat -c "%d:%i:%u:%g:%a" '+SRC)
 r['originalConfig']=g('sudo -n cat '+P)['stdout'];assert 'Attr_Expiration_Time' not in r['originalConfig']
 # Explicit diagnostic mode, no concurrent supervisor or app clients.
 g('set -e; sudo -n systemctl stop autobyteus-nfs.service; sudo -n mkdir -p '+N+'; sudo -n mount -t nfs -o hard,tcp,vers=4.1,actimeo=1,timeo=50,retrans=2,nosharecache '+ip+':'+r['connection']['export']+' '+N,timeout=60)
 r['mounts']=g('findmnt -t nfs,nfs4 -o SOURCE,TARGET,OPTIONS');phase('baseline-default')
 for label,zero in [('candidate-zero',True),('restored-default',False)]:
  unmount();g('sudo -n systemctl stop autobyteus-nfs-ganesha.service')
  content=r['originalConfig'].replace('EXPORT {','EXPORT {\n    Attr_Expiration_Time = 0;',1) if zero else r['originalConfig'];assert not zero or content!=r['originalConfig']
  rootpy('from pathlib import Path; p=Path('+repr(P)+'); p.write_text('+repr(content)+'); p.chmod(0o600)')
  g('sudo -n systemctl start autobyteus-nfs-ganesha.service')
  # Native config comparison, restart each phase identically; fresh mounts/unique warm fixtures.
  mount();r[label+'Config']=g('sudo -n cat '+P)['stdout'];phase(label)
 expected=[False,True,False];assert [all(c['withinFiveSeconds'] for c in p['cases']) for p in r['phases']]==expected
 r['preservation']=g('set -e; stat -c "%d:%i:%u:%g:%a" '+SRC+'; cat '+SRC+'/project/preexisting.txt; cat '+M+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json; cat '+M+'/.autobyteus-nfs/storage.json; sudo -n stat -c "%a:%u:%g:%n" /var/lib/autobyteus-nfs '+P+'; dpkg-query -W -f=\'${Package} ${Version} ${Architecture}\\n\' nfs-ganesha nfs-ganesha-vfs')
 g('sudo -n umount '+N);q=ng(B+' reconnect --yes --json',timeout=90);assert json.loads(q['stdout'])['hostReady'];r['restoredPublicReconnect']=q
 q=ng(B+' detach --yes --drained --json',timeout=120);r['publicDetach']=q
 r['detachedPreservation']=g('set -e; test -z "$(findmnt -rn -t nfs,nfs4)"; test ! -e /etc/autobyteus-nfs/attachment.json; stat -c "%d:%i:%u:%g:%a" '+SRC+'; cat '+SRC+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json')
 r['result']='Pass controlled A/B/A mechanism experiment; not product qualification'
except BaseException as x:
 r['result']='Incomplete';r['error']=repr(x)
 try:r['diagnostics']=g('findmnt -t nfs,nfs4; sudo -n journalctl -b -u autobyteus-nfs.service -u autobyteus-nfs-ganesha.service --no-pager -n 70',check=False,timeout=20)
 except BaseException as y:r['diagnosticError']=repr(y)
finally:save();print(json.dumps({'result':r['result'],'error':r.get('error')}),flush=True)
