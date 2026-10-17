exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text())
OUT='mac-new-source-confirm-result.json';prior=json.loads((E/'mac-new-source-resume-result.json').read_text());SRC=prior['source'];r['source']=SRC;r['newBaseline']=prior['newBaseline'];v={'connection':prior['newConnection']};save()
try:
 a=capture('new-source-mode-confirm');assert a['stat'].endswith(':501:20:700');assert a['bindingBytes']==r['newBaseline']['bindingBytes'];assert set(json.loads(a['bindingBytes'])['identity'])=={'volumeUuid','inode'}
 case('actual new source owner-private mode and nonroot mounted RW',lambda:mounted_proof('newsource'))
 case('newsource public reconnect',lambda:m(B+' reconnect --yes --json',90));assert capture('new-source-repeat')['bindingBytes']==r['newBaseline']['bindingBytes']
 # Exact-owned source absence is a deliberate cleanup scenario, not an outage SLA.
 m('mv '+SRC+' '+SRC+'-retained');case('safe public detach does not require live source path',lambda:m(B+' detach --yes --drained --json',90));m('mv '+SRC+'-retained '+SRC)
 q=case('new source retained no attachment/job/mount',lambda:m('set -e; sudo -n test ! -e /Library/Application\ Support/AutoByteusNFS/attachment.json; test ! -e /Library/LaunchDaemons/com.autobyteus.nfs.plist; ! /sbin/mount | grep '+Q(' on '+ROOT+' ')+'; stat -f "%d:%i:%u:%g:%Lp" '+SRC+'; cat '+SRC+'/.autobyteus-nfs/storage.json; cat '+SRC+'/project/preexisting.txt'));assert r['newBaseline']['stat'] in q['stdout'] and v['connection']['storageId'] in q['stdout'];r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('new source failure '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
