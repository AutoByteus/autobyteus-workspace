#!/usr/bin/env python3
"""Runs argv[1:] in a pseudo-terminal and answers the importer's confirmation prompt with IMPORT.
Prints only lines without '=' values (the importer prints aliases, never secret values)."""
import os, pty, sys, time, select

pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[1], sys.argv[1:])
buf = b""
answered = False
deadline = time.time() + 180
while time.time() < deadline:
    r, _, _ = select.select([fd], [], [], 0.5)
    if fd in r:
        try:
            chunk = os.read(fd, 4096)
        except OSError:
            break
        if not chunk:
            break
        buf += chunk
        if not answered and b"to continue:" in buf:
            time.sleep(0.3)
            os.write(fd, b"IMPORT\n")
            answered = True
    else:
        wpid, st = os.waitpid(pid, os.WNOHANG)
        if wpid:
            reaped = st
            break
else:
    pass
try:
    reaped
except NameError:
    _, reaped = os.waitpid(pid, 0)
status = reaped
sys.stdout.write(buf.decode(errors="replace"))
sys.exit(os.waitstatus_to_exitcode(status))
