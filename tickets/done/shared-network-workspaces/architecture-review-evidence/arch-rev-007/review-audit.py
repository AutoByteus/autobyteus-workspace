"""ARCH007 read-only source, retained-receipt and package audit; no product execution."""
from pathlib import Path
import collections
import hashlib
import json
import plistlib
import re
import subprocess

E = Path(__file__).resolve().parent
T = E.parent.parent
R = T.parent.parent.parent
D = T / 'evidence/design-recovery/sr023'
A = T / 'evidence/api-e2e/api-rev-005'
BASE = 'a4be96c45d4e9799c3dc18fc6b690b7edf579477'
OWN = {str(T / n) for n in ['design-review-report.md', 'architecture-review-revision-record.md']}


def read(p):
    return json.loads(p.read_text())


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=R, text=True).strip()


def verify(items):
    checked = 0
    for name, x in items.items():
        if name in OWN:
            continue
        p = Path(name)
        assert p.stat().st_size == x['bytes'] and digest(p) == x['sha256'], name
        checked += 1
    return checked


idx, inp, final = [read(D / n) for n in ['package-index.json', 'input-audit.json', 'final-audit.json']]
refs = idx['reference_files']
assert len(refs) == len(set(refs)) == 1346 and all(Path(p).is_file() for p in refs)
assert set(inp['reference_files']) <= set(refs)
counts = {'references': len(refs), 'incoming': len(inp['reference_files']),
          'manifestExcludingReviewerAuthorities': verify(final['manifest']),
          'protectedExcludingReviewerAuthorities': verify(inp['protected']),
          'oldDistFiles': verify(inp['dist'])}
# The four current designer authorities plus self-excluded final/index documents are also
# checked against the accepted design commit, not inferred from an old manifest.
for name in list(final['ownedAfter']) + [str(D / 'final-audit.json'), str(D / 'package-index.json')]:
    p = Path(name)
    assert subprocess.check_output(['git', 'show', BASE + ':' + str(p.relative_to(R))], cwd=R) == p.read_bytes()
assert not [p for p in git('diff', '--name-only', 'd65aeda24fc4b9a534a3941b194dd4a55b88c00c', BASE).splitlines() if not p.startswith('tickets/')]
for name in ['requirements-doc.md', 'approval-record-sr017.md', 'approval-record-sr018.md']:
    p = T / name
    assert subprocess.check_output(['git', 'show', '9d0ff246a71988c911cddbd4148fcec16f89db3f:' + str(p.relative_to(R))], cwd=R) == p.read_bytes()
assert (T / 'solution-revision-record.md').read_bytes().startswith((D / 'prior-solution-revision-record.md').read_bytes())

prototype = read(D / 'prototype-result.json')
obs = prototype['observations']
assert prototype['result'] == 'Pass' and len(obs) == 11
by = {x['label']: x for x in obs}
base = by['baseline']
decoded_outputs = []
for c in prototype['commands']:
    if c.get('rc') == 0:
        try:
            decoded_outputs.append(json.loads(c.get('stdout', '')))
        except json.JSONDecodeError:
            pass
for o in obs:
    raw = plistlib.loads(o['rawPlist'].encode())
    assert raw['VolumeUUID'].lower() == o['identity']['volumeUuid']
    assert raw['DeviceNode'] == o['mountedDevice'] and raw['MountPoint'] == o['volumeMountPoint']
    assert raw['FilesystemType'] == 'apfs' and 'Mounted' not in raw
    assert o['uid'] == 501 and o['gid'] == 20 and o['mode'] == '755'
    helper = {k: v for k, v in o.items() if k not in ['label', 'bootAndHashes']}
    assert helper in decoded_outputs, o['label']
    assert [l.split()[0] for l in o['bootAndHashes'].splitlines()[1:]] == [l.split()[0] for l in base['bootAndHashes'].splitlines()[1:]]
bootrows = [by[x] for x in ['baseline', 'ordinary-boot-1', 'ordinary-boot-2', 'ordinary-boot-3']]
assert len({o['bootAndHashes'].splitlines()[0] for o in bootrows}) == 4
assert all(o['identity'] == prototype['savedIdentity'] for o in bootrows)
assert [o['deviceObservation'] for o in bootrows] == [16777229, 16777230, 16777230, 16777228]
rep = by['replacement-directory']
assert rep['identity']['inode'] != base['identity']['inode'] and rep['identity']['volumeUuid'] == base['identity']['volumeUuid']
one, two = by['APFS-volume-1'], by['APFS-volume-2']
assert one['source'] == two['source'] and one['deviceObservation'] == two['deviceObservation'] == 16777241
assert one['identity']['inode'] == two['identity']['inode'] == 2
assert one['identity']['volumeUuid'] != two['identity']['volumeUuid']
assert by['original-APFS-volume-reattached']['identity'] == one['identity']
assert by['final-original']['identity'] == base['identity']
assert len(prototype['controls']) == 5 and all(c['refused'] for c in prototype['controls'])
for error in ['not real directory', 'symlink ancestor', 'permission denied']:
    assert any(c.get('rc') == 1 and error in c.get('stdout', '') for c in prototype['commands'])
