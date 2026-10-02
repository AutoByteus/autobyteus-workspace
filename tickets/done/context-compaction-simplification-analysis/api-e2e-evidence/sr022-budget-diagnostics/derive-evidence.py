"""Offline reconciliation only. Never calls a provider or reads a credential source."""
import datetime
import hashlib
import json
import pathlib
import subprocess

E = pathlib.Path(__file__).resolve().parent
T = E.parent.parent
W = T.parent.parent.parent
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
dump = lambda p, d: p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
compact = lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))
entry = read(E / 'entry-audit.json')
frozen_path = T / 'solution-recovery-evidence/sr022/frozen-requests.json'
frozen = read(frozen_path)
wire = [json.loads(line) for line in (E / 'wire.jsonl').read_text().splitlines()]
requests = [r for r in wire if r['event'] == 'wire_request']
responses = [r for r in wire if r['event'] == 'wire_response']
statuses = [r for r in wire if r['event'] == 'wire_status']
assert len(requests) == len(responses) == len(statuses) == 4
assert [r['arm'] for r in requests] == frozen['order']
assert [r['status'] for r in statuses] == [200] * 4
controls = [{k: v for k, v in r['body'].items() if k != 'messages'} for r in requests]
assert all(c == {'model': 'deepseek-v4-flash', 'temperature': 0.7, 'max_completion_tokens': 8192} for c in controls)
assert not [r for r in wire if r['event'] in ['guard_stop', 'campaign_stop', 'wire_error']]
rows = []
for i, arm in enumerate(frozen['order']):
    case, variant = arm.split('-')
    expected = next(c for c in frozen['cases'] if c['id'] == case)
    rec = read(E / (arm + '.json'))
    req, res = requests[i], responses[i]
    assert req['body']['messages'] == rec['requestedMessages'] == expected[variant]
    assert hashlib.sha256(compact(req['body']['messages']).encode()).hexdigest() == expected[variant + 'Sha256'] == rec['requestedMessagesSha256']
    assert res['choices'][0]['content'] == rec['response']['content']
    assert res['choices'][0]['finish_reason'] == 'stop'
    assert rec['parseValid'] and rec['acceptedByOutputContract']
    assert rec['response']['completionStatus'] == 'complete'
    assert rec['extractedBody'].count('\n## ') == 5
    assert rec['elapsedMs'] < 400000
    rows.append({
        'arm': arm, 'httpStatus': 200, 'requestModel': req['body']['model'],
        'responseModelLabel': res['model'], 'requestMessagesSha256': rec['requestedMessagesSha256'],
        'bodyUnicodeCodePoints': len(rec['extractedBody']),
        'visibleUnicodeCodePointsIncludingMarkers': len(rec['response']['content']),
        'bodyUtf16CodeUnits': rec['bodyCharacters'], 'visibleUtf16CodeUnitsIncludingMarkers': rec['visibleCharacters'],
        'completionTokensIncludingReasoning': rec['outputTokens'],
        'reasoningTokens': rec['reasoningOutputTokens'],
        'derivedNonReasoningCompletionTokensIncludingMarkers': rec['derivedNonReasoningOutputTokens'],
        'elapsedMs': rec['elapsedMs'], 'completionStatus': 'complete', 'finishReason': 'stop',
        'outputContract': 'Pass',
        'manualFidelity': 'Fail — unsupported broader constraints; immediate anchors/status retained' if arm == 'F-withTarget' else 'Pass — scoped good/usable, with concision caveats',
        'manualEvidence': 'semantic-adjudication.md',
    })
pairs = []
for case in ['F', 'R']:
    a = next(r for r in rows if r['arm'] == case + '-withTarget')
    b = next(r for r in rows if r['arm'] == case + '-withoutTarget')
    pairs.append({'case': case, 'withoutMinusWithBodyCodePoints': b['bodyUnicodeCodePoints'] - a['bodyUnicodeCodePoints'],
                  'withoutMinusWithBodyPercent': round((b['bodyUnicodeCodePoints'] / a['bodyUnicodeCodePoints'] - 1) * 100, 2),
                  'withoutMinusWithDerivedNonReasoningTokens': b['derivedNonReasoningCompletionTokensIncludingMarkers'] - a['derivedNonReasoningCompletionTokensIncludingMarkers'],
                  'withoutMinusWithReasoningTokens': b['reasoningTokens'] - a['reasoningTokens']})
