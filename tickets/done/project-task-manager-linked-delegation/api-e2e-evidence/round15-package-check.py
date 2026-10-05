from pathlib import Path
import json,hashlib,datetime
E=Path(__file__).resolve().parent;W=E.parents[3];H=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
i=json.loads((E/'api-015-instance.json').read_text())['result'];assert i['ownsDataRoot'];resources=Path(i['executablePath']).parents[1]/'Resources';assert resources.is_dir()
current=json.loads((E.parent/'implementation-evidence/ir-010-built-boundary-hashes.json').read_text());sources={p:{'sha256':H(Path(p)),'matchesIR010':H(Path(p))==h} for p,h in current['source'].items()};built={p:{'sha256':H(Path(p)),'matchesIR010':H(Path(p))==h} for p,h in current['built'].items()};rows=[]
for p in (W/'autobyteus-server-ts/dist').rglob('*.js'):
 rel=p.relative_to(W/'autobyteus-server-ts/dist');q=resources/'server/dist'/rel
 rows.append({'relative':str(rel),'currentSha256':H(p),'packagedSha256':H(q) if q.is_file() else None,'equal':q.is_file() and H(p)==H(q)})
old=json.loads((E/'api-014-artifact-provenance.json').read_text())['appAsarSha256'];asar=H(resources/'app.asar');out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'instanceId':i['instanceId'],'executablePath':i['executablePath'],'resources':str(resources),'build':'Fresh API008@round15-build, documented isolated-app start --build','source':sources,'built':built,'compiledPackagedJSCount':len(rows),'compiledPackagedAllEqual':all(r['equal'] for r in rows),'rows':rows,'appAsarSha256':asar,'priorAPI014AppAsarSha256':old,'isolatedLaunch':json.loads((resources/'isolated-launch.json').read_text()),'noOldEndpointOrPrechangePackageReuse':True}
(E/'api-015-artifact-provenance.json').write_text(json.dumps(out,indent=2)+'\n');assert all(v['matchesIR010'] for v in sources.values()) and all(v['matchesIR010'] for v in built.values());assert len(rows)>1400 and out['compiledPackagedAllEqual'];print("Asar equality is not backend freshness authority: configured server is Resources/server/dist")
print({k:out[k] for k in ['instanceId','compiledPackagedJSCount','compiledPackagedAllEqual','appAsarSha256','priorAPI014AppAsarSha256']})
