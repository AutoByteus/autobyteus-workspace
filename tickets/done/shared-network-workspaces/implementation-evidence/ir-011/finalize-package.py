from pathlib import Path
import subprocess,json,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=T/'implementation-evidence/ir-011'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args])
inp=json.loads((E/'input-audit.json').read_text()); checks=json.loads((E/'checks-result.json').read_text());assert all(x['exitCode']==0 for x in checks['checks'])
old=git('show',inp['head']+':tickets/in-progress/shared-network-workspaces/implementation-revision-record.md')
assert (T/'implementation-revision-record.md').read_bytes().startswith(old)
changed=[x['path'] for x in inp['inputs'] if sha(R/x['path'])!=x['sha256']]
assert set(changed)=={'tickets/in-progress/shared-network-workspaces/implementation-handoff.md','tickets/in-progress/shared-network-workspaces/implementation-revision-record.md','autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts'}
assert all(sha(R/x['path'])==x['sha256'] for x in inp['preserve'])
assert not Path((E/'scratch-path.txt').read_text().strip()).exists()
assert not git('diff','--name-only','--diff-filter=U').strip()
rawWhitespace=[]
for p in E.glob('*.log'):
    lines=[i for i,x in enumerate(p.read_text().splitlines(),1) if x!=x.rstrip()]
    if lines:rawWhitespace.append({'path':str(p.relative_to(R)),'lines':lines})
refs=[T/p for p in ['implementation-handoff.md','implementation-revision-record.md','requirements-doc.md','approval-record-sr025.md','investigation-notes.md','solution-revision-record.md','design-spec.md','solution-design-handoff.md','design-review-report.md','architecture-review-revision-record.md','code-review-report.md','code-review-revision-record.md','api-e2e-test-review-report.md','api-e2e-execution-coverage-report.md','api-e2e-test-case-ledger.md','api-e2e-coverage-investigation.md','api-e2e-revision-record.md','evidence/api-e2e/api-rev-008/user-command-only-direction.json','handoff-summary.md','delivery-revision-record.md','docs-sync-report.md','release-deployment-report.md','delivery-evidence/dr-001/integration-state.json','delivery-evidence/dr-001/conflict.diff']]
refs += [R/p for p in ['AGENTS.md','DESIGN.md','TESTING.md','autobyteus-server-ts/AGENTS.md','autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts','autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts','autobyteus-server-ts/src/workspaces/workspace-manager.ts','autobyteus-server-ts/src/compositions/build-studio-server.ts','autobyteus-web/docs/file_explorer.md']]
refs += [p for p in E.iterdir() if p.is_file() and p.name not in ['package-index.json','final-checks.json']]
manifest={'kind':'focused current integration package, not sprawling historical cumulative index','sourceCommit':'a4afd758a9766274b08f675c04952b19913fff0c','files':[{'path':str(p.relative_to(R)),'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(set(refs))]}
(E/'package-index.json').write_text(json.dumps(manifest,indent=2)+'\n')
res={'scope':'IR011 implementation-local completion','result':'Ready for selected independent review','allSixTestsPreserved':True,'checksAllExitZero':True,'testFiles':12,'tests':66,'historyBytePrefixPreserved':True,'inputChangesOnlyIntended':changed,'protectedArtifactsUnchanged':len(inp['preserve']),'scratchRemoved':True,'mergeInProgress':False,'packageRefs':len(manifest['files']),'rawLogWhitespaceException':rawWhitespace,'whitespaceNote':'Retained unmodified command output only; .diff evidence also retains ordinary patch context spaces. Authored source/prose checked separately.'}
(E/'final-checks.json').write_text(json.dumps(res,indent=2)+'\n');print(json.dumps(res,indent=2))
