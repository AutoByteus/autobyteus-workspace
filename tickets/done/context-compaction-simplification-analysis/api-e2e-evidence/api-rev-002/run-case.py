# Retained execution recipe, not repository test coverage. Run from assigned worktree.
import json, os, shlex, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
here=Path(__file__).resolve().parent
worktree=here.parents[4]
ticket=here.parents[1]
ledger=ticket/'api-e2e-test-case-ledger.md'
case=next(c for c in json.loads((here/'plan.json').read_text()) if c[0]==sys.argv[1])
cid,name,criteria,command=case
now=lambda: datetime.now(timezone.utc).isoformat()
def event(kind,observed):
    with ledger.open('a') as f:
        f.write(f'| {cid} | {now()} | {kind} | {name}; {criteria}: all checks pass | {observed} | api-e2e-evidence/api-rev-002/{cid}.log |\n')
event('Started','Not yet resolved')
start=now()
# Keep project test configuration but do not inherit provider secrets or production DB overrides.
allowed={'PATH','HOME','USER','LOGNAME','SHELL','TMPDIR','TMP','TEMP','LANG','LC_ALL','TERM','CI','PNPM_HOME','COREPACK_HOME','XDG_CACHE_HOME'}
env={k:v for k,v in os.environ.items() if k in allowed}
env['NO_COLOR']='1'
log=here/f'{cid}.log'
with log.open('w') as f:
    f.write(f'Case {cid}: {name}\nUTC start {start}\ncwd: {worktree}\ncommand: {command}\nenvironment: inherited allow-list only, NO_COLOR=1\n\n');f.flush()
    p=subprocess.Popen(shlex.split(command),cwd=worktree,env=env,stdout=f,stderr=subprocess.STDOUT)
    try: code=p.wait(timeout=360)
    except subprocess.TimeoutExpired:
        p.terminate()
        try: p.wait(timeout=20)
        except subprocess.TimeoutExpired: p.kill();p.wait()
        code=124
    f.write(f'\nUTC end {now()}\nEXIT_CODE={code}\n')
result={'id':cid,'name':name,'criteria':criteria,'command':command,'cwd':str(worktree),'started':start,'completed':now(),'exitCode':code,'result':'Pass' if code==0 else 'Fail','log':str(log)}
(here/f'{cid}.json').write_text(json.dumps(result,indent=2)+'\n')
event('Completed',f"{result['result']} — exit {code}; inspect log for test counts and boundary limits")
print(json.dumps(result,indent=2))
print('\n'.join(log.read_text().splitlines()[-48:]))
