import os,sys,json,subprocess,datetime
from pathlib import Path
e=Path(__file__).resolve().parent
w=e.parents[4]
case=sys.argv[1]; suffix=sys.argv[2] if len(sys.argv)>2 else ''
cmd=json.loads((e/'plan.json').read_text())['cases'][case]
name=case+suffix
env={k:v for k,v in os.environ.items() if k in ['PATH','HOME','USER','SHELL','TMPDIR','LANG','LC_ALL','TERM','PNPM_HOME']}
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (e/(name+'.log')).open('x') as out:
 p=subprocess.run(cmd,cwd=w,env=env,stdout=out,stderr=subprocess.STDOUT)
result={'case':case,'attempt':suffix,'cwd':str(w),'command':cmd,'started':start,'finished':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode,'log':name+'.log'}
(e/(name+'.json')).write_text(json.dumps(result,indent=2)+'\n')
with (w/'tickets/in-progress/context-compaction-simplification-analysis/api-e2e-test-case-ledger.md').open('a') as out:
 out.write('\n- Round3 '+name+': '+('Pass' if p.returncode==0 else 'Fail')+' command exit '+str(p.returncode)+'. Evidence api-e2e-evidence/api-rev-003/'+name+'.log/.json. Counts/assertion scope reconciled before next case.\n')
print(json.dumps(result))
print(''.join((e/(name+'.log')).read_text().splitlines(keepends=True)[-28:]))
sys.exit(p.returncode)
