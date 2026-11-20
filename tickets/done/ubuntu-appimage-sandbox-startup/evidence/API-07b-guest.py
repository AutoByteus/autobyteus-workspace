"""Run as the normal disposable x64 Noble witness, from its home."""
import os, subprocess as sp, time, json
from pathlib import Path
from base64 import b64encode
os.environ["DISPLAY"] = ":91"
record = next(Path("feed").rglob("*.release.json"))
sig = Path(str(record) + ".sig")
original = (record.read_bytes(), sig.read_bytes())
gui = Path("guest-gui.sh").read_text()
def do(*args):
    return sp.run(args, check=True, capture_output=True, text=True, timeout=45)
for mode, expected, gets in [
    ("offline", "reconnect and retry", 0),
    ("invalidsig", "release signature refused", 2),
    ("mismatched", "outer AppImage is not the signed regular file", 2),
]:
    try:
        script = gui
        if mode == "offline":
            script = "\n".join(": >feed.log" if l.startswith("python3 -u -m http.server") else l for l in gui.splitlines())
        elif mode == "invalidsig":
            sig.write_bytes(b64encode(bytes(64)))
        else:
            record.write_bytes((Path("alt")/record.name).read_bytes())
            sig.write_bytes((Path("alt")/sig.name).read_bytes())
        p = sp.Popen(["dbus-run-session", "--", "bash", "-c", script])
        try:
            for _ in range(100):
                if not sp.run(["xdotool","getdisplaygeometry"],stdout=sp.DEVNULL,stderr=sp.DEVNULL).returncode: break
                time.sleep(.1)
            do("xdotool","search","--sync","--onlyvisible","--name","^Install AutoByteus$")
            do("xdotool","mousemove","778","583","click","1")
            do("xdotool","search","--sync","--onlyvisible","--name","^AutoByteus installation$")
            do("import","-window","root",mode+".png")
            do("xdotool","key","Return")
            code = p.wait(timeout=20)
            app, feed = [Path(f).read_text() for f in ("current-app.log","feed.log")]
            print(mode, app.strip(), feed.strip(), flush=True)
            assert code != 0 and expected in app, (code, expected)
            assert feed.count("GET ") == gets and "Ubuntu will request one-shot authorization" not in app
            assert not Path("/opt/autobyteus-desktop/1000").exists()
            print(json.dumps(dict(case=mode, outcome="pass", status=code, requests=gets, installation=False)), flush=True)
        finally:
            if p.poll() is None: p.terminate(); p.wait(timeout=15)
    finally:
        record.write_bytes(original[0]); sig.write_bytes(original[1])
