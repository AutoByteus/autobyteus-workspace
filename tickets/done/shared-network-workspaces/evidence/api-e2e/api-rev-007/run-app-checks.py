from pathlib import Path
import subprocess as sp,os,json,time
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parent.parent.parent;S=Path((E/'scratch-path.txt').read_text().strip())
env={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'LANG':'en_US.UTF-8','LC_ALL':'en_US.UTF-8','CI':'1','PYTHONDONTWRITEBYTECODE':'1'}
rows=[]
checks=[
('server-targeted',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/unit/workspaces/shared-workspace-binding.test.ts','tests/unit/runtime-management/shared/scoped-project-git-environment.test.ts','tests/unit/api/rest/workspaces.test.ts','tests/unit/api/rest/run-file-changes.test.ts','--no-watch','--maxWorkers=2']),
('integration-prepare',['pnpm','-C','autobyteus-server-ts','test:integration:prepare']),
('public-contracts',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts','tests/integration/api/run-file-changes-api.integration.test.ts','--no-watch','--maxWorkers=2']),
('guide-unit',['pnpm','-C','autobyteus-web','test:nuxt','components/settings/__tests__/NodeManager.spec.ts','components/settings/__tests__/NfsGuideCard.spec.ts','utils/__tests__/nfsLauncherCommands.spec.ts','--run','--maxWorkers=2']),
('terminal-unit',['pnpm','-C','autobyteus-ts','exec','vitest','run','tests/unit/tools/terminal','--no-watch','--maxWorkers=2'])]
for name,args in checks:
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- Round7 L02/L24 Starting '+name+' (clean HOME/environment).\n')
 start=time.monotonic()
 with (E/(name+'.log')).open('w') as log:p=sp.run(args,cwd=R,env=env,stdout=log,stderr=sp.STDOUT)
 row={'name':name,'argv':args,'rc':p.returncode,'seconds':round(time.monotonic()-start,3)};rows.append(row);(E/'app-checks-result.json').write_text(json.dumps(rows,indent=2)+'\n')
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write('\n- Round7 L02/L24 '+name+': '+('Pass' if p.returncode==0 else 'Fail')+'.\n')
 print(row,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
