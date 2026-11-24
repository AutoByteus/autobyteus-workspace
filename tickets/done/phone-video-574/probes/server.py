#!/usr/bin/env python3
# autobyteus-574 feasibility prototype (Solution Designer, temporary): a stand-in for the node's file route.
# /media/<file> requires "Authorization: Bearer test-key" and honours Range (206). Every request is logged.
import json, os, re, sys, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(ROOT, 'requests.jsonl')
KEY = 'Bearer test-key'

class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def record(self, status, sent, rng):
        with open(LOG, 'a') as f:
            f.write(json.dumps({'t': round(time.time(), 3), 'path': self.path, 'status': status,
                                'range': rng, 'auth': self.headers.get('Authorization') == KEY,
                                'authHeaderPresent': 'Authorization' in self.headers,
                                'ua': self.headers.get('User-Agent', '')[:60], 'bytes': sent}) + '\n')

    def do_GET(self):
        rng = self.headers.get('Range')
        if self.path.startswith('/page'):
            body = open(os.path.join(ROOT, self.path.lstrip('/').split('?')[0]), 'rb').read()
            self.send_response(200); self.send_header('Content-Type', 'text/html'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
            self.record(200, len(body), rng); return
        m = re.match(r'^/(?:media|open)/([\w.-]+)$', self.path.split('?')[0])
        if not m:
            self.send_response(404); self.end_headers(); self.record(404, 0, rng); return
        if self.headers.get('Authorization') != KEY and not self.path.startswith('/open/'):
            self.send_response(401); self.send_header('Content-Length', '0'); self.end_headers(); self.record(401, 0, rng); return
        path = os.path.join(ROOT, m.group(1)); size = os.path.getsize(path)
        etag = '"%d-%d"' % (size, int(os.path.getmtime(path)))
        if self.headers.get('If-None-Match') == etag:
            self.send_response(304); self.send_header('ETag', etag); self.end_headers(); self.record(304, 0, rng); return
        start, end = 0, size - 1
        status = 200
        if rng:
            mm = re.match(r'bytes=(\d*)-(\d*)', rng)
            if mm.group(1) == '':
                start = max(0, size - int(mm.group(2)))
            else:
                start = int(mm.group(1)); end = int(mm.group(2)) if mm.group(2) else size - 1
            end = min(end, size - 1); status = 206
        length = end - start + 1
        self.send_response(status)
        self.send_header('Content-Type', 'video/mp4'); self.send_header('Accept-Ranges', 'bytes')
        self.send_header('ETag', etag); self.send_header('Content-Length', str(length))
        if status == 206:
            self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
        self.end_headers()
        sent = 0
        try:
            with open(path, 'rb') as f:
                f.seek(start)
                while sent < length:
                    chunk = f.read(min(65536, length - sent))
                    if not chunk:
                        break
                    self.wfile.write(chunk); sent += len(chunk)
                    if os.path.exists(os.path.join(ROOT, 'slow')): time.sleep(0.05)
        except (BrokenPipeError, ConnectionResetError):
            pass
        self.record(status, sent, rng)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8574
    ThreadingHTTPServer(('0.0.0.0', port), H).serve_forever()
