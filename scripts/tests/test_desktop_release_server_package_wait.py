"""Desktop Release publish order (autobyteus-412): the updater files go up only after the server packages.

Run from the repository root with:
python3 -m unittest scripts/tests/test_desktop_release_server_package_wait.py -v
Needs bash and Node 22. No GitHub access: the `run:` blocks of the publish job's "Wait for the server
packages" and "Publish the desktop updater files" steps are extracted from the workflow and run with a
fake `gh` (a release whose assets the test scripts per call) and a fake `sleep` (records, returns at
once), both put first on PATH. The six expected package names come from the node starter's own
`archiveName`/`descriptionName`, so the step and the nodes cannot disagree about them. The test also
checks the job's structure: the two softprops upload steps carry no `latest*.yml`, and the two new
steps run after them, unconditionally.
"""

import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_release_channel_workflow_steps import extract_step, run_bash, substitute_expressions  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "release-desktop.yml"
STARTER = REPO_ROOT / "autobyteus-server-ts" / "docker" / "starter"
NODE = shutil.which("node") or "node"
WAIT_STEP = "Wait for the server packages"
UPLOAD_STEP = "Publish the desktop updater files"
SOFTPROPS_STEPS = ("Publish release assets with curated notes", "Publish release assets with generated notes fallback")
TAG = "v1.5.13-beta.1"
UPDATER_FILES = [
    "release-artifacts/latest-mac.yml",
    "release-artifacts/linux-x64/latest-linux.yml",
    "release-artifacts/linux-arm64/latest-linux-arm64.yml",
    "release-artifacts/windows-x64/latest.yml",
]
BINARIES = ["AutoByteus_personal_macos-arm64-1.5.13-beta.1.dmg", "AutoByteus_personal_linux-x64-1.5.13-beta.1.AppImage"]


