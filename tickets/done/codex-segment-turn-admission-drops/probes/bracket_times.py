"""Read-only: for rejection blocks of one run id, print the nearest preceding and following
timestamps in server.log (ISO stderr stamps or pino epoch 'time' fields), in UTC."""
import re, sys, datetime
path, run = sys.argv[1], sys.argv[2]
iso = re.compile(r'(20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?)Z')
pino = re.compile(r'"time":(\d{13})')
lines = open(path, errors='replace').readlines()
def ts_at(i):
    m = iso.search(lines[i]);
    if m: return m.group(1)[:23]
    m = pino.search(lines[i])
    if m: return datetime.datetime.fromtimestamp(int(m.group(1))/1000, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:23]
    return None
for i, ln in enumerate(lines):
    if ln.startswith('[CodexSegmentTurnAdmissionRejected] {') and run in lines[i+2]:
        ev = re.search(r"nativeEventName: '([^']+)'", lines[i+3]).group(1); rc = re.search(r"reasonCode: '([^']+)'", lines[i+4]).group(1)
        b = next((ts_at(j) for j in range(i-1, max(0,i-5000), -1) if ts_at(j)), None)
        a = next((ts_at(j) for j in range(i+1, min(len(lines), i+5000)) if ts_at(j)), None)
        print(i+1, ev, rc, 'after', b, 'before', a)
