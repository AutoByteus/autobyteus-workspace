from pathlib import Path
import subprocess,json,sys
E=Path(__file__).resolve().parent;W=E.parents[3]
p=subprocess.run(['pnpm','--silent','isolated-app','list'],cwd=W,capture_output=True,text=True);print(p.stdout,p.stderr);assert p.returncode==0
(E/'api-015-instances-before.json').write_text(p.stdout);assert json.loads(p.stdout)['ok']
with (E/'api-015-start-stdout.json').open('w') as f:p=subprocess.run(['pnpm','--silent','isolated-app','start','--build'],cwd=W,stdout=f)
assert p.returncode==0,p.returncode
j=json.loads((E/'api-015-start-stdout.json').read_text());assert j['ok'] and j['result']['ownsDataRoot']
(E/'api-015-instance.json').write_text(json.dumps(j,indent=2)+'\n');print(json.dumps(j))
