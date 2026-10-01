# Run from worktree root. Serial phases share only the worktree's test-owned Prisma DB.
import json, subprocess
from pathlib import Path
root = Path.cwd()
ticket = root / 'tickets/in-progress/agy-mcp-tool-call-presentation'
evidence = ticket / 'implementation-evidence/ir002'
inventory = json.loads((ticket / 'recovery-evidence/solution-recovery-sr005/historical-failure-inventory.json').read_text())
extra = [
 'tests/unit/app-data-migrations/released-unversioned-flat-team-shapes.test.ts',
 'tests/unit/app-data-migrations/agent-org-flat-team-families-v1-app-data-migration.test.ts',
 'tests/unit/app-data-migrations/app-data-migration-runner.test.ts',
 'tests/unit/agent-team-execution/team-run-service.test.ts',
 'tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts',
 'tests/unit/agent-execution/backends/antigravity/agy-mcp-tool-call.test.ts',
 'tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts',
]
commands=[]
for layer, tag in [('Unit/architecture','unit-final'),('Integration','integration-final')]:
 files=[x['path'].removeprefix('autobyteus-server-ts/') for x in inventory if x['layer']==layer]
 if layer=='Unit/architecture': files += extra
 command=['pnpm','exec','vitest','run',*files,'--no-watch','--reporter=json','--outputFile='+str(evidence/(tag+'.json'))]
 with (evidence/(tag+'.log')).open('w') as out:
  result=subprocess.run(command,cwd=root/'autobyteus-server-ts',stdout=out,stderr=subprocess.STDOUT)
 commands.append({'phase':tag,'cwd':str(root/'autobyteus-server-ts'),'command':command,'exitCode':result.returncode})
 print(tag,result.returncode,flush=True)
(evidence/'final-commands.json').write_text(json.dumps(commands,indent=2)+'\n')
