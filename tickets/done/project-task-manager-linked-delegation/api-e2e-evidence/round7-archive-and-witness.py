# Temporary, own allowlisted observation only. Never archive DB/vault/key/env.
from pathlib import Path
import datetime, hashlib, json, shutil, subprocess

E = Path('tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence')
i = json.loads((E / 'api-007-causal-restart.json').read_text())['result']
root = Path(i['dataRoot']).resolve()
assert i['instanceId'] == 'iso-53457-6620' and root.name == 'autobyteus-isolated-root-sqBllc'
at = datetime.datetime.now(datetime.timezone.utc).isoformat()
state = json.loads((root / 'server-data/projects/projects.json').read_text())
(E / 'api-007-causal-project-array-final.json').write_text(json.dumps(state, indent=2) + '\n')
lifetimes = next(x['taskLifetimes'] for x in state if 'taskLifetimes' in x)
allowed = {'raw_traces_active.jsonl', 'run_metadata.json', 'agent_org_run_execution_tree.json', 'agent_org_communication_messages.json'}
archives, cases = [], []
debug = [json.loads(l) for l in (E / 'api-007-causal-owner-debugger.jsonl').read_text().splitlines()]

def copy(p, target):
    assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(p, target)
    archives.append({'sourceRelative': str(p.relative_to(root)), 'archive': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size})

for n in range(1, 6):
    prefix = 'api-007c' + str(n)
    p = E / (prefix + '-physical-recursive.json')
    if not p.exists():
        continue
    v = json.loads(p.read_text())
    d = root / 'server-data/memory/agent_orgs' / v['rootId']
    for f in d.rglob('*'):
        if f.is_file() and f.name in allowed:
            copy(f, E / 'api-007-causal-owned-history/agent_orgs' / f.relative_to(d.parent))
    project = next(p for p in state if p.get('projectId') == v['project']['projectId'])
    protected = []
    for k, original in v['tasks'].items():
        current = next(t for t in project['tasks'] if t['taskId'] == original['taskId'])
        assert current['description'] == original['description']
        assert [c['storedFilename'] for c in current['contextFiles']] == [c['storedFilename'] for c in original['contextFiles']]
        for c in current['contextFiles']:
            f = root / 'server-data/projects/task_context_files' / project['projectId'] / current['taskId'] / c['storedFilename']
            assert f.read_text() == original['marker'] + '\n'
            target = E / 'api-007-causal-owned-saved-packets' / project['projectId'] / current['taskId'] / f.name
            copy(f, target)
            protected.append({'task': k, 'archive': str(target), 'unchanged': True})
    for w in [v['w1'], v['w2']]:
        assert Path(w).resolve().is_relative_to(root)
        assert (Path(w) / 'protected-sentinel.txt').read_text() == 'API007C' + str(n) + '_PHYSICAL_PROTECT\n'
    life = next(l for l in lifetimes if l['lifetimeId'] == v['lifeA']['lifetimeId'])
    b = next(l for l in lifetimes if l['lifetimeId'] == v['lifeB']['lifetimeId'])
    assert b['completedAt'] is None and all(x['cleanup'] == 'not_requested' for x in b['executions'])
    manager = [json.loads(l) for l in (d / v['managerRunId'] / 'raw_traces_active.jsonl').read_text().splitlines() if l]
    done = []
    for call in manager:
        if call['trace_type'] != 'tool_call' or call.get('tool_name') != 'create_or_update_task':
            continue
        result = next((r for r in manager if r['trace_type'] == 'tool_result' and r.get('tool_call_id') == call['tool_call_id']), None)
        if result and result.get('tool_result', {}).get('task', {}).get('status') == 'DONE':
            assert set(result['tool_result']) == {'task'} and set(result['tool_result']['task']) == {'projectId', 'taskId', 'status'}
            done.append({'turnId': call['turn_id'], 'toolCallId': call['tool_call_id'], 'result': result['tool_result'], 'createdAt': result.get('created_at')})
    terminals = [f for f in v['frames'] if f.get('type') == 'ROOT_EXECUTION_EVENT' and f['payload'].get('event', {}).get('agent_run_id') in v.get('ownedIds', []) and f['payload']['event'].get('message', {}).get('type') == 'AGENT_STATUS' and f['payload']['event']['message']['payload'].get('status') == 'offline']
    cases.append({'evidence': p.name, 'result': v.get('result'), 'error': v.get('error'), 'rootId': v['rootId'], 'managerRunId': v['managerRunId'], 'projectId': project['projectId'], 'lifetimeA': life, 'lifetimeB': b, 'ownedFive': v.get('ownedIds'), 'actualReadPaths': v.get('reads'), 'actualDoneCalls': done, 'genuineTerminalEvents': terminals, 'exclusiveW2Provider': v.get('provider'), 'capturedExactDescendants': v.get('exactDescendants'), 'remainingExactAtTaskClose': v.get('remainingExact'), 'protectedW1ProvidersAtTaskClose': v.get('protectedProviders'), 'filesProtected': protected, 'activeRootAtTaskClose': v.get('closedInspection', {}).get('root_org', {}).get('is_active'), 'observer': 'detached/disabled before work; same backend previously inspected' if n == 3 else 'read-only throw/rejected/negative-only conditional breakpoints', 'sourceScope': 'Original actual trigger and all assertions retained. New namespace, no stopped receipt replay or forced timing.'})

(E / 'api-007-causal-owned-evidence-manifest.json').write_text(json.dumps({'at': at, 'archives': archives, 'scope': 'Own allowlisted history and packet only; no DB/vault/key/env'}, indent=2) + '\n')
captures = [x for x in debug if x['event'] not in ['breakpoint', 'owner-verified', 'detached', 'resumed']]
pauses = [x for x in debug if x['event'] == 'resumed']
(E / 'api-007-causal-bounded-attempts.json').write_text(json.dumps({'at': at, 'instanceId': i['instanceId'], 'cases': cases, 'observerCaptures': captures, 'observerReadErrors': [x for x in debug if x.get('evaluationException')], 'observerPauseCount': len(pauses), 'observerPauseTotalMs': sum(x['pauseDurationMs'] for x in pauses), 'limits': 'Fresh positive controls cannot backfill original failed first/retry. Zero diagnostic pauses does not exclude conditional-breakpoint/deoptimization perturbation; case3 detached but same backend previously inspected. Shared root-default W1 retention is protected, not a five-worker physical-PID leak or stop-proof certificate.'}, indent=2) + '\n')
rows = []
for l in subprocess.check_output(['ps', '-axo', 'pid=,ppid=,comm='], text=True).splitlines():
    a = l.strip().split(None, 2)
    if len(a) == 3:
        rows.append({'pid': int(a[0]), 'ppid': int(a[1]), 'comm': a[2]})
ids = {i['pid']}
for _ in rows:
    for p in rows:
        if p['ppid'] in ids:
            ids.add(p['pid'])
own = [p for p in rows if p['pid'] in ids]
(E / 'api-007-causal-owned-processes-before-stop.json').write_text(json.dumps({'at': at, 'instanceId': i['instanceId'], 'processes': own, 'scope': 'Exact owned ancestry IDs/names only; no args/env/foreign signal'}, indent=2) + '\n')
print(json.dumps({'archivedFiles': len(archives), 'cases': len(cases), 'ownPids': len(own), 'observerCaptures': len(captures), 'observerPauses': len(pauses)}))
