from pathlib import Path
E=Path(__file__).resolve().parent; RESULT='docker-visibility-result.json'; exec((E/'common-docker.py').read_text())
prior=json.loads((E/'docker-selected-confirm-result.json').read_text());assert prior['result']=='Pass';r.update(connection=prior['connection'],sourceIdentityBefore=prior['sourceIdentityBefore'],phases=[])
try:
 ids=g('sudo -n docker ps -aq --filter label=com.autobyteus.nfs.installationId --filter label=com.autobyteus.nfs.storageId='+r['connection']['storageId'])['stdout'].split();assert len(ids)==1;engine=ids[0];r['engineContainer']=engine;save()
 q=case('actual activated Docker storage config image process and package identity',lambda:g("set -e; sudo -n cat /var/lib/autobyteus-nfs/ganesha/ganesha.conf; sudo -n docker inspect "+engine+"; sudo -n docker exec "+engine+" sh -c 'cat /proc/1/cmdline; cat /usr/share/autobyteus-nfs/engine-manifest.json'; sudo -n stat -c '%y:%a:%u:%g:%n' /var/lib/autobyteus-nfs/ganesha/ganesha.conf; sha256sum /usr/libexec/autobyteus-nfs/autobyteus-nfs; findmnt -no SOURCE,FSTYPE,OPTIONS "+ROOT+"; sudo -n docker inspect autobyteus-server-0; cat /sys/module/nfsv4/parameters/directory_delegations"))
 assert build['engineImage'] in q['stdout']
 assert 'Attr_Expiration_Time = 0;' in q['stdout'] and build['binary']['sha256'] in q['stdout'];r['activationEvidence']=q;save()
 q=g("sudo -n docker volume inspect $(sudo -n docker volume ls --filter label=com.autobyteus.nfs.storageId="+r['connection']['storageId']+" -q)");r['volumeEvidence']=q;save();vols=json.loads(q['stdout']);assert len(vols)==1;opts=vols[0]['Options']['o'].split(',');assert all(x in opts for x in ['hard','tcp','vers=4.1','actimeo=1','nosharecache']);mount=g('findmnt -no OPTIONS '+ROOT)['stdout'].strip().split(',');assert all(x in mount for x in ['hard','vers=4.1','acregmin=1','acregmax=1','acdirmin=1','acdirmax=1']);assert 'proto=tcp' in mount
 guest='/home/admin/'+V+'-visibility.py';cmd(['exec','-i',V,'/bin/sh','-c','cat > '+guest],data=(E/'guest-visibility.py').read_bytes())
 for phase in ['docker-fresh-public-create','docker-public-reconnect']:
  if phase=='docker-public-reconnect':
   q=case('public Docker-storage reconnect without config or cache manipulation',lambda:nongroups(B+' reconnect --yes --json',timeout=90));v=json.loads(q['stdout']);assert v['hostReady'] and v['nodes']['autobyteus-server-0'].startswith('ready;')
  q=case('API-F004 '+phase+' warmed 1KiB/1MiB + atomic/new native and HTTP',lambda:nongroups('python3 -u '+guest+' '+SRC+' '+phase,timeout=150));result=json.loads(q['stdout'].splitlines()[-1]);r['phases'].append(result);save();assert result['result']=='Pass',result
 q=snapshot();r['preservation']=q;v=json.loads(q['stdout']);assert v['sourceHash']==v['mountedHash']==hashlib.sha256(b'ORIGINAL_API005').hexdigest();assert v['sourceMarker']==v['mountedMarker']=={'storageId':r['connection']['storageId']}
 q=g('sudo -n docker exec autobyteus-server-0 sha256sum /root/.codex/api005-sentinel /home/autobyteus/data/api005-sentinel /home/vncuser/.config/chromium/api005-sentinel');assert q['stdout']==json.loads((E/'managed-nodes-prepare-result.json').read_text())['privateHashes'];r['privatePreservation']=q
 r['result']='Pass';save();event('API-F004 Docker-storage public create/reconnect scope Pass; broader bothOS/physical matrix NOT implied')
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('API-F004 rerun Fail/incomplete '+repr(x))
