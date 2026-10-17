from pathlib import Path
import json,subprocess as s,shutil,time
E=Path(__file__).resolve().parent;d=json.loads((E/'resource.json').read_text());N=d['clone'];assert N=='ab-nfs-sr023-8fd5ad2f';r={'result':'Running','scope':'Only own SR023 disposable VM and scratch; no product installed','commands':[]}
def save():(E/'cleanup.json').write_text(json.dumps(r,indent=2)+'\n')
def run(a):
 p=s.run(a,env=d['env'],capture_output=True,text=True,timeout=60);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save();return q
before=run([d['tart'],'list','--format','json']);assert before['rc']==0 and N in before['stdout']
pid=run(['/bin/ps','-p',str(d['vmPid']),'-o','args=']);assert N in pid['stdout']
# Last experiment detached both own disk-image mounts; explicitly verify absence before stopping.
q=run([d['tart'],'exec',N,'/sbin/mount']);assert q['rc']==0 and '/Volumes/'+N+'-volume' not in q['stdout']
assert run([d['tart'],'stop',N])['rc']==0
time.sleep(2)
assert run([d['tart'],'delete',N])['rc']==0
after=run([d['tart'],'list','--format','json']);assert after['rc']==0 and N not in after['stdout']
assert d['image'] in [v['Name'] for v in json.loads(after['stdout'])],'public baseline cache unexpectedly absent'
q=run(['/bin/ps','-p',str(d['vmPid']),'-o','args=']);assert N not in q['stdout']
p=Path(d['scratch']);assert str(p)=='/private/tmp/nfs-sr023-gc5go40z' and p.is_dir();shutil.rmtree(p);assert not p.exists()
r.update(result='Complete',ownCloneAbsent=True,ownProcessAbsent=True,ownScratchAbsent=True,publicBaselineRetained=True,productResourcesCreated=False);save();print(r['result'])
