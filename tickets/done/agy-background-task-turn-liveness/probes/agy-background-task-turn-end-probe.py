import json, subprocess, sys, time, threading, os
d = sys.argv[1]; os.makedirs(d, exist_ok=True)
p = subprocess.Popen(["agy","--new-project","--add-dir",d,"--model","gemini-3.8-flash-high",
    "--input-format","stream-json","--output-format","stream-json","--dangerously-skip-permissions"],
    cwd=d, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
t0 = time.time()
def log(s): print(f"[{time.time()-t0:6.1f}] {s}", flush=True)
threading.Thread(target=lambda: [log("STDERR "+l.rstrip()[:200]) for l in p.stderr], daemon=True).start()
msg = ("Use run_command to run `sleep 30 && echo FINISHED_MARKER` in the background with WaitMsBeforeAsync 1000 "
       "(it must go to the background). Do NOT wait for it, do NOT check its status. Immediately reply STARTED and end your turn.")
p.stdin.write(json.dumps({"event":"user","message":{"content":msg}})+"\n"); p.stdin.flush()
def out():
    for l in p.stdout:
        try:
            m = json.loads(l); ev = m.get("event")
            if ev == "step_update":
                s = m["step_update"]; info = s.get("tool_info") or {}
                log(f"step {s.get('step_index')} {s.get('step_type')} {s.get('state')} {s.get('tool_name') or info.get('name') or ''} text={json.dumps(s.get('text_delta'))[:120]}")
            elif ev == "result": log("RESULT "+json.dumps(m)[:250])
            else: log(ev)
        except Exception: log("RAW "+l.rstrip()[:200])
threading.Thread(target=out, daemon=True).start()
time.sleep(float(sys.argv[2]))
log("probe end"); p.terminate()
