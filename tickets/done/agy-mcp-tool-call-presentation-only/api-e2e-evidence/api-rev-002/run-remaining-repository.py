import json, subprocess, time
from pathlib import Path
root=Path.cwd(); ticket=root/'tickets/in-progress/agy-mcp-tool-call-presentation'; evidence=ticket/'api-e2e-evidence/api-rev-002'
ledger=ticket/'api-e2e-test-case-ledger.md'
def record(case,name,code):
    counts={}
    report=evidence/(name+'.json')
    if report.exists():
        d=json.loads(report.read_text()); counts={k:d.get(k) for k in ['numPassedTests','numFailedTests','numPendingTests','numTotalTests','numRuntimeErrorTestSuites']}
    with ledger.open('a') as f: f.write(f'| {case} | {"Pass" if code==0 else "Fail"} — exit {code}; {json.dumps(counts)} | api-e2e-evidence/api-rev-002/{name}.log/json; opt-in pending are Not Tested, not passes |\n')
    print(case,name,code,counts,flush=True)
while not (evidence/'unit-architecture.exit').exists(): time.sleep(5)
record('TC-010','unit-architecture',int((evidence/'unit-architecture.exit').read_text()))
for case,name,command in [
 ('TC-011','integration','pnpm -C autobyteus-server-ts exec vitest run tests/integration --no-watch'),
 ('TC-012','deterministic-e2e','pnpm test:e2e'),
 ('TC-002/003','fake-agy',f'RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="{root}/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" AGY_MCP_EVIDENCE_DIR="{evidence}/fake-agy-evidence" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts tests/e2e/runtime/agy-background-task-transport.e2e.test.ts tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts --no-watch')]:
    command+=f' --reporter=default --reporter=json --outputFile="{evidence}/{name}.json"'
    commands=json.loads((evidence/'commands.json').read_text()); commands.append({'case':case,'cwd':str(root),'command':command,'log':name+'.log'}); (evidence/'commands.json').write_text(json.dumps(commands,indent=2))
    with ledger.open('a') as f: f.write(f'| {case} | Started; unresolved | {name}.log; exact command in commands.json |\n')
    with (evidence/(name+'.log')).open('w') as log: code=subprocess.run(command,shell=True,cwd=root,stdout=log,stderr=subprocess.STDOUT).returncode
    (evidence/(name+'.exit')).write_text(str(code)+'\n'); record(case,name,code)
