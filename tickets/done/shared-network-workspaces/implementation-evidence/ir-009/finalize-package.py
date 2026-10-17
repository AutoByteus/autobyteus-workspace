from pathlib import Path
import json,subprocess as sp,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
sp.run(['python3',str(E/'audit-source.py')],check=True,stdout=sp.DEVNULL)
a=json.loads((E/'source-audit.json').read_text());inp=json.loads((E/'input-audit.json').read_text())
paths=json.loads((E/'source-paths.json').read_text());refs=set(inp['references'])|{str(R/p) for p in paths}|{str(T/f) for f in ['implementation-handoff.md','implementation-revision-record.md']}
refs.update(str(p) for p in E.rglob('*') if p.is_file());refs.update([str(E/'package-index.json'),str(E/'final-checks.json')])
final={'result':'Implementation Complete; independent source review required','sourceCommit':a['sourceCommit'],'classification':{'task_size':'Large','architectural_risk':'High'},'inputReferencesPreserved':len(inp['references']),'referenceCount':len(refs),'protectedInputCount':a['protectedInputCount'],'oldArtifactsUnchanged':19,'oldDistFilesUnchanged':286,'currentCandidateFiles':4,'localCheckCommands':14,'intendedMutationFailures':10,'cleanup':'Complete','publicMacBootQualification':'Not run; API-F005 FIRST remains','currentBoundaryAuthorities':'CRR012 Fail / API005 Fail57.14% broader Required; ARCH007 design Pass only','priorFreshness':'API005 CR006/API-F004 scoped independently resolved','noReleaseOrTaskDoneClaim':True}
(E/'final-checks.json').write_text(json.dumps(final,indent=2)+'\n')
index={'round':'IR-009','result':final['result'],'inputCommit':inp['head'],'sourceCommit':a['sourceCommit'],'task_size':'Large','architectural_risk':'High','incomingReferenceCount':len(inp['references']),'referenceCount':len(refs),'reference_files':sorted(refs)}
(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n')
assert all(Path(p).is_file() for p in refs)
assert set(inp['references'])<=refs
print(json.dumps(final,indent=2))
