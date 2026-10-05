# API-REV-018 temporary helper: documented importer into the exact owned instance database, then restart.
# Same user-authorized source as earlier rounds; no secret values are read or printed by this helper.
from pathlib import Path
import json, subprocess, sys

E = Path(__file__).resolve().parent
W = E.parents[4]
i = json.loads((E / 'api-108-instance.json').read_text())['result']
assert i['ownsDataRoot'] and i['databaseUrl'] == 'file:' + str(Path(i['dataRoot']) / 'server-data/db/production.db')
cmd = ['pnpm', '--silent', 'secrets:import', '--', '--source', '/Users/normy/.autobyteus/server-data/.env', '--database-url', i['databaseUrl']]
mode = sys.argv[1]
assert mode in ('preview', 'execute', 'restart')
if mode == 'preview':
    p = subprocess.run(cmd + ['--dry-run'], cwd=W)
elif mode == 'execute':
    p = subprocess.run(['script', '-q', str(E / 'api-108-import-tty.log'), *cmd], cwd=W, input='IMPORT\n', text=True)
else:
    p = subprocess.run(['pnpm', '--silent', 'isolated-app', 'restart', i['instanceId']], cwd=W, capture_output=True, text=True)
    print(p.stdout, p.stderr)
    j = json.loads(p.stdout)
    r = j['result']
    assert j['ok'] and r['instanceId'] == i['instanceId'] and r['dataRoot'] == i['dataRoot'] and r['serverPort'] == i['serverPort']
    out = E / sys.argv[2] if len(sys.argv) > 2 else E / 'api-108-restart.json'
    out.write_text(json.dumps(j, indent=2) + '\n')
assert p.returncode == 0, p.returncode
