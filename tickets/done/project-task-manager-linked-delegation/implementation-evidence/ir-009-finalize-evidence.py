"""Read-only candidate guards plus repeatable IR-009 evidence finalization.

Does not write source/test/index/upstream artifacts or append revision records.
"""
from pathlib import Path
import datetime
import hashlib
import json
import os
import subprocess
import tarfile

W = Path('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation')
T = W / 'tickets/in-progress/project-task-manager-linked-delegation'
E = T / 'implementation-evidence'
I = E / 'ir-009-input'

def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def git(*args, env=None):
    return subprocess.check_output(['git', *args], cwd=W, env=env)

def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')

start = json.loads((I / 'preservation.json').read_text())
candidate = json.loads((E / 'ir-009-package-fingerprints.json').read_text())
assert git('rev-parse', 'HEAD').decode().strip() == start['head'] == candidate['head']
assert git('branch', '--show-current').decode().strip() == candidate['branch']
assert start['stash'] == candidate['stash']
assert start['stash'] in git('stash', 'list', '--format=%H').decode().splitlines()
assert git('rev-parse', start['stash'] + '^1').decode().strip() == '806907faeb567d2b703e10fe984fcd01be0b41fd'
assert not git('ls-files', '-u')
assert sha(I / 'index') == start['index_sha256']
for args in [('diff', 'HEAD', '--check'), ('diff', '--cached', '--check')]:
    assert not git(*args)
(E / 'ir-009-diffcheck.log').write_text('')

tracked = git('diff', 'HEAD', '--name-only', '-z').decode().split('\0')
untracked = git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0')
dirty = sorted({p for p in tracked + untracked if p and not p.startswith('tickets/')})
assert set(dirty) == set(candidate['dirty']) and len(dirty) == 299
assert all(sha(W / p) == h for p, h in candidate['dirty'].items()), 'Candidate bytes changed after validation'
changed = sorted(p for p, h in start['dirty_hashes'].items() if sha(W / p) != h)
assert changed == candidate['localChanged'] and len(changed) == 6
assert sorted(set(dirty) - set(start['dirty_paths'])) == candidate['newDirty']
assert not set(start['dirty_paths']) - set(dirty)
assert len(start['dirty_paths']) == 297
assert all(sha(I / 'dirty' / p) == h for p, h in start['dirty_hashes'].items()), 'Input originals changed'

def index_map(env=None):
    result = {}
    for entry in git('ls-files', '--stage', '-z', env=env).split(b'\0'):
        if not entry:
            continue
        mode_hash_stage, path = entry.split(b'\t', 1)
        result.setdefault(path.decode(), []).append(mode_hash_stage.decode())
    return result

prior_index = index_map({**os.environ, 'GIT_INDEX_FILE': str(I / 'index')})
current_index = index_map()
index_changed = sorted(p for p in prior_index.keys() | current_index.keys()
                       if prior_index.get(p) != current_index.get(p))
assert index_changed == candidate['indexOnlyThreeConflictPathsChanged']

owned = {str(T / name) for name in ['implementation-handoff.md', 'implementation-revision-record.md', 'implementation-investigation.md']}
compiled = {str(W / p) for p in [
    'autobyteus-server-ts/dist/api/graphql/types/collaboration-root-history.js',
    'autobyteus-server-ts/dist/run-history/services/collaboration-root-history-service.d.ts',
    'autobyteus-server-ts/dist/run-history/services/collaboration-root-history-service.d.ts.map',
    'autobyteus-server-ts/dist/run-history/services/collaboration-root-history-service.js',
]}
expected_changed = owned | compiled | {str(W / p) for p in changed}
changed_refs, missing_refs = [], []
for p, info in start['references'].items():
    if not Path(p).is_file():
        missing_refs.append(p)
    elif sha(p) != info['sha256']:
        changed_refs.append(p)
assert not missing_refs
assert set(changed_refs) == expected_changed, 'Unexpected incoming reference drift'
assert len(start['references']) == 2493 and len(changed_refs) == 13
for name in ['implementation-revision-record.md', 'implementation-investigation.md']:
    assert (T / name).read_bytes().startswith((I / name).read_bytes()), 'Prior implementation chronology changed'

durable = candidate['apiDurable20']
assert len(durable) == 20 and all(sha(W / p) == h for p, h in durable.items())
durable_changed = sorted(p for p in durable if sha(W / p) != start['references'][str(W / p)]['sha256'])
assert durable_changed == candidate['apiDurableChangesByImplementation']
assert len(durable_changed) == 1

