from pathlib import Path
import json, hashlib, subprocess, difflib, re, collections
W=Path(__file__).resolve().parents[4];T=W/'tickets/in-progress/project-task-manager-linked-delegation';E=T/'implementation-evidence'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def run(*args): return subprocess.run(args,cwd=W,text=True,capture_output=True)
def write(n,value): (E/n).write_text(json.dumps(value,indent=2)+'\n')
status=run('git','status','--porcelain=v1','--untracked-files=all').stdout
(E/'ir-008-final-git-status.txt').write_text(status)
paths=sorted(set(run('git','ls-files','-m','-o','--exclude-standard','-z').stdout.split('\0'))- {''});paths=[p for p in paths if not p.startswith('tickets/')]
assert not (W/'autobyteus-web/pages/ir008-org-history-preview.vue').exists()
base=json.loads((E/'ir-008-input-package-fingerprints.json').read_text()); fingerprints={p:sha(W/p) for p in paths}
assert all(fingerprints.values()); modified=[p for p,h in base.items() if sha(W/p)!=h]; assert not modified,modified
source='autobyteus-server-ts/src/run-history/services/collaboration-root-history-service.ts'
spec='autobyteus-web/stores/__tests__/runHistoryStore.spec.ts'
newTest='autobyteus-server-ts/tests/unit/run-history/services/collaboration-root-history-public-projection.test.ts'
fixtures=['autobyteus-web/test-support/fixtures/linked-org-history-public.json','autobyteus-web/test-support/fixtures/linked-org-history-public.provenance.json']
expected={source,spec,newTest,*fixtures};newDirty=set(paths)-set(base);assert newDirty==expected,newDirty
write('ir-008-package-fingerprints.json',fingerprints)
# Preserve earlier classification counts and also disclose a semantic test/fixture count.
oldCategory=lambda p:'tests/fixtures' if '/tests/' in p else ('source/template' if '/src/' in p else 'other')
category=lambda p:'tests/fixtures' if any(s in p for s in ['/tests/','/__tests__/','/test-support/']) else ('source/template' if '/src/' in p else 'other')
rows=[]
for p in paths:
 if category(p)!='source/template':continue
 text=(W/p).read_text();raw=sum(bool(l.strip()) for l in text.splitlines());effective=sum(bool(l.strip()) for l in re.sub(r'/\*[\s\S]*?\*/|//[^\n]*','',text).splitlines());rows.append({'path':p,'rawNonEmpty':raw,'effectiveNonEmptyApprox':effective})
