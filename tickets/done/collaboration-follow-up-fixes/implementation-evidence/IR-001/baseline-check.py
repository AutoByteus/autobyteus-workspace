from pathlib import Path
import subprocess,os,json,hashlib,tempfile
root=Path.cwd();ev=root/'tickets/in-progress/collaboration-follow-up-fixes/implementation-evidence/IR-001'
paths=[p for p in subprocess.check_output(['git','diff','--name-only'],text=True).splitlines() if p.startswith(('autobyteus-server-ts/src/','autobyteus-web/')) and '__tests__' not in p and not p.startswith('autobyteus-web/tests/')]
backup={p:(root/p).read_bytes() for p in paths}
sha=lambda x:hashlib.sha256(x).hexdigest()
results=[];env={**os.environ,'PATH':'/tmp/aorg-ir035-bin:'+os.environ['PATH']}
commands=[('before-runtime',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/integration/agent-team-execution/configured-scope-readiness.test.ts','-t','publishes the whole|fresh standalone']),('before-attachment',['pnpm','-C','autobyteus-web','test:nuxt','components/conversation/__tests__/UserMessageFirstSubmission.spec.ts','-t','standalone']),('before-selection',['pnpm','-C','autobyteus-web','test:nuxt','stores/__tests__/workspaceSelectionComposition.spec.ts','-t','late prior Team success']),('baseline-web-typecheck',['pnpm','--package=typescript@5.9.3','--package=vue-tsc@3.1.8','dlx','vue-tsc','--noEmit'])]
try:
 for p in paths:(root/p).write_bytes(subprocess.check_output(['git','show','HEAD:'+p]))
 for name,cmd in commands:
  with (ev/(name+'.log')).open('w') as out:
   result=subprocess.run(cmd,cwd=root/'autobyteus-web' if name=='baseline-web-typecheck' else root,env=env,stdout=out,stderr=subprocess.STDOUT)
  results.append({'name':name,'command':cmd,'exit':result.returncode})
  (ev/'baseline-results.json').write_text(json.dumps(results,indent=2))
finally:
 for p,data in backup.items():(root/p).write_bytes(data)
 (ev/'baseline-restoration.json').write_text(json.dumps({'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'restored':[{'path':p,'sha256':sha(data),'exact':sha((root/p).read_bytes())==sha(data)} for p,data in backup.items()]},indent=2))
