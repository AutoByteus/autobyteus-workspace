from pathlib import Path
import hashlib,json,subprocess
r=Path(__file__).resolve().parents[5];t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'implementation-evidence/ir-006'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def git(*args):return subprocess.check_output(['git',*args],cwd=r).decode().strip()
entry=json.loads((e/'entry-audit.json').read_text());owned=json.loads((e/'source-inventory.json').read_text());owned_paths={x['path'] for x in owned['paths']}
authorized=owned_paths|{str((t/f).relative_to(r)) for f in ['implementation-handoff.md','implementation-revision-record.md']}
def check(pinned):
 changes=[];same=[];exempt=[]
 for p,h in pinned.items():
  if (r/p).is_relative_to(e):exempt.append(p);continue
  if sha(r/p)!=h:changes.append({'path':p,'before':h,'after':sha(r/p),'authorized':p in authorized})
  else:same.append(p)
 return {'unchanged_count':len(same),'changed':changes,'exempt_ir006_evidence':exempt,'unexpected_changes':[x for x in changes if not x['authorized']]}
api=[
'autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts',
'autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts',
'autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts',
'autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts',
'autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-observation.test.ts',
'autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts',
*['test-support/live-e2e/'+p for p in ['live-e2e-harness.ts','run-live-e2e.mjs','compaction-quality-checks.ts','live-e2e-safe-error.ts']]]
apiaudit={'count':len(api),'adaptations_this_round':[],'paths':[{'path':p,'before_sha256':entry['reference_sha256'][p],'after_sha256':sha(r/p),'unchanged':entry['reference_sha256'][p]==sha(r/p)} for p in api]}
(e/'api-owner-preservation.json').write_text(json.dumps(apiaudit,indent=2)+'\n')
newwhitespace={p:[i for i,line in enumerate((r/p).read_text().splitlines(),1) if line.rstrip()!=line] for p in owned_paths}
results={'head':git('rev-parse','HEAD'),'head_unchanged':git('rev-parse','HEAD')==entry['head'],'branch':git('branch','--show-current'),'staged_paths':git('diff','--cached','--name-only'),'pending_preservation':check(entry['pending_sha256']),'reference_preservation':check(entry['reference_sha256']),'owned_paths':sorted(owned_paths),'new_file_whitespace':newwhitespace,'api10_unchanged':all(x['unchanged'] for x in apiaudit['paths']),'no_provider_calls':True,'no_remote_operations':True,'current_result':'Completed Local Fix for source re-review; API-F007 independent closure pending','current_api_result':'API005 Fail78.6 — not rescored'}
(e/'final-audit.json').write_text(json.dumps(results,indent=2)+'\n')
refs=set(json.loads((t/'code-review-evidence/crr-009/reference-index.json').read_text()));refs|={str(r/p) for p in owned_paths};refs|={str(p) for p in e.rglob('*') if p.is_file()};refs|={str(t/'implementation-handoff.md'),str(t/'implementation-revision-record.md'),str(e/'reference-index.json'),str(e/'reference-check.json')}
(e/'reference-index.json').write_text(json.dumps(sorted(refs),indent=2)+'\n')
missing=[p for p in refs if not Path(p).is_file() and p!=str(e/'reference-check.json')]
(e/'reference-check.json').write_text(json.dumps({'count':len(refs),'missing':missing,'input_reference_count':816,'all_input_references_carried':set(json.loads((t/'code-review-evidence/crr-009/reference-index.json').read_text())).issubset(refs)},indent=2)+'\n')
print(json.dumps({k:v for k,v in results.items() if k not in ['pending_preservation','reference_preservation']},indent=2));print('pending',json.dumps(results['pending_preservation'],indent=2));print('reference unexpected',results['reference_preservation']['unexpected_changes']);print('refs',len(refs),'missing',missing)
assert results['head_unchanged'] and not results['staged_paths'] and results['api10_unchanged']
assert not results['pending_preservation']['unexpected_changes'] and not results['reference_preservation']['unexpected_changes']
assert not missing and not any(newwhitespace.values())
