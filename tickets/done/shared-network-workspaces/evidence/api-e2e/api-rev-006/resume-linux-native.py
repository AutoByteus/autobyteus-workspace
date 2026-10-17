"""Current binding/public setup regression on own real Ubuntu guest, not Docker matrix."""
from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='linux-native-resume-result.json';exec((E/'common.py').read_text());Q=shlex.quote;STATE='/var/lib/autobyteus-nfs'
def binding():return g('sudo -n cat '+STATE+'/hosted-filesystem.json')['stdout']
def prove(label):
 q=snapshot();v=json.loads(q['stdout']);assert [v['uid'],v['gid'],v['groups']]==[1000,109,[]];assert v['directoryDelegations']=='Y';assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API006').hexdigest();assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore']
 nongroups('set -e; printf '+Q(label)+' > '+ROOT+'/project/'+label+'.txt; sync; test "$(cat '+SRC+'/project/'+label+'.txt)" = '+Q(label));assert binding()==r['bindingBytes'];return q
prior=json.loads((E/'linux-native-result.json').read_text());r.update({k:prior[k] for k in ['connection','bindingBytes','sourceIdentityBefore','endpoint','bootBefore','bootAfter','bootObservedSeconds']});r['priorEvidence']='linux-native-result.json';save()
try:
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
