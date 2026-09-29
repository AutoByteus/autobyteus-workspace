import json, subprocess, sys, time, threading, os
d = sys.argv[1]
os.makedirs(d, exist_ok=True)
p = subprocess.Popen(["agy","--new-project","--add-dir",d,"--model","gemini-3.8-flash-high",
    "--input-format","stream-json","--output-format","stream-json","--dangerously-skip-permissions"],
    cwd=d, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
t0 = time.time()
def err():
    for l in p.stderr: print(f"[{time.time()-t0:6.1f}] STDERR {l.rstrip()[:200]}", flush=True)
threading.Thread(target=err, daemon=True).start()
msg = ("Do exactly these steps in order, using your run_command tool for each: "
       "1) start `python3 -m http.server 5199` in the directory " + d + " as a long-running background daemon (it never exits). "
       "2) after it is started, run `echo AFTER_ONE`. 3) run `sleep 5 && echo AFTER_TWO`. "
       "4) write a file named done.txt containing OK. Then reply DONE and end the turn. Do not stop the server.")
p.stdin.write(json.dumps({"event":"user","message":{"content":msg}})+"\n"); p.stdin.flush()
deadline = t0 + float(sys.argv[2])
def out():
    for l in p.stdout:
        try:
            m = json.loads(l); ev = m.get("event")
            if ev == "step_update":
                s = m["step_update"]; info = s.get("tool_info") or {}
                print(f"[{time.time()-t0:6.1f}] step {s.get('step_index')} {s.get('step_type')} {s.get('state')} {s.get('tool_name') or info.get('name') or ''} {json.dumps(info.get('parameters',{}))[:120]}", flush=True)
            elif ev == "result":
                print(f"[{time.time()-t0:6.1f}] RESULT {json.dumps(m)[:300]}", flush=True)
            else:
                print(f"[{time.time()-t0:6.1f}] {ev}", flush=True)
        except Exception:
            print(f"[{time.time()-t0:6.1f}] RAW {l.rstrip()[:200]}", flush=True)
th = threading.Thread(target=out, daemon=True); th.start()
while time.time() < deadline and p.poll() is None: time.sleep(1)
print(f"[{time.time()-t0:6.1f}] probe end; done.txt exists={os.path.exists(os.path.join(d,'done.txt'))}", flush=True)
p.terminate()
