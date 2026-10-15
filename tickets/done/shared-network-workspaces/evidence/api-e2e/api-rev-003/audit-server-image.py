"""Read-only image-content comparison using one never-started test-owned container."""
from pathlib import Path
import json,subprocess as sp,hashlib,time
R=Path.cwd();E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip());name='ab-nfs-api003-image-audit';image='sha256:a8c1d37d142a8bcd1ff28287fcc742d1d4c9e99b91f05be3adb3a9cff7b25bbc';r={'name':name,'image':image,'commands':[],'result':'Inspecting'}
def save():(E/'server-image-audit.json').write_text(json.dumps(r,indent=2)+'\n')
def c(a):
 p=sp.run(a,capture_output=True,text=True,timeout=120);q={'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr};r['commands'].append(q);save();assert p.returncode==0,q;return q
save();created=False
try:
 c(['docker','create','--name',name,'--network','none',image]);created=True
 d=S/'image-server-dist';c(['docker','cp',name+':/app/autobyteus-server-ts/dist',str(d)])
 def hashes(root):return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
 a=hashes(d);b=hashes(R/'autobyteus-server-ts/dist');delta=[x for x in sorted(set(a)|set(b)) if a.get(x)!=b.get(x)];r.update(imageFiles=len(a),worktreeFiles=len(b),distDelta=delta,imageHashes=a,worktreeHashes=b,result='Compared');save()
finally:
 if created:r['cleanup']=c(['docker','rm','-v',name]);save()
print(json.dumps({'result':r['result'],'imageFiles':r.get('imageFiles'),'worktreeFiles':r.get('worktreeFiles'),'diffCount':len(r.get('distDelta',[])),'firstDeltas':r.get('distDelta',[])[:15]}))
