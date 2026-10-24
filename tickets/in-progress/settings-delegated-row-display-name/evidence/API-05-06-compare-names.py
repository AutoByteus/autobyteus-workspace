"""ab208 temporary: compare the Settings copy-row names with the sidebar copy-row names in a name-observer log.

For every Settings row key `<address>@<runId>` ever shown, collect the names Settings showed for it and the names
the sidebar showed for the same run (Team/Agent transient rows by data-agent-run-id or data-team-run-id; Org rows
by data-agent-run-id). Prints one line per copy: MATCH / MISMATCH (by run id), MATCH-BY-ADDRESS / MISMATCH-BY-ADDRESS (Team-copy rows and collapsed
members, whose sidebar row carries no copy run id), NO-SIDEBAR-ROW, with the names and initials.
Also lists every conversation title seen. Usage: python3 -I compare-names.py <name-observer.log>
"""
import json
import sys
from collections import defaultdict

settings = defaultdict(set)
initials = defaultdict(set)
sidebar = defaultdict(set)
by_address = defaultdict(set)
titles = []
for line in open(sys.argv[1], encoding='utf-8'):
    if '[NAMES] ' not in line:
        continue
    snap = json.loads(line.split('[NAMES] ', 1)[1])
    for row in snap['settings']:
        if row['name']:
            settings[row['key']].add(row['name'])
            initials[row['key']].add(row['initials'])
    for row in snap['sidebar']:
        if row.get('address') and row['name']:
            by_address[row['address']].add(row['name'])
        for run_id in (row.get('agentRunId'), row.get('teamRunId') if row.get('kind') != 'agent' else None):
            if run_id and row['name']:
                sidebar[run_id].add(row['name'])
    for row in snap['org']:
        if row.get('agentRunId') and row['name']:
            sidebar[row['agentRunId']].add(row['name'])
    if snap.get('title') and (not titles or titles[-1] != snap['title']):
        titles.append(snap['title'])

counts = defaultdict(int)
for key in sorted(settings):
    address, run_id = key.rsplit('@', 1)
    s_names, b_names = sorted(settings[key]), sorted(sidebar.get(run_id, set()))
    if not b_names and by_address.get(address):
        # Team-copy rows carry the root's team run id; members of a collapsed group are not rendered: match by address.
        b_names = sorted(by_address[address])
        verdict = 'MATCH-BY-ADDRESS' if s_names == b_names else 'MISMATCH-BY-ADDRESS'
    elif not b_names:
        verdict = 'NO-SIDEBAR-ROW'
    elif s_names == b_names:
        verdict = 'MATCH'
    else:
        verdict = 'MISMATCH'
    counts[verdict] += 1
    print(f'{verdict:15} {key}  settings={s_names} initials={sorted(initials[key])} sidebar={b_names}')
print('\nconversation titles seen:', titles)
print('\n--- totals', dict(counts))
