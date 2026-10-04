from pathlib import Path
import subprocess,json,datetime,time,os,sys
W=Path.cwd();D=W/'tickets/in-progress/org-run-config-performance/evidence/delivery-dr003'
plan=json.loads((D/'check-plan.json').read_text());records=[]
def run(name,argv,extra=None):
 start=time.monotonic();at=datetime.datetime.now(datetime.timezone.utc).isoformat();log=D/(name+'.log')
 with log.open('w') as out:r=subprocess.run(argv,cwd=W,env={**os.environ,**(extra or {})},stdout=out,stderr=subprocess.STDOUT)
 row={'name':name,'argv':argv,'cwd':str(W),'envOverrides':extra or {},'start':at,'elapsedSeconds':round(time.monotonic()-start,3),'exitCode':r.returncode,'log':str(log),'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()}
 records.append(row);(D/'check-execution.json').write_text(json.dumps(records,indent=2)+'\n');print(json.dumps(row),flush=True)
 print('\n'.join(log.read_text(errors='replace').splitlines()[-8:]),flush=True)
 if r.returncode:sys.exit(r.returncode)
run('frontend-sdk-build',['pnpm','-C','autobyteus-application-frontend-sdk','build'])
run('nuxt-prepare',['pnpm','-C','autobyteus-web','exec','nuxt','prepare'])
run('server-narrow',['pnpm','-C','autobyteus-server-ts','exec','vitest','run',*plan['server'],'--no-watch'])
run('web-narrow',['pnpm','-C','autobyteus-web','test:nuxt',*plan['web'],'--run'])
run('native-input-history',['pnpm','test:native-input-history'])
run('scoped-history-http',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts','--no-watch'])
fixture=str(W/'autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs');env={'RUN_AGY_FAILURE_E2E':'1','ANTIGRAVITY_CLI_COMMAND':fixture}
run('org-publication-http',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts','--no-watch'],{**env,'AGY_ERROR_EVIDENCE_DIR':str(D/'org-publication')})
run('native-arguments-http',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts','--no-watch'],env)
run('agy-transport-browser',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/runtime/agy-failure-transport.e2e.test.ts','--no-watch'],{**env,'RUN_AGY_ERROR_BROWSER':'1','AGY_ERROR_EVIDENCE_DIR':str(D/'agy-transport')})
