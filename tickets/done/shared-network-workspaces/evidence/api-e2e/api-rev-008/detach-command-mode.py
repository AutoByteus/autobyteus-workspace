from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-command-detach-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
try:
 assert json.loads((E/(MODE+'-commands-result.json')).read_text())['result']=='Pass'
 case('FS16 drain exact command-only containers',lambda:g('sudo -n docker stop ab-nfs-api008-cmd-a ab-nfs-api008-cmd-b; sudo -n docker rm ab-nfs-api008-cmd-a ab-nfs-api008-cmd-b',timeout=90))
 case('FS16 public '+MODE+' drained detach',lambda:nongroups(B+' detach --yes --drained --json',timeout=180))
 z=case('FS16 source and marker retained, mount and job absent',lambda:g('set -e; ! grep -E " nfs4? " /proc/mounts; test ! -e /var/lib/autobyteus-nfs/attachment.json; test ! -e /etc/systemd/system/autobyteus-nfs.service; sha256sum '+SRC+'/project/preexisting.txt; cat '+SRC+'/.autobyteus-nfs/storage.json'))
 assert hashlib.sha256(b'ORIGINAL_API008').hexdigest() in z['stdout'];r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['error']=repr(x);save();raise