dump(E / 'comparison.json', {'scope': 'Four fixed diagnostic samples, not API acceptance or a reliability rate',
    'controls': controls[0], 'arms': rows, 'pairs': pairs,
    'measurementNote': 'Raw bodyCharacters/visibleCharacters are JS UTF-16 code units. Derived code-point lengths are not grapheme counts or exact Markdown token counts. Completion usage includes reasoning; subtraction is labelled derived and includes output markers.',
    'rawEvidenceImmutable': True, 'noCausalClaim': True})
ex = read(E / 'execution.json')
worker = read(E / 'worker.json')
pids = [ex['pid'], worker['pid'], read(E / 'setup-attempt-1/execution.json')['pid']]
pid_checks = {str(pid): subprocess.run(['ps', '-p', str(pid), '-o', 'pid=,comm='], capture_output=True, text=True).stdout.strip() for pid in pids}
ports = [ex['serverUrl'].rsplit(':', 1)[1], read(E / 'setup-attempt-1/execution.json')['serverUrl'].rsplit(':', 1)[1]]
port_checks = {port: subprocess.run(['lsof', '-nP', '-iTCP:' + port, '-sTCP:LISTEN'], capture_output=True, text=True).stdout.strip() for port in ports}
owned_paths = [ex['runtimeRoot'], ex['database']['databasePath'], ex['database']['rootKeyPath']]
removed = {p: not pathlib.Path(p).exists() for p in owned_paths}
durable = {p: {'sha256': sha(W / p), 'unchanged': sha(W / p) == h} for p, h in entry['durableHashes'].items()}
authorities = {p: {'sha256': sha(T / p), 'unchanged': sha(T / p) == h} for p, h in entry['authorityHashes'].items()}
source_diff = subprocess.check_output(['git', 'diff', 'HEAD', '--name-only', '--', 'autobyteus-ts/src', 'autobyteus-server-ts/src', 'autobyteus-web', 'packages'], cwd=W, text=True).splitlines()
assert all(d['unchanged'] for d in durable.values()) and all(d['unchanged'] for d in authorities.values())
assert not source_diff and all(removed.values()) and not any(pid_checks.values()) and not any(port_checks.values())
assert sha(frozen_path) == entry['frozenFileSha256']
for data in [wire, [read(E / (arm + '.json')) for arm in frozen['order']]]:
    serialized = json.dumps(data)
    assert 'reasoning_content' not in serialized and '"authorization"' not in serialized.lower()
dump(E / 'final-audit.json', {
    'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=W, text=True).strip(),
    'durableHashes': durable, 'authorityHashes': authorities, 'frozenFileUnchanged': True,
    'productionDiff': source_diff, 'outboundGenerations': 4, 'fixedOrderAndExactRequestsVerified': True,
    'rawHiddenReasoningAndAuthHeadersAbsentFromWireAndArmJson': True,
    'cleanup': {'pidObservations': pid_checks, 'listeningPortObservations': port_checks, 'ownedPathsRemoved': removed, 'runnerCleanup': ex['cleanup']},
    'evidenceHashes': {p.name: sha(p) for p in E.iterdir() if p.is_file() and p.name not in ['final-audit.json', 'reference-index.json', 'handoff-rules.json', 'coordination-receipt.json', 'derivation.log']},
    'limits': ['No production/durable edits', 'No API005 restart/new API006/confidence rescore', 'No model-wide reliability/causal claim', 'No planner/commit/UI/retry/resume proof', 'Qwen stopped; v6 excluded']})
print(json.dumps({'arms': rows, 'pairs': pairs, 'audit': 'Pass'}, indent=2))
