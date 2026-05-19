import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BASH_LAUNCHER = REPO_ROOT / "scripts/public/docker/autobyteus-docker.sh"
POWERSHELL_LAUNCHER = REPO_ROOT / "scripts/public/docker/autobyteus-docker.ps1"


class PublicDockerLauncherSharedWorkspaceTest(unittest.TestCase):
    def test_new_container_adds_bind_mounts_without_removing_named_volumes(self) -> None:
        with fake_docker_environment() as env:
            shared_root = Path(env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"])

            result = run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            self.assertIn("Started autobyteus-server-0", result.stdout)
            self.assertIn("/home/autobyteus/workspace", result.stdout)
            self.assertIn("/home/autobyteus/shared", result.stdout)
            run_args = read_last_run_args(env)
            self.assertIn("autobyteus-server-0-workspace:/app/autobyteus-server-ts/workspace", run_args)
            self.assertIn("autobyteus-server-0-data:/home/autobyteus/data", run_args)
            self.assertIn("autobyteus-server-0-root-home:/root", run_args)
            self.assertIn("AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace", run_args)
            self.assertIn(
                f"type=bind,source={shared_root / 'nodes' / 'autobyteus-server-0'},target=/home/autobyteus/workspace",
                run_args,
            )
            self.assertIn(
                f"type=bind,source={shared_root / 'shared'},target=/home/autobyteus/shared",
                run_args,
            )
            self.assertTrue((shared_root / "nodes" / "autobyteus-server-0").is_dir())
            self.assertTrue((shared_root / "shared").is_dir())

            state_file = Path(env["AUTOBYTEUS_DOCKER_STATE_DIR"]) / "nodes" / "autobyteus-server-0.env"
            state_text = state_file.read_text(encoding="utf-8")
            self.assertIn("IMAGE_REF=autobyteus/test:v1", state_text)
            self.assertRegex(state_text, r"CONFIG_HASH=[0-9a-f]{64}")

    def test_workspace_paths_and_storage_commands_report_the_launcher_owned_mapping(self) -> None:
        with fake_docker_environment() as env:
            shared_root = Path(env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"])

            paths = run_launcher(env, "workspace", "paths", "--name", "My Node").stdout
            storage = run_launcher(env, "storage", "--name", "My Node").stdout

            self.assertIn(f"Shared workspace host root: {shared_root}", paths)
            self.assertIn(f"Node workspace host path: {shared_root / 'nodes' / 'my-node'}", paths)
            self.assertIn("Node workspace container path: /home/autobyteus/workspace", paths)
            self.assertIn("Shared folder container path: /home/autobyteus/shared", paths)
            self.assertIn("AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace", paths)

            self.assertIn("my-node-data -> /home/autobyteus/data", storage)
            self.assertIn("my-node-root-home -> /root", storage)
            self.assertIn("my-node-workspace -> /app/autobyteus-server-ts/workspace", storage)
            self.assertIn(f"{shared_root / 'nodes' / 'my-node'} -> /home/autobyteus/workspace", storage)
            self.assertIn(f"{shared_root / 'shared'} -> /home/autobyteus/shared", storage)
            self.assertIn("workspace apply keeps the named volumes", storage)

    def test_workspace_apply_all_recreates_stale_containers_with_current_bind_mounts(self) -> None:
        with fake_docker_environment() as env:
            original_shared_root = Path(env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"])
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            current_shared_root = original_shared_root.parent / "shared-workspace-current"
            env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"] = str(current_shared_root)
            result = run_launcher(env, "workspace", "apply", "--all")

            self.assertIn("Applying shared workspace bind mounts to autobyteus-server-0", result.stdout)
            self.assertIn("Launcher config changed for autobyteus-server-0", result.stdout)
            run_args = read_last_run_args(env)
            self.assertIn("autobyteus-server-0-data:/home/autobyteus/data", run_args)
            self.assertIn(
                f"type=bind,source={current_shared_root / 'nodes' / 'autobyteus-server-0'},target=/home/autobyteus/workspace",
                run_args,
            )
            self.assertIn(
                f"type=bind,source={current_shared_root / 'shared'},target=/home/autobyteus/shared",
                run_args,
            )
            self.assertTrue((current_shared_root / "nodes" / "autobyteus-server-0").is_dir())
            self.assertTrue((current_shared_root / "shared").is_dir())

    def test_powershell_launcher_matches_the_shared_workspace_cli_contract(self) -> None:
        bash_text = BASH_LAUNCHER.read_text(encoding="utf-8")
        powershell_text = POWERSHELL_LAUNCHER.read_text(encoding="utf-8")

        for text in (bash_text, powershell_text):
            self.assertIn("v2", text)
            self.assertIn("/home/autobyteus/workspace", text)
            self.assertIn("/home/autobyteus/shared", text)
            self.assertIn("AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR", text)
            self.assertIn("AUTOBYTEUS_TEMP_WORKSPACE_DIR", text)
            self.assertIn("workspace paths", text)
            self.assertIn("workspace apply", text)
            self.assertIn("storage", text)
            self.assertIn("type=bind,source=", text)

    def test_powershell_launcher_parses_when_pwsh_is_available(self) -> None:
        if not shutil.which("pwsh"):
            self.skipTest("pwsh is not installed")
        subprocess.run(
            [
                "pwsh",
                "-NoLogo",
                "-NoProfile",
                "-Command",
                f"$null=[scriptblock]::Create((Get-Content -Raw '{POWERSHELL_LAUNCHER}'))",
            ],
            check=True,
            text=True,
            capture_output=True,
        )


def run_launcher(env: dict[str, str], *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(BASH_LAUNCHER), *args],
        check=True,
        text=True,
        capture_output=True,
        env=env,
    )


def read_last_run_args(env: dict[str, str]) -> list[str]:
    run_args_path = Path(env["FAKE_DOCKER_ROOT"]) / "run-args.nul"
    payload = run_args_path.read_bytes()
    records = [record for record in payload.split(b"\n--RUN--\n") if record]
    if not records:
        raise AssertionError("fake docker did not record a docker run invocation")
    return [arg.decode("utf-8") for arg in records[-1].split(b"\0") if arg]


class fake_docker_environment:
    def __enter__(self) -> dict[str, str]:
        self._tmp = tempfile.TemporaryDirectory(prefix="autobyteus-launcher-test-")
        root = Path(self._tmp.name)
        self.fake_root = root / "fake-docker"
        fake_bin = root / "bin"
        state_root = root / "state"
        shared_root = root / "shared workspace"
        self.fake_root.mkdir()
        fake_bin.mkdir()
        write_fake_docker(fake_bin / "docker")
        env = os.environ.copy()
        env.update(
            {
                "PATH": f"{fake_bin}{os.pathsep}{env.get('PATH', '')}",
                "FAKE_DOCKER_ROOT": str(self.fake_root),
                "AUTOBYTEUS_DOCKER_STATE_DIR": str(state_root),
                "AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR": str(shared_root),
            }
        )
        return env

    def __exit__(self, exc_type, exc, tb) -> None:
        self._tmp.cleanup()


def write_fake_docker(path: Path) -> None:
    path.write_text(
        r"""#!/usr/bin/env bash
set -euo pipefail
root="${FAKE_DOCKER_ROOT:?}"
mkdir -p "$root/containers"

record_call() { printf '%s\0' "$@" >> "$root/calls.nul"; printf '\n--CALL--\n' >> "$root/calls.nul"; }
container_file() { printf '%s/containers/%s\n' "$root" "$1"; }
read_meta() {
  local file
  file="$(container_file "$1")"
  [[ -f "$file" ]] || return 1
  # shellcheck disable=SC1090
  source "$file"
}

record_call "$@"

case "${1:-}" in
  info)
    exit 0
    ;;
  pull)
    printf 'pulled %s\n' "${2:-}"
    exit 0
    ;;
  image)
    if [[ "${2:-}" == "inspect" ]]; then
      printf 'sha256:fake-image\n'
      exit 0
    fi
    ;;
  container)
    if [[ "${2:-}" == "inspect" ]]; then
      [[ -f "$(container_file "${3:-}")" ]]
      exit $?
    fi
    ;;
  ps)
    shopt -s nullglob
    for file in "$root"/containers/*; do basename "$file"; done
    exit 0
    ;;
  inspect)
    fmt=""
    name=""
    shift
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --format) fmt="$2"; shift 2 ;;
        *) name="$1"; shift ;;
      esac
    done
    read_meta "$name" || exit 1
    case "$fmt" in
      *'.Image'*) printf 'sha256:fake-image\n' ;;
      *'.State.Running'*) printf 'true\n' ;;
      *'.State.Status'*) printf 'running\n' ;;
      *'.State.ExitCode'*) printf '0\n' ;;
      *'.State.Error'*) printf '\n' ;;
      *'.Config.Labels'*'com.autobyteus.launcher'*) printf 'server-docker\n' ;;
      *'.Config.Labels'*'com.autobyteus.nodeName'*) printf '%s\n' "${node_name:-$name}" ;;
      *'.Config.Labels'*'com.autobyteus.configHash'*) printf '%s\n' "${config_hash:-}" ;;
      *'{{json .State}}'*) printf '{"Running":true,"Status":"running","ExitCode":0,"Error":""}\n' ;;
      *) printf '\n' ;;
    esac
    exit 0
    ;;
  run)
    printf '%s\0' "$@" >> "$root/run-args.nul"
    printf '\n--RUN--\n' >> "$root/run-args.nul"
    name=""
    node_name=""
    config_hash=""
    prev=""
    for arg in "$@"; do
      if [[ "$prev" == "--name" ]]; then name="$arg"; prev=""; continue; fi
      if [[ "$prev" == "--label" ]]; then
        case "$arg" in
          com.autobyteus.nodeName=*) node_name="${arg#*=}" ;;
          com.autobyteus.configHash=*) config_hash="${arg#*=}" ;;
        esac
        prev=""
        continue
      fi
      case "$arg" in
        --name|--label) prev="$arg" ;;
      esac
    done
    [[ -n "$name" ]] || name="unnamed"
    {
      printf 'node_name=%q\n' "${node_name:-$name}"
      printf 'config_hash=%q\n' "$config_hash"
    } > "$(container_file "$name")"
    printf 'fake-container-id\n'
    exit 0
    ;;
  rm)
    shift
    for arg in "$@"; do
      [[ "$arg" == "-f" ]] && continue
      rm -f "$(container_file "$arg")"
    done
    exit 0
    ;;
  start|stop)
    printf '%s\n' "${2:-}"
    exit 0
    ;;
  logs)
    printf 'fake logs\n'
    exit 0
    ;;
esac

printf 'unsupported fake docker command: %s\n' "$*" >&2
exit 1
""",
        encoding="utf-8",
    )
    path.chmod(0o755)


if __name__ == "__main__":
    unittest.main()
