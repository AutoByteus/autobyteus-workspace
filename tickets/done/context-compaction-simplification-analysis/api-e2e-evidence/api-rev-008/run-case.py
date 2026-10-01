from pathlib import Path
import datetime, json, os, subprocess, sys, time
e=Path(__file__).resolve().parent
w=e.parents[4];t=e.parents[1]
case=sys.argv[1]
cmd=['pnpm','-C','autobyteus-server-ts','exec','vitest','run',*sys.argv[2:],'--no-watch']
env=os.environ.copy()
# These are offline unit suites only. Do not enable any registered live campaign.
for key in list(env):
    if key.startswith('RUN_') or key.startswith('AUTOBYTEUS_LIVE_E2E'):
        env.pop(key)
start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
with (e/(case+'.log')).open('w') as log:
    r=subprocess.run(cmd,cwd=w,env=env,stdout=log,stderr=subprocess.STDOUT)
result={'case':case,'cwd':str(w),'command':cmd,'startedAt':start,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'durationSeconds':round(time.monotonic()-clock,3),'exitCode':r.returncode,'log':str(e/(case+'.log')),'scope':'offline unit/reporting contract only; no real-provider or UI run'}
(e/(case+'.json')).write_text(json.dumps(result,indent=2)+'\n')
with (t/'api-e2e-test-case-ledger.md').open('a') as f:
    f.write(f"\n{case} execution completed exit{r.returncode}; exact command/times/log in api-rev-008/{case}.json and .log. Case interpretation follows after log inspection.\n")
print(json.dumps(result,indent=2))
print('\n'.join((e/(case+'.log')).read_text().splitlines()[-55:]))
