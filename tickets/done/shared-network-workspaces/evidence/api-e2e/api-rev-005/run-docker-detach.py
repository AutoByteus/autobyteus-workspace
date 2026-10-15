from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
RESULT='docker-detach-result.json';exec((E/'common-docker.py').read_text())
prep=json.loads((E/'managed-nodes-prepare-result.json').read_text());node=prep['selected']
p=json.loads((E/'docker-selected-confirm-result.json').read_text());assert p['result']=='Pass';UUID=p['connection']['storageId'];r.update(connection=p['connection'],sourceIdentityBefore=p['sourceIdentityBefore'])
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
try:
 case('explicitly drain own selected test node before safe detach',lambda:g('sudo -n docker stop '+node,timeout=60))
 old=inspect(node);other=inspect(prep['unselected']);r['beforeDetach']=old;r['unselectedBeforeDetach']=other;r['sourceBeforeDetach']=snapshot();save()
 case('public detach --yes --drained through installed owner',lambda:nongroups(B+' detach --yes --drained --json',timeout=120))
 def proof():
  a=inspect(node);u=inspect(prep['unselected']);r['afterDetach']=a;save();assert not a['State']['Running'];assert a['Image']==old['Image'];assert a['NetworkSettings']['Networks']['bridge']['Aliases']==old['NetworkSettings']['Networks']['bridge']['Aliases']
  ac=copy.deepcopy(a['Config']);bc=copy.deepcopy(old['Config'])
  for x in [ac,bc]:
   x.pop('Image',None)
   for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:x['Labels'].pop(k,None)
  assert ac==bc;ah=copy.deepcopy(a['HostConfig']);bh=copy.deepcopy(old['HostConfig']);bh['Mounts']=[m for m in bh['Mounts'] if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']];
  for x in [ah,bh]:
   if x.get('OomKillDisable') is None:x['OomKillDisable']=False
  assert ah==bh
  assert sorted(a['Mounts'],key=lambda m:m['Destination'])==sorted([m for m in old['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']],key=lambda m:m['Destination'])
  u['Mounts']=sorted(u['Mounts'],key=lambda m:m['Destination']);other['Mounts']=sorted(other['Mounts'],key=lambda m:m['Destination']);assert u==other
  paths={m['Destination']:m['Source'] for m in a['Mounts']};files=[paths['/root']+'/.codex/api005-sentinel',paths['/home/autobyteus/data']+'/api005-sentinel',paths['/home/vncuser/.config/chromium']+'/api005-sentinel'];q=g('sudo -n sha256sum '+' '.join(map(shlex.quote,files)));assert [x.split()[0] for x in q['stdout'].splitlines()]==[x.split()[0] for x in prep['privateHashes'].splitlines()]
  source=g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; sudo -n test ! -e /var/lib/autobyteus-nfs/start-attempt-'+node+'.json; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sudo -n docker volume inspect autobyteus-nfs-'+UUID);assert UUID in source['stdout'] and r['sourceIdentityBefore'] in source['stdout'] and hashlib.sha256(b'ORIGINAL_API005').hexdigest() in source['stdout'];assert not g('sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId='+UUID+' --format "{{.Names}}"')['stdout'].strip()
  return {'selected':a,'unselected':u,'privateSentinels':q,'originalSourceAndRetainedVolume':source,'exactAttemptRemoved':True}
 case('drained detach current config private/source preservation and exact attempt removal',proof)
 r['result']='Pass';save();event('Selected drained detach preserves current opaque state/source/private bytes and removes exact bounded attempt PASS')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('Detach regression Fail/incomplete '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