assert all(r['rawNonEmpty']<=500 for r in rows)
before=(E/'ir-008-baseline-source'/Path(source).name).read_text();after=(W/source).read_text()
d=list(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+source,tofile='b/'+source));added=sum(x.startswith('+') and not x.startswith('+++') for x in d);removed=sum(x.startswith('-') and not x.startswith('---') for x in d);assert added+removed<=220
patch=''.join(d)+run('git','diff','HEAD','--',spec).stdout
for p in [newTest,*fixtures]:patch+=''.join(difflib.unified_diff([], (W/p).read_text().splitlines(True),fromfile='/dev/null',tofile='b/'+p))
(E/'ir-008-local-delta.diff').write_text(patch)
write('ir-008-size-audit.json',{'method':'Raw nonempty conservative guard; approximate comment removal. Tests/JSON fixtures excluded. Source delta against archived incoming source.','maximumRaw':max(rows,key=lambda r:r['rawNonEmpty']),'maximumEffectiveApprox':max(rows,key=lambda r:r['effectiveNonEmptyApprox']),'localSource':{'path':source,'added':added,'removed':removed,'changedLines':added+removed},'cumulative':rows})
inputs=json.loads((E/'ir-008-input-fingerprints.json').read_text());changed=[p for p,h in inputs.items() if sha(Path(p))!=h];missing=[p for p in inputs if not Path(p).is_file()]
allowed={str(T/n) for n in ['implementation-handoff.md','implementation-revision-record.md','implementation-investigation.md']}|{str(W/source),str(W/spec),str(W/'autobyteus-server-ts/dist/run-history/services/collaboration-root-history-service.js')}
external=json.loads((E/'ir-008-concurrent-reviewer-context.json').read_text())['currentExternalCanonicalHashes']
assert all(sha(Path(p))==h for p,h in external.items())
assert not missing,missing; assert set(changed)<=allowed|set(external),changed
ownedChanged=[p for p in changed if p in allowed];externalChanged=[p for p in changed if p in external]
assert (T/'implementation-revision-record.md').read_bytes().startswith((E/'ir-008-prior-implementation-revision-record.md').read_bytes())
assert (T/'implementation-investigation.md').read_bytes().startswith((E/'ir-008-prior-implementation-investigation.md').read_bytes())
sdk=[p for p in base if '/dist/' in p];assert len(sdk)==64 and all(sha(W/p)==base[p] for p in sdk)
inv=['autobyteus-server-ts/src/startup/migrations.ts','autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts','autobyteus-server-ts/src/app-data-migrations','autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts','autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts','autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts']
x=run('git','diff','HEAD','--',*inv);assert x.returncode==0 and not x.stdout;(E/'ir-008-unchanged-startup-contracts-migrations.diff').write_text(x.stdout)
check=run('git','diff','--check');(E/'ir-008-diffcheck.log').write_text(check.stdout+check.stderr);assert check.returncode==0
head=run('git','rev-parse','HEAD').stdout.strip();branch=run('git','branch','--show-current').stdout.strip();authority=json.loads((E/'ir-008-input-authority.json').read_text());assert head==authority['head'] and branch==authority['branch']
result={'incomingRefs':len(inputs),'unchangedIncomingRefs':len(inputs)-len(changed),'intentionalImplementationChanges':ownedChanged,'externalReviewerCanonicalUpdates':externalChanged,'missing':missing,'all287IncomingDirtyBytesUnchanged':True,'newDirtyPaths':sorted(newDirty),'currentDirty':len(paths),'categoriesUsingPriorMethod':dict(collections.Counter(oldCategory(p) for p in paths)),'categoriesIncludingWebColocatedAndTestSupport':dict(collections.Counter(category(p) for p in paths)),'prefixesExact':True,'sdk64Unchanged':True,'upstreamCanonicalsUnchangedExceptTwoReviewerOwnedCRR014Updates':True,'historicalEvidenceUnchanged':True,'head':head,'branch':branch,'diffcheckExit':0}
write('ir-008-package-preservation.json',result)
lines=['# IR-008 complete cumulative package inventory','',f'{len(paths)} non-ticket dirty paths. Prior-method categories {result["categoriesUsingPriorMethod"]}; semantic categories counting web __tests__/test-support {result["categoriesIncludingWebColocatedAndTestSupport"]}. Same 287 incoming dirty paths all unchanged; five new dirty paths are the bounded correction, not five new files.','',f'Only production source correction `{W/source}`: +{added}/-{removed}; existing typed recursive projector reused. Clean tracked history service and web spec become dirty. New service regression and two public-only fixture/provenance files.','']
for label in ['source/template','tests/fixtures','other']:
 lines += [f'## {label}','']+[f'- `{W/p}`' for p in paths if category(p)==label]
(E/'ir-008-source-inventory.md').write_text('\n'.join(lines)+'\n')
refs=set(inputs);refs.update(json.loads((T/'code-review-evidence/crr-014-reference-files.json').read_text()));refs.update(str(W/p) for p in paths);refs.update(str(p) for p in T.rglob('*') if p.is_file());refs.update(str(p) for p in (W/'autobyteus-server-ts/dist/run-history/services').glob('collaboration-root-history-service.*'))
manifest=E/'ir-008-reference-files.json';refs.add(str(manifest));manifest.write_text(json.dumps(sorted(refs),indent=2)+'\n');assert all(Path(p).is_file() for p in refs)
write('ir-008-reference-check.json',{'references':len(refs),'missing':[],'allCRR014ReferencesIncluded':set(json.loads((T/'code-review-evidence/crr-014-reference-files.json').read_text()))<=refs,'allCRR013ReferencesIncluded':set(json.loads((T/'code-review-evidence/crr-013-reference-files.json').read_text()))<=refs,'fullIncomingInventoryIncluded':set(inputs)<=refs,'notDeltaOnly':True})
print(json.dumps(result,indent=2));print('Complete refs',len(refs))
