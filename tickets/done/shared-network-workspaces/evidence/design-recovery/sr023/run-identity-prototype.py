"""Dependency identity experiment only. No NFS, product-state edits or finished-public-command claim."""
from pathlib import Path
import json,subprocess as s,time,hashlib,shlex,uuid
E=Path(__file__).resolve().parent;res=json.loads((E/'resource.json').read_text());assert res['result']=='Ready';N=res['clone'];B='/Users/admin/'+N+'-probe';SRC='/Users/admin/'+N+'-source';M='/Volumes/'+N+'-volume';r={'result':'Running','scope':'Disposable Go no-cgo platform identity probe, NOT product implementation/API proof','commands':[],'observations':[],'controls':[],'vm':N,'source':SRC};MARK=str(uuid.uuid4());text='SR023 original project '+MARK

def save():(E/'prototype-result.json').write_text(json.dumps(r,indent=2)+'\n')
def m(code,t=60,check=True,data=None):
 a=[res['tart'],'exec',*(['-i'] if data is not None else []),N,'/usr/bin/sudo','-n','-u','admin','/usr/bin/env','-i','HOME=/Users/admin','PATH=/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code];start=time.monotonic()
 try:
  p=s.run(a,env=res['env'],input=data,capture_output=True,timeout=t);q={'argv':a,'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
 except s.TimeoutExpired as x:q={'argv':a,'timeout':t};r['commands'].append(q);save();raise
 r['commands'].append(q);save()
 if check:assert q['rc']==0,q
 return q

def observe(label,path=SRC):
 q=m(B+' '+shlex.quote(path));v=json.loads(q['stdout']);b=m('/usr/sbin/sysctl -n kern.boottime; shasum -a 256 '+shlex.quote(path+'/project/preexisting.txt')+' '+shlex.quote(path+'/.autobyteus-nfs/storage.json'));v.update(label=label,bootAndHashes=b['stdout']);r['observations'].append(v);save();return v

def fixture(path):
 return 'mkdir -p '+path+'/project '+path+'/.autobyteus-nfs; printf %s '+shlex.quote(text)+' > '+path+'/project/preexisting.txt; printf %s '+shlex.quote(json.dumps({'storageId':MARK}))+' > '+path+'/.autobyteus-nfs/storage.json'
try:
 blob=(Path(res['scratch'])/'identity-probe-arm64').read_bytes();r['probeSHA256']=hashlib.sha256(blob).hexdigest();m('umask 077; cat > '+B+'; chmod 755 '+B,data=blob)
 m('set -e; mkdir -m 755 '+SRC+'; '+fixture(SRC));base=observe('baseline');r['savedIdentity']=base['identity'];save()
 # Three ordinary OS shutdown/restart operations, no product service or mount repair.
 for n in range(1,4):
  old=m('/usr/sbin/sysctl -n kern.boottime')['stdout']
  try:m('sudo -n shutdown -r now',10,False)
  except s.TimeoutExpired:pass
  end=time.monotonic()+180
  while time.monotonic()<end:
   try:
    q=m('/usr/sbin/sysctl -n kern.boottime',5,False)
    if q['rc']==0 and q['stdout']!=old:break
   except s.TimeoutExpired:pass
   time.sleep(3)
  else:raise RuntimeError('boot not observed')
  v=observe('ordinary-boot-'+str(n));assert v['identity']==base['identity'];assert v['bootAndHashes'].splitlines()[1:]==base['bootAndHashes'].splitlines()[1:];print('boot',n,'device',v['deviceObservation'],'identity equal',flush=True)
 assert any(v['deviceObservation']!=base['deviceObservation'] for v in r['observations'][1:]),'no raw-device reassignment witnessed; bounded experiment incomplete'
 # Same pathname and exact marker/content on a distinct directory, no record editing.
 m('set -e; mv '+SRC+' '+SRC+'-original; mkdir -m 755 '+SRC+'; cp -R '+SRC+'-original/project '+SRC+'-original/.autobyteus-nfs '+SRC+'/')
 replacement=observe('replacement-directory');assert replacement['identity']['volumeUuid']==base['identity']['volumeUuid'];assert replacement['identity']['inode']!=base['identity']['inode'];r['controls'].append({'case':'same-path directory replacement, same marker/bytes','refused':replacement['identity']!=r['savedIdentity']});save()
 m('set -e; mv '+SRC+' '+SRC+'-replacement; mv '+SRC+'-original '+SRC);assert observe('restored-original-directory')['identity']==base['identity']
 m('set -e; mv '+SRC+' '+SRC+'-original; ln -s '+SRC+'-original '+SRC);q=m(B+' '+SRC,check=False);assert q['rc']!=0 and 'not real directory' in q['stdout'];r['controls'].append({'case':'symlink source','refused':True});m('set -e; rm '+SRC+'; mv '+SRC+'-original '+SRC)
 m('ln -s /Users/admin /Users/admin/'+N+'-ancestor');q=m(B+' /Users/admin/'+N+'-ancestor/'+N+'-source',check=False);assert q['rc']!=0 and 'symlink ancestor' in q['stdout'];r['controls'].append({'case':'symlink ancestor','refused':True})
 m('chmod 000 '+SRC);q=m(B+' '+SRC,check=False);assert q['rc']!=0 and 'permission denied' in q['stdout'];r['controls'].append({'case':'unreadable source as nonroot','refused':True});m('chmod 755 '+SRC);assert observe('after-permission-restore')['identity']==base['identity'];save()
 # Different actual APFS volumes at one mountpoint; never mount over user data.
 vols=[]
 for n in (1,2):
  img='/Users/admin/'+N+'-disk'+str(n)+'.dmg';m('hdiutil create -size 256m -fs APFS -volname '+N+'-disk'+str(n)+' '+img,t=120);m('hdiutil attach -nobrowse -mountpoint '+M+' -plist '+img,t=60);m(fixture(M));v=observe('APFS-volume-'+str(n),M);vols.append(v);m('hdiutil detach '+M,t=60)
 assert vols[0]['identity']['volumeUuid']!=vols[1]['identity']['volumeUuid'];assert vols[0]['identity']['inode']==vols[1]['identity']['inode'],'retain differing-inode result but volume-only control not isolated';assert vols[0]['bootAndHashes'].splitlines()[1:]==vols[1]['bootAndHashes'].splitlines()[1:]
 r['controls'].append({'case':'same-path different-volume same inode/marker/content','refused':True,'one':vols[0]['identity'],'two':vols[1]['identity']});save()
 m('hdiutil attach -nobrowse -mountpoint '+M+' -plist /Users/admin/'+N+'-disk1.dmg');assert observe('original-APFS-volume-reattached',M)['identity']==vols[0]['identity'];m('hdiutil detach '+M)
 r['finalOriginal']=observe('final-original');assert r['finalOriginal']['identity']==base['identity'];r['result']='Pass';save()
except BaseException as x:r.update(result='Incomplete',error=repr(x));save();raise
print(json.dumps({'result':r['result'],'observations':len(r['observations']),'controls':r['controls']}),flush=True)
