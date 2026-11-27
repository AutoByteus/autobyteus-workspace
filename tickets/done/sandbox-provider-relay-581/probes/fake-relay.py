#!/usr/bin/env python3
"""autobyteus-581 probe: a fake provider relay that records the SHAPE of each request a runtime sends.

usage: python3 -I fake-relay.py PORT LOGFILE

Records per request: client address, method, path (no query values), header names, the values of a few
non-secret headers, and for credential headers only the scheme and whether the value equals a known
placeholder. Never records a credential value or a body. Answers 401 in the Anthropic error shape, so a
client stops quickly. Binds 127.0.0.1 only.
"""
import json, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT, LOG = int(sys.argv[1]), sys.argv[2]
SAFE = {"anthropic-beta", "anthropic-version", "user-agent", "content-type", "openai-beta", "originator", "x-app", "version"}
CRED = {"authorization", "x-api-key", "x-goog-api-key", "chatgpt-account-id", "proxy-authorization"}
PLACEHOLDERS = {"rp_probe_pass_placeholder", "placeholder-not-a-credential"}


def describe_credential(value):
    parts = value.split(" ", 1)
    scheme, token = (parts[0], parts[1]) if len(parts) == 2 else ("", parts[0])
    return {"scheme": scheme, "placeholder": token in PLACEHOLDERS, "length": len(token)}


class Handler(BaseHTTPRequestHandler):
    def handle_any(self):
        length = int(self.headers.get("content-length") or 0)
        if length:
            self.rfile.read(length)
        record = {
            "client": self.client_address[0],
            "method": self.command,
            "path": self.path.split("?", 1)[0],
            "headers": sorted(k.lower() for k in self.headers.keys()),
            "safe": {k.lower(): v[:120] for k, v in self.headers.items() if k.lower() in SAFE},
            "credentials": {k.lower(): describe_credential(v) for k, v in self.headers.items() if k.lower() in CRED},
            "bodyBytes": length,
        }
        with open(LOG, "a") as f:
            f.write(json.dumps(record) + "\n")
        body = json.dumps({"type": "error", "error": {"type": "authentication_error", "message": "fake relay"}}).encode()
        self.send_response(401)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = handle_any

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
