#!/usr/bin/env python3
import argparse
import json
import os
import re
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

class Handler(BaseHTTPRequestHandler):
    server_version = "AutoByteusFakeMobile/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/rest/remote-access/status":
            if self.server.status_delay_seconds > 0:
                # Local regression only: simulates a slow host answering the app's connection check.
                time.sleep(self.server.status_delay_seconds)
            body = json.dumps({
                "phoneAccessEnabled": self.server.phone_access_enabled,
                "pairingAvailable": True,
                "serverName": "Fake AutoByteus Node",
                "nodeId": "fake-ios-smoke-node",
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.server.video_path and parsed.path == VIDEO_ROUTE:
            return self.send_media(self.server.video_path, "video/mp4")
        if self.server.audio_path and parsed.path == AUDIO_ROUTE:
            return self.send_media(self.server.audio_path, "audio/mpeg")
        if parsed.path == "/mobile" or parsed.path.startswith("/mobile/"):
            # autobyteus-574, autobyteus-642: with --video or --audio, the page hands the app a node file to play, as the
            # real page does.
            video_buttons = (VIDEO_BUTTONS % {"credential": MEDIA_CREDENTIAL}).encode("utf-8") if self.server.video_path else b""
            video_buttons += (AUDIO_BUTTON % {"credential": MEDIA_CREDENTIAL}).encode("utf-8") if self.server.audio_path else b""
            body = b"""<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'><title>AutoByteus Fake Mobile</title></head><body><main style='font-family:-apple-system;padding:32px'><h1>AUTOBYTEUS_FAKE_MOBILE_READY</h1><p>Fake /mobile shell for iOS simulator smoke validation.</p><input type='file' aria-label='Attachment'>""" + video_buttons + b"""</main></body></html>"""
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

    def send_media(self, path, content_type):
        """The file by one byte range with a strong ETag, only with the page's credential (autobyteus-574 D-1's contract)."""
        authorized = self.headers.get("Authorization") == "Bearer " + MEDIA_CREDENTIAL
        requested = self.headers.get("Range")
        if not authorized:
            self.send_response(401)
            self.send_header("Content-Length", "0")
            self.end_headers()
            self.log_media(401, requested, authorized, 0)
            return
        size = os.path.getsize(path)
        etag = '"%d-%d"' % (size, int(os.path.getmtime(path) * 1000))
        first, last, status = 0, size - 1, 200
        match = re.match(r"^bytes=(\d+)-(\d*)$", requested or "")
        if match and self.headers.get("If-Range") in (None, etag):
            first = int(match.group(1))
            last = min(int(match.group(2)) if match.group(2) else size - 1, size - 1)
            status = 206
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("ETag", etag)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(last - first + 1))
        if status == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (first, last, size))
        self.end_headers()
        sent = 0
        try:
            with open(path, "rb") as media:
                media.seek(first)
                while sent < last - first + 1:
                    chunk = media.read(min(65536, last - first + 1 - sent))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    sent += len(chunk)
                    time.sleep(len(chunk) / 1_500_000)  # about 1.5 MB/s, the AC's throttled node
        except (BrokenPipeError, ConnectionResetError):
            pass
        self.log_media(status, requested, authorized, sent)

    def log_media(self, status, requested, authorized, sent):
        # Never the credential: only whether the request carried the expected one.
        print("MEDIA " + json.dumps({"path": self.path.split("?")[0], "status": status, "range": requested, "authorized": authorized, "bytes": sent}), flush=True)

    def log_message(self, fmt, *args):
        print("%s - - [%s] %s" % (self.client_address[0], self.log_date_time_string(), fmt % args), flush=True)

VIDEO_ROUTE = "/rest/files/videos/clip.mp4"
AUDIO_ROUTE = "/rest/files/audio/memo.mp3"
MEDIA_CREDENTIAL = "fake-ios-media-credential"
VIDEO_BUTTONS = """<p><button style='font-size:20px;padding:12px' onclick="window.AutoByteusShell.postMessage(JSON.stringify({type:'playMedia',kind:'video',url:location.origin+'/rest/files/videos/clip.mp4',title:'clip.mp4',credential:'%(credential)s'}))">Play video</button></p><p><button style='font-size:20px;padding:12px' onclick="window.AutoByteusShell.postMessage(JSON.stringify({type:'playMedia',kind:'video',url:location.origin+'/rest/files/videos/missing.mp4',title:'missing.mp4',credential:'%(credential)s'}))">Play a missing video</button></p>"""

AUDIO_BUTTON = """<p><button style='font-size:20px;padding:12px' onclick="window.AutoByteusShell.postMessage(JSON.stringify({type:'playMedia',kind:'audio',url:location.origin+'/rest/files/audio/memo.mp3',title:'memo.mp3',credential:'%(credential)s'}))">Play audio</button></p>"""

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=29876)
    parser.add_argument("--phone-access-enabled", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--video", default=None,
                        help="autobyteus-574: an MP4 the page hands the app to play (NativeMediaPlayerUITests).")
    parser.add_argument("--audio", default=None,
                        help="autobyteus-642: an MP3 the page hands the app to play (NativeMediaPlayerUITests).")
    parser.add_argument("--status-delay-seconds", type=float, default=0.0,
                        help="Delay each /rest/remote-access/status response (local slow-host regression; CI uses 0).")
    args = parser.parse_args()
    if args.status_delay_seconds < 0:
        parser.error("--status-delay-seconds must not be negative")
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.phone_access_enabled = args.phone_access_enabled
    server.status_delay_seconds = args.status_delay_seconds
    server.video_path = args.video
    server.audio_path = args.audio
    print(f"Fake AutoByteus node listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()
