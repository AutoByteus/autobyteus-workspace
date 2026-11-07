# api417: excerpt of the node's requests and refusals from the isolated instance log in a time window.
import sys, json, re
log, start, end = sys.argv[1], sys.argv[2], sys.argv[3]
for l in open(log, encoding='utf-8', errors='replace'):
    ts = l[1:25]
    if not (start <= ts <= end): continue
    if not re.search(r'request completed|refused|Terminal websocket', l): continue
    m = re.search(r'(\{.*\})\s*$', l)
    if m and 'request completed' in l:
        try: j = json.loads(m.group(1))
        except Exception: print(ts, l.strip()[:200]); continue
        u = re.sub(r'agent_ws_[0-9a-f]+', 'agent_ws_…', j.get('url', ''))[:170]
        if 'health' in u: continue
        print(ts, j.get('method'), u, j.get('statusCode'))
    else:
        print(ts, re.sub(r'agent_ws_[0-9a-f]+', 'agent_ws_…', l.split('] ', 3)[-1].strip())[:220])
