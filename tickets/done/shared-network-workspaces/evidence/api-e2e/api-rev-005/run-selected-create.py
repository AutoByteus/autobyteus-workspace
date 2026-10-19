"""Public selected-node create through actual Docker API/image/module/health boundaries."""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib,copy
E=Path(__file__).resolve().parent; RESULT='selected-create-result.json'; exec((E/'common.py').read_text())
prep=json.loads((E/'managed-nodes-prepare-result.json').read_text());assert prep['result']=='Ready';node=prep['selected'];r['serverImage']=prep['serverImage'];r['node']=node;save()
def inspect(n):return json.loads(g('sudo -n docker inspect '+n)['stdout'])[0]
def private():return g('sudo -n docker exec '+node+' sha256sum /root/.codex/api005-sentinel /home/autobyteus/data/api005-sentinel /home/vncuser/.config/chromium/api005-sentinel')['stdout']
def preservation():
 before=prep['before'];after=inspect(node);r['after']=after;save();assert after['Id']!=before['Id'];assert after['Image']==before['Image'];assert after['State']['Running']
 ac=copy.deepcopy(after['Config']);bc=copy.deepcopy(before['Config']);assert ac.pop('Image')==before['Image'];bc.pop('Image')
 for k in ['com.autobyteus.nfs.storageId','com.autobyteus.nfs.recreation']:ac['Labels'].pop(k,None)
 assert ac==bc,{'configChangedKeys':[k for k in ac if ac[k]!=bc.get(k)]}
 ah=copy.deepcopy(after['HostConfig']);bh=copy.deepcopy(before['HostConfig']);extra=ah.pop('Mounts',[]);old=bh.pop('Mounts',[]) or [];filtered=[m for m in extra if m['Target'] not in [ROOT,'/etc/autobyteus-nfs']];assert filtered==old;assert ah==bh,{'hostConfigChangedKeys':[k for k in ah if ah[k]!=bh.get(k)]}
 oldMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in before['Mounts']]
 afterMounts=[{k:m.get(k) for k in ['Type','Name','Source','Destination','RW','Propagation']} for m in after['Mounts'] if m['Destination'] not in [ROOT,'/etc/autobyteus-nfs']];assert len({m["Destination"] for m in afterMounts})==len(afterMounts);assert sorted(afterMounts,key=lambda m:m["Destination"])==sorted(oldMounts,key=lambda m:m["Destination"])
 assert after['NetworkSettings']['Ports']==before['NetworkSettings']['Ports'];assert set(after['NetworkSettings']['Networks'])==set(before['NetworkSettings']['Networks'])
 for net,info in before['NetworkSettings']['Networks'].items():
  expected=[a for a in info.get('Aliases') or [] if a not in [before['Id'],before['Id'][:12]]];actual=[a for a in after['NetworkSettings']['Networks'][net].get('Aliases') or [] if a not in [after['Id'],after['Id'][:12]]];assert actual==expected,(net,actual,expected)
 assert private()==prep['privateHashes'];u=inspect(prep['unselected']);o=copy.deepcopy(prep['unselectedBefore']);u['Mounts']=sorted(u['Mounts'],key=lambda x:x['Destination']);o['Mounts']=sorted(o['Mounts'],key=lambda x:x['Destination']);assert u==o;return {'configHostConfigImagePrivateVolumesSentinelsPortsAliases':'Pass','unselectedExactSnapshot':'Pass','oldContainer':before['Id'],'newContainer':after['Id']}
try:
 case('fresh nonempty ext4 source before first public setup',lambda:g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; test ! -e /etc/autobyteus-nfs/attachment.json; mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API005 > '+SRC+'/project/preexisting.txt; stat -c "%d:%i:%u:%g:%a" '+SRC))
 r['noPreinstalledEngine']=g("set -e; if dpkg-query -W -f='${Status}' nfs-ganesha 2>/dev/null | grep -q 'install ok installed'; then exit 1; fi; test ! -e /var/lib/autobyteus-nfs/ganesha/ganesha.conf; if pgrep -x ganesha.nfsd; then exit 1; fi");save()
 r['sourceIdentityBefore']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'].strip();addr=json.loads(g('ip -4 -j addr show scope global')['stdout']);ip=[x['local'] for n in addr for x in n['addr_info'] if x['family']=='inet'][0];r['endpoint']=ip
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',V,'/bin/sh','-c','umask 077; cat > '+B+'; chmod 755 '+B],data=data)
 q=case('one fresh public selected native-storage create',lambda:nongroups('umask 077; exec '+B+' create --source '+SRC+' --backend ganesha-native --endpoint '+ip+' --allow '+ip+' --nodes '+node+' --yes --drained --json',timeout=240));v=json.loads(q['stdout']);assert v['status']['hostReady'] and v['status']['nodes'][node].startswith('ready;');r['connection']=v['connection'];save()
 case('exact chosen image config private state ports aliases and unselected preservation',preservation)
 def identity():
  q=snapshot();v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API005').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']};assert ':'.join(map(str,v['sourceIdentity'][:4]))+':'+oct(v['sourceIdentity'][4])[2:]==r['sourceIdentityBefore'];return q
 case('same original nonempty source and native mount identity preserved',identity)
 q=case('installed identity private modes and active managed job',lambda:g('set -e; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; sudo -n systemctl is-active autobyteus-nfs.service; sudo -n find /var/lib/autobyteus-nfs -maxdepth 1 -printf "%m %u %g %f\\n"'));assert build['binary']['sha256'] in q['stdout'];r['privateModeEvidence']=q
 r['result']='Pass';save();event('Fresh selected public create Pass; no reconnect performed; API-F004 healthy visibility next; no fresh-read success implied')
except BaseException as x:
 r['result']='Fail';r['fatal']=repr(x);save();event('ManagedDocker client Fail/incomplete '+repr(x))
 try:r['diagnostics']=g('sudo -n docker ps -a; sudo -n ls -l /var/lib/autobyteus-nfs; sudo -n journalctl -u autobyteus-nfs.service --no-pager -n 40',check=False,timeout=20);save()
 except BaseException as y:r['diagnosticError']=repr(y);save()
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
