"""Public create/reconnect regression, no manual engine installation or reader bypass.
Only test-owned disposable Ubuntu guest; retain until subsequent owned lifecycle checks.
"""
from pathlib import Path
import json,subprocess as sp,time,shlex,hashlib
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent;S=Path((E/'scratch-path.txt').read_text().strip());cfg=json.loads((E/'linux-resource.json').read_text());build=json.loads((E/'build-result.json').read_text());V=cfg['clone'];B='/home/admin/'+V+'-binary';SRC='/home/admin/'+V+'-source';ROOT='/Volumes/autobyteus-shared';tart='/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart';env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','HOME':str(S/'home'),'TART_HOME':cfg['privateTartHome'],'TART_NO_AUTO_PRUNE':'1'}
r={'vm':V,'source':SRC,'mountRoot':ROOT,'binary':build['binary'],'metadata':build['metadata'],'commands':[],'cases':[],'result':'Running'}
def save():(E/'linux-docker-prepare-result.json').write_text(json.dumps(r,indent=2)+'\n')
def event(s):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())+' **Round4 V03-Docker prepare** — '+s+'\n')
 print(s,flush=True)
def cmd(a,timeout=60,data=None,check=True):
 start=time.monotonic()
 try:p=sp.run([tart,*a],env=env,input=data,capture_output=True,timeout=timeout);q={'argv':[tart,*a],'rc':p.returncode,'seconds':round(time.monotonic()-start,3),'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
 except sp.TimeoutExpired as x:q={'argv':[tart,*a],'timeout':timeout,'stdout':(x.stdout or b'').decode(errors='replace'),'stderr':(x.stderr or b'').decode(errors='replace')};r['commands'].append(q);save();raise
 r['commands'].append(q);save()
 if check and q['rc']:raise RuntimeError(q['stderr'][-6000:]+q['stdout'][-2000:])
 return q
def g(code,**kw):return cmd(['exec',V,'/usr/bin/env','-i','HOME=/home/admin','PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','LANG=C','/bin/sh','-c',code],**kw)
def nongroups(code,**kw):return g('sudo -n /usr/bin/setpriv --reuid=1000 --regid=109 --clear-groups /usr/bin/env -i HOME=/home/admin PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin LANG=C /bin/sh -c '+shlex.quote(code),**kw)
def case(name,fn):
 event('Started '+name);start=time.monotonic();q={'name':name}
 try:q['evidence']=fn();q['status']='Pass'
 except BaseException as x:q['status']='Fail';q['error']=repr(x);raise
 finally:q['seconds']=round(time.monotonic()-start,3);r['cases'].append(q);save();event(name+': '+q['status'])
 return q['evidence']
def snapshot():
 code="""import os,json,hashlib,stat
from pathlib import Path
p=Path(SOURCE);s=p.stat()
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
r={'sourceIdentity':[s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode)],'sourceHash':h(p/'project/preexisting.txt'),'sourceMarker':json.loads((p/'.autobyteus-nfs/storage.json').read_text()),'mountedHash':h(Path(MOUNT)/'project/preexisting.txt'),'mountedMarker':json.loads((Path(MOUNT)/'.autobyteus-nfs/storage.json').read_text()),'directoryDelegations':Path('/sys/module/nfsv4/parameters/directory_delegations').read_text().strip(),'uid':os.getuid(),'gid':os.getgid(),'groups':os.getgroups()};print(json.dumps(r))
""".replace('SOURCE',repr(SRC)).replace('MOUNT',repr(ROOT))
 return nongroups('python3 -c '+shlex.quote(code))
import io,tarfile
try:
 case('test-owned Docker prerequisite in owned detached LinuxVM',lambda:g('set -e; ! findmnt -n -t nfs,nfs4 '+ROOT+'; sudo -n apt-get update -qq; sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker.io; sudo -n systemctl start docker; sudo -n docker version',timeout=600))
 candidate=R/'autobyteus-nfs/out/ir005-local-candidate/engine-candidate';stream=io.BytesIO()
 with tarfile.open(fileobj=stream,mode='w') as t:
  t.add(candidate,arcname='engine-candidate')
  for n in ['packaging/Dockerfile','THIRD_PARTY_NOTICES']:t.add(R/'autobyteus-nfs'/n,arcname='autobyteus-nfs/'+n)
 cmd(['exec','-i',V,'/bin/sh','-c','mkdir /home/admin/api004-engine-context; tar -xf - -C /home/admin/api004-engine-context'],data=stream.getvalue())
 base=json.loads((R/'autobyteus-nfs/packaging/release-lock.json').read_text())['ubuntuBaseImage'];r['base']=base;r['retainedManifest']=json.loads((candidate/'engine-manifest.json').read_text());save()
 case('build storage image from exact retained engine pair',lambda:g('cd /home/admin/api004-engine-context; sudo -n docker build --pull --build-arg UBUNTU_BASE='+shlex.quote(base)+' --build-arg TARGETARCH=arm64 -f autobyteus-nfs/packaging/Dockerfile -t ab-nfs-api004:engine .',timeout=900))
 q=case('clean image package and manifest verification',lambda:g("sudo -n docker run --rm --network none --entrypoint /bin/sh ab-nfs-api004:engine -ec 'dpkg-query -W -f=\"\${Package} \${Status} \${Version} \${Architecture}\\n\" nfs-ganesha nfs-ganesha-vfs; cat /usr/share/autobyteus-nfs/engine-manifest.json; test ! -e /tmp/autobyteus-engine; ! command -v gcc'"));assert q['stdout'].count('install ok installed 4.3-8ubuntu1+autobyteus1 arm64')==2
 for p in r['retainedManifest']['architectures']['arm64']['packages']:assert p['sha256'] in q['stdout']
 # Registry exists only inside owned guest, published ONLY on guest loopback. This is not a release/upload to an external registry.
 case('VM-loopback private test registry',lambda:g('sudo -n docker run -d --name ab-nfs-api004-registry -p 127.0.0.1:5000:5000 registry:2',timeout=300))
 q=case('retain image under actual local-registry immutable digest',lambda:g('set -e; sudo -n docker tag ab-nfs-api004:engine 127.0.0.1:5000/ab-nfs-api004:engine; sudo -n docker push 127.0.0.1:5000/ab-nfs-api004:engine; sudo -n docker image inspect 127.0.0.1:5000/ab-nfs-api004:engine --format "{{json .RepoDigests}}"',timeout=300))
 digests=json.loads(q['stdout'].splitlines()[-1]);r['engineImage']=next(x for x in digests if x.startswith('127.0.0.1:5000/ab-nfs-api004@sha256:'));r['imageIdentity']=g('sudo -n docker image inspect ab-nfs-api004:engine registry:2 --format "{{.Id}} {{json .RepoDigests}}"');r['result']='Ready';save();event('Docker storage image ready, test-only loopback digest recorded; no public create yet')
except BaseException as x:r['result']='Incomplete';r['fatal']=repr(x);save();event('Setup incomplete '+repr(x))
print(json.dumps({'result':r['result'],'engineImage':r.get('engineImage'),'fatal':r.get('fatal')}),flush=True)
