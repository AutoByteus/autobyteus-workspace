# Executed inside this round's owned harness scope. Not a product setup command.
import hashlib

plugin_name = 'autobyteus-fixture'
skill_name = 'read-proof'
skill_alias = plugin_name + ':' + skill_name
body = '''# Private proof skill
Use native Read to freshly read proof.txt in ${CLAUDE_SKILL_DIR}, not a shared link.
When asked for the after-stop proof, freshly read after-stop.txt instead.
Use native Write/Edit to publish the exact requested proof text to the requested file inside the selected working directory.
Do not read other home files or run commands. Preserve existing project content unless explicitly asked to append.
'''
workspace_content = '---\nname: workspace-owned\ndescription: Task-owned stand-in for a user project skill. Do not alter it.\n---\nOWNED_' + uuid.uuid4().hex + '\n'
workspace_path = ROOT + '/.claude/skills/workspace-owned/SKILL.md'
nodejs(a['name'], f"const f=require('fs'),p=require('path');f.mkdirSync(p.dirname({json.dumps(workspace_path)}),{{recursive:true}});f.writeFileSync({json.dumps(workspace_path)},{json.dumps(workspace_content)})")
workspace_hash = hashlib.sha256(workspace_content.encode()).hexdigest()
for index, n in enumerate(nodes):
    fixture = gql(n['port'], 'mutation($i:CreateSkillInput!){createSkill(input:$i){name rootPath content}}', {'i': {'name': skill_name, 'description': 'Use this private fixture skill only for the shared-filesystem capability experiment.', 'content': body}})['createSkill']
    n['sourceRoot'] = fixture['rootPath']
    n['proof'] = 'PRIVATE_' + n['name'] + '_' + uuid.uuid4().hex
    n['afterStop'] = 'AFTER_STOP_' + uuid.uuid4().hex
    n['pluginRoot'] = '/home/autobyteus/data/feasibility-runtime/a' if index == 0 else '/root/.claude/task-fixtures/b'
    code = f"""const f=require('fs'),p=require('path');
const source={json.dumps(n['sourceRoot'])},target={json.dumps(n['pluginRoot'])};
f.writeFileSync(p.join(source,'proof.txt'),{json.dumps(n['proof'])}+'\\n');
f.writeFileSync(p.join(source,'after-stop.txt'),{json.dumps(n['afterStop'])}+'\\n');
f.mkdirSync(p.join(target,'.claude-plugin'),{{recursive:true}});
f.writeFileSync(p.join(target,'.claude-plugin/plugin.json'),JSON.stringify({{name:{json.dumps(plugin_name)},version:'0.0.1'}}));
f.mkdirSync(p.join(target,'skills'),{{recursive:true}});
f.cpSync(source,p.join(target,'skills',{json.dumps(skill_name)}),{{recursive:true,dereference:true}});
console.log(JSON.stringify({{privatePlugin:target,sourceRoot:source,sharedRoot:{json.dumps(ROOT)},sourceManifestExists:f.existsSync(p.join(source,'SKILL.md'))}}));"""
    n['publication'] = json.loads(nodejs(n['name'], code))
    d('cp', str(P / 'private-plugin-worker.mjs'), n['name'] + ':/app/autobyteus-server-ts/private-plugin-worker.mjs')
    n['executable'] = d('exec', n['name'], 'sh', '-c', 'command -v claude').stdout.strip()
    n['sdk_metadata'] = json.loads(nodejs(n['name'], "const f=require('fs'),p=require('path'),c=require('crypto'); const d=p.dirname(require.resolve('@anthropic-ai/claude-agent-sdk'));console.log(JSON.stringify({version:JSON.parse(f.readFileSync(p.join(d,'package.json'))).version,typesHash:c.createHash('sha256').update(f.readFileSync(p.join(d,'sdk.d.ts'))).digest('hex')}))"))


def auth_transfer():
    receipts = []
    for n in nodes:
        key = sp.run(['security', 'find-generic-password', '-s', 'Claude Code-credentials', '-w'], capture_output=True, timeout=10)
        assert key.returncode == 0, 'native Claude login unavailable; secret not logged'
        parsed = json.loads(key.stdout)
        oauth = parsed.get('claudeAiOauth', {})
        assert oauth.get('accessToken'), 'native Claude login shape unavailable'
        assert oauth.get('expiresAt', 0) > time.time() * 1000 + 120000, 'OAuth expired/near expiry; source not refreshed'
        injected = sp.run(['docker', 'exec', '-i', n['name'], 'sh', '-c', 'umask 077; mkdir -p /root/.claude; cat > /root/.claude/.credentials.json; chmod 0600 /root/.claude/.credentials.json'], input=key.stdout, capture_output=True, timeout=10)
        assert injected.returncode == 0, 'isolated transfer failed (values not logged)'
        receipts.append({'node': n['name'], 'source': 'exact Mac Claude Code-credentials Keychain item, read-only', 'expiresAt': oauth.get('expiresAt'), 'tokens_logged': False, 'host_secret_file_created': False})
        del parsed, key, oauth
    return receipts


