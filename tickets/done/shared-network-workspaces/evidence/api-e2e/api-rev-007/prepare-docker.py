"""Only Docker client prerequisite; NO NFS package or config preinstallation."""
from pathlib import Path
E=Path(__file__).resolve().parent; RESULT='docker-prepare-result.json'; exec((E/'common.py').read_text())
try:
 case('fresh owned guest has no NFS installation or attachment',lambda:g("set -e; test ! -e /etc/autobyteus-nfs/attachment.json; test ! -e /var/lib/autobyteus-nfs; ! grep -E ' nfs4? ' /proc/mounts; if dpkg-query -W -f='${Status}' nfs-ganesha 2>/dev/null | grep -q 'install ok installed'; then exit 1; fi; cat /etc/os-release; uname -a; findmnt -no SOURCE,FSTYPE /; id"))
 case('Docker only prerequisite in own fresh guest',lambda:g('set -e; sudo -n apt-get update -qq; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker.io; sudo -n systemctl start docker; sudo -n docker version',timeout=600))
 case('private guest loopback registry for current candidate image only',lambda:g('sudo -n docker run -d --name ab-nfs-api007-registry -p 127.0.0.1:5000:5000 registry:2',timeout=300))
 r['result']='Ready';save()
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save();event('Docker prerequisite incomplete '+repr(x))
