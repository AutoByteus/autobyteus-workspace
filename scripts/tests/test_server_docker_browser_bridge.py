import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DOCKER_DIR = REPO_ROOT / "autobyteus-server-ts" / "docker"
OPEN_VNC_BROWSER = DOCKER_DIR / "open-vnc-browser-url.sh"
XDG_OPEN_BRIDGE = DOCKER_DIR / "xdg-open-root-bridge.sh"
EXO_OPEN_BRIDGE = DOCKER_DIR / "exo-open-root-bridge.sh"
DOCKERFILE = DOCKER_DIR / "Dockerfile.monorepo"


EXPECTED_DESKTOP_ENV_AND_COMMAND = [
    "env",
    "DISPLAY=:99",
    "XAUTHORITY=/home/vncuser/.Xauthority",
    "XDG_RUNTIME_DIR=/run/user/1000",
    "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus",
    "BROWSER=",
    "/usr/bin/xdg-open",
]


class ServerDockerBrowserBridgeTest(unittest.TestCase):
    def test_opener_source_uses_uid_aware_sanitized_system_xdg_open(self) -> None:
        opener = OPEN_VNC_BROWSER.read_text(encoding="utf-8")

        self.assertIn('vnc_uid="$(id -u vncuser 2>/dev/null || true)"', opener)
        self.assertIn('current_uid="$(id -u)"', opener)
        self.assertIn("open_as_vncuser=(env \\", opener)
        self.assertIn("  BROWSER= \\", opener)
        self.assertIn('  /usr/bin/xdg-open "${url}")', opener)
        self.assertIn('if [[ "${current_uid}" -eq "${vnc_uid}" ]]; then', opener)
        self.assertIn('if [[ "${current_uid}" -eq 0 ]]; then', opener)
        self.assertIn('exec runuser -u vncuser -- "${open_as_vncuser[@]}"', opener)
        self.assertIn("unsupported uid", opener)

        self.assertNotRegex(opener, r"exec\s+runuser\s+-u\s+vncuser\s+--\s+env")
        self.assertNotRegex(opener, r"(?m)^\s*xdg-open\s+")
        self.assertNotIn("/usr/local/bin/xdg-open", opener)

    def test_root_opener_branch_switches_once_to_sanitized_vncuser_command(self) -> None:
        url = "https://example.invalid/root-opener"
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            fake_bin = tmp_path / "bin"
            fake_bin.mkdir()
            runuser_record = tmp_path / "runuser.nul"
            write_fake_id(fake_bin / "id")
            write_nul_recording_script(fake_bin / "runuser", "FAKE_RUNUSER_RECORD")

            result = subprocess.run(
                ["bash", str(OPEN_VNC_BROWSER), url],
                check=False,
                text=True,
                capture_output=True,
                env=fake_env(fake_bin, FAKE_CURRENT_UID="0", FAKE_VNC_UID="1000", FAKE_RUNUSER_RECORD=str(runuser_record)),
            )

            self.assertEqual(0, result.returncode, result.stderr)
            self.assertEqual(
                ["-u", "vncuser", "--", *EXPECTED_DESKTOP_ENV_AND_COMMAND, url],
                read_nul_record(runuser_record),
            )
            self.assertNotIn("runuser: may not be used by non-root users", result.stderr)

    def test_already_vncuser_opener_branch_skips_runuser_and_clears_browser(self) -> None:
        url = "https://example.invalid/already-vncuser"
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            fake_bin = tmp_path / "bin"
            fake_bin.mkdir()
            xdg_record = tmp_path / "xdg.nul"
            runuser_record = tmp_path / "runuser.nul"
            fake_xdg_open = tmp_path / "fake-xdg-open"

            write_fake_id(fake_bin / "id")
            write_failing_recording_script(fake_bin / "runuser", "FAKE_RUNUSER_RECORD")
            write_env_recording_opener(fake_xdg_open)
            opener_copy = copy_script_with_replacements(
                OPEN_VNC_BROWSER,
                tmp_path / "open-vnc-browser-url.sh",
                {"/usr/bin/xdg-open": str(fake_xdg_open)},
            )

            result = subprocess.run(
                [str(opener_copy), url],
                check=False,
                text=True,
                capture_output=True,
                env=fake_env(
                    fake_bin,
                    FAKE_CURRENT_UID="1000",
                    FAKE_VNC_UID="1000",
                    FAKE_OPENER_RECORD=str(xdg_record),
                    FAKE_RUNUSER_RECORD=str(runuser_record),
                    BROWSER=str(OPEN_VNC_BROWSER),
                ),
            )

            self.assertEqual(0, result.returncode, result.stderr)
            self.assertFalse(runuser_record.exists(), "already-vncuser branch must not call runuser")
            self.assertEqual(
                [
                    "DISPLAY=:99",
                    "XAUTHORITY=/home/vncuser/.Xauthority",
                    "XDG_RUNTIME_DIR=/run/user/1000",
                    "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus",
                    "BROWSER=",
                    url,
                ],
                read_nul_record(xdg_record),
            )
            self.assertNotIn("runuser: may not be used by non-root users", result.stderr)

    def test_unsupported_uid_fails_without_runuser_or_opener_dispatch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            fake_bin = tmp_path / "bin"
            fake_bin.mkdir()
            runuser_record = tmp_path / "runuser.nul"
            xdg_record = tmp_path / "xdg.nul"
            fake_xdg_open = tmp_path / "fake-xdg-open"

            write_fake_id(fake_bin / "id")
            write_failing_recording_script(fake_bin / "runuser", "FAKE_RUNUSER_RECORD")
            write_env_recording_opener(fake_xdg_open)
            opener_copy = copy_script_with_replacements(
                OPEN_VNC_BROWSER,
                tmp_path / "open-vnc-browser-url.sh",
                {"/usr/bin/xdg-open": str(fake_xdg_open)},
            )

            result = subprocess.run(
                [str(opener_copy), "https://example.invalid/unsupported"],
                check=False,
                text=True,
                capture_output=True,
                env=fake_env(
                    fake_bin,
                    FAKE_CURRENT_UID="1234",
                    FAKE_VNC_UID="1000",
                    FAKE_OPENER_RECORD=str(xdg_record),
                    FAKE_RUNUSER_RECORD=str(runuser_record),
                ),
            )

            self.assertNotEqual(0, result.returncode)
            self.assertIn("unsupported uid 1234; expected root (0) or vncuser (1000)", result.stderr)
            self.assertFalse(runuser_record.exists(), "unsupported uid branch must not call runuser")
            self.assertFalse(xdg_record.exists(), "unsupported uid branch must not call the opener")

    def test_root_and_non_root_wrappers_remain_thin_facades(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            fake_bin = tmp_path / "bin"
            fake_bin.mkdir()
            fake_opener = tmp_path / "fake-open-vnc-browser-url"
            fake_xdg_open = tmp_path / "fake-system-xdg-open"
            fake_exo_open = tmp_path / "fake-system-exo-open"
            opener_record = tmp_path / "opener.nul"
            xdg_record = tmp_path / "xdg.nul"
            exo_record = tmp_path / "exo.nul"

            write_fake_id(fake_bin / "id")
            write_nul_recording_script(fake_opener, "FAKE_OPENER_RECORD")
            write_nul_recording_script(fake_xdg_open, "FAKE_XDG_RECORD")
            write_nul_recording_script(fake_exo_open, "FAKE_EXO_RECORD")

            xdg_copy = copy_script_with_replacements(
                XDG_OPEN_BRIDGE,
                tmp_path / "xdg-open",
                {
                    "/usr/local/bin/open-vnc-browser-url.sh": str(fake_opener),
                    "/usr/bin/xdg-open": str(fake_xdg_open),
                },
            )
            exo_copy = copy_script_with_replacements(
                EXO_OPEN_BRIDGE,
                tmp_path / "exo-open",
                {
                    "/usr/local/bin/open-vnc-browser-url.sh": str(fake_opener),
                    "/usr/bin/exo-open": str(fake_exo_open),
                },
            )

            common_env = fake_env(
                fake_bin,
                FAKE_OPENER_RECORD=str(opener_record),
                FAKE_XDG_RECORD=str(xdg_record),
                FAKE_EXO_RECORD=str(exo_record),
            )

            subprocess.run(
                [str(xdg_copy), "https://example.invalid/root-xdg"],
                check=True,
                text=True,
                capture_output=True,
                env={**common_env, "FAKE_CURRENT_UID": "0"},
            )
            self.assertEqual(["https://example.invalid/root-xdg"], read_nul_record(opener_record))
            self.assertFalse(xdg_record.exists(), "root xdg wrapper must delegate instead of passing through")
            self.assertFalse(exo_record.exists(), "root xdg wrapper must not call exo-open")

            opener_record.unlink()
            subprocess.run(
                [str(exo_copy), "--launch", "WebBrowser", "https://example.invalid/root-exo"],
                check=True,
                text=True,
                capture_output=True,
                env={**common_env, "FAKE_CURRENT_UID": "0"},
            )
            self.assertEqual(["https://example.invalid/root-exo"], read_nul_record(opener_record))
            self.assertFalse(xdg_record.exists(), "root exo wrapper must not call xdg-open")
            self.assertFalse(exo_record.exists(), "root exo wrapper must delegate instead of passing through")

            subprocess.run(
                [str(xdg_copy), "https://example.invalid/non-root-xdg"],
                check=True,
                text=True,
                capture_output=True,
                env={**common_env, "FAKE_CURRENT_UID": "1000"},
            )
            self.assertEqual(["https://example.invalid/non-root-xdg"], read_nul_record(xdg_record))

            subprocess.run(
                [str(exo_copy), "--launch", "WebBrowser", "https://example.invalid/non-root-exo"],
                check=True,
                text=True,
                capture_output=True,
                env={**common_env, "FAKE_CURRENT_UID": "1000"},
            )
            self.assertEqual(
                ["--launch", "WebBrowser", "https://example.invalid/non-root-exo"],
                read_nul_record(exo_record),
            )

    def test_dockerfile_installs_bridge_scripts_and_browser_env_for_all_base_variants(self) -> None:
        dockerfile = DOCKERFILE.read_text(encoding="utf-8")

        self.assertRegex(dockerfile, r"(?m)^ARG BASE_IMAGE_TAG=latest$")
        self.assertRegex(dockerfile, r"(?m)^FROM autobyteus/chrome-vnc:\$\{BASE_IMAGE_TAG\} AS runtime$")
        self.assertIn("COPY autobyteus-server-ts/docker/open-vnc-browser-url.sh /usr/local/bin/open-vnc-browser-url.sh", dockerfile)
        self.assertIn("COPY autobyteus-server-ts/docker/xdg-open-root-bridge.sh /usr/local/bin/xdg-open", dockerfile)
        self.assertIn("COPY autobyteus-server-ts/docker/exo-open-root-bridge.sh /usr/local/bin/exo-open", dockerfile)

        chmod_block = dockerfile_instruction_block(dockerfile, "RUN chmod +x")
        for installed_path in (
            "/usr/local/bin/open-vnc-browser-url.sh",
            "/usr/local/bin/xdg-open",
            "/usr/local/bin/exo-open",
        ):
            self.assertRegex(chmod_block, re.escape(installed_path) + r"(?:\s|\\|$)")
        self.assertIn("BROWSER=/usr/local/bin/open-vnc-browser-url.sh", dockerfile)


def fake_env(fake_bin: Path, **overrides: str) -> dict[str, str]:
    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}{os.pathsep}{env['PATH']}"
    env.update(overrides)
    return env


