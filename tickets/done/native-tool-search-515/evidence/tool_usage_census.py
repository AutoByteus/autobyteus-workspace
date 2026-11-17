"""Tool call usage per agent definition: share of runs that called each tool, and calls per tool.
Usage: python3 -I tool_usage_census.py <server-data dir> [agent-definition-id ...]
Read-only; prints counts and tool names only. Claude/Codex MCP names are normalized to the bare tool name."""
import json, os, sys, collections, re
root = sys.argv[1]; wanted = set(sys.argv[2:])
agents_dir = os.path.join(root, 'memory', 'agents')
runs = collections.defaultdict(list)
for d in os.listdir(agents_dir):
    meta = os.path.join(agents_dir, d, 'run_metadata.json')
    if not os.path.exists(meta): continue
    try: m = json.load(open(meta))
    except Exception: continue
    a = m.get('agentDefinitionId'); 
    if wanted and a not in wanted: continue
    runs[a].append((d, m.get('runtimeKind')))
def norm(name):
    name = re.sub(r'^mcp__[^_]+(?:_[^_]+)*?__', '', name)  # mcp__server__tool
    return name.split('.')[-1]
for a, items in sorted(runs.items()):
    per_tool_runs = collections.Counter(); per_tool_calls = collections.Counter(); n_runs = 0; runtimes = collections.Counter()
    for d, rk in items:
        seen = set(); any_call = False
        for fn in os.listdir(os.path.join(agents_dir, d)):
            if not fn.startswith('raw_traces') or not fn.endswith('.jsonl'): continue
            for line in open(os.path.join(agents_dir, d, fn), errors='ignore'):
                if '"tool_call"' not in line: continue
                try: t = json.loads(line)
                except Exception: continue
                if t.get('trace_type') != 'tool_call' or not t.get('tool_name'): continue
                n = norm(t['tool_name']); per_tool_calls[n] += 1; seen.add(n); any_call = True
        if any_call:
            n_runs += 1; runtimes[rk] += 1
            for n in seen: per_tool_runs[n] += 1
    print(f"\n== {a}: {n_runs} runs with tool calls ({dict(runtimes)})")
    for n, c in per_tool_runs.most_common():
        print(f"  {n:28s} runs {c:4d} ({100*c/max(n_runs,1):5.1f}%)  calls {per_tool_calls[n]}")
