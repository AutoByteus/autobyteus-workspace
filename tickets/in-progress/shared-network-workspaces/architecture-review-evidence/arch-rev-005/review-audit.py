"""Architecture input/raw-receipt checks only; no product execution or upstream writes."""
from pathlib import Path
import datetime, hashlib, json, subprocess

E = Path(__file__).resolve().parent
T = E.parents[1]
R = T.parents[2]
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def git(*args): return subprocess.check_output(['git', *args], cwd=R, text=True).strip()

basis = 'cd1519a798'
index = read(T/'evidence/design-recovery/sr021/package-index.json')
inputs = read(T/'evidence/design-recovery/sr021/input-audit.json')
final = read(T/'evidence/design-recovery/sr021/final-audit.json')
reviewer = {str(T/n) for n in ['design-review-report.md', 'architecture-review-revision-record.md']}
missing = [p for p in index['reference_files'] if not Path(p).is_file()]
protected = {p:h for p,h in inputs['protected'].items() if p not in reviewer}
protected.update(final['ownedHashes'])
protected.update(final['extraSourceHashes'])
changes = [p for p,h in protected.items() if not Path(p).is_file() or sha(p) != h]
retained = read(T/'implementation-evidence/ir-005/retained-candidate.json')['files']
retained_changes = [x['path'] for x in retained if not Path(x['path']).is_file() or sha(x['path']) != x['sha256'] or Path(x['path']).stat().st_size != x['size']]
approval = {}
for name in ['requirements-doc.md', 'approval-record-sr018.md', 'approval-record-sr017.md']:
    p = T/name
    old = subprocess.check_output(['git','show','5251ab48bc:'+str(p.relative_to(R))],cwd=R)
    approval[name] = old == p.read_bytes()
aggregate = subprocess.run(['python3','autobyteus-nfs/packaging/release.py','--source-hash'],cwd=R,text=True,capture_output=True)
expected = '4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac'
raw = read(T/'evidence/api-e2e/api-rev-003/managed-reboot-repro-result.json')
phases = ['beforeDiagnostic','afterReconnect','beforeSecondReboot','afterSecondReboot']
nodes = [raw[p]['node'] for p in phases]
observations = raw['observations']
preserve = {k:all(n[k] == nodes[0][k] for n in nodes) for k in ['Id','Image','Config','HostConfig']}
obs_summary=[]
for x in observations:
    status = json.loads(x['status']['stdout']) if x['status']['rc']==0 else {}
    obs_summary.append({'elapsed':x['sinceBootObservationSeconds'],'nodeRunning':x['node']['State']['Running'],'hostReady':status.get('hostReady'),'apiRC':x['api']['rc']})
fs = json.loads(raw['sourceAndMount']['stdout'])
raw_checks = {
    'distinctNormalBootIds':raw['beforeBoot'] != raw['afterBoot'],
    'phaseIdentityAndConfigPreserved':preserve,
    'publicReconnectHostReadyButNodeStopped':json.loads(raw['normalPublicReconnect']['stdout'])['hostReady'] and not nodes[1]['State']['Running'],
    'diagnosticNamedStartSameObservedIdApiRestored':raw['diagnosticOnlyStart']['rc']==0 and nodes[2]['Id']==nodes[0]['Id'] and nodes[2]['State']['Running'] and raw['beforeSecondReboot']['api']['rc']==0,
    'secondBootAllObservedSelectedNodesStopped':all(not x['node']['State']['Running'] for x in observations),
    'secondBootAllObservedAPICallsFail':all(x['api']['rc']!=0 for x in observations),
    'bothFailedIncarnationsHaveQualifiedFields':all(n['State']['Status']=='exited' and n['State']['Pid']==0 and n['State']['StartedAt']<'%s'%n['State']['FinishedAt'] and 'connection refused' in n['State']['Error'] and n['HostConfig']['RestartPolicy']['Name']=='unless-stopped' for n in [nodes[0],nodes[3]]),
    'laterSuccessfulStartChangesIncarnation':nodes[0]['State']['StartedAt'] != nodes[2]['State']['StartedAt'],
    'sourceAndMountSameBytesAndUUID':fs['sourceHash']==fs['mountedHash'] and fs['sourceMarker']==fs['mountedMarker'],
}
source_files = [
 'autobyteus-nfs/internal/setup/'+n+'.go' for n in ['lifecycle','status','apply','service','pending','detach_nodes']
] + ['autobyteus-nfs/internal/docker/'+n+'.go' for n in ['client','ownership','snapshot','attachment','exec','recreate','recovery','engine']]+[
 'autobyteus-nfs/internal/cli/run.go','autobyteus-nfs/internal/service/supervisor.go','autobyteus-nfs/internal/platform/jobs.go','autobyteus-nfs/internal/config/state.go','autobyteus-nfs/internal/config/store.go','scripts/public/docker/autobyteus-docker.d/bash/commands.sh']
result={
 'review':'ARCH-REV-005','date':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'reviewedCommit':git('rev-parse',basis),'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),
 'inputReferenceCount':len(index['reference_files']),'uniqueReferenceCount':len(set(index['reference_files'])),'missingReferences':missing,
 'protectedScope':'SR021 protected input except two reviewer-owned current artifacts, plus current four designer artifacts and eleven added source paths',
 'protectedCount':len(protected),'changedProtected':changes,'retainedCandidateCount':len(retained),'retainedCandidateChanges':retained_changes,
 'approvedBasisByteIdentical':approval,'productionAggregate':{'expected':expected,'actual':aggregate.stdout.strip(),'rc':aggregate.returncode,'stderr':aggregate.stderr},
 'sourceHashes':{p:sha(R/p) for p in source_files},'designCommitFiles':git('diff-tree','--no-commit-id','--name-only','-r',basis).splitlines(),
 'rawEvidenceChecks':raw_checks,'observations':obs_summary,
 'diagnosticLimit':'The inherited diagnostic command uses node name; before/after inspect proves the same ID/config. SR021 requires immutable-ID calls. This audit does not execute Docker or emulate the new recovery parser.',
 'primarySourcesRead':[
 'https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/start.go',
 'https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/stop.go',
 'https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/container/state.go',
 'https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/container/monitor.go',
 'https://docs.docker.com/engine/containers/start-containers-automatically/'],
 'limits':'Read-only source/approved basis/raw API003 receipt audit; no reviewer build, product suite, runtime, VM, provider or live-resource operation. No automatic recovery or negative-control Pass inferred. One attempted web open of api/types/container/inspect.go returned Internal Error; not used as evidence.'
}
result['pass']=not(missing or changes or retained_changes) and all(approval.values()) and aggregate.returncode==0 and aggregate.stdout.strip()==expected and all(preserve.values()) and all(v for k,v in raw_checks.items() if k!='phaseIdentityAndConfigPreserved')
(E/'review-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['pass','inputReferenceCount','uniqueReferenceCount','protectedCount','changedProtected','retainedCandidateCount','retainedCandidateChanges','approvedBasisByteIdentical','productionAggregate','rawEvidenceChecks']},indent=2))
if not result['pass']: raise SystemExit(1)