def write_fake_id(path: Path) -> None:
    write_executable(
        path,
        """#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "-u" && "${2:-}" == "vncuser" ]]; then
  printf '%s\\n' "${FAKE_VNC_UID:-1000}"
elif [[ "${1:-}" == "-u" && "$#" -eq 1 ]]; then
  printf '%s\\n' "${FAKE_CURRENT_UID:?FAKE_CURRENT_UID is required}"
else
  exec /usr/bin/id "$@"
fi
""",
    )


def write_nul_recording_script(path: Path, record_env_name: str) -> None:
    write_executable(
        path,
        f"""#!/usr/bin/env bash
set -euo pipefail
record="${{{record_env_name}:?{record_env_name} is required}}"
printf '%s\\0' "$@" > "${{record}}"
""",
    )


def write_failing_recording_script(path: Path, record_env_name: str) -> None:
    write_executable(
        path,
        f"""#!/usr/bin/env bash
set -euo pipefail
record="${{{record_env_name}:?{record_env_name} is required}}"
printf '%s\\0' "$@" > "${{record}}"
echo "unexpected command invocation: $0" >&2
exit 90
""",
    )


def write_env_recording_opener(path: Path) -> None:
    write_executable(
        path,
        """#!/usr/bin/env bash
set -euo pipefail
: "${FAKE_OPENER_RECORD:?FAKE_OPENER_RECORD is required}"
printf '%s\\0' \\
  "DISPLAY=${DISPLAY-__UNSET__}" \\
  "XAUTHORITY=${XAUTHORITY-__UNSET__}" \\
  "XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR-__UNSET__}" \\
  "DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS-__UNSET__}" \\
  "BROWSER=${BROWSER-__UNSET__}" \\
  "$@" > "${FAKE_OPENER_RECORD}"
""",
    )


def copy_script_with_replacements(source: Path, destination: Path, replacements: dict[str, str]) -> Path:
    text = source.read_text(encoding="utf-8")
    for old, new in replacements.items():
        text = text.replace(old, new)
    write_executable(destination, text)
    subprocess.run(["bash", "-n", str(destination)], check=True, text=True, capture_output=True)
    return destination


def dockerfile_instruction_block(dockerfile: str, prefix: str) -> str:
    lines = dockerfile.splitlines()
    for index, line in enumerate(lines):
        if line.startswith(prefix):
            block = [line]
            while block[-1].rstrip().endswith("\\"):
                index += 1
                if index >= len(lines):
                    break
                block.append(lines[index])
            return "\n".join(block)
    raise AssertionError(f"Dockerfile instruction block not found: {prefix}")


def write_executable(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")
    path.chmod(0o755)


def read_nul_record(path: Path) -> list[str]:
    raw = path.read_bytes()
    if not raw:
        return []
    return raw.decode("utf-8").split("\0")[:-1]


if __name__ == "__main__":
    unittest.main()
