"""Read-only failure-package/source analysis; does not rerun a retired VM or alter product code."""
from pathlib import Path
import ast, hashlib, io, json, subprocess, tarfile
E = Path(__file__).resolve().parent
T = E.parent.parent
R = T.parent.parent.parent
A = T / 'evidence/api-e2e/api-rev-004'
INPUT = 'b5167131bfb4e93fc2a8d8216e83ac791d207cc7'
SOURCE = 'd318bd9db935affdf16d141ef4e88a6c0e4939b5'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=R)
def sha(b):
    return hashlib.sha256(b).hexdigest()
def read(n):
    return json.loads((A / n).read_text())
def save(n, j):
    (E / n).write_text(json.dumps(j, indent=2) + '\n')
refs = read('package-index.json')['reference_files']
assert len(refs) == len(set(refs)) == 992
assert all(Path(p).is_file() for p in refs)
delta = git('diff', '--name-only', SOURCE, INPUT).decode().splitlines()
assert all(p.startswith('tickets/in-progress/shared-network-workspaces/') for p in delta)
assert git('diff', SOURCE, '--', 'autobyteus-nfs', 'scripts', 'autobyteus-server-ts') == b''
prior_record = git('show', INPUT + ':tickets/in-progress/shared-network-workspaces/code-review-revision-record.md')
assert (T / 'code-review-revision-record.md').read_bytes().startswith(prior_record)
retained = read('retained-input-audit.json')['files']
for f in retained:
    b = Path(f['path']).read_bytes()
    assert len(b) == f['size'] and sha(b) == f['sha256'], f['path']
assert len(retained) == 15
upstream = []
for p in refs:
    q = Path(p)
    if q.name in ['code-review-report.md', 'code-review-revision-record.md']:
        continue
    upstream.append({'path': p, 'sha256': sha(q.read_bytes()), 'bytes': q.stat().st_size})
report = git('show', INPUT + ':tickets/in-progress/shared-network-workspaces/code-review-report.md')
save('input-audit.json', dict(inputHead=INPUT, sourceCommit=SOURCE, referenceCount=len(refs), noProductionOrDurableTestDelta=True,
    priorReportSHA256=sha(report), priorRecordSHA256=sha(prior_record), priorRecordBytes=len(prior_record),
    retainedCandidateCount=len(retained), retainedCandidates=retained, inputChangedTicketPaths=delta,
    upstreamFiles=upstream, generatedOutputLimit='Five preexisting dist trees are outside audit; no byte-identity claim.'))
j = read('visibility-repro-result.json'); rep = j['reproduction']
assert j['result'] == rep['result'] == 'Fail'
assert rep['sourceMarker'] == rep['mountedMarker'] == {'storageId': '982e2025-961c-4b25-ab83-24ff06debcfa'}
trials = []
for t in rep['trials']:
    rows = t['rows']; expected = t['expectedSHA']; old = t['initialSHA']
    assert t['size'] == 1024 and t['sourceSHAAfter'] == expected and expected != old
    assert t['sourceFileInodeUnchanged'] and t['sourceMtimeNsAfter'] != t['sourceMtimeNsBefore']
    assert t['result'] == 'Fail' and rows[0]['seconds'] < 1
    assert all(a['seconds'] < b['seconds'] for a, b in zip(rows, rows[1:]))
    first = {}
    for channel in ['native', 'http']:
        key = channel + 'SHA'
        first[channel] = next(r['seconds'] for r in rows if r[key] == expected)
        assert first[channel] == t['freshAtSeconds'][channel] > 60
        assert all(r[key] == old for r in rows if r['seconds'] < first[channel])
    trials.append(dict(file=t['file'], size=t['size'], observations=len(rows), firstFreshSeconds=first,
        firstStaleBeyondFiveSeconds=next(r for r in rows if r['seconds'] > 5), lastStale=rows[-2], firstFresh=rows[-1],
        sourceMtimeNsBefore=t['sourceMtimeNsBefore'], sourceMtimeNsAfter=t['sourceMtimeNsAfter'],
        sourceFileInodeUnchanged=True, sourceSHAAfter=expected, result='Fail'))
assert len(trials) == 2 and len(set(t['file'] for t in trials)) == 2
stdout = j['configuration']['stdout']
conf, rest = stdout.split('\n192.168.64.4:', 1)
assert 'Attr_Expiration_Time' not in conf
assert 'FSAL { Name = VFS; }' in conf and j['source'] in conf
assert all(x in rest for x in ['acregmin=1,acregmax=1,acdirmin=1,acdirmax=1', 'hard', 'vers=4.1'])
assert stdout.endswith('active\nactive\nY\n')
node = json.JSONDecoder().raw_decode(rest[rest.index('[\n'):])[0][0]
assert node['State']['Running'] and node['Id'] == 'c40d2221e0c821ea1a2c44cc9eba5c0fdf3a67179adeca98046ba7687a62a487'
proof = read('native-peer-confirm-result.json')['cases'][0]['evidence']['stdout']
assert '0036ccef0bbb2a2510064f2e882b692687a2288eb25563d89f9c4ac9150c860c' in proof
assert proof.count('4.3-8ubuntu1+autobyteus1 arm64') == 2
script = (A / 'reproduce-visibility.py').read_text(); ast.parse(script)
assert "with p.open('wb') as f:f.write(b);f.flush();os.fsync(f.fileno())" in script
assert "s=p.stat();write(p,b);t=time.monotonic()" in script
assert "direct=(mnt/n).read_bytes();api=http(n)" in script
# Raw argv includes the executed guest script; preserve hashes and compare, not a new live execution.
assert any('os.fsync(f.fileno())' in str(c['argv']) for c in j['commands'])
closure = {}
for n in ['two-reboots-result.json', 'normal-stop-result.json', 'policy-veto-result.json', 'node-upgrade-result.json', 'drained-detach-confirm-result.json']:
    k = read(n)
    assert k['result'] == 'Pass' and all(c['status'] == 'Pass' for c in k['cases'])
    closure[n] = dict(sha256=sha((A/n).read_bytes()), cases=[c['name'] for c in k['cases']])
