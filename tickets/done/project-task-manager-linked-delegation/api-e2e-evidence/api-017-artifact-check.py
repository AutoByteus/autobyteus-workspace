from pathlib import Path
import json,hashlib,subprocess,datetime
W=Path.cwd();E=W/'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence'
i=json.loads((E/'api-017-instance.json').read_text())['result'];assert i['ownsDataRoot']
resources=Path(i['executablePath']).parents[1]/'Resources';server=resources/'server'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[];missing=[];mismatch=[]
for p in (W/'autobyteus-server-ts/dist').rglob('*'):
 if p.is_file():
  r=p.relative_to(W/'autobyteus-server-ts/dist');b=server/'dist'/r
  if not b.is_file():missing.append(str(r));continue
  a=sha(p);h=sha(b);rows.append({'relative':str(r),'currentSha256':a,'packagedSha256':h})
  if a!=h:mismatch.append(str(r))
assert not missing and not mismatch,(missing,mismatch)
package=json.loads((W/'autobyteus-server-ts/package.json').read_text());pack=json.loads((server/'package.json').read_text())
sdkver=package['dependencies']['@anthropic-ai/claude-agent-sdk'];assert pack['dependencies']['@anthropic-ai/claude-agent-sdk']==sdkver
sources=json.loads((E/'api-017-input-preservation.json').read_text());fp=json.loads((W/'tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-011/current-package-fingerprints.json').read_text())
assert all(sha(Path(r['path']))==r['sha256'] for r in fp),[r['path'] for r in fp if sha(Path(r['path']))!=r['sha256']]
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instance':i,'resources':str(resources),'appAsar':str(resources/'app.asar'),'appAsarSha256':sha(resources/'app.asar'),'currentDistPackagedRows':rows,'allDistExact':True,'current545PackageFingerprintsExact':True,'sdkVersion':sdkver,'isolationMarker':json.loads((resources/'isolated-launch.json').read_text()),'scope':'Current worktree --build; every current server dist file byte-exact packaged. Local unsigned app, no distribution/release/legal certificate. Renderer asar separately hash-bound and actual DOM executed, not every shell function.'}
(E/'api-017-artifact-provenance.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'resources':str(resources),'distFiles':len(rows),'allDistExact':True,'all545Exact':True,'asar':out['appAsarSha256'],'sdkVersion':sdkver}))
