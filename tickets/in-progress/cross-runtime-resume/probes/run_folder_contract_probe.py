"""Probe (not production code): check the run-folder invariants of run-runtime-switch-contract.md on run folders.
Read-only. Usage: python3 -I run_folder_contract_probe.py <memory-root> [--limit N]
Checks I-2 (manifest/segment consistency; also for team/org member folders, which have no run_metadata.json), I-5, I-6, I-9; I-1/I-3/I-4/I-7/I-8 apply once switches exist (reported 'n/a')."""
import sys, os, json, glob, re, collections
root = sys.argv[1]
res = collections.Counter(); bad = []
dirs = glob.glob(root + '/agents/*/') + glob.glob(root + '/agent_teams/*/*/') + glob.glob(root + '/agent_orgs/*/*/*/')
for d in dirs:
    if not (os.path.exists(d + 'run_metadata.json') or os.path.exists(d + 'raw_traces_active.jsonl')): continue
    res['folders'] += 1
    res['with_metadata'] += os.path.exists(d + 'run_metadata.json')
    files = {f for f in os.listdir(d) if re.fullmatch(r'raw_traces_\d{6}\.jsonl', f)}
    mp = d + 'raw_traces_manifest.json'
    entries = []
    if os.path.exists(mp):
        try: entries = json.load(open(mp)).get('segments', [])
        except Exception: bad.append((d, 'manifest unreadable')); continue
    names = {e['file_name'] for e in entries}
    if files - names: bad.append((d, 'I-2 segment file not in manifest')); 
    for e in entries:
        if not e.get('runtime_kind'): bad.append((d, 'I-2 segment without runtime_kind'))
        if not os.path.exists(d + e['file_name']): bad.append((d, 'I-2 manifest entry without file'))
    keys = [e['boundary_key'] for e in entries if e.get('boundary_type') == 'runtime_switch']
    if len(keys) != len(set(keys)): bad.append((d, 'I-5 duplicate switch key'))
    meta = {}
    if os.path.exists(d + 'run_metadata.json'):
        try: meta = json.load(open(d + 'run_metadata.json'))
        except Exception: bad.append((d, 'metadata unreadable'))
    if meta.get('pendingRuntimeSwitch') and meta.get('platformAgentRunId'): bad.append((d, 'I-6 pending switch with a session id'))
    sp = d + 'run_summary.md'
    if os.path.exists(sp):
        first = open(sp, errors='replace').readline()
        if not re.match(r'<!-- run_summary run=\S+ by=\S+ at=\S+ covers_through=\S+ -->', first): bad.append((d, 'I-9 bad summary header'))
    res['segments'] += len(entries); res['switch_segments'] += len(keys)
print(dict(res)); print('violations:', len(bad))
for b in bad[:10]: print(' ', b)
print('I-1, I-3, I-4, I-7, I-8: n/a until switches exist')
