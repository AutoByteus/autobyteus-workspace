"""Print the tool calls and results of a run trace (raw_traces_active.jsonl), one line each,
with local wall-clock time, so they can be correlated with the page event log.
Usage: python3 -I trace_tools.py <raw_traces_active.jsonl> [<more files>...]
"""
import json
import sys
import time

for path in sys.argv[1:]:
    print(f'## {path}')
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            entry = json.loads(line)
            if entry.get('trace_type') not in ('tool_call', 'tool_result'):
                continue
            ts = entry.get('ts') or 0
            clock = time.strftime('%H:%M:%S', time.localtime(ts)) + f'.{int(ts * 1000) % 1000:03d}'
            if entry['trace_type'] == 'tool_call':
                detail = 'args=' + json.dumps(entry.get('tool_args'))
            else:
                detail = (entry.get('source_event') or '') + ' result=' + json.dumps(entry.get('tool_result')) \
                    + ' error=' + json.dumps(entry.get('tool_error'))
            print(f"{clock} seq={entry.get('seq')} {entry['trace_type']} {entry.get('tool_name')} {detail}")
