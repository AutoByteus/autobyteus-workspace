from pathlib import Path
import json,hashlib,tarfile
E=Path(__file__).resolve().parent;T=E.parents[1];W=E.parents[4];P=E.parent/'api-rev-011'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
old=E.parent/'api-rev-010/cumulative-package.tar.gz'
assert sha(old)=='39306b3acfc958cf811c7ef17a52d24b61a72f11373d1be1be94f6cd54510ab5'
base=json.loads((T/'code-review-evidence/crr-019/handoff-reference-files.json').read_text())
refs=set(json.loads((P/'reference-index.json').read_text())['paths'])
refs.update(str(p) for p in P.rglob('*') if p.is_file())
refs.update(base)
refs.update(str(p) for p in E.rglob('*') if p.is_file())
refs=sorted(refs)
missing=[n for n in refs if not Path(n).is_file()];assert not missing,missing
(E/'reference-index.json').write_text(json.dumps({'revision':'API-REV-012','paths':refs,'count':len(refs),'scope':'Complete cumulative navigable index, not reread-all or unique-test-count claim; current authorities override archived older snapshots.'},indent=2)+'\n')
(E/'reference-check.json').write_text(json.dumps({'count':len(refs),'missing':missing},indent=2)+'\n')
items=[p for p in P.rglob('*') if p.is_file()]+[p for p in E.rglob('*') if p.is_file() and p.name not in ['resume-evidence.tar.gz','resume-archive.json','handoff-reference-files.json']]
manifest=[{'path':str(p),'sha256':sha(p),'size':p.stat().st_size} for p in items]
(E/'resume-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
items.append(E/'resume-manifest.json')
archive=E/'resume-evidence.tar.gz'
with tarfile.open(archive,'w:gz') as tar:
 for p in items:tar.add(p,arcname=str(p.relative_to(W)),recursive=False)
(E/'resume-archive.json').write_text(json.dumps({'path':str(archive),'sha256':sha(archive),'size':archive.stat().st_size,'files':len(items),'immutablePriorArchive':{'path':str(old),'sha256':sha(old),'size':old.stat().st_size},'chain':'Prior API010 full cumulative snapshot + direct IR012/CRR019 current package + this API011/012 resumed evidence; canonical current reports direct. Later receipt is outside pre-send archive.'},indent=2)+'\n')
selected=set(base)
selected.update(str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md'])
selected.update(x['path'] for x in json.loads((E/'protected-api15-check.json').read_text()))
selected.update(str(P/n) for n in ['reload-result.json','recovery-result.json','stop-result.json','analyze-reload.py','analyze-recovery.py','analyze-stop.py','stop-probe-correction.md','resume-cleanup.json','build-basis.json','packaged-native-writer-check.json','isolated-start.json','build-command.json','workspace-native.log','web-boundary.log','regression-reuse.json'])
selected.update(str(p) for p in E.iterdir() if p.is_file() and p.name not in ['handoff-reference-files.json'])
selected.add(str(old))
selected=sorted(selected);assert all(Path(n).is_file() for n in selected)
(E/'handoff-reference-files.json').write_text(json.dumps(selected,indent=2)+'\n')
print(json.dumps({'indexed':len(refs),'directAttachments':len(selected),'archiveSize':archive.stat().st_size,'archiveSha':sha(archive)},indent=2))
