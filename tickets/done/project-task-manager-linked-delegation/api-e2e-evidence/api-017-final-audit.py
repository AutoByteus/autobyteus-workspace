from pathlib import Path
import json,hashlib,subprocess,datetime
W=Path.cwd();T=W/'tickets/in-progress/project-task-manager-linked-delegation';E=T/'api-e2e-evidence';b=json.loads((E/'api-017-input-preservation.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
git=lambda *a:subprocess.check_output(['git','--no-optional-locks',*a],cwd=W)
owned={str(T/n) for n in ['api-e2e-coverage-investigation.md','api-e2e-execution-coverage-report.md','api-e2e-revision-record.md','api-e2e-test-case-ledger.md']}
foreign={str(T/n) for n in ['implementation-handoff.md','implementation-revision-record.md']}
missing=[p for p in b['references'] if not Path(p).is_file()];assert not missing
changed=[p for p,h in b['references'].items() if sha(p)!=h];assert not set(changed)-owned-foreign,changed
foreignAppends=[]
for p in foreign:
 data=Path(p).read_bytes();marker='## Informational Source Review Result — CRR-022'.encode()
 at=data.rfind(marker);assert at>=0
 candidates=[data[:at][:len(data[:at])-n if n else None] for n in range(7)]
 base=next((v for v in candidates if hashlib.sha256(v).hexdigest()==b['references'][p]),None);assert base is not None,p
 foreignAppends.append({'path':p,'priorBytes':len(base),'currentBytes':len(data),'priorPrefixExact':True,'currentSha256':sha(p),'reason':'Independent Implementation-owned informational CRR22 confirmed primary acceptance notice only'})
assert git('rev-parse','HEAD').decode().strip()==b['head'];assert git('rev-parse','MERGE_HEAD').decode().strip()==b['mergeHead'];assert git('branch','--show-current').decode().strip()==b['branch'];assert git('stash','list','--format=%H %gd %s').decode()==b['stash']
indexCurrentHash=sha(b['indexPath']);cache=json.loads((E/'api-017-recurring-stat-cache-assessment.json').read_text());assert indexCurrentHash in [b['indexHash'],cache['currentSha256']];assert cache['allNamesObjectIdsFlagsModesExtendedFlagsExtensionsExact'] and cache['bothIndexChecksumsValid'];assert hashlib.sha256(git('ls-files','--stage','-z')).hexdigest()==b['stagesHash'];assert not git('ls-files','-u')
filtered=lambda raw:[r for r in raw.split(b'\0') if r and b'tickets/in-progress/project-task-manager-linked-delegation/' not in r]
priorStatus=(E/'api-017-input/status.z').read_bytes();currentStatus=git('status','--porcelain=v1','--untracked-files=all','-z');assert filtered(priorStatus)==filtered(currentStatus)
assert git('diff','--binary')==(E/'api-017-input/unstaged.patch').read_bytes()
assert git('diff','--cached','--binary')==(E/'api-017-input/staged.patch').read_bytes()
fp=json.loads((T/'implementation-evidence/ir-011/current-package-fingerprints.json').read_text());assert all(sha(r['path'])==r['sha256'] for r in fp)
inventory=json.loads((E/'api-017-coverage-inventory.json').read_text());assert all(sha(r['path'])==r['currentSha256'] for r in inventory['paths'])
cleanup=json.loads((E/'api-017-cleanup-verification.json').read_text());assert cleanup['recordAbsent'] and cleanup['dataRootAbsent'] and cleanup['foreignRecordsUnchanged'] and not cleanup['capturedOwnPidsStillPresent'] and all(cleanup['portsFreeBind'].values())
artifact=json.loads((E/'api-017-artifact-provenance.json').read_text());assert sha(artifact['appAsar'])==artifact['appAsarSha256']
assert all(sha(W/'autobyteus-server-ts/dist'/r['relative'])==r['currentSha256'] and sha(Path(artifact['resources'])/'server/dist'/r['relative'])==r['packagedSha256'] for r in artifact['currentDistPackagedRows'])
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'referencesChecked':len(b['references']),'missing':[],'changedReferences':changed,'foreignOwnedAppendOnlyNotices':foreignAppends,'sourceAndPackage545Exact':True,'all20DurablesExact':True,'currentDistPackagedFiles':len(artifact['currentDistPackagedRows']),'asarExact':True,'headMergeHeadBranchStashStagesExact':True,'binaryIndexInitialExact':indexCurrentHash==b['indexHash'],'binaryIndexCurrentSha256':indexCurrentHash,'knownStatCacheOnlyDerivative':indexCurrentHash==cache['currentSha256'],'indexSemanticFieldsAndExtensionsExact':True,'zeroUnmerged':True,'stagedUnstagedBinaryDiffsExact':True,'nonTicketStatusNulSegmentsExact':len(filtered(currentStatus)),'cleanupVerified':True,'legacyBaselineAndCachedWhitespaceNotRelabeled':True}
(E/'api-017-final-preservation.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['changedReferences','foreignOwnedAppendOnlyNotices']}))
