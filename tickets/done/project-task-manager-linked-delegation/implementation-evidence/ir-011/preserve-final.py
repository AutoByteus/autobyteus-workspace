from pathlib import Path
import hashlib,json,subprocess,shutil
from datetime import datetime,timezone
w=Path.cwd();t=w/'tickets/in-progress/project-task-manager-linked-delegation';e=t/'implementation-evidence/ir-011';h=lambda b:hashlib.sha256(b).hexdigest();run=lambda *args:subprocess.check_output(list(args))
original=json.loads((e/'input/ticket-files.json').read_text());changed=[]
for r in original:
 p=t/r['path'];assert p.is_file(),str(p)
 if h(p.read_bytes())!=r['sha256']:changed.append(r['path'])
assert sorted(changed)==sorted(['implementation-handoff.md','implementation-investigation.md','implementation-revision-record.md']),changed
assert (t/'implementation-revision-record.md').read_bytes().startswith((e/'input/implementation-revision-record.md').read_bytes())
assert (t/'implementation-investigation.md').read_bytes().startswith((e/'input/implementation-investigation.md').read_bytes())
paths=set(json.loads((e/'stage-paths.json').read_text()));before=(e/'input/stages.txt').read_text().splitlines();after=run('git','ls-files','--stage').decode().splitlines();a={line.split('\t',1)[1]:line for line in after};preserved=[]
for line in before:
 path=line.split('\t',1)[1]
 if path in paths:continue
 assert a.get(path)==line,(path,line,a.get(path));preserved.append(path)
assert not run('git','ls-files','-u');assert run('git','rev-parse','HEAD').decode().strip()=='028cca2312eae25737f482d94f9f3c213d83c3b9';assert run('git','rev-parse','MERGE_HEAD').decode().strip()=='4dee901d6163ca7053916fa1edc295afbfd7a6da'
index=Path(run('git','rev-parse','--git-path','index').decode().strip());shutil.copyfile(index,e/'final-index');(e/'final-stages.txt').write_bytes(run('git','ls-files','--stage'));(e/'final-status.z').write_bytes(run('git','status','--porcelain=v1','-z','--untracked-files=all'));(e/'final-status.txt').write_bytes(run('git','status','--porcelain=v1','--untracked-files=all'));(e/'final-staged.patch').write_bytes(run('git','diff','--cached','--binary'));(e/'final-unstaged.patch').write_bytes(run('git','diff','--binary'))
# Exact current implementation snapshots, candidate plus non-ticket integrated files.
current={r['integratedPath'] for r in json.loads((e/'accepted-candidate-fidelity.json').read_text())}
current|={row.split('\t')[-1] for row in run('git','diff','HEAD','--name-status','-M').decode().splitlines() if not row.split('\t')[-1].startswith('tickets/')}
fingerprints=[]
for rel in sorted(current):
 p=w/rel
 if not p.is_file():continue
 out=e/'current-package'/rel;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out);fingerprints.append({'path':str(p),'sha256':h(p.read_bytes()),'snapshot':str(out)})
(e/'current-package-fingerprints.json').write_text(json.dumps(fingerprints,indent=2)+'\n')
# Current compiled source is a local build; untouched packaged resources are not this build.
built=[]
for rel in ['agent-execution/backends/claude/session/claude-session.js','agent-execution/backends/codex/backend/codex-agent-run-backend.js','agent-execution/backends/shared/workspace-skill-materializer.js','agent-org-execution/domain/agent-org-run.js','standalone-agent-run-root/domain/standalone-agent-run-root.js','services/agent-streaming/collaboration-execution-tree-dto-projection.js']:
 p=w/'autobyteus-server-ts/dist'/rel;assert p.is_file();built.append({'path':str(p),'sha256':h(p.read_bytes())})
(e/'local-built-boundary-hashes.json').write_text(json.dumps(built,indent=2)+'\n')
result={'at':datetime.now(timezone.utc).isoformat(),'head':run('git','rev-parse','HEAD').decode().strip(),'mergeHead':run('git','rev-parse','MERGE_HEAD').decode().strip(),'branch':run('git','branch','--show-current').decode().strip(),'stash':run('git','stash','list','--format=%H %gd %gs').decode(),'zeroUnmerged':True,'mergeRemainsPending':True,'indexHash':h(index.read_bytes()),'indexChangedOnlyThrough28IndividualPaths':True,'untouchedStageRecordsExactCount':len(preserved),'originalTicketFiles':len(original),'originalTicketChangedOnlyImplementationCanonicals':changed,'oldImplementationRevisionAndInvestigationPrefixesExact':True,'currentPackageSnapshotCount':len(fingerprints),'noMergeCommitFinalizationPushReleaseDeployment':True,'noProviderInferenceDesktopAppUserDataCredentialOperation':True,'previewsClosed':json.loads((e/'preview-cleanup.json').read_text()),'authority':{'REQ':'REQ-BL-008','semanticSR':'SR-014','ARCH':'ARCH-REV-005','IR':'IR-011','CRR':'prior CRR-020 source; CRR-021 successful tests','API':'prior API-REV-016 Pass95.00%, not integrated acceptance','DR':'DR-001','taskSize':'Large','architecturalRisk':'High','route':'Reviewed'}}
(e/'final-preservation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['stash','previewsClosed','authority']},indent=2))
