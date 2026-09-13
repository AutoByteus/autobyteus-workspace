from pathlib import Path
import re,json,collections
r=Path.cwd();e=r/'tickets/in-progress/collaboration-follow-up-fixes/implementation-evidence/IR-001'
pattern=re.compile(r'^(.+?)\(\d+,\d+\): error (TS\d+): (.+)$',re.M)
def read(name):return pattern.findall((e/name).read_text())
def production(row):return not any(x in row[0] for x in ['__tests__/','tests/','electron/','test-support/'])
receipts=json.loads((e/'verification-checks.json').read_text())
assert any(x['name']=='verification-web-typecheck' and 'finished' in x for x in receipts), 'Typecheck has not completed'
b=read('baseline-web-typecheck.log'); c=read('verification-web-typecheck.log')
bp=collections.Counter(tuple(x) for x in b if production(x));cp=collections.Counter(tuple(x) for x in c if production(x))
paths={x['path'].removeprefix('autobyteus-web/') for x in json.loads((e/'source-inventory.json').read_text()) if x['production'] and x['path'].startswith('autobyteus-web/')}
result={'tooling':'vue-tsc3.1.8 / TypeScript5.9.3','baseline':'reviewed HEAD production with then-current tests; new APIs in tests are not baseline validity claims','baseline_total_diagnostics':len(b),'current_total_diagnostics':len(c),'baseline_production_diagnostics':sum(bp.values()),'current_production_diagnostics':sum(cp.values()),'new_production_diagnostics':list((cp-bp).elements()),'removed_production_diagnostics':list((bp-cp).elements()),'changed_production_current':[x for x in c if x[0] in paths],'scope':'Comparison omits line positions only. Repository-wide Vue typecheck remains nonzero, not Pass.'}
# Test diagnostics may differ solely in union member order across compiler graph walks.
bt=collections.Counter(tuple(x) for x in b if not production(x));ct=collections.Counter(tuple(x) for x in c if not production(x))
result['test_diagnostic_text_differences']=list((ct-bt).elements())
(e/'typecheck-comparison-current.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
