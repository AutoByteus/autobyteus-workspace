from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='linux-new-source-result.json';exec((E/'common.py').read_text());assert json.loads((E/'linux-native-resume-result.json').read_text())['result']=='Pass';SRC+='-new';r['source']=SRC;ip=json.loads((E/'linux-native-result.json').read_text())['endpoint'];STATE='/var/lib/autobyteus-nfs'
try:
 g('set -e; test ! -e '+SRC+'; ! findmnt -n -t nfs,nfs4 '+ROOT)
 q=case('public absent source create under077 nonroot clear-groups',lambda:nongroups('umask 077; exec '+B+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes none --yes --json',timeout=240));v=json.loads(q['stdout']);assert v['status']['hostReady'];r['connection']=v['connection'];r['bindingBytes']=g('sudo -n cat '+STATE+'/hosted-filesystem.json')['stdout'];bound=json.loads(r['bindingBytes']);assert set(bound['identity'])=={'device','inode'}
 q=g('stat -c "%d:%i:%u:%g:%a" '+SRC);r['identity']=q['stdout'].strip();assert r['identity'].endswith(':1000:109:700');assert [bound['identity']['device'],bound['identity']['inode']]==[int(x) for x in r['identity'].split(':')[:2]];save()
 case('new owned source actual mounted nonroot RW',lambda:nongroups('set -e; printf NEW_SOURCE_API006 > '+ROOT+'/new.txt; sync; test "$(cat '+SRC+'/new.txt)" = NEW_SOURCE_API006; cmp '+SRC+'/.autobyteus-nfs/storage.json '+ROOT+'/.autobyteus-nfs/storage.json; id'))
 case('newsource public reconnect',lambda:nongroups(B+' reconnect --yes --json',timeout=120));assert g('sudo -n cat '+STATE+'/hosted-filesystem.json')['stdout']==r['bindingBytes'];g('sudo -n test ! -e '+STATE+'/pending-setup.json');r['endpoint']=ip;r['result']='Pass retained for peer prerequisite and detach';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Linux new source incomplete/fail '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
