"""Isolated Codex app-server probe; local mock provider, no credentials or paid inference."""
import argparse
import gzip
import http.server
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import tempfile
import threading
import time

ROOT = Path(__file__).resolve().parent
BINARY = '/Users/normy/.local/bin/codex'
COLLAB = {'spawn_agent', 'send_input', 'send_message', 'wait', 'wait_agent', 'resume_agent',
          'close_agent', 'interrupt_agent', 'list_agents', 'followup_task'}

def collect_tool_names(request):
    names = []
    def walk(tool, namespace=''):
        if tool.get('type') == 'namespace':
            for child in tool.get('tools', []):
                walk(child, tool['name'])
        elif 'name' in tool:
            names.append((namespace + '.' if namespace else '') + tool['name'])
        elif isinstance(tool.get('function'), dict):
            walk(tool['function'], namespace)
    for tool in request.get('tools', []):
        walk(tool)
    for item in request.get('input', []):
        if item.get('type') == 'additional_tools':
            for tool in item.get('tools', []):
                walk(tool)
    return names

def run_case(name, overrides, file_config='', thread_config=None):
    evidence = ROOT / 'evidence' / name
    evidence.mkdir(parents=True, exist_ok=False)
    private = Path(tempfile.mkdtemp(prefix='codex-agent-probe-'))
    home = private / 'home'
    home.mkdir()
    codex_home = home / '.codex'
    codex_home.mkdir()
    workspace = private / 'workspace'
    workspace.mkdir()
    captured = queue.Queue()
    messages = queue.Queue()
    events = []
    process = None
    server = None
    result = {'case': name, 'overrides': overrides, 'file_config': file_config,
              'thread_config': thread_config, 'private_root': str(private)}
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass
        def do_GET(self):
            self.send_response(404)
            self.end_headers()
        def do_POST(self):
            body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
            if self.headers.get('Content-Encoding') == 'gzip':
                body = gzip.decompress(body)
            try:
                request = json.loads(body)
                (evidence / 'request.json').write_text(json.dumps(request, indent=2))
                captured.put({'path': self.path, 'request': request})
            except Exception as error:
                captured.put({'error': repr(error), 'encoding': self.headers.get('Content-Encoding')})
            # Deliberately stop here: capture actual model tool definitions, never execute them.
            body = json.dumps({'error': {'message': 'Intentional local diagnostic capture; no inference',
                                        'type': 'invalid_request_error', 'code': 'probe_complete'}}).encode()
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        config = '''model = "gpt-6.1-sol"
model_provider = "local_probe"
approval_policy = "never"
web_search = "disabled"
[model_providers.local_probe]
name = "Local diagnostic mock"
base_url = "http://127.0.0.1:%s/v1"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false
[analytics]
enabled = false
[feedback]
enabled = false
''' % server.server_port
        (codex_home / 'config.toml').write_text(config + file_config)
        (evidence / 'config.toml').write_text(config + file_config)
        command = [BINARY, 'app-server', '--listen', 'stdio://',
                   '-c', 'features.enable_request_compression=false',
                   '-c', 'features.apps=false', '-c', 'features.plugins=false',
                   '-c', 'features.hooks=false'] + overrides
        result['command'] = command
        env = {'PATH': os.environ['PATH'], 'HOME': str(home), 'CODEX_HOME': str(codex_home),
               'TMPDIR': str(private), 'LANG': 'en_US.UTF-8'}
        with (evidence / 'stderr.log').open('w') as stderr:
            process = subprocess.Popen(command, cwd=str(workspace), env=env,
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                       stderr=stderr, universal_newlines=True)
            def reader():
                for line in process.stdout:
                    try:
                        item = json.loads(line)
                        events.append(item)
                        messages.put(item)
                    except ValueError:
                        events.append({'non_json': line})
            threading.Thread(target=reader, daemon=True).start()
            def send(item):
                process.stdin.write(json.dumps(item) + '\n')
                process.stdin.flush()
            def rpc(id, method, params):
                send({'id': id, 'method': method, 'params': params})
                deadline = time.monotonic() + 30
                while time.monotonic() < deadline:
                    if process.poll() is not None and messages.empty():
                        raise RuntimeError('App-server exited with %s' % process.returncode)
                    try:
                        item = messages.get(timeout=0.2)
                    except queue.Empty:
                        continue
                    if item.get('id') == id:
                        if 'error' in item:
                            raise RuntimeError('%s: %s' % (method, item['error']))
                        return item['result']
                raise TimeoutError(method)
            result['initialize'] = rpc(1, 'initialize', {'clientInfo': {
                'name': 'isolated_multi_agent_probe', 'version': '1.0'},
                'capabilities': {'experimentalApi': True}})
            send({'method': 'initialized', 'params': {}})
            cfg = rpc(2, 'config/read', {'includeLayers': True, 'cwd': str(workspace)})
            (evidence / 'effective-config.json').write_text(json.dumps(cfg, indent=2))
            result['effective_agents'] = cfg.get('config', {}).get('agents')
            result['effective_multi_agent_features'] = {k:v for k,v in cfg.get('config', {}).get('features', {}).items()
                                                       if 'agent' in k or 'collab' in k}
            params = {'cwd': str(workspace), 'model': 'gpt-6.1-sol',
                      'approvalPolicy': 'never', 'sandbox': 'read-only', 'ephemeral': True}
            if thread_config is not None:
                params['config'] = thread_config
            thread = rpc(3, 'thread/start', params)
            result['thread_start'] = thread
            thread_id = thread['thread']['id']
            rpc(4, 'turn/start', {'threadId': thread_id,
                                'input': [{'type':'text', 'text': 'Reply OK; do not execute tools.'}]})
            capture = captured.get(timeout=30)
            if 'error' in capture:
                raise RuntimeError(str(capture))
            result['request_path'] = capture['path']
            tool_names = collect_tool_names(capture['request'])
            result['all_tool_names'] = tool_names
            result['collaboration_tool_names'] = [n for n in tool_names if n.startswith('collaboration.') or n in COLLAB - {'wait'}]
            result['captured'] = True
            # Allow the intentional 400 result to reach the JSON-RPC event stream.
            time.sleep(0.3)
    except Exception as error:
        result['error'] = repr(error)
    finally:
        if process is not None:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=10)
            result['process_exit_code'] = process.returncode
        if server is not None:
            server.shutdown()
            server.server_close()
        (evidence / 'events.json').write_text(json.dumps(events, indent=2))
        shutil.rmtree(private)
        result['cleanup'] = {'process_exited': process is None or process.poll() is not None,
                             'private_root_removed': not private.exists(), 'mock_server_closed': True}
        (evidence / 'result.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result), flush=True)
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--case', default='all')
    args = parser.parse_args()
    cases = [
        ('default', [], '', None),
        ('legacy_off', ['-c', 'features.multi_agent=false', '-c', 'features.multi_agent_v2=false'], '', None),
        ('disable_flags', ['--disable', 'multi_agent', '--disable', 'multi_agent_v2'], '', None),
        ('agents_off', ['-c', 'agents.enabled=false'], '', None),
        ('combined_off', ['-c', 'agents.enabled=false', '-c', 'features.multi_agent=false', '-c', 'features.multi_agent_v2=false'], '', None),
        ('agents_file_off', [], '\n[agents]\nenabled = false\n', None),
        ('agents_cli_over_file_on', ['-c', 'agents.enabled=false'], '\n[agents]\nenabled = true\n', None),
        ('thread_override_on', ['-c', 'agents.enabled=false'], '', {'agents.enabled': True}),
        ('thread_override_off', [], '', {'agents.enabled': False}),
    ]
    results = [run_case(*case) for case in cases if args.case in ('all', case[0])]
    (ROOT / ('summary-' + args.case + '.json')).write_text(json.dumps(results, indent=2))
