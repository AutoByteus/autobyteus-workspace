from pathlib import Path
import subprocess, hashlib, json, difflib
r=Path(__file__).resolve().parents[5];t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'implementation-evidence/ir-007'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def git(*args):return subprocess.check_output(['git',*args],cwd=r,text=True).strip()
entry=json.loads((e/'entry-audit.json').read_text())['sha256']
owned=set()
for f in (e/'source-before').rglob('*'):
 if f.is_file():
  rel=str(f.relative_to(e/'source-before'))
  if sha(r/rel)!=sha(f):owned.add(rel)
for p in git('ls-files','--others','--exclude-standard').splitlines():
 if p not in entry and not p.startswith('tickets/') and (r/p).suffix in ['.ts','.vue']:owned.add(p)
# Preimages of new IR007 test files may record an intermediate local edit, not an entry baseline.
new={p for p in owned if not git('ls-files','--',p) and p not in entry}
rows=[];patch=[]
for p in sorted(owned):
 before=(e/'source-before'/p)
 old='' if p in new else before.read_text();current=(r/p).read_text()
 delta=list(difflib.unified_diff(old.splitlines(True),current.splitlines(True),fromfile='a/'+p,tofile='b/'+p))
 additions=sum(x.startswith('+') and not x.startswith('+++') for x in delta);deletions=sum(x.startswith('-') and not x.startswith('---') for x in delta)
 test= '/tests/' in p or '/__tests__/' in p
 rows.append({'path':p,'action':'Add' if p in new else 'Modify','test':test,'entry_sha256':None if p in new else sha(before),'sha256':sha(r/p),'nonempty_lines':sum(bool(l.strip()) for l in current.splitlines()),'additions':additions,'deletions':deletions,'baseline_matches_entry_pin':p not in entry or sha(before)==entry[p]})
 patch+=delta
(e/'owned-paths.json').write_text(json.dumps(sorted(owned),indent=2)+'\n')
(e/'source-inventory.json').write_text(json.dumps({'note':'IR007-only delta over current IR005/006 pending source; not cumulative source ownership. New-path preimages, if present, are local intermediate edits, not entry baselines.','paths':rows},indent=2)+'\n')
(e/'source.patch').write_text(''.join(patch))
size={'production_file_count':sum(not x['test'] for x in rows),'test_file_count':sum(x['test'] for x in rows),'over_500':[x for x in rows if not x['test'] and x['nonempty_lines']>500],'over_220_changed':[x for x in rows if not x['test'] and x['additions']+x['deletions']>220],'baseline_mismatches':[x for x in rows if not x['baseline_matches_entry_pin']]}
(e/'source-size-check.json').write_text(json.dumps(size,indent=2)+'\n')
allowed=owned|{str((t/f).relative_to(r)) for f in ['implementation-handoff.md','implementation-revision-record.md']}
changes=[{'path':p,'before':h,'after':sha(r/p),'authorized':p in allowed} for p,h in entry.items() if not p.startswith(str(e.relative_to(r))) and sha(r/p)!=h]
api=[
'autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts',
'autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts',
'autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts',
'autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts',
'autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-observation.test.ts',
'autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts',
*['test-support/live-e2e/'+p for p in ['live-e2e-harness.ts','run-live-e2e.mjs','compaction-quality-checks.ts','live-e2e-safe-error.ts']]]
apiresult=[{'path':p,'before':entry.get(p),'after':sha(r/p),'unchanged':entry.get(p)==sha(r/p)} for p in api]
(e/'api-owner-preservation.json').write_text(json.dumps(apiresult,indent=2)+'\n')
result={'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'entry_pin_count':len(entry),'changed':changes,'unexpected_changes':[x for x in changes if not x['authorized']], 'api_paths_unchanged':all(x['unchanged'] for x in apiresult),'ir007_owned_paths':len(owned),'source_limits':size,'staged_diff_stat':git('diff','--cached','--stat')}
(e/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='changed'},indent=2))
# Index all cumulative received references plus current authority/review and own evidence, not node_modules recursion.
refs=set(json.loads((e/'input-reference-index.json').read_text()))
refs.update(str(p) for p in (t/'architecture-review-evidence/arch-rev-004').rglob('*') if p.is_file())
refs.update(str(r/p) for p in owned)
refs.update(str(p) for p in e.rglob('*') if p.is_file() and '/renderer-preview/cache/' not in str(p))
refs.update(str(t/p) for p in ['implementation-handoff.md','implementation-revision-record.md','requirements-doc.md','investigation-notes.md','design-spec.md','design-review-report.md','architecture-review-revision-record.md','architecture-review-clarification.sr034.md','solution-revision-record.md','api-e2e-execution-coverage-report.md'])
refs.discard(str(e/'reference-index.json'));refs.discard(str(e/'reference-check.json'))
(e/'reference-index.json').write_text(json.dumps(sorted(refs),indent=2)+'\n')
(e/'reference-check.json').write_text(json.dumps({'reference_count':len(refs),'missing':[p for p in sorted(refs) if not Path(p).is_file()]},indent=2)+'\n')
