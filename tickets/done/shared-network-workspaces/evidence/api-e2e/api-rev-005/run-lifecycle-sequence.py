from pathlib import Path
import subprocess as sp,json
E=Path(__file__).resolve().parent
assert json.loads((E/'docker-visibility-result.json').read_text())['result']=='Pass'
for script,result in [('run-two-reboots.py','two-reboots-result.json'),('run-normal-stop.py','normal-stop-result.json'),('run-policy-veto.py','policy-veto-result.json'),('run-node-upgrade.py','node-upgrade-result.json')]:
 with (E/(script.replace('.py','-console.log'))).open('w') as f:p=sp.run(['python3',str(E/script)],stdout=f,stderr=sp.STDOUT)
 r=json.loads((E/result).read_text());print(script,r['result'],r.get('fatal'),flush=True);assert p.returncode==0 and r['result']=='Pass'
