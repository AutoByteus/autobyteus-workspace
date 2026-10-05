from pathlib import Path
import subprocess,json
E=Path(__file__).resolve().parent;W=E.parents[3]
assert W==Path('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation')
p=subprocess.run(['pnpm','--silent','isolated-app','list'],cwd=W,capture_output=True,text=True)
assert p.returncode==0;before=json.loads(p.stdout);assert before['ok'];(E/'api-017-instances-before.json').write_text(p.stdout)
with (E/'api-017-start-stdout.json').open('w') as f:p=subprocess.run(['pnpm','--silent','isolated-app','start','--build'],cwd=W,stdout=f)
assert p.returncode==0,p.returncode
j=json.loads((E/'api-017-start-stdout.json').read_text());assert j['ok'] and j['result']['ownsDataRoot']
(E/'api-017-instance.json').write_text(json.dumps(j,indent=2)+'\n');print(json.dumps(j))
