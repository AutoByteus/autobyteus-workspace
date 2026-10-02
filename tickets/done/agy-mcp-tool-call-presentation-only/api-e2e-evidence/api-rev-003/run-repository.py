from pathlib import Path
import subprocess,json,time
r=Path.cwd(); t=r/'tickets/in-progress/agy-mcp-tool-call-presentation-only'; e=t/'api-e2e-evidence/api-rev-003'; l=t/'api-e2e-test-case-ledger.md'
cmds=[]
def event(c,s):
 with l.open('a') as f: f.write(f'| {c} | {s} | api-e2e-evidence/api-rev-003; exact commands.json |\n')
def run(c,n,cmd):
 cmds.append({'case':c,'cwd':str(r),'command':cmd,'log':n+'.log'}); (e/'commands.json').write_text(json.dumps(cmds,indent=2)); event(c,'Started '+n)
 with (e/(n+'.log')).open('w') as f: code=subprocess.run(cmd,shell=True,stdout=f,stderr=subprocess.STDOUT,cwd=r).returncode
 (e/(n+'.exit')).write_text(str(code)); counts={}
 if (e/(n+'.json')).exists():
  d=json.loads((e/(n+'.json')).read_text()); counts={k:d.get(k) for k in ['numPassedTests','numFailedTests','numPendingTests']}
 event(c,f'{n}: exit {code}; {counts}. Skips are Not Tested.'); print(n,code,counts,flush=True)
 return code
while not (e/'build.exit').exists(): time.sleep(2)
event('TC-001/002','Build exit '+(e/'build.exit').read_text().strip())
if int((e/'build.exit').read_text()): raise SystemExit(1)
cmds.append({'case':'TC-001/002','cwd':str(r),'command':'pnpm -C autobyteus-server-ts build','log':'build.log'})
run('TC-001/002','agy-units',f'pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch --reporter=default --reporter=json --outputFile="{e}/agy-units.json"')
run('TC-002/003','fake-agy',f'RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="{r}/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" AGY_MCP_EVIDENCE_DIR="{e}/fake-evidence" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts tests/e2e/runtime/agy-background-task-transport.e2e.test.ts tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts --no-watch --reporter=default --reporter=json --outputFile="{e}/fake-agy.json"')
run('TC-012','full-e2e',f'pnpm test:e2e --reporter=default --reporter=json --outputFile="{e}/full-e2e.json"')
