# Strict wrapper: a run-case wrapper zero cannot bypass its recorded inner failure.
import subprocess,json,sys
from pathlib import Path
E=Path(__file__).parent
cid,label,*cmd=sys.argv[1:]
p=subprocess.run(['python3',str(E/'run-case.py'),cid,label,*cmd],text=True,capture_output=True);print(p.stdout,flush=True);print(p.stderr,flush=True)
if p.returncode:sys.exit(p.returncode)
r=json.loads(p.stdout.strip().splitlines()[-1]);sys.exit(r['exit'])
