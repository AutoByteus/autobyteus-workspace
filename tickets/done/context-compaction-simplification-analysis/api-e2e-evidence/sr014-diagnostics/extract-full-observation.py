from pathlib import Path
import json,hashlib
p=Path(__file__).parent
lines=(p/'full.log').read_text().splitlines()
start=next(i for i,l in enumerate(lines) if l.startswith('{"event":"managed_compaction_all_exit"'))
# Vitest inserted headings/progress between chunks of one large process.stdout.write.
# Retain raw file; remove only known reporter suffixes from the five identified fragments.
fragments=[];selected=[]
for i in [start,start+14,start+32,start+34,start+40]:
 line=lines[i]
 for marker in ['stdout | tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts',' ✓ tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts']:
  if marker in line:line=line[:line.index(marker)]
 fragments.append(line);selected.append({'line1Based':i+1,'keptCharacters':len(line),'sha256':hashlib.sha256(line.encode()).hexdigest()})
joined=''.join(fragments);observed=json.loads(joined)
assert observed['event']=='managed_compaction_all_exit' and observed['stage']=='passed'
assert len(observed['parentRequests'])==8 and len(observed['summaryRequests'])==1
assert len(observed['parentResponses'])==8 and len(observed['summaryResponses'])==1
(p/'full-all-exit-reconstructed.json').write_text(json.dumps(observed,indent=2)+'\n')
(p/'full-all-exit-reconstruction.json').write_text(json.dumps({'method':'Exact reporter-fragment concatenation; raw full.log preserved. Not a pristine JSON stdout record.','sourceSha256':hashlib.sha256((p/'full.log').read_bytes()).hexdigest(),'fragments':selected,'concatenatedSha256':hashlib.sha256(joined.encode()).hexdigest(),'parentRequests':8,'parentResponses':8,'summaryRequests':1,'summaryResponses':1,'eventCount':len(observed['events'])},indent=2)+'\n')
