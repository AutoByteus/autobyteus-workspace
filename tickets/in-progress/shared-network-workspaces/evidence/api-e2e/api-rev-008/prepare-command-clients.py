"""Generic Linux command image only: no application/backend/editor starts."""
from pathlib import Path
E=Path(__file__).resolve().parent;RESULT='command-clients-result.json';exec((E/'common.py').read_text())
try:
 base=json.loads((R/'autobyteus-nfs/packaging/release-lock.json').read_text())['ubuntuBaseImage']
 dockerfile='FROM '+base+'\nRUN apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 git util-linux coreutils findutils && rm -rf /var/lib/apt/lists/*\nCMD ["sleep","infinity"]\n'
 r['dockerfile']=dockerfile;r['image']='ab-nfs-api008-command-client:local';save()
 case('generic Linux command image build, no product application',lambda:cmd(['exec','-i',V,'sudo','-n','docker','build','-t',r['image'],'-'],data=dockerfile.encode(),timeout=900))
 r['imageInspect']=json.loads(g('sudo -n docker image inspect '+r['image'])['stdout']);r['result']='Ready';save()
except BaseException as x:r['result']='Incomplete';r['error']=repr(x);save();raise
