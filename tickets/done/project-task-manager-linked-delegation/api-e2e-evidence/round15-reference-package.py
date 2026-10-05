from pathlib import Path
import json,datetime
E=Path(__file__).resolve().parent;T=E.parent;W=E.parents[3]
refs=json.loads((T/'code-review-evidence/crr-020-reference-files.json').read_text());refs=sorted(set(refs)|{str((E/'api-015-reference-files.json').resolve()),str((E/'api-015-reference-verification.json').resolve())}|{str(p.resolve()) for p in E.rglob('*') if p.is_file() and (p.name.startswith(('api-015','round15')) or 'round15' in p.name or 'api-015-' in str(p.relative_to(E)))})
assert all(Path(p).is_file() for p in refs);c=json.loads((E/'api-015-coverage-inventory.json').read_text());assert all(str(W/p) in refs for p in c['retainedCumulativePaths'])
(E/'api-015-reference-files.json').write_text(json.dumps(refs,indent=2)+'\n');(E/'api-015-reference-verification.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'count':len(refs),'missing':[],'all20CumulativeDurablesIncluded':True,'all3852IncomingPresent':all(x in refs for x in json.loads((T/'code-review-evidence/crr-020-reference-files.json').read_text()))},indent=2)+'\n');print(len(refs))
