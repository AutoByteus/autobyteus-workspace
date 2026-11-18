"""Probe (not production code): build a fact-based hand-over note from a COPY of a run folder.
Usage: python3 -I handover_note_probe.py <copied-run-dir>
No model is called. Reads raw_traces_active.jsonl, file_changes.json, run_metadata.json and work_journal/."""
import sys, json, os, collections
d = sys.argv[1]
recs = []
for l in open(os.path.join(d, 'raw_traces_active.jsonl'), errors='replace'):
    try: recs.append(json.loads(l))
    except Exception: pass
meta = json.load(open(os.path.join(d, 'run_metadata.json')))
users = [r for r in recs if r.get('trace_type') == 'user']
cut = lambda s, n: (s if len(s) <= n else s[:n] + f'…[+{len(s)-n} chars]')
last_turn = recs[-1].get('turn_id')
turn = [r for r in recs if r.get('turn_id') == last_turn]
calls = {r['tool_call_id']: r for r in turn if r.get('trace_type') == 'tool_call' and r.get('tool_call_id')}
done = {r.get('tool_call_id') for r in turn if r.get('trace_type') == 'tool_result'}
open_calls = [c for k, c in calls.items() if k not in done]
actions = collections.Counter(r.get('tool_name') for r in turn if r.get('trace_type') == 'tool_call')
fc = os.path.join(d, 'file_changes.json')
changed = []
if os.path.exists(fc):
    try:
        x = json.load(open(fc)); changed = [e.get('path') for e in x.get('entries', [])]
    except Exception: pass
# Fallback / complement: the journal's own file-action lines (every run has a journal)
import re
jd = os.path.join(d, 'work_journal'); jpaths = []
for f in sorted(os.listdir(jd)):
    if f.endswith('.md'):
        for line in open(os.path.join(jd, f), errors='replace'):
            m = re.match(r'\[\d\d:\d\d:\d\d\] (Write file|Edit file): (\S+)', line)
            if m and m.group(2) not in jpaths: jpaths.append(m.group(2))
lastreply = [r for r in recs if r.get('trace_type') == 'assistant'][-1:] 
out = []
out.append(f"HAND-OVER NOTE (probe) — previous run {meta['runId']} on {meta['runtimeKind']} / {meta.get('llmModelIdentifier')}")
out.append(f"Workspace: {meta.get('workspaceRootPath')}")
out.append(f"Journal: {os.path.join(meta['memoryDir'],'work_journal')} (open lines with a file tool; search_memory finds earlier work)")
out.append(f"Records: {len(recs)}; user messages: {len(users)}")
out.append("Original request: " + (cut(users[0]['content'], 1500) if users else '(none)'))
out.append("Latest user messages:")
for u in users[-3:]: out.append("  - " + cut(u['content'], 600))
out.append(f"Last turn: {len(turn)} records; tools used: {dict(actions)}")
out.append("Last agent reply: " + (cut(lastreply[0]['content'], 1200) if lastreply else '(none)'))
out.append(f"Tool calls with no result in the last turn: {len(open_calls)}")
for c in open_calls[:5]: out.append("  - OPEN: " + c.get('tool_name','?') + ' ' + cut(json.dumps(c.get('tool_args')), 300))
out.append(f"Files changed: file_changes.json {len(changed)}; journal Write/Edit lines {len(jpaths)}" + ''.join('\n  - ' + str(p) for p in (jpaths or changed)[-15:]))
out.append("Not carried over: model reasoning; results of open calls; output beyond 40 lines per call; running processes.")
note = '\n'.join(out)
jsize = sum(os.path.getsize(os.path.join(d, 'work_journal', f)) for f in os.listdir(os.path.join(d, 'work_journal')))
print(note); print(f"\n[note {len(note)} chars; journal {jsize} bytes; ratio {jsize/max(1,len(note)):.0f}x]")
