from pathlib import Path
import json
import os
import subprocess
import sys

worktree = Path(__file__).resolve().parents[5]
runtime = worktree / ".local/api-history-latency"
mode = sys.argv[1]
environment = {
    key: os.environ[key]
    for key in ["PATH", "TMPDIR", "LANG", "LC_ALL", "SHELL", "USER", "LOGNAME"]
    if key in os.environ
}
environment.update(
    HOME=str(runtime / "home"),
    OLLAMA_HOSTS="http://127.0.0.1:51184",
    LMSTUDIO_HOSTS="http://127.0.0.1:51184",
)

if mode == "backend":
    environment["NODE_OPTIONS"] = "--import=" + str(Path(__file__).parent / "cold-observer.mjs")
    environment["API_PROBE_ROOT"] = str(runtime)
    environment["API_PROBE_WORKTREE"] = str(worktree)
    environment["CLAUDE_AGENT_SDK_AUTH_MODE"] = "api-key"
    command = [
        "node",
        str(worktree / "autobyteus-server-ts/dist/app.js"),
        "--data-dir",
        str(runtime / "data"),
        "--host",
        "127.0.0.1",
        "--port",
        "51181",
    ]
    cwd = worktree
elif mode == "proxy":
    command = ["node", str(Path(__file__).parents[1] / "api-live/proxy.mjs"), str(runtime)]
    cwd = worktree
elif mode == "frontend":
    environment["BACKEND_NODE_BASE_URL"] = "http://127.0.0.1:51182"
    command = [
        "node",
        str(worktree / "autobyteus-web/node_modules/nuxt/bin/nuxt.mjs"),
        "dev",
        str(worktree / "autobyteus-web"),
        "--host",
        "127.0.0.1",
        "--port",
        "51183",
    ]
    cwd = worktree / "autobyteus-web"
else:
    raise ValueError("invalid mode")

with (runtime / f"{mode}-cold.log").open("wb") as log:
    process = subprocess.Popen(command, cwd=cwd, env=environment, stdout=log, stderr=subprocess.STDOUT)
    (runtime / f"{mode}-cold-launch.json").write_text(json.dumps({
        "pid": process.pid,
        "command": command,
        "environmentKeys": sorted(environment),
    }, indent=2))
    print(mode, process.pid, flush=True)
    print("EXIT", process.wait(), flush=True)
