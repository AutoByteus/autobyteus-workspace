import pathlib,subprocess,json,hashlib,os,tempfile,shutil,datetime
R=pathlib.Path.cwd();P=R/'tickets/in-progress/fix-prisma-engine-discovery';E=P/'delivery-evidence/dr-001'
base='e22245f097c208e66065302cfc30814cc5ffd14f';candidate='2bfa687988d2a4453ac7ef5e2e172a2717e149fc';target='8a4dfe4279fe05d0180c313c87a2ac8bef23c71a';integrated='129cc8403bdce7ddd32bb8752d48c38a6eb9017d'
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
def hashes(root):return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
assert git('rev-parse','HEAD')==integrated
inputs=json.loads((P/'api-e2e-evidence/api-rev-001/input-audit.json').read_text())['sourceAndTestHashes'];assert all(hashlib.sha256((R/p).read_bytes()).hexdigest()==h for p,h in inputs.items())
prior=json.loads((P/'api-e2e-evidence/api-rev-002/continuation-audit.json').read_text());assert all(hashlib.sha256((R/x['path']).read_bytes()).hexdigest()==x['sha256'] for x in prior['retainedRawEvidence'])
dist=json.loads((P/'api-e2e-evidence/api-rev-001/docker-attempt-1/dist-audit.json').read_text());actual=hashes(R/'autobyteus-server-ts/dist');assert actual==dist['currentManifest'];assert len(actual)==4559
production=['autobyteus-server-ts/src','autobyteus-server-ts/prisma','autobyteus-server-ts/docker','autobyteus-server-ts/package.json','autobyteus-ts','repository_prisma','pnpm-lock.yaml','pnpm-workspace.yaml','package.json','scripts/prepare-server.sh','scripts/public-docker-launcher']
material=git('diff','--name-only',candidate,integrated,'--',*production);assert not material,material
untracked=git('ls-files','--others','--exclude-standard').splitlines();generated=[p for p in untracked if not p.startswith('tickets/')]
expected=['applications/brief-studio/dist/','autobyteus-application-backend-sdk/dist/','autobyteus-application-devkit/dist/','autobyteus-application-frontend-sdk/dist/','autobyteus-application-sdk-contracts/dist/'];assert all(any(p.startswith(x) for x in expected) for p in generated)
preserved={p:hashlib.sha256((R/p).read_bytes()).hexdigest() for p in generated};(E/'generated-prerequisites.json').write_text(json.dumps({'roots':expected,'files':preserved,'owner':'Preexisting upstream generated prerequisites; preserve, never stage or discard'},indent=2)+'\n')
receipt={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bootstrap':base,'reviewedCandidate':candidate,'targetFetched':target,'integrated':integrated,'method':'merge origin/personal; no conflict','checkpoint':'Not needed: reviewed candidate committed and tracked tree/index clean; five untracked generated roots untouched','baseSourceChanges':git('diff','--name-status',base,target,'--','.',':!tickets').splitlines(),'materialStartupRuntimeConstructionChanges':material.splitlines(),'priorFiveInputsHashesMatch':True,'priorRawFilesIntact':len(prior['retainedRawEvidence']),'entireCurrentDistEqualsNativeTestedManifest':len(actual),'nativeRerun':'Not needed: exact runtime/source/CLI/dependency/schema/recipe inputs and tested4559-file dist unchanged; upstream changes web + unrelated server docs/E2E fixture only. Relevant focused/typecheck rerun follows. No Docker/user-node commands.'}
(E/'integration-audit.json').write_text(json.dumps(receipt,indent=2)+'\n')
private=pathlib.Path(tempfile.mkdtemp(prefix='delivery-prisma-check-'));(private/'home').mkdir();(private/'tmp').mkdir();env={'PATH':os.environ['PATH'],'HOME':str(private/'home'),'TMPDIR':str(private/'tmp'),'CI':'1','NO_COLOR':'1'}
db=R/'autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db';paths=[pathlib.Path(str(db)+suffix) for suffix in ('','-journal','-wal','-shm')];assert not any(p.exists() for p in paths),'Existing DB not owned; stop before test reset'
steps=[('focused','pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host tests/unit/secret-management --no-watch'),('typecheck','pnpm -C autobyteus-server-ts typecheck')];results=[]
try:
 for name,cmd in steps:
  with (E/(name+'.log')).open('w') as out:r=subprocess.run(cmd,shell=True,env=env,stdout=out,stderr=subprocess.STDOUT)
  results.append({'name':name,'command':cmd,'exit':r.returncode});(E/'integrated-checks.json').write_text(json.dumps(results,indent=2)+'\n');print(name,r.returncode,flush=True)
  assert r.returncode==0,'Integrated check failed; block Delivery'
finally:
 removed=[]
 for p in paths:
  if p.exists():p.unlink();removed.append(str(p.relative_to(R)))
 shutil.rmtree(private)
 assert all(hashlib.sha256((R/p).read_bytes()).hexdigest()==h for p,h in preserved.items())
 (E/'check-cleanup.json').write_text(json.dumps({'privateRoot':str(private),'privateRootAbsent':not private.exists(),'removedExactOwnedDatabaseFiles':removed,'generatedPrerequisitesPreserved':True,'userResourcesTouched':False},indent=2)+'\n')
