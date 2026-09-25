"""Check when a native TUI produces a CLI conversation ID without a user turn.

Uses a bounded pseudo-terminal and private temporary files. The raw TUI/log
content is not persisted because it can contain account and diagnostic data.
"""
import fcntl
import json
import os
import pathlib
import pty
import re
import select
import signal
import struct
import subprocess
import tempfile
import termios
import time

OUT = pathlib.Path(__file__).with_name("agy-cli-tui-id-timing-probe-results.json")
MODEL = "gemini-3.8-flash-low"

with tempfile.TemporaryDirectory(prefix="autobyteus-agy-tui-timing-") as temp:
    root = pathlib.Path(temp)
    primary = root / "primary"
    primary.mkdir()
    log = root / "agy.log"
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 120, 0, 0))
    env = {**os.environ, "TERM": "xterm-256color"}
    proc = subprocess.Popen(
        ["agy", "--new-project", "--model", MODEL, "--log-file", str(log)],
        cwd=primary, stdin=slave, stdout=slave, stderr=slave,
        start_new_session=True, env=env,
    )
    os.close(slave)
    observed = []
    output = bytearray()
    started = time.monotonic()
    try:
        for _ in range(16):
            if select.select([master], [], [], 0.5)[0]:
                try:
                    output.extend(os.read(master, 65536))
                except OSError:
                    break
            content = log.read_text(errors="replace") if log.exists() else ""
            match = re.search(r"Created conversation[^\n]*", content)
            observed.append({
                "seconds": round(time.monotonic() - started, 2),
                "logExists": log.exists(),
                "createdConversationLine": bool(match),
                "uuidInLog": bool(re.search(r"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b", content)),
            })
            if proc.poll() is not None:
                break
    finally:
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait(timeout=5)
        os.close(master)
    summary = {
        "version": subprocess.run(["agy", "--version"], capture_output=True,
                                  text=True, check=False).stdout.strip(),
        "model": MODEL,
        "inputSubmitted": False,
        "observations": observed,
        "tuiBytesObserved": len(output) > 0,
        "tuiContainsConversationId": bool(re.search(
            rb"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b", output)),
        "processExitAfterSigterm": proc.returncode,
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
