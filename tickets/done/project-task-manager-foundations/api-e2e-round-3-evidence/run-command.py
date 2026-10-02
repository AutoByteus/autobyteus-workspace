"""Evidence recorder only: executes one literal supplied project command, no retries."""
import datetime, json, pathlib, subprocess, sys, time
root = pathlib.Path(__file__).resolve().parents[4]
evidence = pathlib.Path(__file__).resolve().parent
ticket = evidence.parent
name, case, command = sys.argv[1:4]
log = evidence / name
assert not log.exists(), 'Refusing to overwrite evidence'
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def event(phase, note):
    with (ticket/'api-e2e-test-case-ledger.md').open('a') as f:
        f.write(f'| {now()} | {case} | {phase} | {note} | {log} |\n')
event('Started', command)
start = time.monotonic()
with log.open('w') as f:
    result = subprocess.run(command, shell=True, executable='/bin/bash', cwd=root, stdout=f, stderr=subprocess.STDOUT)
# Preserve content, remove only empty terminal lines in this new owned log.
log.write_text(log.read_text().rstrip('\n')+'\n')
record = {'cwd':str(root),'command':command,'log':str(log),'exitCode':result.returncode,'elapsedSeconds':round(time.monotonic()-start,3),'completedAt':now()}
manifest = evidence/'commands.json'
records = json.loads(manifest.read_text()) if manifest.exists() else []
records.append(record); manifest.write_text(json.dumps(records,indent=2)+'\n')
event('Completed', 'Pass (exit0)' if result.returncode==0 else f'Fail (exit{result.returncode}); classify from exact output')
print(json.dumps(record)); print('\n'.join(log.read_text().splitlines()[-15:]))
sys.exit(result.returncode)