backup = Path('/Users/normy/autobyteus_org/autobyteus-worktrees/.task-safety-backups/project-task-manager-linked-delegation/sr-019-latest-base')
pre = json.loads((T / 'solution-evidence/sr-019-base-practices/pre-refresh-preservation.json').read_text())
original_hashes = {x['path']: x['sha256OrLink'] for x in pre['files']}
overlaps = json.loads((T / 'solution-evidence/sr-019-base-practices/refresh-result.json').read_text())['automaticIntegrationChangedPaths']
verified_backup = []
with tarfile.open(backup / 'dirty-work.tar.gz', 'r:gz') as archive:
    members = {m.name.removeprefix('./'): m for m in archive.getmembers()}
    for p in overlaps:
        original = archive.extractfile(members[p]).read()
        assert hashlib.sha256(original).hexdigest() == original_hashes[p]
        assert original == git('show', start['stash'] + ':' + p)
        verified_backup.append(p)

sdk = [p for p in start['references'] if any('/' + s + '/dist/' in p for s in
       ['autobyteus-application-backend-sdk', 'autobyteus-application-sdk-contracts'])]
assert all(sha(p) == start['references'][p]['sha256'] for p in sdk)
write(E / 'ir-009-package-preservation.json', {
    'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'result': 'PASS — candidate preservation guards; not source/API acceptance',
    'head': candidate['head'], 'branch': candidate['branch'], 'retainedStash': start['stash'],
    'unmergedPaths': [], 'incomingReferenceCount': 2493, 'missingIncomingReferences': missing_refs,
    'incomingReferencesChanged': sorted(changed_refs),
    'currentChangedReferenceFingerprints': {p: sha(p) for p in sorted(changed_refs)},
    'incomingDirtyPaths': 297, 'currentDirtyPaths': 299, 'unchangedIncomingDirtyBytes': 291,
    'intentionalIncomingDirtyChanges': changed, 'newDirtyUnitFiles': candidate['newDirty'],
    'onlyIndexChanges': index_changed, 'priorIndexBackupSHA256': start['index_sha256'],
    'priorImplementationRevisionAndInvestigationPrefixesExact': True,
    'allIncomingSpecialistEvidenceAndOwnedUpstreamCanonicalsExact': True,
    'incomingSDKOutputsUnchangedCount': len(sdk),
    'currentAPIDurableCount': 20, 'currentAPIDurableChangedByImplementation': durable_changed,
    'other19APIDurableIncomingBytesExact': True,
    'designerOriginalBackup': str(backup / 'dirty-work.tar.gz'),
    'designerBackupSHA256ObservedNow': sha(backup / 'dirty-work.tar.gz'),
    'originalEightBackupBlobsIndependentlyMatchRecordedPreRefreshAndRetainedStash': verified_backup,
    'checkedCandidate': str(E / 'ir-009-package-fingerprints.json'),
    'sourceTestsUnchangedAfterLocalChecks': True,
})
(E / 'ir-009-final-git-status.txt').write_bytes(git('status', '--porcelain=v1', '--untracked-files=all'))
(E / 'ir-009-final-index.txt').write_bytes(git('ls-files', '--stage'))

# Plain path manifest avoids recursive self-hash issues. Include every received
# reference, all cumulative dirty files, all ticket evidence/history, actual
# untouched owner neighbors and integration tests, not only this local delta.
refs = set(start['references']) | {str(W / p) for p in dirty}
for root in [T, W / 'autobyteus-server-ts/src/agent-execution/backends/antigravity',
             W / 'autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity',
             W / 'autobyteus-server-ts/tests/integration/agent-run-collaboration']:
    refs.update(str(p) for p in root.rglob('*') if p.is_file())
refs.update(str(backup / name) for name in ['dirty-work.tar.gz', 'tracked-work.patch', 'preservation.json', 'git-status.txt', 'merge.log'])
refs.update([str(E / 'ir-009-reference-files.json'), str(E / 'ir-009-reference-check.json')])
for path in [E / 'ir-009-reference-files.json', E / 'ir-009-reference-check.json']:
    if not path.exists():
        write(path, [])
refs = sorted(refs)
assert all(Path(p).is_file() and Path(p).is_absolute() for p in refs)
assert not set(start['references']) - set(refs)
assert all(str(W / p) in refs for p in durable)
write(E / 'ir-009-reference-files.json', refs)
write(E / 'ir-009-reference-check.json', {
    'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'existingAbsoluteReferenceCount': len(refs), 'missing': [],
    'all2493IncomingReferencesRetained': True, 'all299CurrentDirtyPathsRetained': True,
    'all20CumulativeAPIDurableFilesRetained': True,
    'includesOriginalStashDesignerBackupStageEvidenceAndFullSpecialistHistory': True,
    'notDeltaOnly': True,
})
print(json.dumps({'preservation': 'PASS', 'incomingReferences': 2493, 'outgoingReferences': len(refs),
                  'currentDirtyPaths': 299, 'intentionalChangedIncoming': 6, 'newDirtyUnits': 2,
                  'indexChangedOnly': index_changed, 'all20APIDurable': True, 'unmerged': 0}))
