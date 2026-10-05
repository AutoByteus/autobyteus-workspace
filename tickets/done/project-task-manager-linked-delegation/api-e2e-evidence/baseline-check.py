import subprocess,tempfile,os,json,datetime,shlex
from pathlib import Path
root=Path.cwd(); ticket=root/'tickets/in-progress/project-task-manager-linked-delegation';e=ticket/'api-e2e-evidence';ledger=ticket/'api-e2e-test-case-ledger.md'
files=['tests/unit/agent-team-execution/team-run-model-selection-save.test.ts','tests/unit/app-data-migrations/raw-trace-active-file-name-migration.test.ts','tests/unit/app-data-migrations/team-run-execution-tree-v1-app-data-migration.test.ts','tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts','tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts']
def event(kind,obs,result):
 with ledger.open('a') as f:f.write(f'\n| API-007-baseline-{kind} | API-007 | {datetime.datetime.now(datetime.timezone.utc).isoformat()} | {kind} | HEAD source archive; ordinary Vitest/default own DB; shared unchanged installed deps; archived HEAD core source | Compare five original failing files, not whole baseline | {obs} | {result} | api-e2e-evidence/api-007-baseline.log | No broader baseline inference |\n')
event('Started','Owned same-HEAD source control begins','N/A')
with tempfile.TemporaryDirectory(prefix='task-linked-api-baseline-') as tmp:
 scratch=Path(tmp);archive=scratch/'source.tar'
 with archive.open('wb') as f:subprocess.run(['git','archive','HEAD','autobyteus-server-ts','autobyteus-ts'],stdout=f,check=True)
 subprocess.run(['tar','-xf',str(archive),'-C',tmp],check=True);archive.unlink()
 server=scratch/'autobyteus-server-ts';(server/'node_modules').symlink_to(root/'autobyteus-server-ts/node_modules',target_is_directory=True)
 (scratch/'autobyteus-ts/node_modules').symlink_to(root/'autobyteus-ts/node_modules',target_is_directory=True)
 cmd=['pnpm','exec','vitest','run',*files,'--no-watch']
 with (e/'api-007-baseline.log').open('w') as f:
  f.write(f'HEAD={subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()}\ncwd={server}\ncommand={shlex.join(cmd)}\nDependencies shared (not a whole-source/dependency pristine baseline); tsconfig maps core imports to archived HEAD core source; installed dependency links shared; no pristine dependency baseline.\n');f.flush()
  p=subprocess.run(cmd,cwd=server,stdout=f,stderr=subprocess.STDOUT);f.write(f'\nPROCESS_EXIT_CODE={p.returncode}\n')
 (e/'api-007-baseline-meta.json').write_text(json.dumps({'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'serverSource':'git archive HEAD autobyteus-server-ts autobyteus-ts','dependencyTarget':str(root/'autobyteus-server-ts/node_modules'),'scope':files,'exit':p.returncode,'scratchRemovedOnExit':True,'limits':'Archived HEAD server/core source; shared installed deps; no whole-repository/dependency baseline-green or blanket origin certification.'},indent=2)+'\n')
s=(e/'api-007-baseline.log').read_text();summary='; '.join(x.strip() for x in s.splitlines() if 'Test Files ' in x or 'Tests ' in x or 'PROCESS_EXIT_CODE' in x)
event('Completed',summary.replace('|','/'),'Fail' if p.returncode else 'Pass');print(summary)
