import subprocess,json,datetime,re
from pathlib import Path
W=Path('/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes');T=W/'tickets/in-progress/collaboration-follow-up-fixes';E=T/'api-e2e-evidence/API-REV-001';R=E/'repository'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def event(case,phase,msg,path):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write(f'| {now()} | {case} | {phase} | {msg} | {path} |\n')
def run(name,cwd,cmd,case='SETUP'):
 rec={'name':name,'case':case,'cwd':str(cwd),'command':cmd,'started':now()};event(case,'Started',name,f'api-e2e-evidence/API-REV-001/repository/{name}.log')
 with (R/f'{name}.log').open('w') as f:r=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 rec.update(exit=r.returncode,finished=now());rec['tail']=(R/f'{name}.log').read_text(errors='replace')[-1300:]
 (R/f'{name}.json').write_text(json.dumps(rec,indent=2)+'\n');event(case,'Completed','Pass' if r.returncode==0 else 'Fail',f'api-e2e-evidence/API-REV-001/repository/{name}.json');print(json.dumps(rec),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
for p in ['autobyteus-application-sdk-contracts','autobyteus-application-frontend-sdk','autobyteus-application-backend-sdk']:run(p+'-build',W/p,['pnpm','build'])
plan=json.loads((R/'planned-commands.json').read_text())
s=[x for x in plan['server'] if x.endswith('.test.ts')]; w=[x for x in plan['web'] if x.endswith('.spec.ts')]
run('server-readiness',W/'autobyteus-server-ts',['pnpm','exec','vitest','run',s[0],'--no-watch','--maxWorkers=2'],'REPO-SERVER')
run('server-preservation',W/'autobyteus-server-ts',['pnpm','exec','vitest','run',*s[1:],'--no-watch','--maxWorkers=2'],'REPO-SERVER')
focus=[x for x in w if 'workspaceSelectionComposition' in x or 'UserMessageFirstSubmission' in x]
run('web-regressions',W/'autobyteus-web',['pnpm','test:nuxt','--run',*focus,'--maxWorkers=2'],'REPO-WEB')
run('web-preservation',W/'autobyteus-web',['pnpm','test:nuxt','--run',*[x for x in w if x not in focus],'--maxWorkers=2'],'REPO-WEB')
for cmd in ['guard:web-boundary','guard:localization-boundary']:run(cmd.replace(':','-'),W/'autobyteus-web',['pnpm',cmd])
run('server-build',W,['pnpm','-C','autobyteus-server-ts','build'])
