"""Test page server for browser-tool-errors-507 API/E2E journeys.

Serves /p/<name>: a small mobile-ready page that reports its own state to /log with
navigator.sendBeacon: load, visibilitychange, resize (innerWidth, innerHeight,
visibilityState, monotonic time). Every report is appended as one JSON line to the
events file, with the server's wall-clock time, so page state can be correlated with
the agent's tool calls in the run trace.

Usage: python3 -I page_server.py <port> <events.jsonl>
"""
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1])
EVENTS = sys.argv[2]

PAGE = """<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name}</title>
<style>body{{margin:0;font-family:sans-serif}} h1{{background:#2a6;color:#fff;padding:16px;margin:0}}
p{{padding:4px 16px;margin:0;border-bottom:1px solid #ddd}}</style></head>
<body><h1>Page {name}</h1>{rows}
<script>
const send = (kind) => navigator.sendBeacon('/log', JSON.stringify({{
  page: {name_json}, kind, w: innerWidth, h: innerHeight, vis: document.visibilityState,
  t: Math.round(performance.now())
}}));
addEventListener('load', () => send('load'));
document.addEventListener('visibilitychange', () => send('visibilitychange'));
addEventListener('resize', () => send('resize'));
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        if not self.path.startswith('/p/'):
            self.send_response(404)
            self.end_headers()
            return
        name = self.path[3:].split('?')[0] or 'index'
        body = PAGE.format(name=name, name_json=json.dumps(name),
                           rows=''.join(f'<p>row {i} of page {name}</p>' for i in range(120)))
        data = body.encode()
        self.send_response(200)
        self.send_header('content-type', 'text/html; charset=utf-8')
        self.send_header('content-length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        length = int(self.headers.get('content-length') or 0)
        raw = self.rfile.read(length)
        try:
            event = json.loads(raw)
        except ValueError:
            event = {'raw': raw.decode('utf-8', 'replace')}
        event['server_time'] = time.strftime('%H:%M:%S', time.localtime()) + f'.{int(time.time() * 1000) % 1000:03d}'
        with open(EVENTS, 'a', encoding='utf-8') as handle:
            handle.write(json.dumps(event) + '\n')
        self.send_response(204)
        self.end_headers()


ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
