from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-files-runner-result.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text())
prior=json.loads((E/(MODE+'-both-create-result.json')).read_text());assert prior['result']=='Pass'
target='/home/admin/api007-filesystem-cases.py';raw=(E/'guest-filesystem-cases.py').read_bytes()
cmd(['exec','-i',V,'sh','-c','cat > '+target],data=raw)
args=[tart,'exec',V,'env','-i','HOME=/home/admin','PATH=/usr/bin:/bin:/usr/sbin:/sbin','python3',target,MODE,SRC,prior['connection']['storageId']]
r['argv']=args;save()
with (E/(MODE+'-files-stream.log')).open('w') as log:
 p=sp.Popen(args,env=env,stdout=sp.PIPE,stderr=sp.STDOUT,text=True)
 for line in p.stdout:
  log.write(line);log.flush()
  try:d=json.loads(line)
  except ValueError:continue
  if 'case' in d:event(MODE+' '+d['case']['id']+' '+d['case']['status']+'; '+MODE+'-files-result.json / streamed evidence')
 p.wait();r['rc']=p.returncode
z=g('cat /home/admin/api007-files-'+MODE+'.json');(E/(MODE+'-files-result.json')).write_text(z['stdout']);r['result']=json.loads(z['stdout'])['result'];save()
assert p.returncode==0 and r['result']=='Pass'
