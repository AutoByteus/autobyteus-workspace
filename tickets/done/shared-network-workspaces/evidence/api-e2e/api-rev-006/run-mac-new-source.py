exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text())
OUT='mac-new-source-result.json';prior=json.loads((E/'mac-native-result.json').read_text());assert json.loads((E/'mac-controls-confirm-v2-result.json').read_text())['result'].startswith('Pass');r['connection']=prior['connection'];r['baseline']=prior['baseline'];original=SRC
try:
 case('public drained original detach',lambda:m(B+' detach --yes --drained --json',90))
 q=case('original detached source bytes marker modes preserved',lambda:m('set -e; sudo -n test ! -e /Library/Application\ Support/AutoByteusNFS/attachment.json; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist; ! /sbin/mount | grep '+Q(' on '+ROOT+' ')+'; stat -f "%d:%i:%u:%g:%Lp" '+SRC+'; cat '+SRC+'/.autobyteus-nfs/storage.json; cat '+SRC+'/project/preexisting.txt'));assert r['connection']['storageId'] in q['stdout'];assert 'ORIGINAL_API006_MAC' in q['stdout']
 def denied(path,fragment):
  q=m(B+' create --source '+Q(path)+' --backend apple --endpoint '+mac['ip']+' --allow '+mac['ip']+' --nodes none --yes --json',60,False);assert q['rc']!=0 and fragment in q['stderr'],q;m('sudo -n test ! -e /Library/Application\ Support/AutoByteusNFS/attachment.json; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist');return q
 case('private-home source refused before setup',lambda:denied('/Users/admin','root/home/ancestor'))
 case('private auth-named tree refused before setup',lambda:denied(original+'/.codex','private application'))
 m('ln -s '+original+' '+original+'-alias');case('symlink ancestor refused before setup',lambda:denied(original+'-alias/project','symlink ancestors'))
 SRC=original+'-new';r['source']=SRC;save();m('test ! -e '+SRC)
 q=case('public absent-source create under077 actual privileged child and bound save',lambda:m('umask 077; exec '+B+' create --source '+SRC+' --backend apple --endpoint '+mac['ip']+' --allow '+mac['ip']+' --nodes none --yes --json',180));v=json.loads(q['stdout']);assert v['status']['hostReady'];r['newConnection']=v['connection'];save()
 m('set -e; mkdir '+SRC+'/project; printf ORIGINAL_API006_MAC > '+SRC+'/project/preexisting.txt; sudo -n test ! -e '+Q(STATE+'/pending-setup.json'))
 r['newBaseline']=capture('new-source');id=json.loads(r['newBaseline']['bindingBytes'])['identity'];assert set(id)=={'volumeUuid','inode'} and id['inode']==int(r['newBaseline']['stat'].split(':')[1]);assert r['newBaseline']['stat'].endswith(':501:20:755');case('new source mounted nonroot proof',lambda:mounted_proof('newsource'))
 case('newsource public reconnect',lambda:m(B+' reconnect --yes --json',90));assert capture('new-source-repeat')['bindingBytes']==r['newBaseline']['bindingBytes']
 # Exact-owned source absence is a deliberate cleanup scenario, not an outage SLA.
 m('mv '+SRC+' '+SRC+'-retained');case('safe public detach does not require live source path',lambda:m(B+' detach --yes --drained --json',90));m('mv '+SRC+'-retained '+SRC)
 q=case('new source retained no attachment/job/mount',lambda:m('set -e; sudo -n test ! -e /Library/Application\ Support/AutoByteusNFS/attachment.json; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist; ! /sbin/mount | grep '+Q(' on '+ROOT+' ')+'; stat -f "%d:%i:%u:%g:%Lp" '+SRC+'; cat '+SRC+'/.autobyteus-nfs/storage.json; cat '+SRC+'/project/preexisting.txt'));assert r['newBaseline']['stat'] in q['stdout'] and v['connection']['storageId'] in q['stdout'];r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('new source failure '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
