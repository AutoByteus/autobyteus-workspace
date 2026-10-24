"""ab265 temporary: per Save, timing of the AgentOrgRunConfig read(s) against the Org stream reload (ws CONNECTED,
ROOT_EXECUTION_VIEW_SNAPSHOT kind=agent_org). Usage: python3 -I race-timing.py <observer.log>"""
import sys
from datetime import datetime
rows = []
for line in open(sys.argv[1], encoding='utf-8'):
    line = line.rstrip('\n')
    if line:
        ts, rest = line.split(' ', 1); rows.append((datetime.fromisoformat(ts.replace('Z', '+00:00')), rest))
saves = [i for i, (_, r) in enumerate(rows) if r == 'gql-req UpdateDelegatedLaunchSelections']
for n, i in enumerate(saves, 1):
    t0 = rows[i][0]; end = saves[n] if n < len(saves) else len(rows)
    ev = []
    for t, r in rows[i:end]:
        ms = (t - t0).total_seconds() * 1000
        if ms > 3000: break
        if r.startswith(('gql-req AgentOrgRunConfig', 'gql-res AgentOrgRunConfig', 'gql-res UpdateDelegatedLaunchSelections')) \
           or 'kind=agent_org' in r or (r.startswith('[OBS] savebar') and ('Saved' in r or 'refreshed' in r)):
            ev.append(f"{ms:+6.0f}ms {r.split(' status=')[0].replace(' kind=agent_org', '').split(' ws://')[0]}")
    print(f'Save {n}:'); [print('   ', e) for e in ev]
