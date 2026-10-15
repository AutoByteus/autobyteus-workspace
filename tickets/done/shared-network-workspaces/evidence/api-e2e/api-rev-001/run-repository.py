"""Personal API-REV001 credential-free repository checks; run from assigned worktree.
No NFS/root/Docker/provider changes. VM runner separately owns guest-only actions.
"""
from pathlib import Path
import os,subprocess as sp,tempfile,json,hashlib,urllib.request,tarfile,time,sys
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
S=Path(tempfile.mkdtemp(prefix='ab-nfs-api001-')).resolve();(E/'scratch-path.txt').write_text(str(S)+'\n')
for d in ['home','tmp']: (S/d).mkdir()
ENV={'PATH':os.environ['PATH'],'HOME':str(S/'home'),'TMPDIR':str(S/'tmp'),'LANG':'en_US.UTF-8','LC_ALL':'en_US.UTF-8','CI':'1','GOTOOLCHAIN':'local','PYTHONDONTWRITEBYTECODE':'1'}
results=[]
def event(case,state,info):
 with (T/'api-e2e-test-case-ledger.md').open('a') as f:f.write(f'\n- {time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())} **{case} {state}** — {info}\n')
def run(case,name,cmd,cwd=R,extra=None):
 event(case,'Checkpoint','Starting '+name+'; see '+name+'.log')
 with (E/(name+'.log')).open('w') as out:
  out.write('cwd='+str(cwd)+'\ncommand='+json.dumps(cmd)+'\n');out.flush()
  p=sp.Popen(cmd,cwd=cwd,env={**ENV,**(extra or {})},stdout=out,stderr=sp.STDOUT);rc=p.wait()
 row={'case':case,'name':name,'cwd':str(cwd),'command':cmd,'rc':rc,'pid':p.pid};results.append(row)
 (E/'repository-results.json').write_text(json.dumps({'scratch':str(S),'environmentKeys':list(ENV),'results':results},indent=2)+'\n')
 print(name,rc,flush=True);return rc
try:
 event('N01','Started','Packaging/Go checks in private HOME/TMPDIR; no live credentials.')
 meta=json.loads((T/'implementation-evidence/ir-003/go-toolchain.json').read_text());archive=S/meta['filename']
 urllib.request.urlretrieve('https://go.dev/dl/'+meta['filename'],archive)
 digest=hashlib.sha256(archive.read_bytes()).hexdigest();assert digest==meta['sha256']
 with tarfile.open(archive) as tf:
  for m in tf.getmembers():
   p=Path(m.name);assert p.parts[0]=='go' and '..' not in p.parts and not p.is_absolute() and not m.issym() and not m.islnk()
  tf.extractall(S)
 GO=str(S/'go/bin/go');ENV['PATH']=str(S/'go/bin')+':'+ENV['PATH']
 (E/'toolchain.json').write_text(json.dumps({'url':'https://go.dev/dl/'+meta['filename'],'sha256':digest,'root':str(S/'go'),'version':sp.check_output([GO,'version'],env=ENV,text=True).strip()},indent=2)+'\n')
 a=run('N01','python-bootstrap-launcher',['python3','-m','unittest','scripts/tests/test_nfs_packaging_and_launcher.py','scripts/tests/test_nfs_installer_fixture.py','scripts/tests/test_public_docker_launcher_shared_workspace.py','-v'])
 b=run('N01','go-race',[GO,'test','-race','-count=1','-v','./...'],R/'autobyteus-nfs')
 c=run('N01','go-vet',[GO,'vet','./...'],R/'autobyteus-nfs')
 d=run('N01','go-build-native',[GO,'build','-trimpath','-o',str(S/'autobyteus-nfs'),'./cmd/autobyteus-nfs'],R/'autobyteus-nfs')
 if d==0:
  (E/'binary.json').write_text(json.dumps({'path':str(S/'autobyteus-nfs'),'sha256':hashlib.sha256((S/'autobyteus-nfs').read_bytes()).hexdigest(),'sourceHead':sp.check_output(['git','rev-parse','HEAD'],text=True).strip(),'metadata':'unchanged development-unqualified'},indent=2)+'\n')
  run('N01','native-version',[str(S/'autobyteus-nfs'),'version'])
 event('N01','Completed','Pass (repository scope, skips enumerated in logs)' if a==b==c==d==0 else 'Fail; inspect exact results, no implied platform pass.')
 # Small directly relevant server files before broad suites. No paid provider gate.
 event('N02','Started','Shared binding/profile/source/process-close/API units, clean env.')
 args=['tests/unit/workspaces/shared-workspace-binding.test.ts','tests/unit/agent-execution/backends/shared','tests/unit/agent-execution/agent-run-manager.test.ts','tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts','tests/unit/runtime-management/codex/client/codex-app-server-client-manager.test.ts','tests/unit/runtime-management/shared/scoped-project-git-environment.test.ts','tests/unit/skills/github/private-profile-source-lifecycle.test.ts','tests/unit/agent-execution/backends/antigravity/agy-configured-skill-linker.test.ts','tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts','tests/unit/api/rest/workspaces.test.ts','tests/unit/api/rest/run-file-changes.test.ts']
 rc=run('N02','server-targeted',['pnpm','-C','autobyteus-server-ts','exec','vitest','run',*args,'--no-watch','--maxWorkers=2'])
 event('N02','Completed',('Pass' if rc==0 else 'Fail')+'; see server-targeted.log for exact tests and boundaries.')
 event('N03','Started','Prepare normal integration outputs then public-schema and REST suites.')
 rc=run('N03','integration-prepare',['pnpm','-C','autobyteus-server-ts','test:integration:prepare'])
 if rc==0:
  rc=run('N03','public-contracts',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts','tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts','tests/integration/api/run-file-changes-api.integration.test.ts','--no-watch','--maxWorkers=2'])
  event('N03','Checkpoint',('Pass' if rc==0 else 'Fail')+' public contracts. Not socket/browser/native NFS proof.')
  agy=run('N03','agy-scripted-linked-skills',['pnpm','-C','autobyteus-server-ts','exec','vitest','run','tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts','--no-watch'],extra={'RUN_AGY_FAILURE_E2E':'1','ANTIGRAVITY_CLI_COMMAND':str(R/'autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs')})
  rc=rc or agy
 event('N03','Completed',('Pass' if rc==0 else 'Fail')+'; controlled source HTTP/runtime, not real inference.')
 event('N04','Started','Guide/terminal narrow checks.')
 a=run('N04','guide-unit',['pnpm','-C','autobyteus-web','test:nuxt','components/settings/__tests__/NodeManager.spec.ts','components/settings/__tests__/NfsGuideCard.spec.ts','utils/__tests__/nfsLauncherCommands.spec.ts','--run','--maxWorkers=2'])
 b=run('N04','terminal-unit',['pnpm','-C','autobyteus-ts','exec','vitest','run','tests/unit/tools/terminal','--no-watch','--maxWorkers=2'])
 event('N04','Completed',('Pass' if a==b==0 else 'Fail')+'; broader unchanged IR002 suites carried separately, FUP001 not erased.')
except BaseException as ex:
 event('N01–04','Checkpoint','Runner interrupted/failed: '+repr(ex));raise
finally:
 (E/'repository-runner-finished.json').write_text(json.dumps({'finished':True,'scratchRetainedForVM':str(S),'noDelegation':True},indent=2)+'\n')
