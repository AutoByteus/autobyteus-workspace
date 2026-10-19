"""Read-only parser of the user's server.log: lists [CodexSegmentTurnAdmissionRejected] blocks
with line number, run id, event, reason, nearest preceding ISO timestamp; groups consecutive bursts."""
import re, sys, collections
path = sys.argv[1]
ts_re = re.compile(r'(20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d)')
recs = []
last_ts = None
with open(path, errors='replace') as f:
    lines = f.readlines()
i = 0
while i < len(lines):
    ln = lines[i]
    m = ts_re.search(ln)
    if m: last_ts = m.group(1)
    if ln.startswith('[CodexSegmentTurnAdmissionRejected] {'):
        blk = ''.join(lines[i:i+6])
        rid = re.search(r"runId: '([^']+)'", blk); ev = re.search(r"nativeEventName: '([^']+)'", blk); rc = re.search(r"reasonCode: '([^']+)'", blk)
        if rid:
            recs.append((i+1, rid.group(1), ev.group(1), rc.group(1), last_ts))
        i += 6; continue
    i += 1
print('total', len(recs))
c = collections.Counter((r[2], r[3]) for r in recs); print(c.most_common())
runs = collections.Counter(r[1] for r in recs); print('runs', len(runs)); print(runs.most_common(12))
# bursts: consecutive records where gap between blocks is only rejection lines
bursts = []
cur = [recs[0]]
for prev, r in zip(recs, recs[1:]):
    if r[0] - prev[0] == 6 and r[1] == prev[1]:
        cur.append(r)
    else:
        bursts.append(cur); cur = [r]
bursts.append(cur)
bursts.sort(key=len, reverse=True)
for b in bursts[:15]:
    print(len(b), 'lines', b[0][0], '-', b[-1][0], b[0][1], collections.Counter((x[2], x[3]) for x in b).most_common(), 'ts~', b[0][4])
print('--- by approx date (nearest preceding timestamp) ---')
byd = collections.Counter((r[4] or 'none')[:10] for r in recs)
for d,n in sorted(byd.items()): print(d, n)
print('--- after 2026-09-03: by run/event/reason ---')
late = [r for r in recs if (r[4] or '') >= '2026-09-03']
print(len(late), collections.Counter((r[2], r[3]) for r in late).most_common())
print(len(set(r[1] for r in late)), 'runs')
