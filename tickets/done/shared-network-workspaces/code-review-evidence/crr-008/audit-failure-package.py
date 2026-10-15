"""Read-only CRR008 evidence/identity checks; not a fresh runtime reproduction."""
from pathlib import Path
import hashlib, json, subprocess as sp, datetime, urllib.request
R=Path(__file__).resolve().parents[5]
T=R/'tickets/in-progress/shared-network-workspaces'
E=T/'evidence/api-e2e/api-rev-003'
O=Path(__file__).resolve().parent
assert R.name=='shared-network-workspaces'
def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def write(name,data):(O/name).write_text(json.dumps(data,indent=2)+'\n')
def git(*a):return sp.check_output(['git',*a],cwd=R)
head='8f497a61fde65e44aefd2362f8fb37db91570997'
input_head='e8ed5627da2afa646c9ab89c6ce69b3a0bc0826c'
package=read(E/'package-index.json'); manifest=read(E/'evidence-manifest.json')
refs=package['reference_files']; missing=[p for p in refs if not Path(p).is_file()]
verified=[]; mismatches=[]
for e in manifest['files']:
 p=Path(e['path']); b=p.read_bytes(); actual=sha(b)
 if actual!=e['sha256'] or len(b)!=e['size']:mismatches.append({'path':str(p),'expected':e['sha256'],'actual':actual})
 verified.append({'path':str(p.relative_to(R)),'sha256':actual,'size':len(b)})
changed=git('diff','--name-only',input_head,head).decode().splitlines()
non_ticket=[p for p in changed if not p.startswith('tickets/in-progress/shared-network-workspaces/')]
paths=['autobyteus-nfs/internal/'+p for p in ['cli/run.go','setup/lifecycle.go','setup/apply.go','setup/status.go','setup/setup_test.go','setup/service.go','service/supervisor.go','platform/jobs.go','docker/engine.go','docker/attachment.go','docker/recreate.go','docker/snapshot.go','config/state.go']]
paths+=['tickets/in-progress/shared-network-workspaces/'+p for p in ['requirements-doc.md','approval-record-sr018.md','design-spec.md','investigation-notes.md','solution-revision-record.md','design-review-report.md','architecture-review-revision-record.md','implementation-handoff.md','implementation-revision-record.md']]
identities=[]
for p in paths:
 b=(R/p).read_bytes(); old=git('show',input_head+':'+p)
 identities.append({'path':p,'sha256':sha(b),'equalReviewedInput':b==old})
retained=[]
for f in read(E/'artifact-audit.json')['retainedCandidate']:
 actual=sha(Path(f['path']).read_bytes());retained.append({'path':f['path'],'sha256':actual,'unchanged':actual==f['sha256']})
