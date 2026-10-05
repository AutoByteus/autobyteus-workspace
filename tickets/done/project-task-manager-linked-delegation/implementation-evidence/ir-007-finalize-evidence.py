from pathlib import Path
import json,hashlib,subprocess,difflib,re,collections
W=Path(__file__).resolve().parents[4]
T=W/'tickets/in-progress/project-task-manager-linked-delegation'; E=T/'implementation-evidence'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def run(*a): return subprocess.run(a,cwd=W,capture_output=True,text=True)
def write(n,v): (E/n).write_text(json.dumps(v,indent=2)+'\n')
base=json.loads((E/'ir-007-input-fingerprints.json').read_text())
status=run('git','status','--porcelain=v1','--untracked-files=all').stdout
(E/'ir-007-final-git-status.txt').write_text(status)
paths=sorted(set(l[3:] for l in status.splitlines() if not l[3:].startswith('tickets/')))
assert len(paths)==287, len(paths)
finger={p:sha(W/p) for p in paths}; assert all(finger.values())
write('ir-007-package-fingerprints.json',finger)
cat=lambda p:'tests/fixtures' if '/tests/' in p else ('source/template' if '/src/' in p else 'other')
categories=collections.Counter(cat(p) for p in paths)
source=[p for p in paths if cat(p)=='source/template']
rows=[]
for p in source:
 text=(W/p).read_text(); raw=sum(bool(l.strip()) for l in text.splitlines()); no_comments=re.sub(r'/\*[\s\S]*?\*/|//[^\n]*','',text); effective=sum(bool(l.strip()) for l in no_comments.splitlines())
 rows.append({'path':p,'rawNonEmpty':raw,'effectiveNonEmptyApprox':effective})
local=[p for p in paths if '/backends/codex/' in p and Path(p).name in ['codex-agent-run-backend.ts','codex-thread.ts','codex-turn-event-converter.ts']]
local_rows=[]; patch=''
for p in local:
 before=(E/'ir-007-baseline-owners'/p).read_text(); after=(W/p).read_text(); d=list(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+p,tofile='b/'+p)); patch+=''.join(d)
 added=sum(l.startswith('+') and not l.startswith('+++') for l in d); removed=sum(l.startswith('-') and not l.startswith('---') for l in d)
 local_rows.append({'path':p,'added':added,'removed':removed,'localChangedLines':added+removed,'baselineSHA256':sha(E/'ir-007-baseline-owners'/p),'currentSHA256':sha(W/p)})
for p in paths:
 if p not in base['paths'] and p not in local:
  patch+=''.join(difflib.unified_diff([], (W/p).read_text().splitlines(True),fromfile='/dev/null',tofile='b/'+p))
