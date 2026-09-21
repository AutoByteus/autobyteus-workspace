from pathlib import Path
import subprocess,os,json,datetime
r=Path.cwd();e=r/'tickets/in-progress/collaboration-follow-up-fixes/implementation-evidence/IR-001';env={**os.environ,'PATH':'/tmp/aorg-ir035-bin:'+os.environ['PATH']}
checks=[('final-prepare','autobyteus-web',['pnpm','exec','nuxi','prepare']),('final-server','autobyteus-server-ts',['pnpm','exec','vitest','run',*(e/'server-paths.txt').read_text().splitlines()]),('final-web','autobyteus-web',['pnpm','test:nuxt',*(e/'web-paths.txt').read_text().splitlines()]),('final-server-typecheck','autobyteus-server-ts',['pnpm','exec','tsc','--noEmit','-p','tsconfig.build.json']),('final-web-build','autobyteus-web',['pnpm','build']),('final-web-typecheck','autobyteus-web',['pnpm','--package=typescript@5.9.3','--package=vue-tsc@3.1.8','dlx','vue-tsc','--noEmit']),('final-web-boundary','autobyteus-web',['pnpm','guard:web-boundary']),('final-localization-boundary','autobyteus-web',['pnpm','guard:localization-boundary']),('final-whitespace','.', ['git','diff','--check'])]
checks=[(name.replace('final-', 'completion-'), cwd, cmd + (['components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts', 'components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts'] if name=='final-web' else [])) for name,cwd,cmd in checks if name not in ['final-server','final-server-typecheck','final-prepare']]
checks=[(name.replace('completion-', 'verification-'), cwd, cmd) for name,cwd,cmd in checks if name in ['completion-web','completion-web-typecheck','completion-whitespace']]
results=[]
for name,cwd,cmd in checks:
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (e/(name+'.log')).open('w') as log:p=subprocess.run(cmd,cwd=r/cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
 results.append({'name':name,'cwd':str(r/cwd),'command':cmd,'started':start,'finished':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':p.returncode})
 (e/'verification-checks.json').write_text(json.dumps(results,indent=2))
 print(name,p.returncode,flush=True)
