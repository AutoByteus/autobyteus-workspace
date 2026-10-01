from pathlib import Path
import subprocess,json,hashlib
r=Path.cwd();t=r/'tickets/in-progress/agy-mcp-tool-call-presentation-only';e=t/'api-e2e-evidence/api-rev-003';l=t/'api-e2e-test-case-ledger.md'
s=r/'autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts';d=r/'autobyteus-server-ts/dist/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js'
fails=[str(r/'autobyteus-server-ts/tests/e2e/token-usage'/x) for x in ['token-usage-unit-prices-graphql.e2e.test.ts','token-usage-ledger-graphql.e2e.test.ts','token-usage-ledger-provider-semantics.e2e.test.ts','token-usage-analytics-graphql.e2e.test.ts']]
base='b0b077b02571098a6bf7993ab46b67a69fdb8f9d'
meta={'basis':'Production-equivalent base: only existing changed production converter replaced in source and dist. New helper remains unused. Selected failing tests are byte-identical to base. Not full baseline checkout.','files':fails,'identicalTests':all(subprocess.check_output(['git','show',base+':'+str(Path(f).relative_to(r))])==Path(f).read_bytes() for f in fails)}
old=s.read_bytes();oldD=d.read_bytes();(e/'converter-current.ts.backup').write_bytes(old);(e/'converter-current.js.backup').write_bytes(oldD)
try:
 s.write_bytes(subprocess.check_output(['git','show',base+':'+str(s.relative_to(r))]))
 subprocess.run(['node','-e',"const fs=require('fs'),ts=require('typescript');fs.writeFileSync(process.argv[2],ts.transpileModule(fs.readFileSync(process.argv[1],'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText)",str(s),str(d)],cwd=r/'autobyteus-server-ts',check=True)
 cmd=['pnpm','-C','autobyteus-server-ts','exec','vitest','run',*fails,'--config='+str(e/'token-order.config.mts'),'--no-watch','--reporter=default','--reporter=json','--outputFile='+str(e/'baseline-token-order.json')];meta['command']=cmd
 with (e/'baseline-token-order.log').open('w') as f: meta['exit']=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT).returncode
finally:
 s.write_bytes(old);d.write_bytes(oldD);meta['restoredSourceHash']=hashlib.sha256(s.read_bytes()).hexdigest();meta['restoredDistHash']=hashlib.sha256(d.read_bytes()).hexdigest();meta['restorationExact']=s.read_bytes()==old and d.read_bytes()==oldD;(e/'baseline-token-provenance.json').write_text(json.dumps(meta,indent=2))
with l.open('a') as f: f.write('| TC-012 | Baseline-equivalent failure comparison completed; converter source/dist restored exactly. No repair. | api-e2e-evidence/api-rev-003/baseline-provenance.json |\n')
print(json.dumps(meta,indent=2))
