#!/usr/bin/env python3
"""Size guardrail: changed source implementation files (not tests) vs the ticket base."""
import subprocess
import sys

ROOT = "/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437"
BASE = "b690a5dfdb"

def run(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True).stdout

files = run("git", "diff", "--name-only", BASE, "--", ".").split()
files += run("git", "ls-files", "--others", "--exclude-standard").split()
SOURCE_EXT = (".ts", ".vue", ".mjs", ".js", ".sh", ".ps1")
def is_test(path):
    return ("/tests/" in path or "__tests__" in path or path.startswith("tests/") or ".spec." in path
            or ".test." in path or path.startswith("test-support/") or path.startswith("tickets/")
            or "/generated/" in path or path.endswith(".d.mts"))

def effective(text):
    return sum(1 for line in text.splitlines() if line.strip())

print("file | base lines | now lines | changed lines (+/-) | flag")
for path in sorted(set(files)):
    if not path.endswith(SOURCE_EXT) or is_test(path):
        continue
    try:
        now = open(f"{ROOT}/{path}", encoding="utf-8").read()
    except FileNotFoundError:
        continue
    base = run("git", "show", f"{BASE}:{path}")
    numstat = run("git", "diff", "--numstat", BASE, "--", path).split()
    added, removed = (numstat[0], numstat[1]) if numstat else (str(effective(now)), "0")
    n_now, n_base = effective(now), effective(base)
    flags = []
    if n_now > 500 and n_base <= 500:
        flags.append("OVER-500")
    if n_base > 500 and n_now > n_base:
        flags.append("GREW-WHILE-OVER")
    try:
        if int(added) + int(removed) > 220:
            flags.append(">220-delta")
    except ValueError:
        pass
    if flags or n_now > 400:
        print(f"{path} | {n_base} | {n_now} | +{added}/-{removed} | {' '.join(flags)}")
