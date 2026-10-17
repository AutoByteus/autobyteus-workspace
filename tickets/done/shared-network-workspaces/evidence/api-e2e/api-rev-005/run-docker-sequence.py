from pathlib import Path
import subprocess as sp,json
E=Path(__file__).resolve().parent
assert json.loads((E/'linux-docker-prepare-result.json').read_text())['result']=='Ready'
for script,result in [('build-docker-variant.py','build-docker-result.json'),('run-docker-selected-create.py','docker-selected-create-result.json'),('run-docker-visibility.py','docker-visibility-result.json')]:
 with (E/(script.replace('.py','-console.log'))).open('w') as f:p=sp.run(['python3',str(E/script)],stdout=f,stderr=sp.STDOUT)
 r=json.loads((E/result).read_text());print(script,r['result'],r.get('fatal'),flush=True);assert p.returncode==0 and r['result'] in ['Ready','Pass']
