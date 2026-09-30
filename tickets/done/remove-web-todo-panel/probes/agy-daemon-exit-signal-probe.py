"""P3: Does Antigravity (AGY) report a daemon's own exit after the turn that started it ended?

Turn 1: start a daemon that exits by itself after ~20 s; end the turn immediately.
Idle window: log every stdout event AGY emits while no turn is active; poll AGY's brain folder
(.system_generated/{messages,tasks}) for new/changed files.
Turn 2: ask the model (no tools) what it knows about the task; log every step incl. system_message content.

Usage: python3 agy-daemon-exit-signal-probe.py <workdir> [idle_seconds] [daemon_command]
"""
import glob, json, os, subprocess, sys, threading, time

d = sys.argv[1]
idle = float(sys.argv[2]) if len(sys.argv) > 2 else 45
cmd = sys.argv[3] if len(sys.argv) > 3 else "sleep 20; echo DAEMON_EXITED_MARKER > daemon-exit.txt"
os.makedirs(d, exist_ok=True)
brain_root = os.path.expanduser("~/.gemini/antigravity-cli/brain")
before = set(glob.glob(os.path.join(brain_root, "*")))

p = subprocess.Popen(["agy", "--new-project", "--add-dir", d, "--model", "gemini-3.8-flash-high",
    "--input-format", "stream-json", "--output-format", "stream-json", "--dangerously-skip-permissions"],
    cwd=d, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
t0 = time.time()
results = []
def ts(): return f"[{time.time()-t0:6.1f}]"
def err():
    for l in p.stderr: print(f"{ts()} STDERR {l.rstrip()[:200]}", flush=True)
threading.Thread(target=err, daemon=True).start()
def out():
    for l in p.stdout:
        try:
            m = json.loads(l); ev = m.get("event")
            if ev == "step_update":
                s = m["step_update"]; info = s.get("tool_info") or {}
                extra = ""
                if s.get("step_type") not in ("PLANNER_RESPONSE",):
                    extra = json.dumps({k: v for k, v in s.items() if k not in ("step_index", "step_type", "state")})[:600]
                print(f"{ts()} step {s.get('step_index')} {s.get('step_type')} {s.get('state')} {s.get('tool_name') or info.get('name') or ''} {extra}", flush=True)
            elif ev == "result":
                results.append(time.time()); print(f"{ts()} RESULT {json.dumps(m)[:300]}", flush=True)
            else:
                print(f"{ts()} EVENT {ev} {json.dumps(m)[:300]}", flush=True)
        except Exception:
            print(f"{ts()} RAW {l.rstrip()[:300]}", flush=True)
threading.Thread(target=out, daemon=True).start()

def send(text):
    p.stdin.write(json.dumps({"event": "user", "message": {"content": text}}) + "\n"); p.stdin.flush()
    print(f"{ts()} >>> USER {text[:120]}", flush=True)

def wait_results(n, timeout):
    end = time.time() + timeout
    while time.time() < end and len(results) < n and p.poll() is None: time.sleep(0.5)

def snapshot(brain):
    files = {}
    for sub in ("messages", "tasks"):
        for f in glob.glob(os.path.join(brain, ".system_generated", sub, "*")):
            try: files[f] = os.path.getmtime(f)
            except OSError: pass
    return files

send("Using your run_command tool, start exactly this command as a long-running background daemon (IsDaemon true) "
     "in " + d + ": `" + cmd + "`. "
     "Do not wait for it and do not check it. Immediately reply STARTED and end your turn.")
wait_results(1, 120)
brain = next(iter(set(glob.glob(os.path.join(brain_root, "*"))) - before), None)
print(f"{ts()} turn1 done; brain={brain}", flush=True)
seen = snapshot(brain) if brain else {}
for f in sorted(seen): print(f"{ts()} BRAIN-FILE initial {os.path.relpath(f, brain)}", flush=True)
end = time.time() + idle
while time.time() < end:
    time.sleep(2)
    if brain:
        now = snapshot(brain)
        for f, m in now.items():
            if seen.get(f) != m:
                body = ""
                try: body = open(f).read()[:400].replace("\n", " | ")
                except Exception: pass
                print(f"{ts()} BRAIN-FILE {'new' if f not in seen else 'changed'} {os.path.relpath(f, brain)} :: {body}", flush=True)
        seen = now
print(f"{ts()} idle window over; daemon-exit.txt exists={os.path.exists(os.path.join(d, 'daemon-exit.txt'))}", flush=True)
send("Without running any tools: what is the current status of the background command you started? "
     "Did you receive any notification about it? Answer in one or two sentences, then end your turn.")
wait_results(2, 120)
time.sleep(3)
print(f"{ts()} probe end", flush=True)
p.terminate()
