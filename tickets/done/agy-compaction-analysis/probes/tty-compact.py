import os, pty, time, select, sys, re
conv = sys.argv[1]
pid, fd = pty.fork()
if pid == 0:
    os.chdir("/tmp/agy-probe/work")
    os.environ["TERM"] = "xterm-256color"; os.environ["COLUMNS"]="160"; os.environ["LINES"]="50"
    os.execvp("agy", ["agy", "--conversation", conv, "--model", "gemini-3.8-flash-low", "--dangerously-skip-permissions"])
out = open("/tmp/agy-probe/tty-output.log", "wb")
def pump(sec):
    end = time.time() + sec
    while time.time() < end:
        r,_,_ = select.select([fd],[],[],0.2)
        if r:
            try: data = os.read(fd, 65536)
            except OSError: return
            out.write(data); out.flush()
pump(12)
for ch in "/compact": os.write(fd, ch.encode()); time.sleep(0.05)
pump(1.0)
os.write(fd, b"\r")
pump(60)
os.write(fd, b"\x03"); pump(1); os.write(fd, b"\x03"); pump(2)
try: os.kill(pid, 15)
except Exception: pass
