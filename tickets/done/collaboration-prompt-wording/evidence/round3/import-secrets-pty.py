#!/usr/bin/env python3
"""Runs the secret importer in a pseudo-terminal and answers its confirmation phrase (derived from the target path, not a secret).
Usage: import-secrets-pty.py <repo-root> <source .env> <database url> [extra args]. Prints the importer's own output (it never prints values)."""
import os, pty, re, select, sys, time
root, source, dburl = sys.argv[1:4]
cmd = ["node", f"{root}/autobyteus-server-ts/dist/secret-management/cli/import-local-environment-secrets.js", "--source", source, "--database-url", dburl] + sys.argv[4:]
pid, fd = pty.fork()
if pid == 0:
    os.execvp(cmd[0], cmd)
buf = b""; answered = False; deadline = time.time() + 120
while time.time() < deadline:
    r, _, _ = select.select([fd], [], [], 1)
    if r:
        try: chunk = os.read(fd, 4096)
        except OSError: break
        if not chunk: break
        buf += chunk
        m = re.search(rb"Type (.+?) to continue:", buf)
        if m and not answered:
            os.write(fd, m.group(1) + b"\n"); answered = True
_, status = os.waitpid(pid, 0)
print(buf.decode(errors="replace"))
print("exit", os.waitstatus_to_exitcode(status))