def package_names(version: str, arch: str) -> List[str]:
    """The archive, description and signature names a node fetches (the starter's own functions)."""
    script = (
        "const { pathToFileURL } = await import('node:url');"
        "const { archiveName } = await import(pathToFileURL(process.argv[1]).href);"
        "const { descriptionName } = await import(pathToFileURL(process.argv[2]).href);"
        "const [version, arch] = [process.argv[3], process.argv[4]];"
        "console.log([archiveName(version, arch), descriptionName(version, arch), `${descriptionName(version, arch)}.sig`].join('\\n'));"
    )
    result = subprocess.run(
        [NODE, "--input-type=module", "-e", script, str(STARTER / "package-verifier.mjs"),
         str(STARTER / "release-source.mjs"), version, arch],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.split()


def write_executable(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)


def publish_job_lines() -> List[str]:
    lines = WORKFLOW.read_text(encoding="utf-8").splitlines()
    start = lines.index("  publish-release:")
    end = next((i for i in range(start + 1, len(lines)) if re.match(r"^  \S", lines[i])), len(lines))
    return lines[start:end]


def step_blocks() -> Dict[str, List[str]]:
    """The publish job's steps by name, in order, each as its lines (comments left out)."""
    blocks: Dict[str, List[str]] = {}
    current: Optional[str] = None
    for line in publish_job_lines():
        match = re.match(r"^      - name: (.+?)\s*$", line)
        if match:
            current = match.group(1)
            blocks[current] = []
        elif current is not None and not line.lstrip().startswith("#"):
            blocks[current].append(line)
    return blocks


class ServerPackageWaitTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="desktop-release-wait-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.ref = self.tmp / "ref"
        (self.ref / "autobyteus-server-ts" / "docker").mkdir(parents=True)
        (self.ref / "autobyteus-server-ts" / "docker" / "system-level.json").write_text("{}\n", encoding="utf-8")
        self.fake = self.tmp / "fake"
        self.fake.mkdir()
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        # `gh release view`: prints the asset names of call N from assets.N, else from assets (the last state);
        # no-release.N makes call N fail as when the release does not exist. `gh release upload`: refuses a path
        # that is not there, as the real one does.
        write_executable(bin_dir / "gh", f"""#!/usr/bin/env bash
echo "$*" >> "{self.fake}/gh-calls"
if [[ "$1 $2" == "release view" ]]; then
  count=$(( $(cat "{self.fake}/count" 2>/dev/null || echo 0) + 1 ))
  echo "$count" > "{self.fake}/count"
  if [[ -f "{self.fake}/no-release.$count" ]]; then echo "release not found" >&2; exit 1; fi
  if [[ -f "{self.fake}/assets.$count" ]]; then cat "{self.fake}/assets.$count"; else cat "{self.fake}/assets"; fi
  exit 0
fi
if [[ "$1 $2" == "release upload" ]]; then
  for arg in "${{@:4}}"; do
    [[ "$arg" == --* || -f "$arg" ]] || {{ echo "no such file: $arg" >&2; exit 1; }}
  done
  exit 0
fi
echo "unexpected gh call: $*" >&2
exit 2
""")
        write_executable(bin_dir / "sleep", f"""#!/usr/bin/env bash
echo "$1" >> "{self.fake}/sleeps"
""")
        self.env = {"PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}", "RELEASE_TAG": TAG,
                    "GH_TOKEN": "fake", "GH_REPO": "AutoByteus/autobyteus-workspace"}
        version = TAG[1:]
        self.x64 = package_names(version, "x64")
        self.arm64 = package_names(version, "arm64")

    def assets(self, names: List[str], call: Optional[int] = None) -> None:
        target = self.fake / (f"assets.{call}" if call else "assets")
        target.write_text("".join(f"{name}\n" for name in names), encoding="utf-8")

    def run_step(self, name: str) -> subprocess.CompletedProcess:
        return run_bash(substitute_expressions(extract_step(WORKFLOW, name)["run"], {}), self.ref, self.env)

    def gh_calls(self) -> List[str]:
        path = self.fake / "gh-calls"
        return path.read_text(encoding="utf-8").splitlines() if path.exists() else []

    def sleeps(self) -> List[str]:
        path = self.fake / "sleeps"
        return path.read_text(encoding="utf-8").splitlines() if path.exists() else []

    def test_the_six_names_are_the_ones_nodes_fetch(self) -> None:
        self.assertEqual([
            "autobyteus-server-1.5.13-beta.1-linux-x64.tar.gz",
            "autobyteus-server-1.5.13-beta.1-linux-x64.json",
            "autobyteus-server-1.5.13-beta.1-linux-x64.json.sig",
        ], self.x64)
        self.assertEqual(3, len(self.arm64))

    def test_packages_already_on_the_release_pass_at_once(self) -> None:
        self.assets(BINARIES + self.x64 + self.arm64)
        result = self.run_step(WAIT_STEP)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([f"release view {TAG} --json assets --jq .assets[].name"], self.gh_calls())
        self.assertEqual([], self.sleeps())

    def test_waits_until_all_six_files_are_there(self) -> None:
        self.assets(BINARIES, call=1)
        self.assets(BINARIES + self.arm64[:1], call=2)  # the arm64 archive first: not enough
        self.assets(BINARIES + self.x64 + self.arm64[:2], call=3)  # no arm64 signature yet
        self.assets(BINARIES + self.x64 + self.arm64)
        result = self.run_step(WAIT_STEP)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(4, len(self.gh_calls()))
        self.assertEqual(["30", "30", "30"], self.sleeps())

    def test_a_failed_asset_read_counts_as_missing_and_the_wait_goes_on(self) -> None:
        (self.fake / "no-release.1").write_text("", encoding="utf-8")
        self.assets(BINARIES + self.x64 + self.arm64)
        result = self.run_step(WAIT_STEP)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(2, len(self.gh_calls()))

    def test_gives_up_after_60_minutes_naming_the_tag_and_every_missing_file(self) -> None:
        self.assets(BINARIES + self.x64)
        result = self.run_step(WAIT_STEP)
        self.assertEqual(1, result.returncode)
        self.assertEqual(120, len(self.gh_calls()))
        self.assertEqual(["30"] * 120, self.sleeps())
        error = next(line for line in result.stdout.splitlines() if line.startswith("::error::"))
        self.assertIn(f"The server packages of {TAG} did not appear within 60 minutes", error)
        self.assertIn("missing: " + " ".join(self.arm64) + ".", error)
        for name in self.x64:
            self.assertNotIn(name, error)
        self.assertIn("Rerun the Server Docker Release's failed jobs, then rerun this job.", error)

    def test_a_ref_without_server_packages_is_not_held(self) -> None:
        (self.ref / "autobyteus-server-ts" / "docker" / "system-level.json").unlink()
        result = self.run_step(WAIT_STEP)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("::notice::This ref predates server packages", result.stdout)
        self.assertEqual([], self.gh_calls())

    def test_uploads_the_four_updater_files_replacing_any_earlier_copy(self) -> None:
        for path in UPDATER_FILES:
            (self.ref / path).parent.mkdir(parents=True, exist_ok=True)
            (self.ref / path).write_text("version: 1.5.13-beta.1\n", encoding="utf-8")
        result = self.run_step(UPLOAD_STEP)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([f"release upload {TAG} {' '.join(UPDATER_FILES)} --clobber"], self.gh_calls())

    def test_the_upload_fails_when_an_updater_file_is_missing(self) -> None:
        for path in UPDATER_FILES[:3]:
            (self.ref / path).parent.mkdir(parents=True, exist_ok=True)
            (self.ref / path).write_text("x\n", encoding="utf-8")
        self.assertNotEqual(0, self.run_step(UPLOAD_STEP).returncode)


class PublishJobOrderTest(unittest.TestCase):
    def test_softprops_uploads_no_updater_file(self) -> None:
        blocks = step_blocks()
        for name in SOFTPROPS_STEPS:
            with self.subTest(step=name):
                text = "\n".join(blocks[name])
                self.assertIn("softprops/action-gh-release@v2", text)
                self.assertIn("files: |", text)
                self.assertNotIn("latest", text)

    def test_the_wait_and_the_updater_upload_are_the_last_steps_and_always_run(self) -> None:
        blocks = step_blocks()
        names = list(blocks)
        self.assertEqual([*SOFTPROPS_STEPS, WAIT_STEP, UPLOAD_STEP], names[-4:])
        for name in (WAIT_STEP, UPLOAD_STEP):
            with self.subTest(step=name):
                self.assertEqual("", extract_step(WORKFLOW, name)["if"])  # no `if: always()`: a failed wait stops the upload
                text = "\n".join(blocks[name])
                self.assertIn("GH_TOKEN: ${{ github.token }}", text)
                self.assertIn("GH_REPO: ${{ github.repository }}", text)
                self.assertIn("RELEASE_TAG: ${{ needs.prepare-release.outputs.release_tag }}", text)

    def test_the_updater_files_are_the_ones_the_job_validated(self) -> None:
        blocks = step_blocks()
        validated = "\n".join(blocks["Merge macOS updater metadata"] + blocks["Validate Linux updater metadata"])
        for path in UPDATER_FILES[:3]:
            self.assertIn(path, validated)


if __name__ == "__main__":
    unittest.main()
