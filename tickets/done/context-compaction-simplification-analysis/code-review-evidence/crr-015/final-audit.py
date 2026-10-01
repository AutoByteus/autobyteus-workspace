from pathlib import Path
import os,json,subprocess,hashlib
r=Path.cwd();t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'code-review-evidence/crr-015';entry=json.loads((e/'entry-audit.json').read_text());pins={**entry['pins'],**json.loads((e/'reviewed-source-pins.json').read_text())}
changed=[];missing=[]
for name,sha in pins.items():
 p=Path(name)
 if not p.is_file():missing.append(name)
 elif hashlib.sha256(p.read_bytes()).hexdigest()!=sha:changed.append(name)
allowed=[str(t/'code-review-report.md'),str(t/'code-review-revision-record.md')];unexpected=[p for p in changed if p not in allowed]
env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'}
def git(*a):return subprocess.check_output(['git',*a],env=env)
checks={}
for n,args in {'index':['ls-files','-s'],'head':['rev-parse','HEAD'],'merge-head':['rev-parse','MERGE_HEAD'],'unmerged':['ls-files','-u'],'stash':['stash','list']}.items():
 current=git(*args);checks[n]=current==(e/('entry-'+n+'.txt')).read_bytes()
raw=hashlib.sha256(Path(entry['rawIndexPath']).read_bytes()).hexdigest()
result={'pinned':len(pins),'incomingPins':len(entry['pins']),'changed':changed,'missing':missing,'unexpected':unexpected,'gitEntryEqual':checks,'rawIndexEntrySha256':entry['rawIndexSha256'],'rawIndexFinalSha256':raw,'rawIndexEqual':raw==entry['rawIndexSha256'],'scope':'No source/test/API edits; reviewer authorities only. Vitest may update ignored runner cache.'}
(e/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));assert not missing and not unexpected and all(checks.values())
refs=set(json.loads((t/'api-e2e-evidence/api-rev-009/reference-index.json').read_text())['paths']);refs.update(pins);refs.update(str(f) for f in e.rglob('*') if f.is_file());receipt=t/'api-e2e-evidence/api-rev-009/handoff-receipt.json'
if receipt.is_file():refs.add(str(receipt))
refs.update([str(e/'reference-index.json'),str(e/'reference-check.json')]);refs=sorted(refs)
(e/'reference-index.json').write_text(json.dumps({'paths':refs},indent=2)+'\n');(e/'reference-check.json').write_text(json.dumps({'count':len(refs),'missing':[p for p in refs if not Path(p).is_file() and p!=str(e/'reference-check.json')]},indent=2)+'\n');print('refs',len(refs))
