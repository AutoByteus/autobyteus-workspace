"""Supported NFS command creates actual host mount; two generic shells enter that NFS mount.
A bind of the proven NFS mount is intentionally same-kernel, NOT an independent NFS client.
"""
from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-command-setup-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text());r['mode']=MODE
try:
 assert json.loads((E/'command-clients-result.json').read_text())['result']=='Ready'
 if MODE=='LN':g('mkdir -m 755 '+SRC+'; mkdir -m 755 '+SRC+'/project; printf ORIGINAL_API008 > '+SRC+'/project/preexisting.txt')
 else:assert json.loads((E/'LN-command-detach-result.json').read_text())['result']=='Pass'
 r['sourceBefore']=g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout'];ip=json.loads(g('ip -4 -j addr show scope global')['stdout'])[0]['addr_info'][0]['local'];r['endpoint']=ip
 data=Path(build['binary']['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==build['binary']['sha256'];cmd(['exec','-i',V,'sh','-c','cat > '+B+'; chmod 755 '+B],data=data)
 z=case('FS01 '+MODE+' supported NFS create without application nodes',lambda:nongroups(B+' create --source '+SRC+' --backend '+('ganesha-native' if MODE=='LN' else 'ganesha-docker')+' --endpoint '+ip+' --allow '+ip+' --nodes none --yes --drained --json',timeout=300));d=json.loads(z['stdout']);assert d['status']['hostReady'];r['connection']=d['connection'];r['mount']=g('findmnt -T '+ROOT+' -o TARGET,SOURCE,FSTYPE,OPTIONS')['stdout'];assert 'nfs4' in r['mount'];assert g('stat -c "%d:%i:%u:%g:%a" '+SRC)['stdout']==r['sourceBefore']
 for n in ['ab-nfs-api008-cmd-a','ab-nfs-api008-cmd-b']:
  case('start command-only '+n,lambda:g('sudo -n docker run -d --name '+n+' --network none --label validation.owner=api008 --mount type=bind,src='+ROOT+',dst='+ROOT+' ab-nfs-api008-command-client:local',timeout=90))
 r['containers']=json.loads(g('sudo -n docker inspect ab-nfs-api008-cmd-a ab-nfs-api008-cmd-b')['stdout']);assert all(x['Config']['Cmd']==['sleep','infinity'] and x['HostConfig']['NetworkMode']=='none' for x in r['containers']);r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['error']=repr(x);save();raise
