from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-detach-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
try:
 case('real drain both owned nodes',lambda:g('sudo -n docker stop autobyteus-server-0 autobyteus-server-1',timeout=90))
 case('public safe detach '+MODE,lambda:nongroups(B+' detach --yes --drained --json',timeout=180))
 z=case('source and marker preserved, owned attachment/job/mount absent',lambda:g('set -e; ! grep -E " nfs4? " /proc/mounts; test ! -e /var/lib/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; cat '+SRC+'/.autobyteus-nfs/storage.json; sha256sum '+SRC+'/project/preexisting.txt; sudo -n docker inspect autobyteus-server-0 autobyteus-server-1 --format "{{.State.Running}} {{json .Mounts}}"'))
 assert hashlib.sha256(b'ORIGINAL_API008').hexdigest() in z['stdout'];r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['error']=repr(x);save();raise
