"""Bounded native-TUI custom-agent probe; never persists raw terminal bytes."""
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

OUT = pathlib.Path(__file__).with_name("agy-cli-tui-agent-probe-results.json")
MODEL = "gemini-3.8-flash-low"
CODE = "PTY-LIME"

with tempfile.TemporaryDirectory(prefix="autobyteus-agy-tui-agent-") as temp:
    root = pathlib.Path(temp)
    primary = root / "primary"
    primary.mkdir()
    agent = primary / ".agents" / "agents" / "pty-sentinel" / "agent.md"
    agent.parent.mkdir(parents=True)
    agent.write_text("---\nname: pty-sentinel\ndescription: TUI probe.\nmainAgent: true\n---\n"
                     "Your identity code is PTY-LIME. Reply with that code if asked.\n")
    log = root / "agy.log"
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 120, 0, 0))
    proc = subprocess.Popen(
        ["agy", "--new-project", "--agent", "pty-sentinel", "--model", MODEL,
         "--log-file", str(log), "--prompt-interactive",
         "What is your assigned identity code? Reply with only the code."],
        cwd=primary, stdin=slave, stdout=slave, stderr=slave,
        start_new_session=True, env={**os.environ, "TERM": "xterm-256color"},
    )
    os.close(slave)
    output = bytearray()
    started = time.monotonic()
    try:
        while time.monotonic() - started < 35:
            if select.select([master], [], [], 0.5)[0]:
                try:
                    output.extend(os.read(master, 65536))
                except OSError:
                    break
            if CODE.encode() in output and log.exists() and "Created conversation" in log.read_text(errors="replace"):
                break
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
    raw_log = log.read_text(errors="replace") if log.exists() else ""
    created_lines = [line for line in raw_log.splitlines() if "Created conversation" in line]
    ids = set(re.findall(r"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b", "\n".join(created_lines)))
    summary = {
        "model": MODEL,
        "promptInteractiveUsed": True,
        "customAgentNameShownInTui": b"pty-sentinel" in output,
        "expectedCodeShownInTui": CODE.encode() in output,
        "logCreatedConversationLines": len(created_lines),
        "uniqueConversationIdsOnCreatedLines": len(ids),
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "processExitAfterSigterm": proc.returncode,
        "rawTerminalAndLogPersisted": False,
    }
    OUT.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