(E/'ir-007-local-delta.diff').write_text(patch)
assert all(r['rawNonEmpty']<=500 for r in rows),[r for r in rows if r['rawNonEmpty']>500]
assert all(r['localChangedLines']<=220 for r in local_rows)
write('ir-007-size-audit.json',{'method':'Raw non-empty is conservative hard guard; effective estimate removes comments. Tests outside source hard guard. Local deltas measured against saved incoming bytes, not HEAD cumulative diff.','sourceTemplatePaths':len(source),'maximumRaw':max(rows,key=lambda x:x['rawNonEmpty']),'maximumEffectiveApprox':max(rows,key=lambda x:x['effectiveNonEmptyApprox']),'localSource':local_rows,'cumulative':rows})
review=json.loads((T/'code-review-evidence/crr-010-input-preservation.json').read_text())['protectedSpecialistArtifacts']
changed=[p for p,h in base['paths'].items() if sha(W/p)!=h]
assert sorted(changed)==sorted(p for p in local if p in base['paths'])
specchanged=[p for p,h in base['specialist'].items() if sha(W/p)!=h]; canonchanged=[p for p,h in base['canonical'].items() if sha(W/p)!=h]
assert not specchanged and not canonchanged
rchanged=[p for p,h in review.items() if sha(Path(p))!=h]
allowed={str(T/n) for n in ['implementation-handoff.md','implementation-revision-record.md','implementation-investigation.md']}
assert set(rchanged)<=allowed, rchanged
assert sha(E/'ir-006-completed-handoff.md')==review[str(T/'implementation-handoff.md')]
assert sha(E/'ir-006-revision-record-prefix.md')==review[str(T/'implementation-revision-record.md')]
assert sha(E/'ir-006-investigation-prefix.md')==review[str(T/'implementation-investigation.md')]
assert (T/'implementation-revision-record.md').read_bytes().startswith((E/'ir-006-revision-record-prefix.md').read_bytes())
assert (T/'implementation-investigation.md').read_bytes().startswith((E/'ir-006-investigation-prefix.md').read_bytes())
sdk=[p for p in base['paths'] if '/dist/' in p]; assert len(sdk)==64 and all(sha(W/p)==base['paths'][p] for p in sdk)
inv=['autobyteus-server-ts/src/startup/migrations.ts','autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts','autobyteus-server-ts/src/app-data-migrations','autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts','autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts','autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts']
d=run('git','diff','HEAD','--',*inv); assert d.returncode==0 and not d.stdout; (E/'ir-007-unchanged-startup-contracts-migrations.diff').write_text(d.stdout)
check=run('git','diff','--check');(E/'ir-007-diffcheck.log').write_text(check.stdout+check.stderr); assert check.returncode==0
head=run('git','rev-parse','HEAD').stdout.strip();branch=run('git','branch','--show-current').stdout.strip();assert head==base['head'] and branch==base['branch']
write('ir-007-package-preservation.json',{'originalDirty':len(base['paths']),'unchangedOriginal':len(base['paths'])-len(changed),'intentionalModifiedOriginal':changed,'newDirtyPaths':[p for p in paths if p not in base['paths']],'specialistSnapshot':len(base['specialist']),'specialistChanged':specchanged,'upstreamCanonicalChanged':canonchanged,'reviewerProtected679Changed':rchanged,'reviewerProtectedUnchanged':len(review)-len(rchanged),'reviewerProtectedChangeExplanation':'Only owned implementation canonicals are updated; all historical specialist artifacts and upstream canonicals unchanged.','recordPrefixExact':True,'investigationPrefixExact':True,'sdkOutputsPreserved':len(sdk),'currentDirty':len(paths),'currentCategories':dict(categories),'diffcheckExit':check.returncode,'invariantHEADDiffBytes':len(d.stdout),'head':head,'branch':branch})
lines=['# IR-007 current source inventory','',f'Cumulative dirty non-ticket package: {len(paths)} paths, {dict(categories)}. Preserved prior work is not reclassified as a new IR-007 edit.','', '## Current correction inventory (against incoming CRR-010)', '']
for r in local_rows: lines.append(f"- Modify `{W/r['path']}`: +{r['added']}/-{r['removed']} lines; existing exact owner only.")
lines += [f'- Add `{W/p}`: durable provider-free local regression/owned JSON-RPC child.' for p in paths if p not in base['paths'] and p not in local]
lines+=['','Detailed responsibilities, supported production/event spines and causal limitations: `ir-007-owner-causal-investigation.md`. No new production file, coordinator, global ledger or scheduler.','', '## Complete current source/template paths','']
lines += [f"- `{W/r['path']}` — {r['rawNonEmpty']} raw non-empty / {r['effectiveNonEmptyApprox']} effective estimate." for r in rows]
lines += ['', '## Complete current tests/fixtures paths','']+[f'- `{W/p}`' for p in paths if cat(p)=='tests/fixtures']
lines += ['', '## Retained other dirty paths','']+[f'- `{W/p}`' for p in paths if cat(p)=='other']
(E/'ir-007-source-inventory.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'local':local_rows,'maximumRaw':max(rows,key=lambda x:x['rawNonEmpty']),'currentDirty':len(paths),'categories':dict(categories),'specialistSnapshotUnchanged':len(base['specialist']),'reviewerProtectedChanges':rchanged,'branch':branch,'head':head,'diffcheckExit':0},indent=2))
