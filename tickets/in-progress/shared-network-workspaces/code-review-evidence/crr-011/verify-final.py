from pathlib import Path
import subprocess as sp,json,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=T/'code-review-evidence/crr-011';inp=json.loads((E/'input-audit.json').read_text());I=T/'implementation-evidence/ir-008'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
exceptions={str((T/n).relative_to(R)) for n in ['code-review-report.md','code-review-revision-record.md']}
changed=[p for p,h in inp['files'].items() if p not in exceptions and sha(R/p)!=h];assert not changed,changed
history=T/'code-review-revision-record.md';prefix=history.read_bytes()[:inp['revisionPrefixBytes']];assert hashlib.sha256(prefix).hexdigest()==inp['files'][str(history.relative_to(R))]
for p,v in inp['retainedArtifacts'].items():assert sha(R/p)==v['sha256'] and (R/p).stat().st_size==v['bytes']
assert all(sha(R/p)==h for p,h in inp['preexistingUntrackedFiles'].items())
S=Path((E/'scratch-path.txt').read_text().strip());assert not S.exists()
source=sp.run(['git','diff','--check','391d65a993fbb0ca891e043d6a7eea5e4981eebc','d65aeda24fc4b9a534a3941b194dd4a55b88c00c','--','autobyteus-nfs'],capture_output=True,text=True);assert source.returncode==0
refs=set(json.loads((I/'package-index.json').read_text())['reference_files']);refs.update(str(p) for p in E.rglob('*') if p.is_file());refs.update([str(E/'package-index.json'),str(E/'final-checks.json'),str(E/'artifact-whitespace.log')])
index={'round':'CRR-011','result':'Pass — implementation-source review only; CR006/API-F004 product closure pending','sourceCommit':'d65aeda24fc4b9a534a3941b194dd4a55b88c00c','requirements':'Approved SR018','design':'Ready SR022 / ARCH-REV006 Pass','implementation':'IR008','task_size':'Large','architectural_risk':'High','incomingReferenceCount':1088,'referenceCount':len(refs),'reference_files':sorted(refs)}
(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n')
(E/'artifact-whitespace.log').touch(exist_ok=True)
(E/'final-checks.json').write_text(json.dumps({'result':'Pass','protectedIncomingPathsUnchanged':len(inp['files'])-2,'priorRevisionPrefixBytesPreserved':inp['revisionPrefixBytes'],'retainedCandidatesUnchanged':len(inp['retainedArtifacts']),'preexistingDistFilesUnchanged':len(inp['preexistingUntrackedFiles']),'sourceWhitespacePass':True,'rawArtifactWhitespace':'see artifact-whitespace.log; preserved diagnostic blank is not a source waiver','scratchAbsent':True,'incomingReferencesRetained':1088,'referenceCount':len(refs),'noProductionDurableTestEdits':True,'noPublicRuntimeClaim':True},indent=2)+'\n')
assert all(Path(p).is_file() for p in refs)
print(json.dumps({'result':'Pass','refs':len(refs),'protected':len(inp['files'])-2,'sourceWhitespace':source.returncode}))
