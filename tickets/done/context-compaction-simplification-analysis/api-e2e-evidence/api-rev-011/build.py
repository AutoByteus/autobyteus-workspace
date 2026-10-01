from pathlib import Path
import subprocess,datetime,tempfile,json,hashlib,os
E=Path(__file__).resolve().parent;W=E.parents[4];T=E.parents[1]
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
paths=json.loads((E.parent/'api-rev-010/build-backup.json').read_text())['paths']
root=Path(tempfile.mkdtemp(prefix='autobyteus-api011-build-backup-'));archive=root/'prebuild-outputs.tar'
with (E/'backup.log').open('x') as f:
 r=subprocess.run(['tar','-cf',str(archive),*paths],cwd=W,stdout=f,stderr=subprocess.STDOUT)
assert r.returncode==0
(E/'build-backup.json').write_text(json.dumps({'archive':str(archive),'paths':paths,'sha256':sha(archive),'size':archive.stat().st_size,'time':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2))
cmd=['pnpm','--silent','isolated-app','start','--build'];start=datetime.datetime.now(datetime.timezone.utc).isoformat()
(E/'build-command.json').write_text(json.dumps({'command':cmd,'cwd':str(W),'started':start},indent=2))
with (E/'isolated-start.json').open('x') as out,(E/'isolated-start.stderr').open('x') as err:
 r=subprocess.run(cmd,cwd=W,stdout=out,stderr=err,env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
(E/'isolated-start.exit').write_text(str(r.returncode)+'\n')
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\nAPI011 I11-03 documented full build/start completed exit'+str(r.returncode)+'. Exclusive isolated-start.{json,stderr,exit}; inspect outcome before continuing.\n')
print(r.returncode,(E/'isolated-start.json').read_text())