case('native Claude login streamed only into fresh private homes, no source edit', auth_transfer)
worker_by_name = {}


def response(worker, timeout=160):
    assert select.select([worker.stdout], [], [], timeout)[0], 'native SDK response timeout'
    line = worker.stdout.readline()
    assert line, 'native worker exited before receipt'
    result = json.loads(line)
    assert result.get('event') != 'ERROR', result
    return result


def start_worker(n, resume=None):
    argv = ['docker', 'exec', '-i', '-w', '/app/autobyteus-server-ts', n['name'], 'node', 'private-plugin-worker.mjs', ROOT, n['pluginRoot'], n['executable']]
    if resume:
        argv.append(resume)
    suffix = '-resumed' if resume else ''
    errfile = open(P / (n['name'] + suffix + '-worker.stderr.log'), 'w')
    worker = sp.Popen(argv, stdin=sp.PIPE, stdout=sp.PIPE, stderr=errfile, text=True)
    worker._probe_error_file = errfile
    workers.append(worker)
    init = response(worker)
    (P / (n['name'] + suffix + '-init.json')).write_text(json.dumps(init, indent=2))
    assert init['event'] == 'READY' and init['cwd'] == ROOT, init
    assert any(p.get('name') == plugin_name and p.get('path') == n['pluginRoot'] for p in init.get('plugins', [])), init
    assert skill_alias in init.get('skills', []) and 'workspace-owned' in init.get('skills', []), init
    assert not init.get('pluginErrors'), init
    n['sessionId'] = init['sessionId']
    worker_by_name[n['name']] = worker
    return init


def start_pair():
    return [{'node': n['name'], 'init': start_worker(n), 'sdk': n['sdk_metadata']} for n in nodes]


case('both native sessions discover different private plugin paths and preserved workspace skill', start_pair)


def turn(n, prompt, label, require_skill=False, require_read=None):
    worker = worker_by_name[n['name']]
    worker.stdin.write(json.dumps({'action': 'turn', 'label': label, 'prompt': prompt}) + '\n')
    worker.stdin.flush()
    receipt = response(worker, 180)
    (P / (label + '-turn.json')).write_text(json.dumps({'node': n['name'], 'prompt': prompt, 'receipt': receipt}, indent=2))
    assert receipt.get('event') == 'TURN_COMPLETED' and not receipt.get('resultError'), receipt
    tools = [x for e in receipt['events'] if e.get('type') == 'assistant' for x in e.get('message', {}).get('content', []) if x.get('type') == 'tool_use']
    results = [x for e in receipt['events'] if e.get('type') == 'user' for x in e.get('message', {}).get('content', []) if x.get('type') == 'tool_result']
    assert tools and results, 'no actual native tool results'
    assert not any(x.get('is_error') for x in results), results
    assert not any(x.get('name') not in ['Skill', 'Read', 'Write', 'Edit'] for x in tools), tools
    if require_skill:
        assert any(x['name'] == 'Skill' and x['input'].get('skill') == skill_alias for x in tools), tools
    if require_read:
        assert any(x['name'] == 'Read' and x['input'].get('file_path') == require_read for x in tools), tools
    return {'node': n['name'], 'sessionId': n['sessionId'], 'tools': tools, 'receipt': label + '-turn.json'}


def snapshot(filename, expected):
    rows = []
    for n in nodes:
        actual = json.loads(nodejs(n['name'], f"const f=require('fs');console.log(JSON.stringify(f.readFileSync({json.dumps(ROOT + '/' + filename)},'utf8')))") )
        assert actual == expected, (n['name'], actual, expected)
        rows.append({'node': n['name'], 'path': ROOT + '/' + filename, 'sha256': hashlib.sha256(expected.encode()).hexdigest()})
    backing = json.loads(d('exec', server, 'python3', '-c', "from pathlib import Path;import json;print(json.dumps(Path('/export/project/" + filename + "').read_text()))").stdout)
    assert backing == expected, (backing, expected)
    return {'clients': rows, 'backingPath': '/export/project/' + filename, 'exactBytes': expected}


def invariant():
    rows = []
    for n in nodes:
        code = f"const f=require('fs'),c=require('crypto');const z=f.readFileSync({json.dumps(workspace_path)});console.log(JSON.stringify({{userSkillHash:c.createHash('sha256').update(z).digest('hex'),projectSkills:f.readdirSync({json.dumps(ROOT + '/.claude/skills')}),codexArtifacts:f.existsSync({json.dumps(ROOT + '/.agents')})}}))"
        result = json.loads(nodejs(n['name'], code))
        assert result['userSkillHash'] == workspace_hash and result['projectSkills'] == ['workspace-owned'] and not result['codexArtifacts'], result
        rows.append({'node': n['name'], 'state': result})
    return rows


filename = 'native-private-roundtrip.txt'


def write_a():
    receipt = turn(a, 'Invoke native Skill ' + skill_alias + '. Freshly read its proof.txt with native Read and use native Write to create ' + filename + ' in cwd containing exactly that proof text. The proof content is not supplied here. Do not touch any other project file.', 'a-write', True, a['pluginRoot'] + '/skills/read-proof/proof.txt')
    return {'native': receipt, 'storage': snapshot(filename, a['proof'] + '\n'), 'project': invariant()}


