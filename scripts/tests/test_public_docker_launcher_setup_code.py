"""`setup-code`'s step-by-step progress, bounded wait, and the per-attempt socket bound
(autobyteus-workspace-3, SR-001): image check/recreate/start on standard error, no URL block,
standard output holding only the code lines; a waiting message after the first failed attempt
and at least every 10 s after; a 90-second wall-clock deadline (not an attempt count); one
request to the node's control socket bounded at 5 s. `new-container` shares the wait.

Run: python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v
Uses the fake Docker of test_public_docker_launcher_shared_workspace.py for everything except
the attempt loop. For the attempt loop, a small `docker` wrapper is put on PATH ahead of the
fake: it intercepts the `exec <container> node -e <client> <socket>` shape (counting attempts,
or running the launcher's own real client JS with a real `node` against a real Unix socket for
the one attempt that must prove the 5 s bound) and delegates every other Docker call to the
shared fake by absolute path. One case (the 10 s cadence) costs ~11 s; one case (AC-004) costs
~5 s. No Docker daemon, network or user node. The PowerShell twin is covered by a text contract
(parsed with `pwsh` by the shared suite's parse test when `pwsh` is installed).
"""
import contextlib
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_public_docker_launcher_shared_workspace import (  # noqa: E402
    BASH_MODULE_DIR, POWERSHELL_MODULE_DIR, REPO_ROOT,
    fake_docker_environment, run_launcher, write_fake_container, write_node_state,
)

CODE_LINE_PREFIX = "Setup code for autobyteus-server-0:"


def shared_fake_docker_path(env: dict) -> Path:
    """The shared fake `docker` binary that `fake_docker_environment` already put on PATH."""
    return Path(env["PATH"].split(os.pathsep)[0]) / "docker"


def write_counting_exec_docker_wrapper(path: Path, real_docker: Path, counter_file: Path, succeed_at_attempt: int) -> None:
    """A `docker` ahead of the shared fake on PATH: for the setup-code exec shape, counts attempts in
    `counter_file` and fails (no stdout, a short stderr line) until `succeed_at_attempt`, then answers
    with a canned code. Every other Docker call delegates to the shared fake by absolute path."""
    path.write_text(f"""#!/usr/bin/env bash
set -euo pipefail
real={shlex.quote(str(real_docker))}
counter={shlex.quote(str(counter_file))}
if [[ "$1" == "exec" && "$3" == "node" && "$4" == "-e" ]]; then
  count=0
  [[ -f "$counter" ]] && count="$(cat "$counter")"
  count=$((count + 1))
  printf '%s' "$count" > "$counter"
  if (( count < {succeed_at_attempt} )); then
    printf 'the node did not answer\\n' >&2
    exit 1
  fi
  printf 'fake-setup-code-after-wait 2026-11-08T10:30:00.000Z\\n'
  exit 0
fi
exec "$real" "$@"
""", encoding="utf-8")
    path.chmod(0o755)


def write_bounded_attempt_docker_wrapper(
    path: Path, real_docker: Path, counter_file: Path, hang_at_attempt: int, hang_socket: str, timing_file: Path,
) -> None:
    """Like `write_counting_exec_docker_wrapper`, except attempt `hang_at_attempt` runs the launcher's own
    real client JS (passed through as `$5`) with a real `node` against `hang_socket`, a real Unix socket
    that accepts and never answers; its wall-clock duration is recorded in `timing_file`. The attempt right
    after it answers with a canned code, proving the wait continued past the bounded attempt."""
    path.write_text(f"""#!/usr/bin/env bash
set -euo pipefail
real={shlex.quote(str(real_docker))}
counter={shlex.quote(str(counter_file))}
timing={shlex.quote(str(timing_file))}
hang_socket={shlex.quote(hang_socket)}
if [[ "$1" == "exec" && "$3" == "node" && "$4" == "-e" ]]; then
  count=0
  [[ -f "$counter" ]] && count="$(cat "$counter")"
  count=$((count + 1))
  printf '%s' "$count" > "$counter"
  if (( count < {hang_at_attempt} )); then
    printf 'the node did not answer\\n' >&2
    exit 1
  fi
  if (( count == {hang_at_attempt} )); then
    start=$(date +%s)
    node -e "$5" "$hang_socket" > /dev/null 2>&1 || true
    end=$(date +%s)
    printf '%s\\n' "$((end - start))" > "$timing"
    exit 1
  fi
  printf 'fake-setup-code-after-hang 2026-11-08T10:30:00.000Z\\n'
  exit 0
fi
exec "$real" "$@"
""", encoding="utf-8")
    path.chmod(0o755)


