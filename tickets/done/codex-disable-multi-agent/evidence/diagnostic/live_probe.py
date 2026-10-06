"""Real authenticated tool-inventory turns, isolated data and secret-safe cleanup.

User requested this experiment. No auth bytes enter evidence or stdout.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import queue
import shutil
import signal
import subprocess
import tempfile
import threading
import time

ROOT = Path(__file__).resolve().parent
USER_CODEX_HOME = Path('/Users/normy/.codex')
BINARY = '/Users/normy/.local/bin/codex'
MODEL = 'gpt-6.1-sol'
PROMPT = '''What tools do you currently have available in THIS conversation?
Inspect the actual tool definitions available to you, not your general knowledge of Codex.
List all direct callable tools with their namespace-qualified names in tools.
Separately list every built-in multi-agent/collaboration tool in collaboration_tools.
If no multi-agent/collaboration tools are available, use an empty array and explain that in note.
Do not execute any tools, spawn any agents, read any files, or change anything. Just report the definitions you can see.
Return only JSON with keys tools (string array), collaboration_tools (string array), and note (string).'''
OUTPUT_SCHEMA = {'type': 'object', 'additionalProperties': False,
                 'properties': {'tools': {'type': 'array', 'items': {'type': 'string'}},
                                'collaboration_tools': {'type': 'array', 'items': {'type': 'string'}},
                                'note': {'type': 'string'}},
                 'required': ['tools', 'collaboration_tools', 'note']}

def fingerprint(path):
    return hashlib.sha256(path.read_bytes()).digest() if path.is_file() else None

def run_case(case, overrides):
    evidence = ROOT / 'live-evidence' / case
    evidence.mkdir(parents=True, exist_ok=False)
    private = Path(tempfile.mkdtemp(prefix='codex-agent-live-probe-'))
    os.chmod(private, 0o700)
    home = private / 'home'
    home.mkdir(mode=0o700)
    codex_home = home / '.codex'
    codex_home.mkdir(mode=0o700)
    workspace = private / 'workspace'
    workspace.mkdir()
    result = {'case': case, 'model': MODEL, 'overrides': overrides,
              'prompt': PROMPT, 'private_root': str(private)}
    events = []
    q = queue.Queue()
    process = None
    source_auth = USER_CODEX_HOME / 'auth.json'
    source_config = USER_CODEX_HOME / 'config.toml'
    auth_before, config_before = fingerprint(source_auth), fingerprint(source_config)
    try:
        shutil.copyfile(source_auth, codex_home / 'auth.json')
        os.chmod(codex_home / 'auth.json', 0o600)
        result['temporary_auth_copy'] = True
        cache = USER_CODEX_HOME / 'models_cache.json'
        if cache.is_file():
            shutil.copyfile(cache, codex_home / 'models_cache.json')
            os.chmod(codex_home / 'models_cache.json', 0o600)
            result['private_catalog_copy'] = True
        config = '''model = "gpt-6.1-sol"
model_reasoning_effort = "low"
approval_policy = "never"
cli_auth_credentials_store = "file"
web_search = "disabled"
[analytics]
enabled = false
[feedback]
enabled = false
'''
        (codex_home / 'config.toml').write_text(config)
        (evidence / 'config.toml').write_text(config)
        command = [BINARY, 'app-server', '--listen', 'stdio://',
                   '-c', 'features.apps=false', '-c', 'features.plugins=false',
                   '-c', 'features.hooks=false'] + overrides
        result['command'] = command
        result['binary_version'] = subprocess.check_output([BINARY, '--version'], universal_newlines=True).strip()
        env = {'PATH': os.environ['PATH'], 'HOME': str(home), 'CODEX_HOME': str(codex_home),
               'TMPDIR': str(private), 'LANG': 'en_US.UTF-8'}
        for key in ['HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'NO_PROXY',
                    'SSL_CERT_FILE', 'SSL_CERT_DIR', 'CODEX_CA_BUNDLE', 'NODE_EXTRA_CA_CERTS']:
            if key in os.environ:
                env[key] = os.environ[key]
        with (evidence / 'stderr.log').open('w') as stderr:
            process = subprocess.Popen(command, cwd=str(workspace), env=env,
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                       stderr=stderr, universal_newlines=True, start_new_session=True)
            result['pid'] = process.pid
            def reader():
                for line in process.stdout:
                    try:
                        event = json.loads(line)
                        events.append(event)
                        q.put(event)
                    except ValueError:
                        events.append({'non_json': line})
            threading.Thread(target=reader, daemon=True).start()
            def send(item):
                process.stdin.write(json.dumps(item) + '\n')
                process.stdin.flush()
            def rpc(id, method, params, timeout=60):
                send({'id': id, 'method': method, 'params': params})
                deadline = time.monotonic() + timeout
                while time.monotonic() < deadline:
                    if process.poll() is not None and q.empty():
                        raise RuntimeError('App-server exited %s' % process.returncode)
                    try:
                        event = q.get(timeout=0.2)
                    except queue.Empty:
                        continue
                    if event.get('id') == id:
                        if 'error' in event:
                            raise RuntimeError('%s: %s' % (method, event['error']))
                        return event['result']
                raise TimeoutError(method)
            result['initialize'] = rpc(1, 'initialize', {
                'clientInfo': {'name': 'autobyteus-server-ts', 'version': '0.1.1'},
                'capabilities': {'experimentalApi': True}})
            send({'method': 'initialized', 'params': {}})
            cfg = rpc(2, 'config/read', {'includeLayers': True, 'cwd': str(workspace)})
            (evidence / 'effective-config.json').write_text(json.dumps(cfg, indent=2))
            result['effective_agents'] = cfg.get('config', {}).get('agents')
            result['effective_multi_agent_features'] = {k:v for k,v in cfg.get('config', {}).get('features', {}).items()
                                                       if 'agent' in k or 'collab' in k}
            thread = rpc(3, 'thread/start', {'cwd': str(workspace), 'model': MODEL,
                'approvalPolicy': 'never', 'sandbox': 'read-only', 'ephemeral': True})
            result['thread_start'] = thread
            tid = thread['thread']['id']
            started = rpc(4, 'turn/start', {'threadId': tid,
                'input': [{'type': 'text', 'text': PROMPT}], 'effort': 'low',
                'outputSchema': OUTPUT_SCHEMA})
            result['turn_id'] = started['turn']['id']
            deadline = time.monotonic() + 180
            while time.monotonic() < deadline:
                try:
                    event = q.get(timeout=0.5)
                except queue.Empty:
                    if process.poll() is not None:
                        raise RuntimeError('App-server exited before turn completion')
                    continue
                if event.get('method') == 'turn/completed' and event.get('params', {}).get('threadId') == tid:
                    result['turn_completed'] = event['params']['turn']
                    break
            else:
                send({'id': 90, 'method': 'turn/interrupt', 'params': {
                    'threadId': tid, 'turnId': result['turn_id']}})
                raise TimeoutError('turn completion after 180 seconds')
            answers = [e['params']['item']['text'] for e in events
                       if e.get('method') == 'item/completed'
                       and e.get('params', {}).get('item', {}).get('type') == 'agentMessage']
            result['answer'] = '\n'.join(answers)
            if not result['answer']:
                result['answer'] = ''.join(e['params']['delta'] for e in events
                    if e.get('method') == 'item/agentMessage/delta')
            (evidence / 'answer.txt').write_text(result['answer'])
            try:
                result['answer_json'] = json.loads(result['answer'])
            except ValueError:
                result['answer_json_error'] = 'Answer is not valid JSON'
            result['tool_events'] = [e for e in events if e.get('method') == 'item/started'
                and e.get('params', {}).get('item', {}).get('type') not in
                ['userMessage', 'agentMessage', 'reasoning', 'plan']]
            result['token_usage_events'] = [e['params'] for e in events
                                          if e.get('method') == 'thread/tokenUsage/updated']
    except Exception as error:
        result['error'] = repr(error)
    finally:
        if process is not None:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=10)
            result['process_exit_code'] = process.returncode
        (evidence / 'events.json').write_text(json.dumps(events, indent=2))
        shutil.rmtree(private)
        result['cleanup'] = {'process_exited': process is None or process.poll() is not None,
                             'private_root_and_auth_removed': not private.exists(),
                             'source_auth_unchanged': fingerprint(source_auth) == auth_before,
                             'source_config_unchanged': fingerprint(source_config) == config_before}
        (evidence / 'result.json').write_text(json.dumps(result, indent=2))
    print(json.dumps({k:result.get(k) for k in ['case', 'binary_version', 'error',
          'turn_completed', 'answer_json', 'tool_events', 'cleanup']}), flush=True)
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--case', choices=['default', 'legacy_off', 'agents_off', 'all'], default='all')
    args = parser.parse_args()
    cases = [('default', []),
             ('legacy_off', ['-c', 'features.multi_agent=false', '-c', 'features.multi_agent_v2=false']),
             ('agents_off', ['-c', 'agents.enabled=false'])]
    results = [run_case(*case) for case in cases if args.case in ['all', case[0]]]
    (ROOT / ('live-summary-' + args.case + '.json')).write_text(json.dumps(results, indent=2))
