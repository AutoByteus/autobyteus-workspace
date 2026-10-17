from pathlib import Path
import json,tarfile,hashlib,subprocess as s,time
E=Path(__file__).resolve().parent;r=json.loads((E/'resource.json').read_text());scratch=Path(r['scratch']);dest=scratch/'go.tar.gz';h=hashlib.sha256(dest.read_bytes()).hexdigest();assert h=='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5'
with tarfile.open(dest) as t:
 for m in t.getmembers():
  assert (m.name == 'go' or m.name.startswith('go/')) and '..' not in Path(m.name).parts and (m.isfile() or m.isdir()),m.name
 t.extractall(scratch)
(E/'toolchain.json').write_text(json.dumps({'url':'https://go.dev/dl/go1.27.2.darwin-arm64.tar.gz','sha256':h,'bytes':dest.stat().st_size,'path':str(scratch/'go/bin/go')},indent=2)+'\n')
q=s.run([r['tart'],'exec',r['clone'],'/bin/sh','-c','id; /usr/bin/sw_vers; /usr/bin/uname -a; /usr/sbin/sysctl -n kern.boottime; /usr/sbin/diskutil info -plist /System/Volumes/Data'],env=r['env'],capture_output=True,text=True,timeout=30)
r['commands'].append({'argv':q.args,'rc':q.returncode,'stdout':q.stdout,'stderr':q.stderr});r['result']='Ready' if q.returncode==0 else 'Incomplete';r['prepareAttempt1Error']=r.pop('error');(E/'resource.json').write_text(json.dumps(r,indent=2)+'\n');print(r['result']);assert q.returncode==0
