#!/usr/bin/env python3
import argparse
import json
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

class Handler(BaseHTTPRequestHandler):
    server_version = "AutoByteusFakeMobile/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/rest/remote-access/status":
            body = json.dumps({
                "phoneAccessEnabled": self.server.phone_access_enabled,
                "pairingAvailable": True,
                "compatibilityVersion": 1,
                "serverName": "Fake AutoByteus Node",
                "serverInstanceId": "fake-ios-smoke-node",
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/mobile" or parsed.path.startswith("/mobile/"):
            body = b"""<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'><title>AutoByteus Fake Mobile</title></head><body><main style='font-family:-apple-system;padding:32px'><h1>AUTOBYTEUS_FAKE_MOBILE_READY</h1><p>Fake /mobile shell for iOS simulator smoke validation.</p><input type='file' aria-label='Attachment'></main></body></html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path in ("/mobile.webmanifest", "/favicon.ico", "/autobyteus-icon.svg") or parsed.path.startswith(("/_nuxt/", "/__nuxt/", "/assets/")):
            self.send_response(204)
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, fmt, *args):
        print("%s - - [%s] %s" % (self.client_address[0], self.log_date_time_string(), fmt % args), flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=29876)
    parser.add_argument("--phone-access-enabled", action=argparse.BooleanOptionalAction, default=True)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.phone_access_enabled = args.phone_access_enabled
    print(f"Fake AutoByteus node listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()
