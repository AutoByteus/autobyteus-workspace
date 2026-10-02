import json,hashlib,subprocess
from pathlib import Path
from datetime import datetime,timezone
E=Path(__file__).resolve().parent;T=E.parent.parent;W=T.parent.parent.parent
entry=json.loads((E/'entry-audit.json').read_text())
def h(p):
 p=W/p
 return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
changed=[{'path':p,'before':s,'now':h(p)} for p,s in entry['pending'].items() if h(p)!=s]
api=[{'path':p,'unchanged':h(p)==s,'sha256':h(p)} for p,s in entry['api'].items()]
inv=[{'round':x['round'],'path':x['path'],'unchanged':h(x['path'])==x['actual'],'sha256':h(x['path'])} for x in entry['inventories']]
auth=[{'path':p,'before':s,'now':h(str(T.relative_to(W)/p))} for p,s in entry['authority'].items() if h(str(T.relative_to(W)/p))!=s]
report={'at':datetime.now(timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=W,text=True).strip(),'entryPending':len(entry['pending']),'changedEntryPending':changed,'unchangedEntryPending':len(entry['pending'])-len(changed),'api':api,'apiMismatches':[x for x in api if not x['unchanged']],'implementation':inv,'implementationMismatches':[x for x in inv if not x['unchanged']],'authorityChanges':auth,'authorityChangeReason':'Concurrent Solution Designer SR032 proposal; not API-owned edits. Approved baseline retained; affected added requirement/design not approved.'}
(E/'checkpoint-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['api','implementation']},indent=2))
assert not report['apiMismatches'] and not report['implementationMismatches']
