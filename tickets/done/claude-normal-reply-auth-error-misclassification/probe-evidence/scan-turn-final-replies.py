import os, json, sys, datetime, collections
root = sys.argv[1]
M = ['authentication_failed','not logged in','please run /login']
hits = []
runtime_cache = {}
def runtime_for(d):
    p = os.path.join(d, 'run_metadata.json')
    try:
        j = json.load(open(p))
        return j.get('runtimeKind') or j.get('runtime_kind') or j.get('runtime') or '?'
    except Exception:
        return '?'
for dp, dn, fn in os.walk(root):
    tr = [f for f in fn if f.startswith('raw_traces') and f.endswith('.jsonl')]
    if not tr: continue
    rt = runtime_for(dp)
    last = {}
    for f in tr:
        for line in open(os.path.join(dp, f), errors='ignore'):
            try: d = json.loads(line)
            except Exception: continue
            if d.get('trace_type') != 'assistant': continue
            t = d.get('turn_id')
            if t not in last or d.get('ts',0) >= last[t].get('ts',0): last[t] = d
    for t, d in last.items():
        c = (d.get('content') or '').lower()
        ms = [m for m in M if m in c]
        if ms:
            hits.append((d.get('ts',0), rt, ms, dp.replace(root,'')[-90:]))
hits.sort()
for h in hits:
    print(datetime.datetime.fromtimestamp(h[0]).strftime('%Y-%m-%d %H:%M'), h[1], h[2], h[3])
print('total', len(hits))
