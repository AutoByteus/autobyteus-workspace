#!/usr/bin/env python3
"""API-12: per build, MSP-05 in probe order, the MSP-90 tries, and the background Team open against the Team tap."""
import json, statistics, sys
for name in ('merged', 'base'):
    d = json.load(open(f'{name}/mobile-shell-probe.json'))
    m = d['cases']['MSP-90']; tries = m['tries']
    unknown = [e['line'] for e in d['browserErrors'] if not e['known']]
    rows = []
    for t in tries:
        bg = next((r['at'] for r in t['reads'] if r['op'] == 'GetTeamRunResumeConfig'), None)
        agents = sum(1 for r in t['reads'] if r['op'] == 'GetAgentRunResumeConfig' and (bg is None or r['at'] < bg))
        rows.append((t['index'], t['opened'], t['race'], t['listAt'], t['teamTapAt'], bg, None if bg is None else t['teamTapAt'] - bg, agents))
    gaps = [r[6] for r in rows if r[6] is not None]
    print(f"== {name}: MSP-05 {d['cases']['MSP-05']['result']}; MSP-90 races {m['races']}/{len(tries)}, failed opens {m['failedOpens']}; unknown browser lines {len(unknown)} (all FU-004: {all('became mounted while it was loading' in u for u in unknown)})")
    print(f"   list shown ms median {statistics.median(r[3] for r in rows)}; Team tap ms median {statistics.median(r[4] for r in rows)}; background Team open start (GetTeamRunResumeConfig) ms median {statistics.median(r[5] for r in rows if r[5] is not None)}; tap minus background start median {statistics.median(gaps)} (min {min(gaps)}, max {max(gaps)}); agent hydrations before it {sorted(set(r[7] for r in rows))}")
    for r in rows:
        if r[2] or not r[1]: print(f"   race try {r[0]}: opened={r[1]} list={r[3]} tap={r[4]} bgStart={r[5]} tap-bgStart={r[6]}")
