"""Existing public launcher upgrade, not a new private node lifecycle owner."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
exec((E/'run-two-reboots.py').read_text().split('try:\n for i in [1,2]:')[0].replace('two-reboots-result.json','node-upgrade-result.json'))
assert json.loads((E/'policy-veto-result.json').read_text())['result']=='Pass'
setup=json.loads((E/'managed-client-image-result.json').read_text());launcher=setup['launcherRoot']+'/scripts/public/docker/autobyteus-docker.sh';home='/home/admin/api005-launcher-home'
try:
 case('explicit operator restores original unless-stopped policy and starts node for restart regression',lambda:g('sudo -n docker update --restart=unless-stopped '+before['Id']+'; sudo -n docker start '+before['Id'],timeout=60));case('restored explicit running state actual API ready',ready)
 case('ordinary Docker node restart',lambda:g('sudo -n docker restart '+before['Id'],timeout=60));case('ordinary node restart readiness',ready);case('ordinary node restart exact original selected state preservation',preserved)
 case('test-only registry and isolated HOME current helper prerequisites',lambda:g('set -e; sudo -n docker start ab-nfs-api005-registry; sudo -n mkdir -p '+home+'/.local/bin; sudo -n cp /usr/libexec/autobyteus-nfs/autobyteus-nfs '+home+'/.local/bin/autobyteus-nfs; sudo -n chmod 755 '+home+'/.local/bin/autobyteus-nfs; sha256sum '+home+'/.local/bin/autobyteus-nfs'))
 q=case('actual public launcher upgrade --all against same immutable current worktree image',lambda:g('sudo -n /usr/bin/env -i HOME='+home+' PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /bin/bash '+launcher+' upgrade --all --image '+setup['guestRegistryDigest'],timeout=180))
 new=inspect(node);r['upgradeBefore']=before;r['upgradeAfter']=new;save();assert new['Id']!=before['Id'] and new['Image']==before['Image'];assert new['Config']['Labels']['com.autobyteus.nfs.storageId']==UUID
 oldMounts={m['Destination']:m for m in before['Mounts']};newMounts={m['Destination']:m for m in new['Mounts']};assert oldMounts==newMounts
 assert new['HostConfig']['PortBindings']==before['HostConfig']['PortBindings'];assert new['HostConfig']['RestartPolicy']==before['HostConfig']['RestartPolicy'];assert new['State']['Running']
 # upgrade --all explicitly requests all nodes start; do not call that an unselected mutation by reconnect.
 r['unselectedAfterRequestedUpgradeAll']=inspect(prep['unselected']);save()
 case('explicitly stop unselected fixture again after requested upgrade --all',lambda:g('sudo -n docker stop '+prep['unselected'],timeout=60));prep['unselectedBefore']=inspect(prep['unselected']);before=new;r['beforeCurrentUpgrade']=before;save()
 case('current replacement admitted by existing selected node reference',ready)
 case('new current container private bytes mounted APIs source and exact state baseline',preserved)
 case('ordinary reboot resolves current replacement rather than old recreation receipt ID',reboot)
 case('replacement automatic boot same current ID private and mounted data preservation',preserved)
 r['result']='Pass';save();event('Node restart and actual public launcher replacement/current-ref ordinary boot PASS. Upgrade-all has its documented own configuration policy, not unchanged opaque-config proof.')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('Node/launcher regression Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('sudo -n docker ps -a; sudo -n journalctl -b -u autobyteus-nfs.service --no-pager -n 80; sudo -n docker inspect '+node,check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
