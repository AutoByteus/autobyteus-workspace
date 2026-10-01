from pathlib import Path
import subprocess,json,time
r=Path.cwd();t=r/'tickets/in-progress/agy-mcp-tool-call-presentation-only';e=t/'api-e2e-evidence/api-rev-003';l=t/'api-e2e-test-case-ledger.md'
while not (e/'baseline-provenance.json').exists(): time.sleep(2)
assert json.loads((e/'baseline-provenance.json').read_text())['restorationExact']
inv=t/'api-e2e-coverage-investigation.md'
with inv.open('a') as f:f.write('''\n## Post-repository checkpoint\nBuild Pass; AGY units 168 Pass / 5 opt-in Not Tested; explicit fake transport 9 Pass. Full E2E 195 Pass / 43 Fail / 133 Not Tested; failing files unchanged from base; production-equivalent base comparison recorded separately, no corrections imported. Seven-category repository scores: AC proof 90%, directness 95%, integration realism 75%, environment fidelity 95%, lifecycle/recovery 75%, user surface 50%, durable regression 90% = 81.4%. Broader validation Required: fresh real CLI, old-writer/current-reader, renderer and packaged desktop close material gaps. No current Pass. Browser-automation skill has no runtime-advertised locator/tool; the project-owned Playwright dependency and reported isolated CDP endpoint will be used as temporary executable automation, with identical ownership/surface constraints.\n''')
def run(case,name,cmd):
 with l.open('a') as f:f.write(f'| {case} | Started {name} | API-REV-003 |\n')
 commands=json.loads((e/'commands.json').read_text());commands.append({'case':case,'cwd':str(r),'command':cmd,'log':name+'.log'});(e/'commands.json').write_text(json.dumps(commands,indent=2))
 with (e/(name+'.log')).open('w') as log:code=subprocess.run(cmd,shell=True,cwd=r,stdout=log,stderr=subprocess.STDOUT).returncode
 (e/(name+'.exit')).write_text(str(code))
 with l.open('a') as f:f.write(f'| {case} | {name}: exit {code}; inspect evidence for assertion totals | api-e2e-evidence/api-rev-003/{name}.log |\n')
 print(name,code,flush=True)
run('TC-004','old-writer',f'node "{e}/old-writer-probe.mjs" "{r}" "{e}/old-writer"')
run('TC-007','renderer',f'node "{t}/api-e2e-evidence/tc-007-activity-panel-probe.mjs" "{r}" "{e}/renderer"')
run('TC-005/008','live-agy',f'RUN_AGY_E2E=1 RUN_AGY_CAPABILITY_E2E=1 AGY_CAPABILITY_EVIDENCE_DIR="{e}/live-evidence" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts --no-watch --reporter=default --reporter=json --outputFile="{e}/live-agy.json"')
run('TC-013','desktop-build',f'pnpm --silent isolated-app start --build > "{e}/desktop-start.json" 2> "{e}/desktop-build-stderr.log"')
