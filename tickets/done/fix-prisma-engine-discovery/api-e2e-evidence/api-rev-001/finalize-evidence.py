import pathlib,subprocess,json,hashlib
r=pathlib.Path.cwd();e=r/'tickets/in-progress/fix-prisma-engine-discovery/api-e2e-evidence/api-rev-001'
results=[]
commands=[['node','--check','autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs'],['python3','scripts/check_licensing.py'],['python3','scripts/check_repository_artifact_hygiene.py'],['git','diff','--check'],['git','diff','--check','--cached'],['git','diff','--check','e22245f097c208e66065302cfc30814cc5ffd14f'],['docker','ps','-a','--filter','label=autobyteus.api=fix-prisma-engine-discovery','--format','{{.Names}}'],['docker','ps','-a','--filter','label=autobyteus.prisma-e2e=api-prisma-90067e31-699','--format','{{.Names}}']]
for cmd in commands:
 p=subprocess.run(cmd,capture_output=True,text=True);results.append({'command':cmd,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr}); print(cmd[:3],p.returncode)
(e/'final-gates.json').write_text(json.dumps(results,indent=2)+'\n')
assert all(x['exit']==0 for x in results)
assert all(not x['stdout'].strip() for x in results if x['command'][0]=='docker')
