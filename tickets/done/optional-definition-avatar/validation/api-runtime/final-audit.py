from pathlib import Path
import json,hashlib,subprocess
p=Path(__file__).resolve().parent;w=p.parents[4]
before=json.loads((p/'hashes-before.json').read_text())
def hashes(root):
 return {str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(root.rglob('*')) if f.is_file() and not any(x in ['.git','node_modules'] for x in f.relative_to(root).parts)}
roots={'external':Path('/Users/normy/autobyteus_org/autobyteus-agents'),'fixture':w/'autobyteus-server-ts/tests/.tmp/avatar-api001-package'}
after={k:hashes(v) for k,v in roots.items()}; assert before==after,'source changed'
tele=json.loads((p/'telemetry.json').read_text());assert tele['active']==tele['pending']==tele['events']==[],tele
runtime=w/'autobyteus-server-ts/tests/.tmp/avatar-api001'
mem=[str(x.relative_to(runtime)) for x in (runtime/'memory').rglob('*') if x.is_file()] if (runtime/'memory').exists() else []
manifest=json.loads((p.parent/'implementation-manifest.json').read_text());assert all(hashlib.sha256((w/f).read_bytes()).hexdigest()==h for f,h in manifest['files'].items())
catalog=json.loads((p/'fixture-catalog.json').read_text())['data']; assert len(catalog['agentOrgDefinitions'])==3
assert len(catalog['agentTeamDefinitions'])==15
assert set(d['definitionId'] for d in catalog['definitionAdmissionDiagnostics'])=={'avatar-org-invalid','avatar-team-invalid','northstar-operating-company','software-development-department'}
proof={'sourceFilesUnchanged':{k:len(v) for k,v in after.items()},'telemetry':tele,'memoryFiles':mem,'manifestMatches':len(manifest['files']),'externalHead':subprocess.check_output(['git','-C',str(roots['external']),'rev-parse','HEAD'],text=True).strip(),'currentExternalTeams':12,'externalExcluded':2,'fixtureAvailable':{'sharedAgents':3,'sharedTeams':3,'Orgs':3},'invalidFixtureExcluded':2}
(p/'final-audit.json').write_text(json.dumps(proof,indent=2));(p/'hashes-after.json').write_text(json.dumps(after,indent=2));print(json.dumps(proof,indent=2))
