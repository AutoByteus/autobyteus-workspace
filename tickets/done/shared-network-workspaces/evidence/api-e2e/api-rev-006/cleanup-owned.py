from pathlib import Path
import json,subprocess as sp,shutil,time
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());C=Path('/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK');tart=str(C/'tools/tart.app/Contents/MacOS/tart');r={'result':'Running','resources':[],'scope':'Only exact owned API006 VMs and own scratch; source bytes/marker/modes proved before disposable fixtures retired. No host mount/service/app/node or public cache changes.'}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def run(a,env,timeout=90):
 p=sp.run(a,env=env,capture_output=True,text=True,timeout=timeout);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r.setdefault('commands',[]).append(q);save();assert p.returncode==0,q;return q
for name in ['mac-volume-result.json','mac-new-source-confirm-result.json','linux-native-resume-result.json','linux-new-source-detach-result.json']:assert json.loads((E/name).read_text())['result']=='Pass',name
mac=json.loads((E/'mac-peer-resource.json').read_text());lin=json.loads((E/'linux-resource.json').read_text());ls=json.loads((E/'linux-start.json').read_text())
for row in [{'name':mac['clone'],'pid':mac['vmPid'],'home':str(C/'driver-home'),'tartHome':mac['tartHome'],'os':'mac'},{'name':lin['clone'],'pid':ls['vmPid'],'home':str(S/'home'),'tartHome':lin['privateTartHome'],'os':'linux'}]:
 assert row['name'].startswith('ab-nfs-api006-');r['resources'].append(row);env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':row['home'],'TART_HOME':row['tartHome'],'TART_NO_AUTO_PRUNE':'1'}
 command=run(['/bin/ps','-p',str(row['pid']),'-o','command='],env)['stdout'];assert tart+' run '+row['name']+' ' in command
 if row['os']=='mac':
  source='/Users/admin/'+row['name']+'-source';code='set -e; sudo -n test ! -e "/Library/Application Support/AutoByteusNFS/attachment.json"; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist; ! /sbin/mount | grep " on /Volumes/autobyteus-shared "; cat '+source+'/project/preexisting.txt; cat '+source+'/.autobyteus-nfs/storage.json; stat -f "%i:%u:%g:%Lp" '+source+' '+source+'-new; /usr/bin/hdiutil info'
 else:
  source='/home/admin/'+row['name']+'-native-source';code='set -e; sudo -n test ! -e /var/lib/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; ! findmnt -n -t nfs,nfs4 /Volumes/autobyteus-shared; cat '+source+'/project/preexisting.txt; cat '+source+'/.autobyteus-nfs/storage.json; stat -c "%d:%i:%u:%g:%a" '+source+' '+source+'-new'
 row['guestFinal']=run([tart,'exec',row['name'],'/bin/sh','-c',code],env)
 for a in [[tart,'stop',row['name'],'--timeout','15'],[tart,'delete',row['name']],[tart,'list']]:run(a,env)
 row['processAbsent']=sp.run(['/bin/ps','-p',str(row['pid'])],capture_output=True).returncode!=0;row['cloneAbsent']=not (Path(row['tartHome'])/'vms'/row['name']).exists();assert row['processAbsent'] and row['cloneAbsent'];save()
assert S.name=='ab-nfs-api006-mvw23zqb' and S.is_dir();shutil.rmtree(S);r['scratchAbsent']=not S.exists();r['publicCacheRetained']=C.exists();assert r['scratchAbsent'] and r['publicCacheRetained'];r['result']='Complete';save()
