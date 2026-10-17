from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='docker-confirm-fixture-reset.json';exec((E/'common-docker.py').read_text())
try:
 r['before']=g('sudo -n docker inspect autobyteus-server-0 autobyteus-server-1');r['sourceBefore']=snapshot();save()
 case('LD harness recovery real drain A',lambda:g('sudo -n docker stop autobyteus-server-0',timeout=90))
 case('LD harness recovery public detach',lambda:nongroups(B+' detach --yes --drained --json',timeout=120))
 r['after']=g('sudo -n docker inspect autobyteus-server-0 autobyteus-server-1; ! grep -E " nfs4? " /proc/mounts; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt');r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();raise
