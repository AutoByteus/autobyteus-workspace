from pathlib import Path
import json, hashlib, subprocess, os
R=Path(__file__).resolve().parents[5]
T=R/'tickets/in-progress/context-compaction-simplification-analysis'
E=T/'code-review-evidence/crr-020'
assert E == Path(__file__).resolve().parent
os.environ['GIT_OPTIONAL_LOCKS']='0'
def h(p):
 s=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):s.update(b)
 return s.hexdigest()
def dump(n,d): (E/n).write_text(json.dumps(d,indent=2)+'\n')
def git(*a):return subprocess.check_output(['git',*a],cwd=R,text=True)
pins=json.loads((E/'entry-pins.json').read_text())
allowed={str(T/'api-e2e-test-review-report.md'),str(T/'code-review-revision-record.md')}
changed=[];missing=[]
for p,sha in pins.items():
 if not Path(p).is_file():missing.append(p)
 elif h(p)!=sha:changed.append(p)
before=json.loads((E/'entry-git.json').read_text())
idx=Path(git('rev-parse','--git-path','index').strip());idx=idx if idx.is_absolute() else R/idx
logical=git('ls-files','--stage')
after={'head':git('rev-parse','HEAD').strip(),'merge_head':git('rev-parse','MERGE_HEAD').strip(),'index_sha256':h(idx),'logical_index_sha256':hashlib.sha256(logical.encode()).hexdigest(),'stash':git('stash','list'),'staged_count':len(git('diff','--cached','--name-only').splitlines()),'unmerged_count':len(git('ls-files','--unmerged').splitlines())}
(E/'final-index.txt').write_text(logical)
(E/'final-status.txt').write_text(git('status','--porcelain=v1','--untracked-files=all'))
durable=json.loads((E/'durable-hash-audit.json').read_text())
r={'pins_checked':len(pins),'unchanged':len(pins)-len(changed)-len(missing),'changed':changed,'missing':missing,'unexpected_changes':[p for p in changed if p not in allowed],'git_equal':after==before,'git':after,'API15_unchanged':all(h(a['path'])==a['sha256'] for a in durable),'source_report_unchanged':h(T/'code-review-report.md')==pins[str(T/'code-review-report.md')],'guard_unchanged':h(R/'autobyteus-web/scripts/guard-web-boundary.mjs')==pins[str(R/'autobyteus-web/scripts/guard-web-boundary.mjs')],'scope':'enumerated entry pins, before handoff only; no downstream freeze claim'}
dump('final-audit.json',r)
c=subprocess.run(['git','diff','--check','--','tickets/in-progress/context-compaction-simplification-analysis/api-e2e-test-review-report.md','tickets/in-progress/context-compaction-simplification-analysis/code-review-revision-record.md'],cwd=R,text=True,capture_output=True)
(E/'owned-diff-check.log').write_text(c.stdout+c.stderr);(E/'owned-diff-check.exit').write_text(str(c.returncode)+'\n')
assert not missing and not r['unexpected_changes'] and r['git_equal'] and r['source_report_unchanged'] and r['API15_unchanged'] and r['guard_unchanged'] and c.returncode==0,r
refs=json.loads((T/'api-e2e-evidence/api-rev-012/reference-index.json').read_text())['paths']
allrefs=sorted(set(refs)|{str(p) for p in E.rglob('*') if p.is_file()}|{str(E/'reference-index.json'),str(E/'reference-check.json'),str(E/'handoff-reference-files.json')})
dump('reference-index.json',{'revision':'CRR-020','paths':allrefs,'note':'Complete cumulative navigation; not a reread-all claim. Direct current canonical authorities override archived versions.'})
bounded=json.loads((T/'api-e2e-evidence/api-rev-012/handoff-reference-files.json').read_text())
bounded=sorted(set(bounded)|{str(p) for p in E.rglob('*') if p.is_file()}|{str(E/'handoff-reference-files.json')}|{str(T/n) for n in ['delivery-revision-record.md','delivery-handoff.md','release-deployment-report.md','release-notes.md'] if (T/n).is_file()}|{str(T/'api-e2e-evidence/api-rev-011'/n) for n in ['analyze-stop.initial.py','isolated-start.exit']}|{str(R/'autobyteus-server-ts/tests/unit/agent-execution/recovery-native-fixture.ts')})
dump('handoff-reference-files.json',bounded)
if not (E/'reference-check.json').exists(): dump('reference-check.json',{})
absent=[p for p in allrefs+bounded if not Path(p).is_file()]
dump('reference-check.json',{'cumulative_count':len(allrefs),'bounded_attachment_count':len(bounded),'missing':absent,'archives':'Unmodified complete API010 archive plus API012 resume archive; hashes in archive-hash-check.json; direct current authorities and all API15 attached.'})
assert not absent,absent
print(json.dumps({k:v for k,v in r.items() if k!='git'},indent=2));print('references',len(allrefs),'attachments',len(bounded))
