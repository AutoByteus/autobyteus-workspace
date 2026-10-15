"""Read-only acceptance alignment/integrity checks; not runtime or source re-review."""
from pathlib import Path
import hashlib, json, subprocess
ROOT = Path(__file__).resolve().parents[5]
T = ROOT / 'tickets/in-progress/shared-network-workspaces'
E = Path(__file__).resolve().parent
INPUT = 'b1af17feda2dd4d3825ce6b3e727ce4114283c16'
SOURCE = 'd3c88f37c30ee74a89a95a4f6906992667c9b875'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode()
def read(name):
    return json.loads((T/name).read_text())
idx = read('evidence/acceptance-revision/sr024/package-index.json')
refs = idx['reference_files']
assert len(refs) == len(set(refs)) == 1610
assert all(Path(p).is_file() for p in refs)
assert not git('diff', '--name-only', SOURCE, INPUT, '--', '.', ':!tickets/in-progress/shared-network-workspaces').strip()
assert not git('diff', '--name-only', INPUT, '--', '.', ':!tickets/in-progress/shared-network-workspaces').strip()
focused = ['requirements-doc.md','approval-record-sr024.md','requirements-approval-request.md','design-spec.md','investigation-notes.md','solution-revision-record.md','solution-design-handoff.md','code-review-report.md','code-review-revision-record.md','api-e2e-execution-coverage-report.md','api-e2e-test-case-ledger.md','api-e2e-revision-record.md','implementation-handoff.md','evidence/acceptance-revision/sr024/acceptance-disposition.md','evidence/acceptance-revision/sr024/final-audit.json','evidence/api-e2e/api-rev-006/prior-failure-resolution.json','evidence/api-e2e/api-rev-006/peer-network-confirm-result.json','evidence/api-e2e/api-rev-006/mac-native-result.json','evidence/api-e2e/api-rev-006/mac-volume-result.json','evidence/api-e2e/api-rev-006/mac-controls-confirm-v2-result.json']
hashes={}
for f in focused:
    p=T/f; h=hashlib.sha256(p.read_bytes()).hexdigest()
    assert idx['manifest'][str(p)]['sha256']==h, f
    hashes[f]=h
api='evidence/api-e2e/api-rev-006/'
native=read(api+'mac-native-result.json'); vol=read(api+'mac-volume-result.json')
resolution=read(api+'prior-failure-resolution.json'); peer=read(api+'peer-network-confirm-result.json')
assert native['result']==vol['result']=='Pass'
assert native['binary']['sha256']==resolution['binary']['sha256']
assert resolution['sourceCommit']==SOURCE
obs=resolution['observations'][:3]
assert len(set(o['bootID'] for o in obs))==3
assert len(set(o['stat'].split(':')[0] for o in obs))==2
assert len(set(o['stat'].split(':',1)[1] for o in obs))==1
assert len(set(o['bindingSHA256'] for o in obs))==1
assert len(set(o['volume']['VolumeUUID'] for o in obs))==1
r=resolution['replacementVolumes']
assert r[0]['stat']==r[1]['stat']==r[2]['stat']
assert r[0]['volume']['VolumeUUID']==r[2]['volume']['VolumeUUID']!=r[1]['volume']['VolumeUUID']
assert peer['tcp22']['rc']==peer['tcp2049']['rc']==1
assert 'timed out' in peer['tcp22']['stderr'] and 'No route to host' in peer['tcp2049']['stderr']
old=git('show', INPUT+':tickets/in-progress/shared-network-workspaces/architecture-review-revision-record.md')
new=(T/'architecture-review-revision-record.md').read_text()
assert new.split('## Revision Entries',1)[1].startswith(old.split('## Revision Entries',1)[1])
report=(T/'design-review-report.md').read_text()
assert len([l for l in report.splitlines() if l.startswith('## ')])==28
assert 'ARCH-REV-008' in report and 'Approved SR024' in report
assert 'Blocked67.86%' in report and 'IV-F01' in report
result={'result':'PASS','scope':'Acceptance/design alignment; no runtime tests or repeated technical source audit','inputCommit':INPUT,'sourceCommit':SOURCE,'referencesExist':len(refs),'focusedInputHashes':hashes,'productionDeltaFromSource':[],'priorArchitectureEntriesExactPrefix':True,'reportSections':28,'scopedEvidence':{'nativeMacResult':native['result'],'bootIds':[o['bootID'] for o in obs],'sourceStats':[o['stat'] for o in obs],'sameBindingAndVolume':True,'replacementSameStatDifferentVolume':True,'macGuestPeerTCP22':peer['tcp22']['stderr'].strip(),'macGuestPeerTCP2049':peer['tcp2049']['stderr'].strip()},'notClaimed':['All input hashes re-audited','Full source re-review','New API score or Pass','Peer filesystem proof from self-mount','Physical/native-agent/personal/release qualification']}
(E/'review-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['focusedInputHashes','scopedEvidence']},indent=2))
