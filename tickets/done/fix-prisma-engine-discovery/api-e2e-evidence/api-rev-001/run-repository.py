import os, tempfile, pathlib, subprocess, json, datetime, shutil
root=pathlib.Path.cwd(); ev=root/'tickets/in-progress/fix-prisma-engine-discovery/api-e2e-evidence/api-rev-001'; ledger=ev.parent.parent/'api-e2e-test-case-ledger.md'
private=pathlib.Path(tempfile.mkdtemp(prefix='api-prisma-repo-')); (private/'home').mkdir(); (private/'tmp').mkdir()
env={'PATH':os.environ['PATH'],'HOME':str(private/'home'),'TMPDIR':str(private/'tmp'),'CI':'1','NO_COLOR':'1'}
steps=[('focused','pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host tests/unit/secret-management --no-watch'),('typecheck','pnpm -C autobyteus-server-ts typecheck'),('integration-prepare','pnpm -C autobyteus-server-ts test:integration:prepare'),('integration','pnpm -C autobyteus-server-ts test:integration'),('unit','pnpm -C autobyteus-server-ts test:unit')]
results=[]
try:
 for name,cmd in steps:
  with ledger.open('a') as f:f.write(f'\n- {datetime.datetime.now(datetime.timezone.utc).isoformat()} API001 Started {name}: `{cmd}`; clean private HOME/TMPDIR.\n')
  with (ev/(name+'.log')).open('w') as log:r=subprocess.run(cmd,shell=True,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
  results.append({'step':name,'command':cmd,'exit':r.returncode}); (ev/'repository-results.json').write_text(json.dumps(results,indent=2)+'\n')
  with ledger.open('a') as f:f.write(f'- API001 Checkpoint {name} exit{r.returncode}, evidence `{ev.name}/{name}.log`; totals to be reconciled.\n')
  print(name,r.returncode,flush=True)
  if r.returncode:break
finally:
 shutil.rmtree(private)
 (ev/'repository-private-cleanup.json').write_text(json.dumps({'privateRoot':str(private),'absent':not private.exists()})+'\n')