case('A invokes private native Skill and publishes actual helper content to common project', write_a)


def read_b():
    receipt = turn(b, 'Use native Read to freshly open ' + ROOT + '/' + filename + ' and report exact contents. No contents are supplied here.', 'b-read', False, ROOT + '/' + filename)
    return {'native': receipt, 'storage': snapshot(filename, a['proof'] + '\n')}


case('B reads A output through independent mount without prompt copying', read_b)


def modify_b():
    receipt = turn(b, 'Invoke native Skill ' + skill_alias + '. Freshly read its own proof.txt with native Read. Append that exact proof text including one newline to ' + filename + ' in cwd, preserving all existing bytes. Use native Edit or Write. The private proof content is not supplied here.', 'b-modify', True, b['pluginRoot'] + '/skills/read-proof/proof.txt')
    return {'native': receipt, 'storage': snapshot(filename, a['proof'] + '\n' + b['proof'] + '\n'), 'project': invariant()}


case('B uses own private Skill source and preserves A bytes while modifying', modify_b)


def reopen_a():
    receipt = turn(a, 'Use native Read to freshly open ' + ROOT + '/' + filename + ' and report its full contents. Another node modified it; new content is not supplied here.', 'a-reread', False, ROOT + '/' + filename)
    return {'native': receipt, 'storage': snapshot(filename, a['proof'] + '\n' + b['proof'] + '\n')}


case('A fresh reopen obtains B modification', reopen_a)


def stop_worker(n):
    w = worker_by_name.pop(n['name'])
    w.stdin.write(json.dumps({'action': 'close'}) + '\n')
    w.stdin.flush()
    out, _ = w.communicate(timeout=30)
    w._probe_error_file.close()
    assert w.returncode == 0, (w.returncode, out)
    workers.remove(w)
    return {'node': n['name'], 'sessionId': n['sessionId'], 'exit': w.returncode, 'remaining_stdout': out}


def close_a():
    closed = stop_worker(a)
    nodejs(a['name'], f"require('fs').rmSync({json.dumps(a['pluginRoot'])},{{recursive:true}})")
    peer = json.loads(nodejs(b['name'], f"const f=require('fs');console.log(JSON.stringify({{activeProof:f.existsSync({json.dumps(b['pluginRoot'] + '/skills/read-proof/proof.txt')}),afterStopProof:f.existsSync({json.dumps(b['pluginRoot'] + '/skills/read-proof/after-stop.txt')})}}))"))
    assert peer['activeProof'] and peer['afterStopProof'], peer
    return {'closed': closed, 'a_private_bundle_removed': True, 'b_private_source': peer, 'sharedProject': invariant()}


case('A close/private-bundle cleanup cannot delete B Skill or workspace-owned project files', close_a)


def after_stop():
    receipt = turn(b, 'The peer session has stopped. Invoke native Skill ' + skill_alias + ' again, freshly read its after-stop.txt with native Read and create peer-stopped-proof.txt in cwd containing exactly that file. This proof content has not been supplied here.', 'b-after-peer-stop', True, b['pluginRoot'] + '/skills/read-proof/after-stop.txt')
    return {'native': receipt, 'storage': snapshot('peer-stopped-proof.txt', b['afterStop'] + '\n'), 'sharedProject': invariant()}


case('B active session invokes Skill/reads previously unread private asset after A cleanup', after_stop)
R['closed_before_resume'] = stop_worker(b)


def resume_b():
    previous = b['pluginRoot']
    b['pluginRoot'] = previous + '-resumed'
    newproof = 'RESUMED_' + uuid.uuid4().hex
    nodejs(b['name'], f"const f=require('fs');f.cpSync({json.dumps(previous)},{json.dumps(b['pluginRoot'])},{{recursive:true}});f.writeFileSync({json.dumps(b['pluginRoot'] + '/skills/read-proof/proof.txt')},{json.dumps(newproof + chr(10))});f.rmSync({json.dumps(previous)},{{recursive:true}})")
    init = start_worker(b, b['sessionId'])
    receipt = turn(b, 'Resume capability check: invoke native Skill ' + skill_alias + ' and freshly read proof.txt from the currently loaded private plugin, not a remembered previous path. Create resumed-proof.txt in cwd containing exactly the newly read proof. New content is not supplied here.', 'b-resumed-new-bundle', True, b['pluginRoot'] + '/skills/read-proof/proof.txt')
    return {'node': b['name'], 'resumedSessionId': b['sessionId'], 'init': init, 'native': receipt, 'storage': snapshot('resumed-proof.txt', newproof + '\n'), 'sharedProject': invariant()}


case('native SDK resume loads replacement private bundle, no retained shared/old private path', resume_b)
R['closed_after_resume'] = stop_worker(b)
R['uncovered'] = ['production application private-plugin preparation/collision/admission integration', 'native macOS mounted client', 'independent physical LAN computer', 'one-command product setup', 'latest source/UI/final validation', 'other runtime private skill discovery']
R['production_patch'] = False