build = read(D / 'probe-build.json')
assert {b['env']['GOARCH'] for b in build} == {'amd64', 'arm64'}
assert all(b['rc'] == 0 and b['env']['CGO_ENABLED'] == '0' for b in build)
assert next(b['sha256'] for b in build if b['env']['GOARCH'] == 'arm64') == prototype['probeSHA256']
cleanup = read(D / 'cleanup.json')
assert cleanup['result'] == 'Complete' and not cleanup['productResourcesCreated']
assert all(cleanup[k] for k in ['ownCloneAbsent', 'ownProcessAbsent', 'ownScratchAbsent', 'publicBaselineRetained'])
last_list = [c for c in cleanup['commands'] if c['argv'][-3:] == ['list', '--format', 'json']][-1]
assert prototype['vm'] not in [x['Name'] for x in json.loads(last_list['stdout'])]
assert not Path((D / 'scratch-path.txt').read_text().strip()).exists()

# Independent re-read of the incoming observed product failure; no script/VM rerun.
native = read(A / 'mac-native-result.json')
second = read(A / 'mac-reboot-confirm-result.json')
third = read(A / 'mac-volume-boot-result.json')
assert native['result'] == 'Fail' and all(x['status'] == 'Pass' for x in native['cases'])
err = 'selected source device/inode changed; no replacement will be exported'
macrows = []
for name, d in [('second', second), ('third', third)]:
    for q in d['observations']:
        raw, src = q['stdout'], d['source']
        m = re.search(r'^(\d+):(\d+):(\d+):(\d+):(\d+):' + re.escape(src) + r'$', raw, re.M)
        current = list(map(int, m.groups()))
        h = json.JSONDecoder().raw_decode(raw[raw.index('{\n  "installationId"'):])[0]
        assert current[1:] == [506781, 501, 20, 755] and h['identity'] == {'device': 16777228, 'inode': 506781}
        assert current[0] != h['identity']['device'] and err in raw and 'nfsd is running' in raw
        assert ' on /Volumes/autobyteus-shared ' not in raw
        volume = None
        if name == 'third':
            v = plistlib.loads(re.search(r'<\?xml.*?</plist>', raw, re.S).group(0).encode())
            volume = v['VolumeUUID']
            assert volume == 'A19FE379-BE62-4297-9A39-3934CC88214B' and v['DeviceNode'] == '/dev/disk2s5'
        macrows.append({'round': name, 'identity': current, 'volumeUuid': volume})
    assert d['diagnosticReconnect']['rc'] == 1 and err in d['diagnosticReconnect']['stderr']
    assert all(q['rc'] == 1 and json.loads(q['stdout'])['hostReady'] is False for q in d['statusObservations'])
assert len(macrows) == 9
assert len({native['beforeBoot'], second['beforeSecondBoot'], second['afterSecondBoot'], third['afterThirdBoot']}) == 4

visibility, names = [], set()
for name in ['visibility-result.json', 'docker-visibility-result.json']:
    d = read(A / name)
    assert d['result'] == 'Pass'
    cases = [c for p in d['phases'] for c in p['cases']]
    assert len(cases) == 20
    assert all(p['uid'] == 1000 and p['gid'] == 109 and p['groups'] == [] for p in d['phases'])
    assert d['activationEvidence']['rc'] == 0 and d['activationEvidence']['stdout'].count('Attr_Expiration_Time = 0;') == 1
    maximum = {'native': 0, 'http': 0}
    for c in cases:
        assert c['file'] not in names
        names.add(c['file'])
        assert c['sourceSHA256'] == c['expectedSHA256'] != c['initialSHA256']
        for label, reader in c['readers'].items():
            exact = [x for x in reader['rows'] if x.get('sha256') == c['expectedSHA256'] and x.get('size') == c['size']]
            assert reader['result'] == 'Pass' and exact and 0 <= reader['firstExactSeconds'] <= 5
            assert exact[0]['seconds'] == round(reader['firstExactSeconds'], 6)
            maximum[label] = max(maximum[label], reader['firstExactSeconds'])
    assert dict(collections.Counter(c['kind'] for c in cases)) == {'inplace': 12, 'atomic': 4, 'new': 4}
    visibility.append({'evidence': name, 'fixtures': 20, 'readerChecks': 40, 'maxSeconds': maximum})

report = {'result': 'Pass — scoped evidence audit, not product execution', 'inputCommit': BASE,
          'counts': counts, 'productionAndApprovalUnchanged': True, 'solutionHistoryPrefixPreserved': True,
          'prototypeObservations': [{k: v for k, v in o.items() if k not in ['rawPlist', 'bootAndHashes']} for o in obs],
          'prototypeOnly': True, 'prototypeCleanupComplete': True, 'macProductFailureRows': macrows,
          'priorFreshnessResolution': visibility, 'uniqueFreshnessFixtures': len(names),
          'limits': 'No reviewer build, product test, VM, root, mount, Docker, app or provider operation. CRR012/API005 Fail remain. No physical/release/user qualification.'}
(E / 'review-checks.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': report['result'], 'counts': counts, 'prototypeRows': len(obs), 'apiMacRows': len(macrows), 'freshnessChecks': 80}))
