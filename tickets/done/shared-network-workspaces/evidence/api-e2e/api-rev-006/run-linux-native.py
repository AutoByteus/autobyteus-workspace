"""Current binding/public setup regression on own real Ubuntu guest, not Docker matrix."""
from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='linux-native-result.json';exec((E/'common.py').read_text());Q=shlex.quote;STATE='/var/lib/autobyteus-nfs'
def binding():return g('sudo -n cat '+STATE+'/hosted-filesystem.json')['stdout']
def prove(label):
 q=snapshot();v=json.loads(q['stdout']);assert [v['uid'],v['gid'],v['groups']]==[1000,109,[]];assert v['directoryDelegations']=='Y';assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API006').hexdigest();assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore']
 nongroups('set -e; printf '+Q(label)+' > '+ROOT+'/project/'+label+'.txt; sync; test "$(cat '+SRC+'/project/'+label+'.txt)" = '+Q(label));assert binding()==r['bindingBytes'];return q
try:
 case('fresh nonempty owned source and native prerequisites',lambda:g('set -e; test "$(id -u)" = 1000; test ! -e '+STATE+'; test ! -e /etc/autobyteus-nfs; test ! -e '+ROOT+'; ! dpkg-query -W nfs-ganesha; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API006 > '+SRC+'/project/preexisting.txt; uname -a; findmnt -no SOURCE,FSTYPE /'))
 r['sourceIdentityBefore']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'].strip();addr=json.loads(g('ip -4 -j addr show scope global')['stdout']);ip=next(x['local'] for n in addr for x in n['addr_info'] if x['family']=='inet');r['endpoint']=ip
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',V,'/bin/sh','-c','umask 077; cat > '+B+'; chmod 755 '+B],data=data);assert build['binary']['sha256'] in g('sha256sum '+B)['stdout']
 q=case('public native create under077 nonroot clear-groups',lambda:nongroups('umask 077; exec '+B+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes none --yes --json',timeout=600));v=json.loads(q['stdout']);assert v['status']['hostReady'];r['connection']=v['connection'];r['bindingBytes']=binding();bound=json.loads(r['bindingBytes']);assert set(bound['identity'])=={'device','inode'};assert [bound['identity']['device'],bound['identity']['inode']]==[int(x) for x in r['sourceIdentityBefore'].split(':')[:2]];save()
 case('native mounted bytes UUID source identity and nonroot RW',lambda:prove('first'))
 q=case('actual installed engine jobs private modes manifest and client policy',lambda:g('set -e; sudo -n systemctl is-active autobyteus-nfs.service autobyteus-nfs-ganesha.service; sudo -n test ! -e '+STATE+'/pending-setup.json; sudo -n stat -c "%u:%a:%n" '+STATE+' '+STATE+'/attachment.json; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; dpkg-query -W -f=\'${Package} ${Status} ${Version} ${Architecture}\\n\' nfs-ganesha nfs-ganesha-vfs; findmnt -n -o SOURCE,FSTYPE,OPTIONS '+ROOT+'; sudo -n cat '+STATE+'/ganesha/ganesha.conf'));assert q['stdout'].count('install ok installed 4.3-8ubuntu1+autobyteus1 arm64')==2 and build['binary']['sha256'] in q['stdout'];assert '0:700:'+STATE in q['stdout'] and '0:600:'+STATE+'/attachment.json' in q['stdout'];assert 'vers=4.1' in q['stdout'] and ',hard,' in q['stdout']
 old=g('cat /proc/sys/kernel/random/boot_id')['stdout'].strip();r['bootBefore']=old;save()
 try:g('sudo -n reboot',timeout=8,check=False)
 except sp.TimeoutExpired:pass
 start=time.monotonic()
 for n in range(80):
  try:
   q=g('cat /proc/sys/kernel/random/boot_id',timeout=5,check=False)
   if q.get('rc')==0 and q['stdout'].strip()!=old:
    r['bootAfter']=q['stdout'].strip();save();q=nongroups('findmnt -n -t nfs,nfs4 '+ROOT+' >/dev/null && test "$(cat '+ROOT+'/project/preexisting.txt)" = ORIGINAL_API006',timeout=8,check=False)
    if q['rc']==0:break
  except sp.TimeoutExpired:pass
  time.sleep(3)
 else:raise RuntimeError('automatic mount absent in observation window; not SLA')
 r['bootObservedSeconds']=time.monotonic()-start;case('ordinary boot automatic mounted nonroot RW before manual reconnect',lambda:prove('boot'))
 case('separate explicit public reconnect',lambda:nongroups(B+' reconnect --yes --json',timeout=120));case('same saved binding after explicit reconnect',lambda:prove('reconnect'))
 g('mv '+SRC+' '+SRC+'-original; mkdir '+SRC+'; cp -a '+SRC+'-original/. '+SRC+'/')
 q=case('public replacement directory copiedmarker refusal',lambda:nongroups(B+' reconnect --yes --json',timeout=90,check=False));assert q['rc']!=0 and 'identity changed' in q['stderr'];assert binding()==r['bindingBytes']
 g('mv '+SRC+' '+SRC+'-replacement; mv '+SRC+'-original '+SRC);case('restore exact original public reconnect',lambda:nongroups(B+' reconnect --yes --json',timeout=120));case('restored original mounted RW',lambda:prove('restore'))
 case('public drained detach',lambda:nongroups(B+' detach --yes --drained --json',timeout=120))
 q=case('original source preserved mount job attachment absent',lambda:g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/systemd/system/autobyteus-nfs.service; sudo -n test ! -e '+STATE+'/attachment.json; stat -c "%d:%i:%u:%g:%a" '+SRC+'; cat '+SRC+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json'));assert r['sourceIdentityBefore'] in q['stdout'] and r['connection']['storageId'] in q['stdout'];r['result']='Pass';save()
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('native regression incomplete/fail '+repr(x))
 try:r['diagnostics']=g('findmnt -t nfs,nfs4; sudo -n systemctl status autobyteus-nfs.service autobyteus-nfs-ganesha.service --no-pager; sudo -n ls -l '+STATE,check=False,timeout=30);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
