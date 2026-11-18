"""ab265 temporary: per-Save summary of the probe observer log.

For each Save request (UpdateDelegatedLaunchSelections or another *Save*/*Update* mutation seen in Settings),
report: its response time and errors, whether an Org stream CONNECTED + ROOT_EXECUTION_VIEW_SNAPSHOT (kind=agent_org)
followed within 3 s, how many AgentOrgRunConfig requests were made between the Save response and the next Save bar
text that is 'Saved.' or an error, and the Save bar texts seen in that window. Also counts every Save bar text
containing 'could not be refreshed' in the whole log.
Anchors on the Save *request* (Playwright reports a response after the page may already have sent the next
request). Each Save is tagged with the probe case running at that time (from the probe ledger).
Usage: python3 -I summarize-observer.py <observer.log> <save-op-name>[,<save-op-name>...] [<ledger.md>]
"""
import json
import sys
from datetime import datetime, timedelta

path, ops = sys.argv[1], set(sys.argv[2].split(','))
starts = []
if len(sys.argv) > 3:
    for line in open(sys.argv[3], encoding='utf-8'):
        parts = line.strip().split(' ')
        if len(parts) >= 4 and parts[0] == '-' and parts[3] == 'Started':
            starts.append((datetime.fromisoformat(parts[1].replace('Z', '+00:00')), parts[2]))
def case_at(t):
    current = '?'
    for ts, case in starts:
        if ts <= t:
            current = f'{case}#{sum(1 for x, c in starts if c == case and x <= ts)}'
    return current
rows = []
for line in open(path, encoding='utf-8'):
    line = line.rstrip('\n')
    if not line:
        continue
    ts, rest = line.split(' ', 1)
    rows.append((datetime.fromisoformat(ts.replace('Z', '+00:00')), rest))

def savebar(rest):
    if rest.startswith('[OBS] savebar '):
        return json.loads(rest[len('[OBS] savebar '):])
    return None

refresh_fail_total = sum(1 for _, r in rows if (savebar(r) or '').find('could not be refreshed') >= 0)
saves = [i for i, (_, r) in enumerate(rows) if r.startswith('gql-req ') and r.split(' ')[1] in ops]
print(f'observer log: {path}')
print(f'save ops counted: {sorted(ops)}')
print(f'saves (requests): {len(saves)}')
summary = {'reload_after_save': 0, 'second_read': 0, 'saved_shown': 0, 'refresh_failed': 0}
for n, i in enumerate(saves, 1):
    t0, r0 = rows[i]
    end = saves[n] if n < len(saves) else len(rows)
    window = rows[i + 1:end]
    # The reload may start just before the Save response (event published before the response); look 1 s back too.
    near = [(t, r) for t, r in rows[max(0, i - 50):end] if t0 - timedelta(seconds=1) <= t <= t0 + timedelta(seconds=3)]
    connected = any(r.startswith('ws CONNECTED kind=agent_org') for _, r in near)
    snapshot = any(r.startswith('ws ROOT_EXECUTION_VIEW_SNAPSHOT kind=agent_org') for _, r in near)
    reads, texts, outcome = 0, [], None
    for t, r in window:
        if r.startswith('gql-req ') and r.split(' ')[1] == 'AgentOrgRunConfig' and outcome is None:
            reads += 1
        text = savebar(r)
        if text is not None:
            texts.append(f'{(t - t0).total_seconds():+.2f}s {text!r}')
            if outcome is None and text and (text.startswith('Saved.') or 'could not be refreshed' in text):
                outcome = text
    summary['reload_after_save'] += connected and snapshot
    summary['second_read'] += reads >= 2
    summary['saved_shown'] += bool(outcome and outcome.startswith('Saved.'))
    summary['refresh_failed'] += bool(outcome and 'could not be refreshed' in outcome)
    response = next((r for _, r in window if r.startswith('gql-res ') and r.split(' ')[1] in ops), None)
    print(f'\nSave {n} [{case_at(t0)}] request at {t0.isoformat()}; response: {response}')
    print(f'  Org stream reload within -1..+3 s: CONNECTED={connected} SNAPSHOT={snapshot}')
    print(f'  AgentOrgRunConfig reads before the outcome: {reads}')
    print(f'  outcome: {outcome!r}')
    for x in texts[:6]:
        print(f'  savebar {x}')
print('\n--- totals')
print(f"saves={len(saves)} reload_after_save={summary['reload_after_save']} saves_with_>=2_reads={summary['second_read']} "
      f"saved_shown={summary['saved_shown']} could_not_be_refreshed_outcomes={summary['refresh_failed']} "
      f"could_not_be_refreshed_texts_in_whole_log={refresh_fail_total}")
