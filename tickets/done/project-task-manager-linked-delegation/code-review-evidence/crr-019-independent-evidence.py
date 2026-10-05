from pathlib import Path
from collections import Counter
import json, hashlib, datetime

W = Path.cwd()
T = W / 'tickets/in-progress/project-task-manager-linked-delegation'
C = T / 'code-review-evidence'
D = T / 'solution-evidence/sr-020-causal-investigation'
read = lambda p: json.loads(p.read_text())
raw = lambda p: [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
a = read(D / 'sr-020-claude-concrete-agent_org.json')
r = read(D / 'sr-020-claude-failed-exact-retry.json')
w = read(D / 'final-witness.json')
events = raw(D / 'owner-debugger.jsonl')
by = lambda name: [e for e in events if e['event'] == name]
problem = 'AgentRun termination cannot settle while submitted input remains unresolved.'

def leaf_messages(error):
    children = (error.get('errors') or []) + ([error['cause']] if error.get('cause') else [])
    return [m for c in children for m in leaf_messages(c)] if children else [error['message']]

begins, roots = by('root-begin'), by('root-proofs')
assert len(begins) == len(roots) == 2
assert begins[0]['value'] == begins[1]['value']
assert roots[0]['value']['actual'] == roots[1]['value']['actual']
root_receipts = []
for event in roots:
    value = event['value']
    assert len(value['proofs']) == 2
    for proof in value['proofs']:
        assert proof['status'] == 'rejected'
        assert set(leaf_messages(proof['error'])) == {problem}
    root_receipts.append({'at': event['at'], 'exact': value['actual'],
                         'branches': [p['branch'] for p in value['proofs']],
                         'onlyLeafError': problem})

reader = next(e['value']['runId'] for e in by('agent-manager') if e['value']['errors'])
backend = [e for e in by('agent-backend') if e['value']['runId'] == reader]
before_settle = [e for e in by('input-before-settle') if e['value']['runId'] == reader]
manager = [e for e in by('agent-manager') if e['value']['runId'] == reader]
assert len(backend) == len(before_settle) == len(by('input-assert')) == 2
assert len({e['value']['generation'] for e in backend + before_settle + manager}) == 1
for e in backend:
    v = e['value']
    assert v['result'] == {'accepted': True}
    assert not v['activeDispatch'] and not v['uncertainDispatch']
    assert not v['input']['accepting']
    assert len(v['input']['entries']) == 1
    entry = v['input']['entries'][0]
    assert entry['state'] == 'forwarded' and entry['pendingTerminal'] is None
    assert entry['kind'] == 'start_turn'
    assert entry['associatedTurnId'] == entry['observedTurnId']
assert backend[0]['value'] == backend[1]['value']
for e in before_settle:
    assert e['value']['input'] == backend[0]['value']['input']
for e in by('input-assert'):
    assert e['value']['entries'] == backend[0]['value']['input']['entries']
for e in manager:
    assert e['value']['activePublished'] and not e['value']['attachments']
    assert set(m for err in e['value']['errors'] for m in leaf_messages(err)) == {problem}
    assert all('settleAcceptedTermination' in err['stack'] for err in e['value']['errors'])

components = by('session-components')
assert len(components) == 2  # successful first cleanup only; no physical retry invented
assert {e['value']['runId'] for e in components} >= {reader}
for e in components:
    v = e['value']
    assert set(v['proof']) == {'listeners', 'skills', 'mcp', 'process'}
    assert all(p['status'] == 'fulfilled' and p['error'] is None for p in v['results'])
    assert e['at'] < begins[1]['at']
assert len(by('sdk-children')) == len(by('process-generations')) == 2
for e in by('sdk-children'):
    assert e['at'] < begins[1]['at']
    assert all(p['status'] == 'fulfilled' and p['error'] is None for p in e['value']['results'])
    for receipt in e['value']['receipts']:
        assert all(receipt[k] for k in ['spawned', 'physicalExit', 'nodeClosed',
                                       'stderrClosed', 'sdkExitDelivered', 'releaseProof'])
        assert receipt['streams'] is None
for e in by('process-generations'):
    assert e['value']['generations'] == 0
    assert all(p['status'] == 'fulfilled' for p in e['value']['results'])
assert not any(e.get('evaluationException') for e in events)
assert not by('capture-error') and not by('resume-error')
pauses = [e['pauseMs'] for e in by('resumed')]
assert max(pauses) == 1 and sum(pauses) == 26

life = lambda state, tid: next(l for row in state for l in row.get('taskLifetimes', []) if l['taskId'] == tid)
task = lambda state, tid: next(t for row in state for t in row.get('tasks', []) if t['taskId'] == tid)
B, A = a['tasks']['B']['taskId'], a['tasks']['A']['taskId']
states = [a['closedState'], r['beforeState'], r['atFailureState'], w['projects']]
assert all(life(state, B) == life(states[0], B) for state in states)
closed = life(states[0], B)
assert closed['lifetimeId'] == begins[0]['value']['id'] and closed['completedAt']
assert closed['executions'][0]['cleanup'] == 'failed'
assert closed['executions'][0]['error'] == {'code': 'TASK_RELEASE_FAILED', 'message': 'Exact Task execution cleanup failed.'}
assert r['beforeTree'] == r['atFailureTree'] == w['privateTree']
assert life(w['projects'], A)['completedAt'] is None
assert life(w['projects'], A)['executions'][0]['cleanup'] == 'not_requested'
for name in ['A', 'B']:
    t = task(w['projects'], a['tasks'][name]['taskId'])
    assert t['description'] == a['tasks'][name]['description']
    # Tool DTO has a derived path; persisted context descriptors do not. Compare
    # persisted descriptors across actual states, and names/content to setup.
    assert t['contextFiles'] == task(a['currentState'], t['taskId'])['contextFiles']
    assert [x['storedFilename'] for x in t['contextFiles']] == [x['storedFilename'] for x in a['tasks'][name]['contextFiles']]
    for ctx in t['contextFiles']:
        assert (D / 'owned-context' / t['taskId'] / ctx['storedFilename']).read_text() == a['tasks'][name]['marker'] + '\n'
borrowed = raw(next((D / 'owned-history').rglob(a['borrowedId'] + '/raw_traces_active.jsonl')))
assert borrowed == a['borrowedTrace']
trace = raw(D / 'owned-history' / a['managerRunId'] / 'raw_traces_active.jsonl')
calls = [v for v in trace if v.get('trace_type') == 'tool_call' and v.get('tool_name') == 'create_or_update_task'
         and v.get('tool_args', {}).get('task_id') == B and v['tool_args'].get('status') == 'DONE']
assert len(calls) == 2
turns = []
for n, call in enumerate(calls):
    turn = [v for v in trace if v.get('turn_id') == call['turn_id']]
    tools = [v['tool_name'] for v in turn if v.get('trace_type') == 'tool_call']
    assert tools == ['create_or_update_task', 'list_project_tasks']
    ack = next(v for v in turn if v.get('trace_type') == 'tool_result' and v.get('tool_call_id') == call['tool_call_id'])
    value = json.loads(ack['tool_result']) if isinstance(ack['tool_result'], str) else ack['tool_result']
    assert value == {'task': {'projectId': closed['projectId'], 'taskId': B, 'status': 'DONE'}}
    assistant = [v for v in turn if v.get('trace_type') == 'assistant']
    assert len(assistant) == 1
    assert ('B_DONE_RECORDED' if n == 0 else r['nonce']) in assistant[0]['content']
    turns.append({'at': datetime.datetime.fromtimestamp(call['ts'], datetime.timezone.utc).isoformat(),
                  'turnId': call['turn_id'], 'toolCallId': call['tool_call_id'], 'tools': tools, 'ack': value})
reader_trace = raw(next((D / 'owned-history').rglob(reader + '/raw_traces_active.jsonl')))
assert any(v.get('trace_type') == 'tool_result' and v.get('tool_name') in ['Read', 'Bash']
           and a['tasks']['B']['marker'] in json.dumps(v) for v in reader_trace)
assert not any(v.get('trace_type') == 'assistant' for v in reader_trace)
statuses = w['inspection']['root_org']['agent_statuses']
assert next(v for v in statuses if v['agent_run_id'] == reader)['status'] == 'offline'
assert next(v for v in statuses if v['agent_run_id'] == a['managerRunId'])['status'] == 'idle'
assert w['inspection']['root_org']['is_active']

sources = read(D / 'source-inventory.json')
assert all(sha(Path(v['source'])) == v['sha256'] for v in sources.values())
artifact = read(D / 'verified-current-artifact.json')
compiled = artifact['compiledPackagedEqual']
base = W / 'autobyteus-server-ts/dist'
packaged = W / 'autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist'
assert len(compiled) == 1452
assert all(sha(base / p) == expected == sha(packaged / p) for p, expected in compiled.items())
assert sha(packaged.parents[1] / 'app.asar') == artifact['appAsarSha256']
own = read(C / 'crr-019-input-preservation.json')
prior = read(C / 'crr-018-input-preservation.json')
assert own['dirty'] == prior['dirty']
cleanup = read(D / 'cleanup-verification.json')
assert cleanup['profileAbsent'] and cleanup['debuggerDetached'] and cleanup['foreignInstanceRecordsExact']

out = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
       'scope': 'Independent archive, raw receipt, current-source/artifact hash verification; no new live execution or repair',
       'instanceId': a['instanceId'], 'rootId': a['rootId'], 'managerId': a['managerRunId'],
       'readerId': reader, 'generation': backend[0]['value']['generation'], 'businessTurns': turns,
       'rootReceipts': root_receipts, 'readerFirstAndRetryStateExact': backend[0]['value'],
       'sameInputAssertionTwice': True, 'attachmentsErrors': [],
       'firstSuccessfulClaudeComponents': [e['value'] for e in components],
       'firstOnlySDKProofs': [e['value'] for e in by('sdk-children')],
       'sameClosedLifetimeAndWholePrivateTreeAcrossRetry': True, 'AContextBorrowedProtected': True,
       'finalReaderPresentation': 'offline (original API014 was running)',
       'pauseMaxMs': max(pauses), 'pauseTotalMs': sum(pauses), 'evaluationErrors': [],
       'currentSourceSnapshotCount': len(sources), 'compiledPackagedEqualCount': len(compiled),
       'all299BytesSameCRR018AndCRR017': True, 'eventCounts': dict(Counter(e['event'] for e in events)),
       'originalFAPI011InnerPhysicalCertificate': 'UNOBSERVED; not retroactively replaced',
       'excludedAttributions': ['original sole cause', 'original review-gap causation', 'SDK vendor',
                                'orphan/descendant PID census', 'shared FAPI007 cause', 'repair/product acceptance']}
(C / 'crr-019-independent-evidence.json').write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps({'status': 'PASS', 'rawRootAttempts': 2, 'readerAssertionAttempts': 2,
                  'currentSourceSnapshots': len(sources), 'compiledEqual': len(compiled),
                  'all299CandidateBytesSame': True, 'scope': out['scope']}, indent=2))
