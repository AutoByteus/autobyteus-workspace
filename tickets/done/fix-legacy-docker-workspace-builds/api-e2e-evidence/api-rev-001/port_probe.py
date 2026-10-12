"""API fixture receipts/negative control and fixed-input baseline parser proof."""
import json, re, subprocess, unittest
from pathlib import Path
from unittest.mock import patch
from scripts.tests import test_public_docker_launcher_shared_workspace as m
case=m.PublicDockerLauncherSharedWorkspaceTest()
with m.fake_docker_environment() as env:
    assert not (Path(env['FAKE_DOCKER_ROOT']).parent/'bin/python3').exists()
    assert not (Path(env['FAKE_DOCKER_ROOT']).parent/'port-probe.jsonl').exists()
print('PASS default fixture has no Python controller or receipts.')
for scenario,busy,count,retry in [('sequential',(),3,False),('retry',(),1,True),('busy',(8001,),1,False)]:
    with m.fake_docker_environment(controlled_busy_ports=busy) as env:
        if retry: env['FAKE_DOCKER_FAIL_FIRST_RUN_BIND']='1'
        for _ in range(count): m.run_launcher(env,'new-container','--image','api/fake-only','--tag','fixture')
        queries=m.assert_port_probe_receipts(case,env)
        records=m.read_run_arg_records(env)
        print(scenario,'RUN receipts',json.dumps(records))
        print(scenario,'PROBE receipts',json.dumps(m.read_port_probe_receipts(env)))
        assert len(records)==(2 if retry else count)
        if scenario=='sequential':
            assert [q['port'] for q in queries]==[8001,5908,6080,9228,8002,5909,6081,9229,8003,5910,6082,9230]
        if scenario=='retry':
            assert [q['port'] for q in queries[:4]]==[8001,5908,6080,9228]
            assert len(queries)==8 and sum(r['kind']=='random-delegated' for r in m.read_port_probe_receipts(env))==4
        if scenario=='busy':
            assert queries[0]=={'kind':'availability','port':8001,'available':False}
            assert '8001:8000' not in records[0]
            assert sum(r['kind']=='random-delegated' for r in m.read_port_probe_receipts(env))==1
print('PASS actual public creation/random/retry executed with isolated availability inputs; no policy override.')
original=m.write_port_probe_double
def permissive(path,receipts,busy_ports):
    original(path,receipts,busy_ports)
    text=path.read_text()
    old='available = port not in (8001,)'
    assert old in text
    path.write_text(text.replace(old,'available = True'))
# Only fixture-generated executable mutated; original test/policy unchanged.
with patch.object(m,'write_port_probe_double',permissive):
    result=unittest.TestResult()
    test=m.PublicDockerLauncherSharedWorkspaceTest('test_controlled_busy_preferred_port_uses_real_random_fallback')
    test.run(result)
assert len(result.failures)==1 and not result.errors,result.__dict__
assert '8001 == 8001' in result.failures[0][1],result.failures
print('PASS permissive availability-double mutation detected by unchanged real-fallback assertion:\n'+result.failures[0][1])
# Independent native Bash cause confirmation, fixed inert input, parse-only; no eval.
source=m.BASH_LAUNCHER.read_text()
function=re.search(r'(?m)^entry_shell_quote\(\) \{\n.*?^\}',source,re.S).group(0)
quoted=subprocess.run(['/bin/bash','-c',function+'\nentry_shell_quote "$1"','fixture-probe',"fixture's"],text=True,capture_output=True,check=True).stdout
parser=subprocess.run(['/bin/bash','-n','-c',"printf '%s\\n' "+quoted],text=True,capture_output=True)
print('BASE-001 inert fixed-input quote:',repr(quoted),'native Bash parse-only exit:',parser.returncode,parser.stderr)
assert parser.returncode!=0
print('Known BASE-001 product defect remains Fail/Open; not waived, repaired or counted Pass. Owned fixtures cleaned; no live Docker or user profiles.')
