import os, pathlib, tempfile, subprocess, json, shutil
repo=pathlib.Path(__file__).resolve().parents[5]
evidence=pathlib.Path(__file__).resolve().parent
root=pathlib.Path(tempfile.mkdtemp(prefix='agy-delivery-')).resolve()
for part in ['home','data','memory','tmp','config','cache']: (root/part).mkdir()
db=(repo/'autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db')
assert db.resolve().is_relative_to(repo/'autobyteus-server-ts/tests')
assert not db.is_symlink()
env={'PATH':os.environ['PATH'],'HOME':str(root/'home'),'TMPDIR':str(root/'tmp'),'XDG_CONFIG_HOME':str(root/'config'),'XDG_CACHE_HOME':str(root/'cache'),'APP_ENV':'test','NODE_ENV':'test','DB_TYPE':'sqlite','DATABASE_URL':'file:'+str(db),'DATABASE_URL_TEST':'file:'+str(db),'AUTOBYTEUS_MEMORY_DIR':str(root/'memory'),'AUTOBYTEUS_SERVER_HOST':'http://127.0.0.1:1','CI':'1','AGY_LIVE':'0'}
files=['tests/unit/runtime-management','tests/unit/agent-execution/backends/antigravity']
cmd=['pnpm','-C','autobyteus-server-ts','exec','vitest','run',*files,'--no-watch']
preflight={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'cwd':str(repo),'root':str(root),'command':cmd,'environment':env,'notes':'Unit-only; opt-in live suites disabled. Prisma setup reviewed: hard-coded worktree test database reset. No backend/browser/installed provider launched.'}
(evidence/'preflight.json').write_text(json.dumps(preflight,indent=2)+'\n')
try:
 with (evidence/'integrated-unit.log').open('w') as log: result=subprocess.run(cmd,cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT)
 (evidence/'result.json').write_text(json.dumps({'exit_code':result.returncode,'head':preflight['head']},indent=2)+'\n')
finally:
 shutil.rmtree(root)
 (evidence/'cleanup.json').write_text(json.dumps({'removed_owned_root':str(root),'absent':not root.exists(),'test_db':'Retained under worktree tests/.tmp per test convention; no production paths inspected.'},indent=2)+'\n')
raise SystemExit(result.returncode)
