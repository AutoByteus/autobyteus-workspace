"""Read-only: for given Codex rollout files, print each item_completed written after its own turn ended:
how the turn ended, delay since that end, item type/status/exit code and output size."""
import sys, json, datetime, collections
def t(s): return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))
agg = collections.Counter()
for f in sys.argv[1:]:
    ended = {}; current = None
    for ln in open(f):
        try: o = json.loads(ln)
        except Exception: continue
        if o.get('type') != 'event_msg': continue
        p = o.get('payload') or {}; ty = p.get('type')
        if ty == 'task_started': current = p.get('turn_id')
        elif ty in ('task_complete', 'turn_aborted'):
            ended[p.get('turn_id')] = (ty, p.get('reason'), o['timestamp'])
            if current == p.get('turn_id'): current = None
        elif ty == 'item_completed' and p.get('turn_id') in ended:
            how, reason, at = ended[p['turn_id']]; it = p.get('item') or {}
            delay = (t(o['timestamp']) - t(at)).total_seconds()
            status = it.get('status'); 
            out = it.get('aggregated_output') or it.get('aggregatedOutput') or it.get('result') or ''
            key = (how, reason, it.get('type'), str(status))
            agg[key] += 1
            print(f.split('/')[-1][-41:-6], how, reason, f'+{delay:.3f}s', it.get('type'), 'status=', status, 'exit=', it.get('exit_code', it.get('exitCode')), 'out_len=', len(json.dumps(out)), 'next_turn_running=', bool(current), '| keys', sorted(it.keys())[:12])
print('SUMMARY', dict(agg))
