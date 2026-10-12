"""API-owned single-round runner; retained execution evidence, not durable suite."""
import datetime, json, os, re, subprocess, tempfile
from pathlib import Path
ROOT=Path.cwd()
PKG=ROOT/'tickets/in-progress/fix-legacy-docker-workspace-builds'
EVID=PKG/'api-e2e-evidence/api-rev-001'
LEDGER=PKG/'api-e2e-test-case-ledger.md'
PYTHONS=['/usr/bin/python3','/opt/homebrew/bin/python3.11']
PATH='/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin'
seq=0
results=[]
def event(case, kind, command, expected, observed='', result='N/A', evidence=''):
    global seq
    seq+=1
    stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    row=f'| {seq} | {case} | {stamp} | {kind} | {command} | {expected} | {observed} | {result} | {evidence} | Continue / retain limits |\n'
    with LEDGER.open('a') as f: f.write(row)

def execute(case, jobs, expected, allowed_failure=False):
    event(case,'Started','; '.join(' '.join(j[0]) for j in jobs),expected)
    observations=[]
    for args, filename in jobs:
        with tempfile.TemporaryDirectory(prefix='api-docker-retirement-') as temp:
            home=Path(temp)/'home'; home.mkdir()
            tmp=Path(temp)/'tmp'; tmp.mkdir()
            env={'PATH':PATH,'HOME':str(home),'TMPDIR':str(tmp),'PYTHONDONTWRITEBYTECODE':'1'}
            run=subprocess.run(args,cwd=ROOT,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=240)
            output=run.stdout
            (EVID/filename).write_text(f'$ {" ".join(args)}\nCWD {ROOT}\nClean env PATH={PATH}; HOME/TMPDIR owner-created; no inherited application/provider variables\n'+output+f'\nExit: {run.returncode}\nOwned HOME/TMPDIR and nested fixture cleanup completed.\n')
            match=re.search(r'Ran (\d+) tests?',output)
            count=int(match[1]) if match else None
            failures=re.findall(r'^FAIL: (\S+)',output,re.M)
            errors=re.findall(r'^ERROR: (\S+)',output,re.M)
            skips=re.findall(r"^(test_[^\n]+) \.\.\. skipped (.+)$",output,re.M)
            item={'case':case,'command':args,'log':filename,'exit':run.returncode,'total':count,'failures':failures,'errors':errors,'skips':skips,'passes':None if count is None else count-len(failures)-len(errors)-len(skips)}
            results.append(item)
            observations.append(f'{filename}: {count} run/{item["passes"]} Pass/{len(failures)} Fail/{len(errors)} errors/{len(skips)} skips; exit {run.returncode}')
            ok=run.returncode==0
            if allowed_failure:
                ok=(run.returncode==1 and count==62 and failures==['test_bash_install_no_update_path_skips_profile_write'] and not errors)
            if not ok:
                event(case,'Completed','See exact command in log',expected,'; '.join(observations),'Fail',filename)
                (EVID/'repository-results.json').write_text(json.dumps(results,indent=2))
                raise SystemExit('Unexpected outcome; stop subsequent cases and inspect evidence')
    result='Fail' if allowed_failure else 'Pass'
    event(case,'Completed','See exact commands in logs',expected,'; '.join(observations),result,', '.join(j[1] for j in jobs))
    (EVID/'repository-results.json').write_text(json.dumps(results,indent=2))
    print(case, result, '; '.join(observations),flush=True)

source='scripts.tests.test_docker_build_context_sources'
base='scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.'
methods=['test_new_containers_prefer_sequential_friendly_ports','test_bind_failure_retry_uses_random_ports_after_first_friendly_attempt','test_controlled_busy_preferred_port_uses_real_random_fallback','test_port_probe_double_delegates_python_and_rejects_probe_drift']
execute('API-001',[([py,'-m','unittest',source,'-v'],f'source-{v}.log') for py,v in zip(PYTHONS,['python39','python311'])],'9/9 per interpreter')
execute('API-002',[([py,'-m','unittest',*[base+m for m in methods],'-v'],f'affected-{v}.log') for py,v in zip(PYTHONS,['python39','python311'])],'4/4 per interpreter')
execute('API-003',[([PYTHONS[0],'-m','unittest',source,'scripts.tests.test_server_docker_browser_bridge','scripts.tests.test_server_docker_cli_install_failures','scripts.tests.test_server_docker_cli_latest_defaults','-v'],'narrow-tests.log')],'27/27')
execute('API-004',[([py,'-m','unittest','discover','-s','scripts/tests','-p','test_*docker*.py','-v'],f'broad-{v}.log') for py,v in zip(PYTHONS,['python39','python311'])],'62 each; sole unchanged BASE-001 failure; original platform skips, no errors',True)