@contextlib.contextmanager
def hanging_unix_socket_server():
    """A real Unix socket (short path, macOS's 104-byte limit) that accepts a connection and never writes
    or closes it: the launcher's real client must time out on its own, as `probes/silent-socket-attempt.sh`
    reproduces."""
    sock_path = f"/tmp/sc-hang-{os.getpid()}.sock"
    try:
        os.unlink(sock_path)
    except FileNotFoundError:
        pass
    proc = subprocess.Popen(
        ["node", "-e", "require('net').createServer(()=>{}).listen(process.argv[1])", sock_path],
    )
    try:
        for _ in range(50):
            if os.path.exists(sock_path):
                break
            time.sleep(0.1)
        yield sock_path
    finally:
        proc.kill()
        proc.wait(timeout=5)
        try:
            os.unlink(sock_path)
        except FileNotFoundError:
            pass


class PublicDockerLauncherSetupCodeTest(unittest.TestCase):
    def test_ac001_recreate_path_shows_image_check_and_recreate_steps_on_stderr_only(self) -> None:
        with fake_docker_environment() as env:
            write_node_state(env, "autobyteus-server-0", "autobyteus-server-0")
            write_fake_container(env, "autobyteus-server-0", "autobyteus-server-0", config_hash="stale-hash")

            result = run_launcher(env, "setup-code", "--name", "autobyteus-server-0")

            self.assertIn("Checking image autobyteus/test:v1", result.stderr)
            self.assertIn("pulled autobyteus/test:v1", result.stderr)
            self.assertIn(
                "Recreating the container of autobyteus-server-0: the launcher configuration changed. "
                "Its named volumes are kept.",
                result.stderr,
            )
            self.assertIn("Started autobyteus-server-0.", result.stderr)
            self.assertNotIn("AutoByteus Docker node:", result.stderr)
            self.assertNotIn("AutoByteus Docker node:", result.stdout)
            self.assertNotIn("Backend: http://localhost", result.stdout + result.stderr)
            self.assertIn(f"{CODE_LINE_PREFIX} fake-setup-code-autobyteus-server-0", result.stdout)
            self.assertIn("Valid once, until 2026-11-08T10:30:00.000Z", result.stdout)
            self.assertNotIn("Checking image", result.stdout)
            self.assertNotIn("Recreating", result.stdout)
            self.assertNotIn("fake-setup-code-autobyteus-server-0", result.stderr)

    def test_ac003_running_current_node_answers_at_once_with_only_the_code_on_stdout(self) -> None:
        with fake_docker_environment() as env:
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            result = run_launcher(env, "setup-code", "--name", "autobyteus-server-0")

            stdout_lines = [line for line in result.stdout.splitlines() if line]
            self.assertEqual(2, len(stdout_lines))
            self.assertTrue(stdout_lines[0].startswith(f"{CODE_LINE_PREFIX} fake-setup-code-autobyteus-server-0"))
            self.assertTrue(stdout_lines[1].startswith("Valid once, until 2026-11-08T10:30:00.000Z."))
            self.assertIn("already running with the current image and launcher config.", result.stderr)
            self.assertNotIn("Waiting for", result.stderr)
            self.assertNotIn("Waiting for", result.stdout)
            self.assertNotIn("AutoByteus Docker node:", result.stdout)
            self.assertNotIn("AutoByteus Docker node:", result.stderr)
            self.assertNotIn("fake-setup-code", result.stderr)

    def test_ac002_waiting_message_after_first_failed_attempt_then_the_code(self) -> None:
        with fake_docker_environment() as env:
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")
            real_docker = shared_fake_docker_path(env)
            bin_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "setup-code-bin"
            bin_dir.mkdir()
            counter_file = Path(env["FAKE_DOCKER_ROOT"]).parent / "attempt-count"
            write_counting_exec_docker_wrapper(bin_dir / "docker", real_docker, counter_file, succeed_at_attempt=2)
            env["PATH"] = f"{bin_dir}{os.pathsep}{env['PATH']}"

            result = run_launcher(env, "setup-code", "--name", "autobyteus-server-0")

            self.assertIn("Waiting for autobyteus-server-0 to start (up to 90 seconds)...", result.stderr)
            self.assertNotIn("Still waiting", result.stderr)
            self.assertIn(f"{CODE_LINE_PREFIX} fake-setup-code-after-wait", result.stdout)
            self.assertNotIn("Waiting for", result.stdout)

    def test_ac002_still_waiting_cadence_after_about_10_seconds(self) -> None:
        with fake_docker_environment() as env:
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")
            real_docker = shared_fake_docker_path(env)
            bin_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "setup-code-bin"
            bin_dir.mkdir()
            counter_file = Path(env["FAKE_DOCKER_ROOT"]).parent / "attempt-count"
            write_counting_exec_docker_wrapper(bin_dir / "docker", real_docker, counter_file, succeed_at_attempt=12)
            env["PATH"] = f"{bin_dir}{os.pathsep}{env['PATH']}"

            result = run_launcher(env, "setup-code", "--name", "autobyteus-server-0")

            self.assertIn("Waiting for autobyteus-server-0 to start (up to 90 seconds)...", result.stderr)
            self.assertTrue(
                any(line.startswith("[AutoByteus Docker] Still waiting for autobyteus-server-0 to start (")
                    for line in result.stderr.splitlines()),
                result.stderr,
            )
            self.assertIn(f"{CODE_LINE_PREFIX} fake-setup-code-after-wait", result.stdout)

    def test_ac008_new_container_shares_the_waiting_message_and_keeps_its_other_output(self) -> None:
        with fake_docker_environment() as env:
            real_docker = shared_fake_docker_path(env)
            bin_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "setup-code-bin"
            bin_dir.mkdir()
            counter_file = Path(env["FAKE_DOCKER_ROOT"]).parent / "attempt-count"
            write_counting_exec_docker_wrapper(bin_dir / "docker", real_docker, counter_file, succeed_at_attempt=2)
            env["PATH"] = f"{bin_dir}{os.pathsep}{env['PATH']}"

            result = run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            self.assertIn("Waiting for autobyteus-server-0 to start (up to 90 seconds)...", result.stderr)
            self.assertIn("Started autobyteus-server-0.", result.stdout)
            self.assertIn("AutoByteus Docker node: autobyteus-server-0", result.stdout)
            self.assertIn(f"{CODE_LINE_PREFIX} fake-setup-code-after-wait", result.stdout)

    def test_ac004_one_silent_attempt_is_bounded_and_a_later_attempt_still_succeeds(self) -> None:
        with fake_docker_environment() as env, hanging_unix_socket_server() as hang_socket:
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")
            real_docker = shared_fake_docker_path(env)
            bin_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "setup-code-bin"
            bin_dir.mkdir()
            counter_file = Path(env["FAKE_DOCKER_ROOT"]).parent / "attempt-count"
            timing_file = Path(env["FAKE_DOCKER_ROOT"]).parent / "hang-attempt-seconds"
            write_bounded_attempt_docker_wrapper(
                bin_dir / "docker", real_docker, counter_file, hang_at_attempt=2,
                hang_socket=hang_socket, timing_file=timing_file,
            )
            env["PATH"] = f"{bin_dir}{os.pathsep}{env['PATH']}"

            result = run_launcher(env, "setup-code", "--name", "autobyteus-server-0")

            hang_seconds = int(timing_file.read_text(encoding="utf-8").strip())
            self.assertGreaterEqual(hang_seconds, 4, "the attempt against a silent socket ended too soon to have timed out")
            self.assertLessEqual(hang_seconds, 9, "the attempt against a silent socket was not bounded")
            self.assertIn(f"{CODE_LINE_PREFIX} fake-setup-code-after-hang", result.stdout)

    def test_ac005_bash_deadline_counts_wall_clock_seconds_not_attempts(self) -> None:
        module = (BASH_MODULE_DIR / "commands.sh").read_text(encoding="utf-8")
        with tempfile.TemporaryDirectory(prefix="autobyteus-setup-code-unit-") as root:
            home = Path(root)
            prefix = """set -euo pipefail
state_path_for() { printf '%s\\n' "$HOME/node.env"; }
load_state() { CONTAINER_NAME=node-one; BACKEND_PORT=8001; }
log() { printf '[AutoByteus Docker] %s\\n' "$*" >&2; }
fail() { printf 'error: %s\\n' "$*" >&2; exit 1; }
docker() { printf 'x\\n' >> "$HOME/attempts"; sleep 5; printf 'the node did not answer\\n' >&2; return 1; }
"""
            # The module's own top-level `SETUP_CODE_WAIT_SECONDS=90` runs after `prefix`, so the shortened
            # budget is set after sourcing the module, not before (it would otherwise be overwritten back to 90).
            suffix = "\nSETUP_CODE_WAIT_SECONDS=6\nprint_setup_code_of_running_node node-one"
            result = subprocess.run(
                ["/bin/bash", "-c", prefix + module + suffix],
                env={"HOME": str(home), "PATH": "/usr/bin:/bin"},
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertNotEqual(0, result.returncode)
            attempts = (home / "attempts").read_text(encoding="utf-8").splitlines()
            self.assertLessEqual(len(attempts), 2, "90 attempts of 5 s each would no longer mean 90 seconds")
            self.assertIn("node-one did not answer with a setup code within 6 seconds", result.stderr)
            self.assertIn("last attempt: the node did not answer", result.stderr)
            self.assertIn("autobyteus-docker logs --name node-one", result.stderr)
            self.assertNotIn(CODE_LINE_PREFIX, result.stdout)

    def test_ac006_powershell_text_contract_for_timeout_wait_and_no_url_block(self) -> None:
        commands_text = (POWERSHELL_MODULE_DIR / "Commands.ps1").read_text(encoding="utf-8")
        runtime_text = (POWERSHELL_MODULE_DIR / "DockerRuntime.ps1").read_text(encoding="utf-8")

        self.assertIn("s.setTimeout(5000", commands_text)
        self.assertIn("the node did not answer within 5 seconds", commands_text)
        self.assertIn("[Diagnostics.Stopwatch]::StartNew()", commands_text)
        self.assertIn("Waiting for $NodeName to start (up to $Script:SetupCodeWaitSeconds seconds)...", commands_text)
        self.assertIn("Still waiting for $NodeName to start ($elapsed s)...", commands_text)
        self.assertIn("-NoUrls", commands_text)
        self.assertIn("[switch]$NoUrls", runtime_text)
        self.assertIn("& docker pull $ImageRef | Out-Host", runtime_text)
        self.assertIn("if (-not $NoUrls) { Print-Urls $state }", runtime_text)
        self.assertIn("Recreating the container of ${NodeName}: a newer image was downloaded. Its named volumes are kept.", runtime_text)
        self.assertIn("Recreating the container of ${NodeName}: the launcher configuration changed. Its named volumes are kept.", runtime_text)
        self.assertIn("Recreating the container of ${NodeName}: the container predates launcher configuration tracking. Its named volumes are kept.", runtime_text)
        self.assertNotIn("Image changed for $NodeName", runtime_text)
        self.assertNotIn("Launcher config changed for $NodeName", runtime_text)

    def test_powershell_launcher_parses_when_pwsh_is_available(self) -> None:
        if not shutil.which("pwsh"):
            self.skipTest("pwsh is not installed")
        paths = [REPO_ROOT / "scripts/public/docker/autobyteus-docker.ps1", POWERSHELL_MODULE_DIR / "Core.ps1",
                  POWERSHELL_MODULE_DIR / "ContainerConfig.ps1", POWERSHELL_MODULE_DIR / "DockerRuntime.ps1",
                  POWERSHELL_MODULE_DIR / "NodeUpdate.ps1", POWERSHELL_MODULE_DIR / "Commands.ps1"]
        paths_literal = "@(" + ",".join(f"'{path}'" for path in paths) + ")"
        subprocess.run(
            ["pwsh", "-NoLogo", "-NoProfile", "-Command",
             f"$paths={paths_literal}; foreach ($path in $paths) {{ $null=[scriptblock]::Create((Get-Content -Raw $path)) }}"],
            check=True, text=True, capture_output=True,
        )


if __name__ == "__main__":
    unittest.main()
