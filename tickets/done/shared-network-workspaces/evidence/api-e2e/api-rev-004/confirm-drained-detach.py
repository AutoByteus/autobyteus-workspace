from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
exec((E/'run-two-reboots.py').read_text().split('try:\n for i in [1,2]:')[0].replace('two-reboots-result.json','drained-detach-confirm-result.json'))
assert json.loads((E/'node-upgrade-result.json').read_text())['result']=='Pass'
try:
 original=json.loads((E/'drained-detach-result.json').read_text());assert original['cases'][1]['status']=='Pass';old=original['beforeDetach'];other=original['unselectedBeforeDetach'];r['beforeDetach']=old;r['detachEvidence']='drained-detach-result.json (actual successful public detach, no repeat)';save()
 def proof():
  a=inspect(node);u=inspect(prep['unselected']);r['afterDetach']=a;save();assert not a['State']['Running'];assert a['Image']==old['Image'];assert a['NetworkSettings']['Networks']['bridge']['Aliases']==old['NetworkSettings']['Networks']['bridge']['Aliases']
  ac=copy.deepcopy(a['Config']);bc=copy.deepcopy(old['Config'])
  for x in [ac,bc]:
   x.pop('Image',None)
   for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:x['Labels'].pop(k,None)
  assert ac==bc;ah=copy.deepcopy(a['HostConfig']);bh=copy.deepcopy(old['HostConfig']);bh['Mounts']=[m for m in bh['Mounts'] if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']];assert bh['OomKillDisable'] is None and ah['OomKillDisable'] is False;bh['OomKillDisable']=False;assert ah==bh
  assert sorted(a['Mounts'],key=lambda m:m['Destination'])==sorted([m for m in old['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']],key=lambda m:m['Destination'])
  u['Mounts']=sorted(u['Mounts'],key=lambda m:m['Destination']);other['Mounts']=sorted(other['Mounts'],key=lambda m:m['Destination']);assert u==other
  paths={m['Destination']:m['Source'] for m in a['Mounts']};files=[paths['/root']+'/.codex/api004-sentinel',paths['/home/autobyteus/data']+'/api004-sentinel',paths['/home/vncuser/.config/chromium']+'/api004-sentinel'];q=g('sudo -n sha256sum '+' '.join(map(shlex.quote,files)));assert [x.split()[0] for x in q['stdout'].splitlines()]==[x.split()[0] for x in prep['privateHashes'].splitlines()]
  source=g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; sudo -n test ! -e /var/lib/autobyteus-nfs/start-attempt-'+node+'.json; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sudo -n docker volume inspect autobyteus-nfs-'+UUID);assert UUID in source['stdout'] and r['sourceIdentityBefore'] in source['stdout'] and hashlib.sha256(b'ORIGINAL_API004').hexdigest() in source['stdout'];assert not g('sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId='+UUID+' --format "{{.Names}}"')['stdout'].strip()
  return {'selected':a,'unselected':u,'privateSentinels':q,'originalSourceAndRetainedVolume':source,'exactAttemptRemoved':True}
 case('drained detach current config private/source preservation and exact attempt removal',proof)
 r['result']='Pass';save();event('Selected drained detach preserves current opaque state/source/private bytes and removes exact bounded attempt PASS')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Detach regression Fail/incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
