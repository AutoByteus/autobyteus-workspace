# Deliberate target-only compiler error; never run the runtime suite while mutant exists.
from pathlib import Path
import hashlib,subprocess,sys,json
from datetime import datetime,timezone
E=Path(__file__).resolve().parent;W=E.parents[4];P=E.parent.parent
T=W/'autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts'
before=T.read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest()
mutant=before+b'\nconst api_fixture_types_negative_control: number = "deliberate target type error";\nvoid api_fixture_types_negative_control;\n'
receipt={'beforeSHA256':sha(before),'mutantSHA256':sha(mutant),'mutation':'append string-to-number assignment, read by void; no runtime executed','expectedCompilerExit':2,'expectedDiagnostic':'TS2322','restored':False}
try:
 T.write_bytes(mutant)
 result=subprocess.run([sys.executable,str(E/'run-isolated.py'),'scoped-negative','TYPE-NEG','2','pnpm','-C','autobyteus-server-ts','typecheck:claude-interrupt-resume-e2e'],cwd=W)
 actual=int((E/'scoped-negative.exit').read_text())
 resources=json.loads((E/'scoped-negative.resources.json').read_text());lines=resources['compilerDiagnosticLines']
 receipt.update(actualCompilerExit=actual,diagnosticLines=lines)
 assert result.returncode==0 and actual==2, 'Expected same named command to fail with exit2'
 assert len(lines)==1 and 'TS2322' in lines[0] and 'claude-agent-websocket-interrupt-resume.e2e.test.ts' in lines[0], 'Exact deliberate target diagnostic must be present, no diagnostic exemption'
finally:
 T.write_bytes(before);receipt.update(afterSHA256=sha(T.read_bytes()),restored=T.read_bytes()==before)
 (E/'negative-restoration.json').write_text(json.dumps(receipt,indent=2)+'\n')
 with (P/'api-e2e-test-case-ledger.md').open('a') as f:f.write(f'| TYPE-NEG | {datetime.now(timezone.utc).isoformat()} | Checkpoint | Source restored in finally | Byte-exact original | before/afterSHA256={receipt["afterSHA256"]}; restored={receipt["restored"]} | N/A | evidence/api-e2e/negative-restoration.json |\n')
 assert receipt['restored'], 'Target byte restoration required before next execution'
print(json.dumps(receipt,indent=2))
