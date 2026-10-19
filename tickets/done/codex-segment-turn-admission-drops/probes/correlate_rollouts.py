"""Read-only correlation. For every run with [CodexSegmentTurnAdmissionRejected] after a cutoff,
resolve its Codex thread id from AutoByteus memory metadata, read the Codex rollout(s) for that
thread, and count item_completed records that Codex wrote after the item's own turn had ended
(turn_aborted/task_complete), split into: next turn already started (expected CONFLICT) or no turn
running (expected INACTIVE). Compares with the log's item/completed rejection counts per run."""
import re, sys, json, glob, os, collections
log, cutoff = sys.argv[1], sys.argv[2]
mem = os.path.expanduser('~/.autobyteus/server-data/memory')
codex = os.path.expanduser('~/.codex')
exec(open(os.path.join(os.path.dirname(__file__), 'parse_rejections.py')).read().split("print('total'")[0].replace('sys.argv[1]', 'log'))
late = [r for r in recs if (r[4] or '') >= cutoff]
logc = collections.defaultdict(collections.Counter)
for r in late: logc[r[1]][(r[2], r[3])] += 1
# thread id map
tid = {}
for p in glob.glob(mem + '/agents/*/run_metadata.json'):
    try: d = json.load(open(p)); tid[d['runId']] = d.get('platformAgentRunId')
    except Exception: pass
for p in glob.glob(mem + '/agent_teams/*/team_run_execution_tree.json'):
    try: d = json.load(open(p))
    except Exception: continue
    def walk(o):
        if isinstance(o, dict):
            if o.get('agentRunId') and o.get('platformAgentRunId'): tid[o['agentRunId']] = o['platformAgentRunId']
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(d)
tot = collections.Counter()
for run, c in sorted(logc.items()):
    t = tid.get(run)
    files = sorted(glob.glob(f'{codex}/sessions/*/*/*/*{t}.jsonl') + glob.glob(f'{codex}/archived_sessions/*{t}.jsonl')) if t else []
    ended, current = set(), None
    lateItems = collections.Counter()
    for f in files:
        for ln in open(f):
            try: o = json.loads(ln)
            except Exception: continue
            if o.get('type') != 'event_msg': continue
            p = o.get('payload') or {}; ty = p.get('type')
            if ty == 'task_started': current = p.get('turn_id')
            elif ty in ('task_complete', 'turn_aborted'):
                ended.add(p.get('turn_id'))
                if current == p.get('turn_id'): current = None
            elif ty == 'item_completed':
                it = p.get('turn_id')
                if it in ended:
                    kind = 'CONFLICT' if current else 'INACTIVE'
                    lateItems[(kind, (p.get('item') or {}).get('type'))] += 1
    lc = {f"{e.split('/')[1]}:{rc.split('_')[-1]}": n for (e, rc), n in c.items()}
    print(run, 'thread', t, 'rollouts', len(files), '| log', lc, '| rollout late item_completed', dict(lateItems))
    for k, n in lateItems.items(): tot[k] += n
print('TOTAL rollout late item_completed by (expected reason, item type):', dict(tot))
