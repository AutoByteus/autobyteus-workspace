"""Finalize reviewer-owned artifacts without changing any upstream authority or product path."""
from pathlib import Path
import ast, hashlib, json, subprocess
E=Path(__file__).resolve().parent;T=E.parent.parent;R=T.parent.parent.parent
A=T/'evidence/api-e2e/api-rev-004';INPUT='b5167131bfb4e93fc2a8d8216e83ac791d207cc7'
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git',*a],cwd=R)
up=json.loads((A/'package-index.json').read_text())['reference_files']
refs=sorted(set(up+[str(p) for p in E.iterdir() if p.is_file()]+[str(E/'package-index.json'),str(E/'final-checks.json')]))
index={'round':'CRR-010','result':'Fail','classification':'Design Impact','finding':'CR006 / API-F004',
 'reviewEntry':'API/E2E Failure-Origin Review','taskSize':'Large','architecturalRisk':'High',
 'inputHead':INPUT,'sourceCommit':'d318bd9db935affdf16d141ef4e88a6c0e4939b5',
 'incomingReferenceCount':len(up),'referenceCount':len(refs),'reference_files':refs}
(E/'package-index.json').write_text(json.dumps(index,indent=2)+'\n')
original=git('show',INPUT+':tickets/in-progress/shared-network-workspaces/code-review-revision-record.md')
record=(T/'code-review-revision-record.md').read_bytes();assert record.startswith(original)
audit=json.loads((E/'input-audit.json').read_text());mismatches=[]
for f in audit['upstreamFiles']:
 if sha(Path(f['path']).read_bytes())!=f['sha256']:mismatches.append(f['path'])
assert not mismatches,mismatches
paths=git('diff','--name-only',INPUT).decode().splitlines()
allow=['tickets/in-progress/shared-network-workspaces/code-review-report.md','tickets/in-progress/shared-network-workspaces/code-review-revision-record.md']
assert all(p in allow or p.startswith('tickets/in-progress/shared-network-workspaces/code-review-evidence/crr-010/') for p in paths),paths
subprocess.run(['git','diff','--check',INPUT,'--',*allow,'tickets/in-progress/shared-network-workspaces/code-review-evidence/crr-010'],cwd=R,check=True)
errors=[]
for p in E.iterdir():
 if p.suffix=='.json' and p.name!='final-checks.json':
  try:json.loads(p.read_text())
  except Exception as ex:errors.append([str(p),repr(ex)])
 if p.suffix=='.py':ast.parse(p.read_text())
assert not errors,errors
result={'result':'Pass artifact integrity; canonical review remains Fail',
 'referenceCount':len(refs),'incomingReferencesPreserved':set(up)<=set(refs),'unchangedUpstreamHashCount':len(audit['upstreamFiles']),
 'upstreamMismatches':mismatches,'priorCRR001Through009PrefixPreserved':True,'priorPrefixBytes':len(original),'priorPrefixSHA256':sha(original),
 'reviewerOnlyTrackedChanges':paths,'authoredWhitespace':'Pass','jsonErrors':errors,'pythonSyntax':'Pass',
 'sourceOrDurableTestChange':False,'runtimeResourcesCreated':False,'reviewerCleanup':'N/A - no runtime resources created',
 'apiCleanup':'Inherited API004 Complete; not a new teardown',
 'generatedOutputLimit':'Five prior untracked dist trees retained/unstaged; no hash identity claim',
 'noLiveValidationClaim':True,'routing':json.loads((E/'routing.json').read_text())['selected']}
(E/'final-checks.json').write_text(json.dumps(result,indent=2)+'\n')
assert all(Path(p).is_file() for p in refs)
print(json.dumps({k:v for k,v in result.items() if k!='reviewerOnlyTrackedChanges'},indent=2))