boots = read('two-reboots-result.json')
assert len(boots['boots']) == 2
for b in boots['boots']:
    assert b['oldBoot'] != b['newBoot']
for c in boots['commands']:
    cmd = c['argv'][-1]
    assert 'docker start ' not in cmd and ' reconnect ' not in cmd
before, after = boots['before'], boots['lastInspect']
assert before['Id'] == after['Id'] and before['Image'] == after['Image'] and before['Config'] == after['Config']
assert sorted(before['Mounts'], key=lambda x:x['Destination']) == sorted(after['Mounts'],key=lambda x:x['Destination'])
assert before['NetworkSettings']['Ports'] == after['NetworkSettings']['Ports']
for net in before['NetworkSettings']['Networks']:
    assert before['NetworkSettings']['Networks'][net]['Aliases'] == after['NetworkSettings']['Networks'][net]['Aliases']
x,y = before['HostConfig'].copy(),after['HostConfig'].copy()
for z in [x,y]:
    if z.get('Dns') is None:z['Dns']=[]
assert x == y
assert read('cleanup.json')['result'] == 'Complete'
save('execution-evidence-review.json', dict(result='Fail confirmed / prior F003 scoped resolution accepted',
    evidenceType='Independent audit of inherited real execution, not reviewer runtime rerun', trials=trials,
    nativeConfig=conf, nativeCLIAndPackages=proof, nodeID=node['Id'], nodeImage=node['Image'],
    source=j['source'], markers=rep['sourceMarker'], priorFailureClosure=closure,
    boots=[{k:v for k,v in b.items() if k!='readiness'} for b in boots['boots']],
    corrections='API004 evidence-identity-corrections.json governs inherited helper envelopes; no fresh package absence credited.',
    limits=['Freshness timestamps measured after both serial reads, ~0.5s sampling, not exact instant per reader.',
        'No packet/cache instrumentation or fix experiment; exact sole cause not established.',
        'Native Linux storage reproduced. Shared config path is not Docker STORAGE reproduction.',
        'No real-provider/physical/independent-peer proof inferred.']))
clues=read('visibility-source-clues.json'); archive=Path(clues['archive']); raw=archive.read_bytes()
assert sha(raw)==clues['sha256']=='eed35ab4b732ac05d2afc3531e70cdc27031fb414fdb52a0daf093f33daaec0a'
with tarfile.open(fileobj=io.BytesIO(raw)) as a:
    original=a.extractfile('nfs-ganesha_4.3.orig.tar.gz').read()
    debian=a.extractfile('nfs-ganesha_4.3-8ubuntu1+autobyteus1.debian.tar.xz').read()
assert sha(original)==clues['originalSourceSHA256']
spans={'src/include/nfs_exports.h':[(181,188)], 'src/support/exports.c':[(65,73),(1999,2010),(2074,2085),(3385,3414)],
 'src/FSAL/Stackable_FSALs/FSAL_MDCACHE/mdcache_helpers.c':[(815,830),(3560,3577)],
 'src/FSAL/Stackable_FSALs/FSAL_MDCACHE/mdcache_int.h':[(788,825),(865,916)],
 'src/FSAL/Stackable_FSALs/FSAL_MDCACHE/mdcache_handle.c':[(915,1035)],
 'src/doc/man/ganesha-export-config.rst':[(64,74)]}
files=[]
with tarfile.open(fileobj=io.BytesIO(original)) as a:
    for p,ranges in spans.items():
        b=a.extractfile('nfs-ganesha-4.3/'+p).read(); lines=b.decode().splitlines()
        files.append(dict(member='nfs-ganesha-4.3/'+p,sha256=sha(b),excerpts=[dict(start=lo,end=hi,text='\n'.join(lines[lo-1:hi])) for lo,hi in ranges]))
with tarfile.open(fileobj=io.BytesIO(debian)) as a:
    patches=[]
    for m in a.getmembers():
        if m.isfile() and '/patches/' in m.name:
            b=a.extractfile(m).read(); txt=b.decode(errors='replace')
            if any(x in txt for x in ['Attr_Expiration_Time','EXPORT_DEFAULT_CACHE_EXPIRY','expire_time_attr','mdcache_is_attrs_valid']):
                patches.append(m.name)
save('engine-source-audit.json',dict(archive=str(archive),sha256=sha(raw),originalSHA256=sha(original),files=files,
    debianPatchesMentioningAttributeExpiry=patches,scope='Read-only exact retained corresponding source; no extraction/build/install or runtime root-cause experiment.'))
print(json.dumps(dict(result='Pass evidence audit; API-F004 remains Fail',references=len(refs),retainedCandidates=len(retained),trials=trials,sourceFiles=len(files),expiryPatchMentions=patches),indent=2))
