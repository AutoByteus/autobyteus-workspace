"""Bounded reviewer checks; no durable test/source edits; own scratch only."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

E = Path(__file__).resolve().parent
R = E.parents[4]
T = E.parents[1]
assert (R / 'autobyteus-web/package.json').is_file()
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=R, text=True).strip()
def dump(name, value):
    (E / name).write_text(json.dumps(value, indent=2) + '\n')

docs = ['requirements-doc.md', 'approval-record-sr025.md', 'design-spec.md',
        'solution-design-handoff.md', 'solution-revision-record.md', 'investigation-notes.md',
        'design-review-report.md', 'architecture-review-revision-record.md',
        'implementation-handoff.md', 'implementation-revision-record.md',
        'code-review-report.md', 'code-review-revision-record.md',
        'api-e2e-execution-coverage-report.md', 'api-e2e-revision-record.md',
        'api-e2e-coverage-investigation.md', 'api-e2e-test-case-ledger.md']
source = [R / p for p in git('diff', '--name-only', '0deb1d4824b1601c8ee267c404a40479a16d01ce',
                            'a3f65bfe6e7859a3167cb41013b80bc223385cfb').splitlines()]
support = ['components/fileExplorer/FileViewer.vue', 'components/fileExplorer/MonacoEditor.vue',
           'components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts',
           'stores/fileExplorer.ts', 'stores/fileExplorerTreeChangeActions.ts',
           'utils/fileExplorer/pathUtils.ts']
paths = [T / p for p in docs] + source + [R / 'DESIGN.md', R / 'TESTING.md', R / 'AGENTS.md', R / 'autobyteus-web/AGENTS.md']
paths += [R / 'autobyteus-web' / p for p in support if (R / 'autobyteus-web' / p).is_file()]
paths += list((T / 'implementation-evidence/ir-010').rglob('*'))
paths = sorted({p for p in paths if p.is_file()})
before = {str(p.relative_to(R)): sha(p) for p in paths}
dist_roots = ['applications/brief-studio/dist', 'autobyteus-application-backend-sdk/dist',
              'autobyteus-application-devkit/dist', 'autobyteus-application-frontend-sdk/dist',
              'autobyteus-application-sdk-contracts/dist']
dist = {str(p.relative_to(R)): sha(p) for d in dist_roots for p in (R / d).rglob('*') if p.is_file()}
history = (T / 'code-review-revision-record.md').read_bytes()
audit = {'head': git('rev-parse', 'HEAD'), 'sourceCommit': 'a3f65bfe6e7859a3167cb41013b80bc223385cfb',
         'baseline': '0deb1d4824b1601c8ee267c404a40479a16d01ce', 'initialStatus': git('status', '--short'),
         'inputs': before, 'oldDist': dist, 'historyBytes': len(history),
         'historySha256': hashlib.sha256(history).hexdigest(), 'sourceSize': []}
for p in source:
    if p.suffix in ('.vue', '.ts') and '__tests__' not in str(p):
        rel = str(p.relative_to(R))
        old = subprocess.check_output(['git', 'show', f"{audit['baseline']}:{rel}"], cwd=R, text=True)
        numbers = git('diff', '--numstat', audit['baseline'], audit['sourceCommit'], '--', rel).split('\t')
        audit['sourceSize'].append({'path': rel, 'beforeNonblank': sum(bool(x.strip()) for x in old.splitlines()),
                                   'afterNonblank': sum(bool(x.strip()) for x in p.read_text().splitlines()),
                                   'addedPlusRemoved': int(numbers[0])+int(numbers[1])})
dump('input-audit.json', audit)
scratch = Path(tempfile.mkdtemp(prefix='ab-crr015-check-'))
(scratch / 'home').mkdir(); (scratch / 'tmp').mkdir()
env = {'PATH': os.environ['PATH'], 'HOME': str(scratch / 'home'), 'TMPDIR': str(scratch / 'tmp'),
       'LANG': 'en_US.UTF-8', 'CI': '1', 'NO_COLOR': '1'}
probe = R / 'autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.crr015-probe.spec.ts'
results = {'environmentKeys': sorted(env), 'scratch': str(scratch), 'checks': []}
def run(name, argv):
    start = time.monotonic()
    with (E / f'{name}.log').open('wb') as out:
        proc = subprocess.run(argv, cwd=R, env=env, stdout=out, stderr=subprocess.STDOUT)
    row = {'name': name, 'argv': argv, 'exitCode': proc.returncode, 'seconds': round(time.monotonic()-start, 2)}
    results['checks'].append(row)
    dump('checks-result.json', results)
    print(json.dumps(row), flush=True)
try:
    run('adjacent-regression', ['pnpm', '-C', 'autobyteus-web', 'test:nuxt',
        'components/fileExplorer/__tests__', 'components/fileExplorer/viewers/__tests__',
        'stores/__tests__/fileExplorerStore.spec.ts', 'stores/__tests__/fileExplorerNodeRouting.spec.ts',
        'utils/fileExplorer/__tests__', '--run', '--maxWorkers=2'])
    run('web-boundary', ['pnpm', '-C', 'autobyteus-web', 'guard:web-boundary'])
    run('localization-boundary', ['pnpm', '-C', 'autobyteus-web', 'guard:localization-boundary'])
    with probe.open('x') as out:
        out.write((E / 'pending-save-probe.spec.ts').read_text())
    run('pending-save-probe', ['pnpm', '-C', 'autobyteus-web', 'test:nuxt',
        'components/fileExplorer/__tests__/FileExplorerTabs.crr015-probe.spec.ts', '--run', '--maxWorkers=2'])
finally:
    if probe.is_file() and probe.read_bytes() == (E / 'pending-save-probe.spec.ts').read_bytes():
        probe.unlink()
    shutil.rmtree(scratch)
    results.update({'probeRemoved': not probe.exists(), 'scratchRemoved': not scratch.exists(),
                    'inputsUnchanged': all(p.is_file() and sha(p) == before[str(p.relative_to(R))] for p in paths),
                    'oldDistUnchanged': all((R / p).is_file() and sha(R / p) == digest for p, digest in dist.items()),
                    'oldDistCount': len(dist)})
    dump('checks-result.json', results)
    print(json.dumps({k: v for k, v in results.items() if k != 'checks'}), flush=True)
