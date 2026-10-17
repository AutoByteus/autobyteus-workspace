"""Probe: what usage/context data does the Codex app server give, and when?

Usage: python3 -I codex-usage-probe.py <out.jsonl> <scenario: multi|fill> [extra -c overrides...]
Runs in a private CODEX_HOME with a temporary copy of the user's auth; nothing auth-related is logged.
"""
import json, os, queue, shutil, subprocess, sys, tempfile, threading, time
from pathlib import Path

OUT = Path(sys.argv[1]); SCENARIO = sys.argv[2]; EXTRA = sys.argv[3:]
BINARY = '/Users/normy/.local/bin/codex'; MODEL = os.environ.get('PROBE_MODEL', 'gpt-6-luna')
USER_CODEX_HOME = Path('/Users/normy/.codex')
filler = lambda n: '\n'.join(f'record {n}-{i}: the quick brown fox jumps over the lazy dog' for i in range(2500))
PROMPTS = {
    'multi': ['Run these shell commands one at a time, waiting for each result before the next: `echo one`, then `echo two`, then `echo three`. Then reply with exactly DONE.',
              'Reply with exactly: SECOND'],
    'fill': [f'Data dump {n}. Do not analyze. Reply with exactly: OK{n}\n' + filler(n) for n in range(1, 5)] + ['Reply with exactly: END'],
    'fill6': [f'Data dump {n}. Do not analyze. Reply with exactly: OK{n}\n' + filler(n) for n in range(1, 7)] + ['Reply with exactly: END'],
}[SCENARIO]

private = Path(tempfile.mkdtemp(prefix='codex-usage-probe-'))
home = private / 'home'; codex_home = home / '.codex'; workspace = private / 'ws'
codex_home.mkdir(parents=True); workspace.mkdir()
shutil.copyfile(USER_CODEX_HOME / 'auth.json', codex_home / 'auth.json'); os.chmod(codex_home / 'auth.json', 0o600)
if (USER_CODEX_HOME / 'models_cache.json').is_file():
    shutil.copyfile(USER_CODEX_HOME / 'models_cache.json', codex_home / 'models_cache.json')
(codex_home / 'config.toml').write_text(f'model = "{MODEL}"\nmodel_reasoning_effort = "low"\napproval_policy = "never"\ncli_auth_credentials_store = "file"\nweb_search = "disabled"\n[analytics]\nenabled = false\n[feedback]\nenabled = false\n')
env = {'PATH': os.environ['PATH'], 'HOME': str(home), 'CODEX_HOME': str(codex_home), 'TMPDIR': str(private), 'LANG': 'en_US.UTF-8'}
cmd = [BINARY, 'app-server', '--listen', 'stdio://', '-c', 'features.apps=false', '-c', 'features.plugins=false', '-c', 'features.hooks=false'] + EXTRA
t0 = time.monotonic(); out = OUT.open('w'); q = queue.Queue()
def log(label, data): out.write(json.dumps({'label': label, 'dt': round((time.monotonic() - t0) * 1000), 'data': data}) + '\n'); out.flush()
log('ARGV', {'model': MODEL, 'extra': EXTRA, 'version': subprocess.check_output([BINARY, '--version'], text=True).strip()})
p = subprocess.Popen(cmd, cwd=str(workspace), env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
def reader():
    for line in p.stdout:
        try: ev = json.loads(line)
        except ValueError: continue
        q.put(ev)
threading.Thread(target=reader, daemon=True).start()
def send(o): p.stdin.write(json.dumps(o) + '\n'); p.stdin.flush()
def rpc(i, method, params):
    send({'id': i, 'method': method, 'params': params})
    while True:
        ev = q.get(timeout=120)
        record(ev)
        if ev.get('id') == i:
            if 'error' in ev: raise RuntimeError(ev['error'])
            return ev['result']
def record(ev):
    m = ev.get('method')
    if m is None: return
    pr = ev.get('params', {})
    if m == 'thread/tokenUsage/updated': log('TOKEN_USAGE', pr)
    elif m in ('item/started', 'item/completed'): log(m, {'type': pr.get('item', {}).get('type'), 'id': pr.get('item', {}).get('id')})
    elif m.endswith('/delta'): return
    else: log('EVENT', {'method': m, 'params': json.dumps(pr)[:600]})
try:
    rpc(1, 'initialize', {'clientInfo': {'name': 'autobyteus-server-ts', 'version': '0.1.1'}, 'capabilities': {'experimentalApi': True}})
    send({'method': 'initialized', 'params': {}})
    th = rpc(2, 'thread/start', {'cwd': str(workspace), 'model': MODEL, 'approvalPolicy': 'never', 'sandbox': 'read-only', 'ephemeral': True})
    tid = th['thread']['id']
    for n, text in enumerate(PROMPTS):
        log('SEND', text[:120])
        rpc(10 + n, 'turn/start', {'threadId': tid, 'input': [{'type': 'text', 'text': text}], 'effort': 'low'})
        deadline = time.monotonic() + 300
        while time.monotonic() < deadline:
            try: ev = q.get(timeout=0.5)
            except queue.Empty: continue
            record(ev)
            if ev.get('method') == 'turn/completed': break
finally:
    p.terminate()
    try: p.wait(timeout=10)
    except subprocess.TimeoutExpired: p.kill()
    shutil.rmtree(private)
    log('END', {'private_removed': not private.exists()})