commands=[]
for args in [[],['--engine-manifest','autobyteus-nfs/out/ir005-local-candidate/engine-candidate/engine-manifest.json']]:
 argv=['python3','-B','autobyteus-nfs/packaging/release.py','--source-hash',*args];p=sp.run(argv,cwd=R,capture_output=True,text=True,timeout=30);commands.append({'argv':argv,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
audit={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputHead':input_head,'reviewHead':head,'referenceCount':len(refs),'missing':missing,'manifestCount':len(verified),'manifestMismatches':mismatches,'manifest':verified,'changedSinceReviewedInput':changed,'nonTicketChanges':non_ticket,'focusedIdentities':identities,'retainedCandidate':retained,'aggregateCommands':commands,'priorReviewReportSHA256':sha(git('show',head+':tickets/in-progress/shared-network-workspaces/code-review-report.md')),'revisionPrefixSHA256':sha(git('show',head+':tickets/in-progress/shared-network-workspaces/code-review-revision-record.md')),'revisionPrefixBytes':len(git('show',head+':tickets/in-progress/shared-network-workspaces/code-review-revision-record.md')),'limits':'Hashes verify identity, not behavior. Only focused evidence/source reviewed; no VM or product tests executed this round.'}
write('focused-audit.json',audit)
assert len(refs)==625 and not missing and not non_ticket
assert all(p['equalReviewedInput'] for p in identities) and all(p['unchanged'] for p in retained)
assert all(p['rc']==0 for p in commands)
# Receipt-only API revision suffix is allowed only after inspection, never ignored as a pass.
assert not mismatches, mismatches
repro=read(E/'managed-reboot-repro-result.json');diag=read(E/'managed-reboot-diagnostic.json');life=read(E/'managed-lifecycle-result.json');native=read(E/'linux-public-final-result.json')
assert repro['result']=='Reproduced' and repro['journeyResult']=='Fail'
assert repro['beforeBoot']!=repro['afterBoot'] and len(repro['observations'])==15
before=repro['beforeSecondReboot']['node'];after=repro['afterSecondReboot']['node']
assert before['State']['Running'] and before['HostConfig']['RestartPolicy']['Name']=='unless-stopped'
assert before['Id']==after['Id'] and before['Config']==after['Config'] and before['HostConfig']==after['HostConfig']
obs=[]
for o in repro['observations']:
 node=o['node'];s=node['State'];assert node['Id']==before['Id'] and not s['Running'] and not s['Restarting'] and not s['OOMKilled']
 assert s['ExitCode']==255 and 'connection refused' in s['Error'] and o['api']['rc']!=0
 status=json.loads(o['status']['stdout']) if o['status'].get('rc')==0 else None
 obs.append({'seconds':o['sinceBootObservationSeconds'],'state':s,'apiRC':o['api']['rc'],'statusRC':o['status'].get('rc'),'status':status})
assert obs[-1]['status']['hostReady'] and obs[-1]['status']['nodes']['autobyteus-server-0']=='attached, stopped (not ready)'
assert not repro['afterReconnect']['node']['State']['Running'] and repro['normalPublicReconnect']['rc']==0
assert repro['diagnosticOnlyStart']['rc']==0 and repro['beforeSecondReboot']['api']['rc']==0
preservation=json.loads(repro['sourceAndMount']['stdout']); assert preservation['sourceHash']==preservation['mountedHash'] and preservation['sourceMarker']==preservation['mountedMarker']
assert native['result']=='Pass' and len(native['cases'])==7 and all(c['status']=='Pass' and c['evidence']['rc']==0 for c in native['cases'])
source_proof=json.loads(native['cases'][2]['evidence']['stdout']);post=json.loads(native['cases'][6]['evidence']['stdout']);assert source_proof==post
assert source_proof['uid']==1000 and source_proof['gid']==109 and source_proof['groups']==[] and source_proof['directoryDelegations']=='Y'
assert source_proof['sourceHash']==source_proof['mountedHash'] and source_proof['sourceMarker']==source_proof['mountedMarker']
journal={}
for name,data in [('firstBoot',diag),('secondBoot',repro)]:
 text=data['journal']['stdout']+'\n'+data['journal'].get('stderr','')
 journal[name]=[l for l in text.splitlines() if any(s in l for s in ['failed to start container','API listen','Starting NFS','ganesha.nfsd Starting','Starting : MAIN','Started autobyteus-nfs','Daemon has completed initialization'])]
write('execution-evidence-review.json',{'result':'Confirmed API-F003 failure mechanism and API-F002 scoped resolution from archived raw evidence; not a new reproduction','firstLifecycleCases':[{k:c[k] for k in ['name','status','seconds']} for c in life['cases']],'secondBootBefore':repro['beforeBoot'],'secondBootAfter':repro['afterBoot'],'selectedID':before['Id'],'selectedImage':before['Image'],'restartPolicy':before['HostConfig']['RestartPolicy'],'sameIDConfigHostConfigAcrossSecondBoot':True,'publicReconnectRC':repro['normalPublicReconnect']['rc'],'publicReconnectStatus':json.loads(repro['normalPublicReconnect']['stdout']),'diagnosticOnlyStartRestoresSameNode':True,'observations':obs,'journalExtract':journal,'preservation':preservation,'nativePriorFailureResolution':{'cases':[{k:c[k] for k in ['name','status','seconds']} for c in native['cases']],'proof':source_proof,'binary':native['binary'],'sourceHash':native['metadata']['sourceHash']},'cleanupResult':read(E/'cleanup.json')['result'],'limits':['No deadline guarantee inferred from 150s observation; source shows no selected-node recovery path','Manual start is diagnostic, not automatic recovery Pass','No physical-peer/other OS/other Docker version generalization','No fresh runtime/UI/test-suite execution by reviewer']})
fetch=[]
for url,patterns in [
 ('https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/daemon.go',['for c, notifyChan := range restartContainers','daemon.containerStart(context.Background(), cfg, c','failed to start container']),
 ('https://raw.githubusercontent.com/moby/moby/docker-v29.1.3/daemon/start.go',['daemon.setupMounts','container.SetError','SetError']),
 ('https://docs.docker.com/engine/containers/start-containers-automatically/',[])]:
 with urllib.request.urlopen(url,timeout=30) as res:b=res.read();status=res.status
 lines=b.decode().splitlines();fetch.append({'url':url,'http':status,'sha256':sha(b),'size':len(b),'lineHits':{p:[i+1 for i,l in enumerate(lines) if p in l] for p in patterns}})
write('primary-contracts-fetch.json',{'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':fetch,'earlierLookupErrors':['Raw moby v29.1.3 tag (without docker- prefix) yielded404 in web lookup; corrected public tag used. No conclusion drawn from failed URLs.'],'limits':'Upstream tag is mechanism context, not byte equality of Ubuntu distro engine. Installed Docker29.1.3 is from API journal/provenance; two actual boot logs establish this failure.'})
print(json.dumps({'reviewHead':head,'references':len(refs),'manifestVerified':len(verified),'focusedIdentities':len(identities),'retained':len(retained),'result':'Pass evidence consistency; runtime failure confirmed','primaryFetch':len(fetch)}))
