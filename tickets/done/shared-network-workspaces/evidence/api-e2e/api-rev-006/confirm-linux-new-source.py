from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='linux-new-source-confirm-result.json';exec((E/'common.py').read_text());prior=json.loads((E/'linux-new-source-result.json').read_text());SRC=prior['source'];r.update({k:prior[k] for k in ['source','connection','bindingBytes','identity']});ip=json.loads((E/'linux-native-result.json').read_text())['endpoint'];STATE='/var/lib/autobyteus-nfs'
try:
 q=g('stat -c "%d:%i:%u:%g:%a" '+SRC);assert q['stdout'].strip()==r['identity'];assert r['identity'].endswith(':1000:109:750');bound=json.loads(r['bindingBytes']);assert set(bound['identity'])=={'device','inode'};assert [bound['identity']['device'],bound['identity']['inode']]==[int(x) for x in r['identity'].split(':')[:2]]
 case('new owned source actual mounted nonroot RW',lambda:nongroups('set -e; printf NEW_SOURCE_API006 > '+ROOT+'/new.txt; sync; test "$(cat '+SRC+'/new.txt)" = NEW_SOURCE_API006; cmp '+SRC+'/.autobyteus-nfs/storage.json '+ROOT+'/.autobyteus-nfs/storage.json; id'))
 case('newsource public reconnect',lambda:nongroups(B+' reconnect --yes --json',timeout=120));assert g('sudo -n cat '+STATE+'/hosted-filesystem.json')['stdout']==r['bindingBytes'];g('sudo -n test ! -e '+STATE+'/pending-setup.json');r['endpoint']=ip;r['result']='Pass retained for peer prerequisite and detach';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Linux new source incomplete/fail '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
