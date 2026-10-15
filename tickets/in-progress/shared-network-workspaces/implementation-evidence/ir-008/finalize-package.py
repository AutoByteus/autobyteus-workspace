"""Persist the completed IR008 cumulative package without changing upstream verdicts."""
from pathlib import Path
import json,subprocess as sp,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
rule={'when':'When implementation is complete and the carried classification is task_size=Large or architectural_risk=High, implementation-scoped validation is complete, and the cumulative implementation package is ready for independent source review.','recipient_address':'/software_engineering_team/code_reviewer'}
(E/'routing.json').write_text(json.dumps({'round':'IR-008','result':'Implementation Complete','task_size':'Large','architectural_risk':'High','rulesRead':'fresh get_handoff_rules 2026-10-15 after implementation/local validation/handoff','selectedRule':rule,'reason':'Architecture-reviewed SR022 implementation complete, Large/High retained. Not a code/delivery Local Fix request. Low-risk rules do not apply. No Design Impact.','dispatch':'existing role only; one primary handoff; no spawning or direct API dispatch'},indent=2)+'\n')
a=json.loads((E/'source-audit.json').read_text());checks=json.loads((E/'checks-result.json').read_text())
assert all(x['rc']==x['expected'] for x in checks) and len(checks)==18
assert json.loads((E/'cleanup.json').read_text())['absent']
p=sp.run(['git','show','--format=','--check',a['sourceCommit']],capture_output=True,text=True)
assert p.returncode==0,p.stdout+p.stderr
final={'round':'IR-008','sourceCommit':a['sourceCommit'],'sourceWhitespaceRC':p.returncode,'localCommandsExpected':len(checks),'goPackages':7,'goTopLevelPass':56,'goFirstLevelSubcasePass':140,'mutationControls':7,'currentCanonicalHandoff':str(T/'implementation-handoff.md'),'currentRevisionRecord':str(T/'implementation-revision-record.md'),'upstreamVerdictsUnchanged':True,'codeReviewRequired':True,'apiFreshnessNotExecuted':True,'cleanupVerified':True}
(E/'final-checks.json').write_text(json.dumps(final,indent=2)+'\n')
incoming=json.loads((T/'architecture-review-evidence/arch-rev-006/package-index.json').read_text())['reference_files']
refs=set(incoming);refs.update(str(R/x['path']) for x in a['delta']);refs.update(str(p) for p in E.rglob('*') if p.is_file())
refs.update([str(T/'implementation-handoff.md'),str(T/'implementation-revision-record.md'),str(E/'package-index.json')])
index={'round':'IR-008','result':'Implementation Complete; source review required','sourceCommit':a['sourceCommit'],'requirements':'Approved SR018','design':'Ready SR022 / ARCH006 Pass','task_size':'Large','architectural_risk':'High','incomingReferenceCount':len(incoming),'referenceCount':len(refs),'entryPoint':str(T/'implementation-handoff.md'),'reference_files':sorted(refs)}
(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n')
assert set(incoming)<=refs and all(Path(p).is_file() for p in refs)
print(json.dumps({'references':len(refs),'source':a['sourceCommit'],'incomingRetained':len(incoming),'selectedRecipient':rule['recipient_address']}))
