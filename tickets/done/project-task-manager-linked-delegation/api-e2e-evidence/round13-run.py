from pathlib import Path
import sys,subprocess,json,datetime,time
E=Path(__file__).parent;T=E.parent;W=T.parents[2]
case,label=sys.argv[1:3];cmd=sys.argv[3:];stamp=datetime.datetime.now(datetime.timezone.utc).isoformat();log=E/(case+'.log');start=time.monotonic()
with log.open('w') as f:
 f.write(f'{stamp}\nCWD {W}\nCOMMAND {json.dumps(cmd)}\n');f.flush();p=subprocess.run(cmd,cwd=W,stdout=f,stderr=subprocess.STDOUT)
 elapsed=round(time.monotonic()-start,2);f.write(f'\nINNER_EXIT={p.returncode}\nELAPSED={elapsed}\n')
r={'id':case,'label':label,'at':stamp,'cwd':str(W),'command':cmd,'exit':p.returncode,'elapsed':elapsed,'result':'Pass' if p.returncode==0 else 'Fail','log':str(log)}
with (E/'api-013-executable-results.jsonl').open('a') as f:f.write(json.dumps(r)+'\n')
with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write(f'\n### {case} / {stamp}\n- {label}\n- Result **{r["result"]}**, inner exit **{p.returncode}**, {elapsed}s.\n- Exact command `{json.dumps(cmd)}`; cwd `{W}`; evidence `{log}`. Command-level result only; scope/count/directness reconciled separately.\n')
print(json.dumps(r));sys.exit(p.returncode)
