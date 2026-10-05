from pathlib import Path
import json,datetime
E=Path(__file__).resolve().parent;T=E.parent;W=E.parents[3]
refs=json.loads((E/'api-013-reference-files.json').read_text());refs=sorted(set(refs)|{str(p.resolve()) for p in E.rglob('*') if p.is_file() and (p.name.startswith(('api-014','round14')) or 'api-014-' in str(p.relative_to(E)))})
assert all(Path(p).is_file() for p in refs);c=json.loads((E/'api-014-coverage-inventory.json').read_text());assert all(str(W/p) in refs for p in c['retainedCumulativePaths'])
(E/'api-014-reference-files.json').write_text(json.dumps(refs,indent=2)+'\n');(E/'api-014-reference-verification.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'count':len(refs),'missing':[],'all20CumulativeDurablesIncluded':True,'all3136IncomingPresent':all(x in refs for x in json.loads((E/'api-013-reference-files.json').read_text()))},indent=2)+'\n');print(len(refs))
