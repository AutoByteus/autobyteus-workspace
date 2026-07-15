from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
ROOT = Path(__file__).resolve().parents[5] / 'autobyteus-web' / 'dist' / 'public'
os.chdir(ROOT)
class SPA(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.translate_path(self.path.split('?',1)[0])
        if not os.path.exists(path) or os.path.isdir(path):
            self.path = '/index.html'
        return super().do_GET()
ThreadingHTTPServer(('127.0.0.1',3317), SPA).serve_forever()
