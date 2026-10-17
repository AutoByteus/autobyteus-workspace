"""Public create/reconnect regression, no manual engine installation or reader bypass.
Only test-owned disposable Ubuntu guest; retain until subsequent owned lifecycle checks.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
E=Path(__file__).resolve().parent; RESULT='linux-docker-prepare-v2-result.json'; exec((E/'common.py').read_text())
import io,tarfile
try:
 case('verify already-installed Docker in owned detached LinuxVM',lambda:g('set -e; ! grep -E " nfs4? " /proc/mounts; dpkg-query -W docker.io; sudo -n docker version',timeout=60))
 candidate=R/'autobyteus-nfs/out/ir005-local-candidate/engine-candidate';stream=io.BytesIO()
 with tarfile.open(fileobj=stream,mode='w') as t:
  t.add(candidate,arcname='engine-candidate')
  for n in ['packaging/Dockerfile','THIRD_PARTY_NOTICES']:t.add(R/'autobyteus-nfs'/n,arcname='autobyteus-nfs/'+n)
 cmd(['exec','-i',V,'/bin/sh','-c','mkdir /home/admin/api008-engine-context; tar -xf - -C /home/admin/api008-engine-context'],data=stream.getvalue())
 base=json.loads((R/'autobyteus-nfs/packaging/release-lock.json').read_text())['ubuntuBaseImage'];r['base']=base;r['retainedManifest']=json.loads((candidate/'engine-manifest.json').read_text());save()
 case('build storage image from exact retained engine pair',lambda:g('cd /home/admin/api008-engine-context; sudo -n docker build --pull --build-arg UBUNTU_BASE='+shlex.quote(base)+' --build-arg TARGETARCH=arm64 -f autobyteus-nfs/packaging/Dockerfile -t ab-nfs-api008:engine .',timeout=900))
 q=case('clean image package and manifest verification',lambda:g("sudo -n docker run --rm --network none --entrypoint /bin/sh ab-nfs-api008:engine -ec 'dpkg-query -W -f=\"\${Package} \${Status} \${Version} \${Architecture}\\n\" nfs-ganesha nfs-ganesha-vfs; cat /usr/share/autobyteus-nfs/engine-manifest.json; test ! -e /tmp/autobyteus-engine; ! command -v gcc'"));assert q['stdout'].count('install ok installed 4.3-8ubuntu1+autobyteus1 arm64')==2
 for p in r['retainedManifest']['architectures']['arm64']['packages']:assert p['sha256'] in q['stdout']
 # Registry exists only inside owned guest, published ONLY on guest loopback. This is not a release/upload to an external registry.
 case('existing own loopback registry ready',lambda:g('sudo -n docker start ab-nfs-api008-registry; sudo -n docker inspect ab-nfs-api008-registry; curl -fsS http://127.0.0.1:5000/v2/'))
 q=case('retain image under actual local-registry immutable digest',lambda:g('set -e; sudo -n docker tag ab-nfs-api008:engine 127.0.0.1:5000/ab-nfs-api008:engine; sudo -n docker push 127.0.0.1:5000/ab-nfs-api008:engine; sudo -n docker image inspect 127.0.0.1:5000/ab-nfs-api008:engine --format "{{json .RepoDigests}}"',timeout=300))
 digests=json.loads(q['stdout'].splitlines()[-1]);r['engineImage']=next(x for x in digests if x.startswith('127.0.0.1:5000/ab-nfs-api008@sha256:'));r['imageIdentity']=g('sudo -n docker image inspect ab-nfs-api008:engine registry:2 --format "{{.Id}} {{json .RepoDigests}}"');r['result']='Ready';save();event('Docker storage image ready, test-only loopback digest recorded; no public create yet')
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save();event('Setup incomplete '+repr(x))
print(json.dumps({'result':r['result'],'engineImage':r.get('engineImage'),'fatal':r.get('fatal')}),flush=True)
