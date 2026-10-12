"""Sequential API one-round probe/gate runner with immediate ledger checkpoints."""
import datetime, json, os, re, subprocess, tempfile
from pathlib import Path
ROOT=Path.cwd(); PKG=ROOT/'tickets/in-progress/fix-legacy-docker-workspace-builds'; E=PKG/'api-e2e-evidence/api-rev-001'; L=PKG/'api-e2e-test-case-ledger.md'; PY='/opt/homebrew/bin/python3.11'
seq=len(re.findall(r'^\| \d+ \| API-',L.read_text(),re.M))
results=[]
def event(case,event,cmd,expected,observed,result,log):
    global seq
    seq+=1
    with L.open('a') as f:
        f.write(f'| {seq} | {case} | {datetime.datetime.now(datetime.timezone.utc).isoformat()} | {event} | {cmd} | {expected} | {observed} | {result} | {log} | Retain scoped limits |\n')
for case,name,commands,expected in [
    ('API-005','input-reference-audit.log',[[PY,str(E/'audit.py')]],'Exact allowlist, retained byte/input/consumer/link proof'),
    ('API-006','helper-probe.log',[[PY,str(E/'helpers.py')]],'Fake default/zh/source-helper entrychain receipts'),
    ('API-007','port-probe.log',[[PY,str(E/'port_probe.py')]],'Default off, query receipts, mutation rejected; BASE-001 parse failure retained'),
    ('API-008','gates.log',[[PY,'scripts/check_licensing.py'],[PY,'scripts/check_repository_artifact_hygiene.py'],['git','diff','--check'],['git','diff','--cached','--check'],['git','diff','2756d7b298ca5b203ebd2310d172b37a5d381b5c','HEAD','--check']],'License/hygiene/diff gates exit0'),
]:
    event(case,'Started','See retained script/commands',expected,'','N/A',name)
    chunks=[]; exits=[]
    with tempfile.TemporaryDirectory(prefix='api-probe-clean-env-') as tmp:
        env={'PATH':'/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin','HOME':tmp,'TMPDIR':tmp,'PYTHONPATH':str(ROOT),'PYTHONDONTWRITEBYTECODE':'1'}
        for cmd in commands:
            r=subprocess.run(cmd,cwd=ROOT,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=90)
            chunks.append('$ '+' '.join(cmd)+'\n'+r.stdout+f'\nExit: {r.returncode}\n')
            exits.append(r.returncode)
            if r.returncode: break
    (E/name).write_text('CWD '+str(ROOT)+'\nClean env; no application/provider inheritance.\n'+'\n'.join(chunks)+'\nOwned outer HOME/TMPDIR cleanup completed.\n')
    result='Pass' if all(code==0 for code in exits) else 'Fail'
    event(case,'Completed','See exact commands in log',expected,'exit codes '+repr(exits),result,name)
    results.append({'case':case,'result':result,'exit_codes':exits,'log':name})
    (E/'probe-results.json').write_text(json.dumps(results,indent=2))
    print(case,result,'exit codes',exits,flush=True)
    if result=='Fail': raise SystemExit('Unexpected probe/gate failure; investigate before proceeding')
