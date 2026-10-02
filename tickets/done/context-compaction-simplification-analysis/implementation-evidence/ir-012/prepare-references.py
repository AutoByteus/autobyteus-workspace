from pathlib import Path
import json
r=Path(__file__).resolve().parents[5];t=r/'tickets/in-progress/context-compaction-simplification-analysis';e=t/'implementation-evidence/ir-012'
up=t/'code-review-evidence/crr-017/reference-index.json';d=json.loads(up.read_text())
old=str(r/'autobyteus-web/services/agentCollaboration/__tests__/nativeAcceptedInputHistory.spec.ts');pre=str(e/'source-before/autobyteus-web/services/agentCollaboration/__tests__/nativeAcceptedInputHistory.spec.ts');new=str(r/'test-support/native-input-history/native-accepted-input-history.integration.test.ts')
paths=set(d['paths']);paths.discard(old);paths.add(pre);paths.add(new)
paths.update(str(p) for p in (t/'code-review-evidence/crr-017').rglob('*') if p.is_file())
paths.update(str(p) for p in (t/'code-review-evidence/crr-018').rglob('*') if p.is_file())
paths.update(str(p) for p in (r/'test-support/native-input-history').rglob('*') if p.is_file())
paths.add(str(r/'package.json'))
paths.update(str(p) for p in e.rglob('*') if p.is_file())
paths.add(str(r/'autobyteus-web/tests/integration/web-boundary-guard.integration.test.ts'))
paths.update(str(e/p) for p in ['reference-index.json','reference-check.json','handoff-reference-files.json'])
(e/'reference-index.json').write_text(json.dumps({'revision':'IR-012','upstream_index':str(up),'package':'Current direct files override immutable API010 cumulative archive. Includes relevant historical supplements; not a claim every file reread.','relocated_active_test':{'old':old,'preserved_preimage':pre,'current':new},'paths':sorted(paths)},indent=2)+'\n')
canonicals=['requirements-doc.md','investigation-notes.md','design-spec.md','solution-revision-record.md','design-review-report.md','architecture-review-revision-record.md','architecture-identity-handoff.sr038.md','implementation-handoff.md','implementation-revision-record.md','code-review-report.md','code-review-revision-record.md','api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-test-case-ledger.md','api-e2e-revision-record.md','api-e2e-test-review-report.md','input-hold-proposal.sr027.md','terminal-compaction-activity.sr032.md','proposed-compaction-prompt.md','output-format-and-coverage.md','acceptance-disposition.sr020.md']
bounded={str(t/x) for x in canonicals}
bounded.update(str(p) for p in (r/'test-support/native-input-history').rglob('*') if p.is_file())
bounded.add(str(r/'package.json'))
bounded.update(str(p) for p in (t/'code-review-evidence/crr-018').glob('*') if p.is_file())
bounded.update([str(r/'TESTING.md'),str(r/'autobyteus-web/scripts/guard-web-boundary.mjs'),str(r/'autobyteus-web/package.json'),str(r/'autobyteus-web/vitest.config.mts')])
for x in json.loads((t/'implementation-evidence/ir-011/source-inventory.json').read_text()):
 p=str(r/x['path']);bounded.add(new if p==old else p)
bounded.update(x['path'] for x in json.loads((e/'protected-owner-entry.json').read_text()) if 'electron-dist' not in x['path'])
for folder,names in [
 ('api-e2e-evidence/api-rev-010',['cumulative-package.tar.gz','cumulative-package.json','cumulative-package-manifest.json','cumulative-package-check.json','reference-index.json','isolated-start.json','isolated-start.stderr','build-command.json','build-backup.json','handoff-receipt.json']),
 ('code-review-evidence/crr-017',['README.md','reference-index.json','guard-reproduction.log','guard-reproduction-command.json','source-provenance.json','final-audit.json','handoff-receipt.json']),
 ('implementation-evidence/ir-011',['source-inventory.json','source-delta.patch','rendered-result-check.md','local-checks.md'])]:
 bounded.update(str(t/folder/x) for x in names)
bounded.add(str(r/'autobyteus-web/tests/integration/web-boundary-guard.integration.test.ts'))
bounded.update(str(e/x) for x in ['guard-before.log','workspace-native-final.log','web-boundary-final.log'])
bounded.update(str(p) for p in e.glob('*') if p.is_file() and p.suffix in ['.md','.json','.patch'] and not p.name.startswith('entry-'))
bounded.update([pre,str(e/'reference-check.json'),str(e/'reference-index.json')])
bounded.discard(str(e/'handoff-reference-files.json'))
missing_bound=[p for p in bounded if not Path(p).is_file() and p!=str(e/'reference-check.json')];assert not missing_bound,missing_bound
(e/'handoff-reference-files.json').write_text(json.dumps(sorted(bounded),indent=2)+'\n')
# All references are live filesystem navigation; deleted active test replaced explicitly above.
missing=[p for p in paths if not Path(p).is_file() and p!=str(e/'reference-check.json')]
(e/'reference-check.json').write_text(json.dumps({'references':len(paths),'bounded_handoff_files':len(bounded),'missing':missing,'Pass':not missing,'relocation_is_not_history_rewrite':True},indent=2)+'\n');assert not missing,missing
print('references',len(paths),'bounded',len(bounded))
