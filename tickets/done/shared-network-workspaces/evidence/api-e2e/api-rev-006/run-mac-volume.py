"""Actual two APFS disk images in the owned guest, public source identity lifecycle.
Separate replacement control, NOT automatic disk-image startup qualification.
"""
exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text())
OUT='mac-volume-result.json';assert json.loads((E/'mac-new-source-confirm-result.json').read_text())['result']=='Pass'
VOL='/Volumes/'+mac['clone']+'-volume';OTHER=VOL+'-other';IMG='/Users/admin/'+mac['clone']+'-original.dmg';REPL='/Users/admin/'+mac['clone']+'-replacement.dmg';SRC=VOL+'/source';r.update(source=SRC,volumeMount=VOL,otherMount=OTHER,images=[IMG,REPL]);save()
def attach(image,mount):return m('/usr/bin/hdiutil attach -nobrowse -owners on -mountpoint '+Q(mount)+' '+Q(image),60)
def copyproof():
 a=capture('replacement');base=r['baseline'];assert a['volume']['VolumeUUID']!=base['volume']['VolumeUUID'];assert a['markerBytes']==base['markerBytes'] and a['hashes']==base['hashes'];assert a['bindingBytes']==base['bindingBytes'];r['replacement']=a;save();return a
try:
 case('create actual original APFS volume',lambda:m('/usr/bin/hdiutil create -size 256m -fs APFS -volname API006Original '+IMG,90));attach(IMG,VOL)
 m('set -e; mkdir -p '+SRC+'/project; printf ORIGINAL_API006_MAC > '+SRC+'/project/preexisting.txt; chmod 755 '+SRC)
 q=case('public APFS volume source create',lambda:m(B+' create --source '+SRC+' --backend apple --endpoint '+mac['ip']+' --allow '+mac['ip']+' --nodes none --yes --json',180));v=json.loads(q['stdout']);assert v['status']['hostReady'];r['connection']=v['connection'];r['baseline']=capture('original-volume');case('actual APFS volume mounted nonroot RW',lambda:mounted_proof('original-volume'))
 case('create different actual APFS volume',lambda:m('/usr/bin/hdiutil create -size 256m -fs APFS -volname API006Replacement '+REPL,90));attach(REPL,OTHER)
 m('set -e; mkdir '+OTHER+'/source; cp -Rp '+SRC+'/project '+SRC+'/.autobyteus-nfs '+OTHER+'/source/; chmod 755 '+OTHER+'/source; /usr/bin/hdiutil detach '+OTHER,60)
 old=m('/usr/sbin/sysctl -n kern.bootsessionuuid')['stdout'].strip();r['replacementRebootBefore']=old;save()
 try:m('sudo -n shutdown -r now',10,False)
 except sp.TimeoutExpired:pass
 for n in range(80):
  try:
   q=m('/usr/sbin/sysctl -n kern.bootsessionuuid',5,False)
   if q.get('rc')==0 and q['stdout'].strip()!=old:r['replacementRebootAfter']=q['stdout'].strip();save();break
  except sp.TimeoutExpired:pass
  time.sleep(3)
 else:raise RuntimeError('replacement control reboot not observed')
 # Ordinary reboot cleared manual disk-image mounts. Do not unmount a busy export forcibly.
 case('original image absent after reboot',lambda:m('set -e; test ! -e '+SRC+'; ! /sbin/mount | grep '+Q(' on '+VOL+' ')+'; sudo -n cat '+Q(STATE+'/hosted-filesystem.json')))
 attach(REPL,VOL);case('different volume identical marker and bytes at same source path',copyproof)
 def refuse():
  q=m(B+' reconnect --yes --json',90,False);assert q['rc']!=0 and 'identity changed' in q['stderr'],q;assert m('sudo -n cat '+Q(STATE+'/hosted-filesystem.json'))['stdout']==r['baseline']['bindingBytes'];m('! /sbin/mount | grep '+Q(' on '+ROOT+' (nfs'));return q
 case('public reconnect refuses actual different APFS UUID',refuse)
 m('/usr/bin/hdiutil detach '+VOL,60);attach(IMG,VOL)
 case('restore exact original APFS image public reconnect',lambda:m(B+' reconnect --yes --json',120));case('restored actual volume nonroot mounted RW',lambda:mounted_proof('restored-volume'))
 a=capture('restored-original-volume');b=r['baseline'];assert a['volume']['VolumeUUID']==b['volume']['VolumeUUID'];assert a['stat'].split(':')[1:]==b['stat'].split(':')[1:] and a['bindingBytes']==b['bindingBytes'] and a['markerBytes']==b['markerBytes'] and a['hashes']==b['hashes']
 case('public drained detach original APFS volume',lambda:m(B+' detach --yes --drained --json',120))
 q=case('detached original preserved no mount job attachment',lambda:m('set -e; sudo -n test ! -e '+Q(STATE+'/attachment.json')+'; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist; ! /sbin/mount | grep '+Q(' on '+ROOT+' (nfs')+'; stat -f "%i:%u:%g:%Lp" '+SRC+'; cat '+SRC+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json'));assert ':'.join(b['stat'].split(':')[1:]) in q['stdout'] and v['connection']['storageId'] in q['stdout']
 case('detach only owned disk image',lambda:m('/usr/bin/hdiutil detach '+VOL,60));r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('actual volume control failure '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
