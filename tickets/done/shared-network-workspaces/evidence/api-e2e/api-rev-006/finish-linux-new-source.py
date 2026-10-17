from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='linux-new-source-detach-result.json';exec((E/'common.py').read_text());p=json.loads((E/'linux-new-source-confirm-result.json').read_text());assert p['result'].startswith('Pass');SRC=p['source'];r.update(source=SRC,connection=p['connection'],bindingBytes=p['bindingBytes'],identity=p['identity']);STATE='/var/lib/autobyteus-nfs'
try:
 r['beforeDetachNetwork']=g('set -e; sudo -n ss -ltnp; nc -z -v -w 3 '+p['endpoint']+' 2049; sudo -n systemctl is-active autobyteus-nfs.service autobyteus-nfs-ganesha.service; findmnt -n '+ROOT);save()
 g('mv '+SRC+' '+SRC+'-retained');case('public safe detach absent live source path',lambda:nongroups(B+' detach --yes --drained --json',timeout=120));g('mv '+SRC+'-retained '+SRC)
 q=case('new source original inode owner private mode content marker preserved',lambda:g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; sudo -n test ! -e '+STATE+'/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; stat -c "%d:%i:%u:%g:%a" '+SRC+'; cat '+SRC+'/new.txt; cat '+SRC+'/.autobyteus-nfs/storage.json'));assert r['identity'] in q['stdout'] and r['connection']['storageId'] in q['stdout'] and 'NEW_SOURCE_API006' in q['stdout'];r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('new source detach incomplete/fail '+repr(x))
