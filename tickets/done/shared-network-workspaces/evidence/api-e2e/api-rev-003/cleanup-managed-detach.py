"""Ordinary public drained detach after recorded failure; not a restart fix/pass."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','managed-detach-cleanup-result.json'))
node='autobyteus-server-0';prep=json.loads((E/'managed-nodes-restricted-result.json').read_text());UUID='71887d49-17ec-4e6f-a734-03ebd3abaafd'
try:
 assert json.loads((E/'managed-reboot-repro-result.json').read_text())['result']=='Reproduced'
 r['before']=json.loads(g('sudo -n docker inspect '+node)['stdout'])[0];assert not r['before']['State']['Running'];r['sourceBefore']=snapshot();save()
 r['detach']=nongroups(B+' detach --yes --drained --json',timeout=120);save()
 r['after']=json.loads(g('sudo -n docker inspect '+node)['stdout'])[0];r['unselected']=json.loads(g('sudo -n docker inspect '+prep['unselected'])['stdout'])[0];a=r['after'];assert not a['State']['Running'];assert a['Image']==r['before']['Image'];assert a['NetworkSettings']['Networks']['api003-clients']['Aliases']==['api003-primary'];assert a['HostConfig']['PortBindings']==r['before']['HostConfig']['PortBindings'];assert a['HostConfig']['RestartPolicy']==r['before']['HostConfig']['RestartPolicy'];assert r['unselected']['Id']==prep['unselectedBefore']['Id'] and r['unselected']['Config']==prep['unselectedBefore']['Config'] and r['unselected']['HostConfig']==prep['unselectedBefore']['HostConfig'] and not r['unselected']['State']['Running']
 mounts=sorted(a['Mounts'],key=lambda m:m['Destination']);assert mounts==sorted(prep['before']['Mounts'],key=lambda m:m['Destination']);assert not any(m['Destination'] in [ROOT,'/etc/autobyteus-nfs'] for m in a['Mounts']);old=copy.deepcopy(prep['before']['Config']);new=copy.deepcopy(a['Config']);old.pop('Image',None);new.pop('Image',None);assert old==new
 mapping={m['Destination']:m['Source'] for m in a['Mounts']};files=[mapping['/root']+'/.codex/api003-sentinel',mapping['/home/autobyteus/data']+'/api003-sentinel',mapping['/home/vncuser/.config/chromium']+'/api003-sentinel'];q=g('sudo -n sha256sum '+' '.join(map(shlex.quote,files)));assert [x.split()[0] for x in q['stdout'].splitlines()]==[x.split()[0] for x in prep['privateHashes'].splitlines()];r['privateSentinelsAfter']=q
 r['sourceAfter']=g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC+'; sudo -n docker volume inspect autobyteus-nfs-'+UUID+'; sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId='+UUID+' --format "{{.Names}}"');assert '64769:787680:1000:109:755' in r['sourceAfter']['stdout'] and UUID in r['sourceAfter']['stdout'] and hashlib.sha256(b'ORIGINAL_API003').hexdigest() in r['sourceAfter']['stdout'];assert not g('sudo -n docker ps -a --filter label=com.autobyteus.nfs.storageId='+UUID+' --format "{{.Names}}"')['stdout'].strip()
 r['result']='Pass cleanup detach and stopped-state preservation only';save()
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
