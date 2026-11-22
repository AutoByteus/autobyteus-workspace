"""Desktop Release clean-image gate (autobyteus-28): each Linux job runs its own AppImage in a stock image.

Run from the repository root with:
python3 -m unittest scripts/tests/test_desktop_release_clean_image_step.py -v
Needs bash and Node 22. No Docker or GitHub access: the `run:` block of each Linux job's "Verify Linux <arch>
AppImage runs in a clean Ubuntu image" step is extracted from the workflow and run with bash against a
checkout holding the real `verify-clean-image-runtime.mjs` and a fake `docker` first on PATH, which records
its call and answers as the container would. The test also checks each job's structure: the step belongs to
that job, runs unconditionally after the job's layout check and before its artifacts are uploaded, so a
runtime that cannot start on a stock system fails the job before anything is published.
"""

import json
import os
import re
import shutil
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_release_channel_workflow_steps import run_bash, substitute_expressions  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "release-desktop.yml"
VERIFIER = REPO_ROOT / "scripts" / "desktop-package" / "verify-clean-image-runtime.mjs"
VERSION = "1.5.14-beta.6"
# job id -> (arch token in the AppImage name, step-name label)
LINUX_JOBS = {"build-linux-x64": ("linux-x64", "x64"), "build-linux-arm64": ("linux-arm64", "ARM64")}
LOADER_ERROR = ("/autobyteus.AppImage: error while loading shared libraries: libz.so: "
                "cannot open shared object file: No such file or directory")


def job_steps(job: str) -> Dict[str, List[str]]:
    """The job's steps by name, in workflow order, each as its lines (comments left out)."""
    lines = WORKFLOW.read_text(encoding="utf-8").splitlines()
    start = lines.index(f"  {job}:")
    end = next((i for i in range(start + 1, len(lines)) if re.match(r"^  \S", lines[i])), len(lines))
    steps: Dict[str, List[str]] = {}
    current: Optional[str] = None
    for line in lines[start:end]:
        match = re.match(r"^      - name: (.+?)\s*$", line)
        if match:
            current = match.group(1)
            steps[current] = []
        elif current is not None and not line.lstrip().startswith("#"):
            steps[current].append(line)
    return steps


def run_block(step: List[str]) -> str:
    """The step's `run: |` block, dedented as GitHub runs it."""
    index = next(i for i, line in enumerate(step) if line.strip() == "run: |")
    body = [line[10:] if line.strip() else "" for line in step[index + 1:]]
    return "\n".join(body).strip() + "\n"


def write_executable(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)


class CleanImageStepStructureTest(unittest.TestCase):
    def test_each_linux_job_runs_the_gate_unconditionally_after_its_layout_check_and_before_upload(self) -> None:
        for job, (_, label) in LINUX_JOBS.items():
            with self.subTest(job=job):
                steps = job_steps(job)
                names = list(steps)
                gate = f"Verify Linux {label} AppImage runs in a clean Ubuntu image"
                self.assertIn(gate, names)
                self.assertLess(names.index(f"Build Electron Linux {label}"), names.index(gate))
                self.assertLess(names.index(f"Verify Linux {label} AppImage and updater metadata"), names.index(gate))
                self.assertLess(names.index(gate), names.index(f"Upload Linux {label} artifacts"))
                keys = [line.strip().split(":", 1)[0] for line in steps[gate] if re.match(r"^        \S", line)]
                self.assertEqual(["run"], keys, "the gate has no if:, continue-on-error or other condition")
                self.assertIn("node scripts/desktop-package/verify-clean-image-runtime.mjs", run_block(steps[gate]))

    def test_no_job_continues_past_a_failed_step(self) -> None:
        workflow = WORKFLOW.read_text(encoding="utf-8")
        for job in LINUX_JOBS:
            with self.subTest(job=job):
                lines = workflow.splitlines()
                start = lines.index(f"  {job}:")
                end = next((i for i in range(start + 1, len(lines)) if re.match(r"^  \S", lines[i])), len(lines))
                self.assertNotIn("continue-on-error", "\n".join(lines[start:end]))


class CleanImageStepRunTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="desktop-release-clean-image-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.ref = self.tmp / "ref"
        (self.ref / "scripts" / "desktop-package").mkdir(parents=True)
        shutil.copyfile(VERIFIER, self.ref / "scripts" / "desktop-package" / VERIFIER.name)
        self.dist = self.ref / "autobyteus-web" / "electron-dist"
        self.dist.mkdir(parents=True)
        self.images = {}
        for token, _ in LINUX_JOBS.values():
            image = self.dist / f"AutoByteus_personal_{token}-{VERSION}.AppImage"
            image.write_bytes(b"inert test bytes, not executable")
            self.images[token] = image
        self.fake = self.tmp / "fake"
        self.fake.mkdir()
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        # `docker`: records its arguments as JSON; exits with fake/exit and writes fake/stderr when present.
        write_executable(bin_dir / "docker", f"""#!/usr/bin/env python3
import json, pathlib, sys
fake = pathlib.Path({str(self.fake)!r})
(fake / "calls").open("a").write(json.dumps(sys.argv[1:]) + "\\n")
if (fake / "stderr").exists():
    sys.stderr.write((fake / "stderr").read_text())
sys.exit(int((fake / "exit").read_text()) if (fake / "exit").exists() else 0)
""")
        self.env = {"PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}"}

    def run_gate(self, job: str):
        label = LINUX_JOBS[job][1]
        step = job_steps(job)[f"Verify Linux {label} AppImage runs in a clean Ubuntu image"]
        return run_bash(substitute_expressions(run_block(step), {}), self.ref, self.env)

    def docker_calls(self) -> List[List[str]]:
        path = self.fake / "calls"
        return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []

    def test_each_job_runs_its_own_architecture_image_in_a_networkless_stock_ubuntu_image(self) -> None:
        for job, (token, _) in LINUX_JOBS.items():
            with self.subTest(job=job):
                (self.fake / "calls").unlink(missing_ok=True)
                result = self.run_gate(job)
                self.assertEqual(0, result.returncode, result.stdout + result.stderr)
                self.assertIn("Verified the AppImage runtime loads and extracts AppRun in a clean ubuntu:24.04 image",
                              result.stdout)
                calls = self.docker_calls()
                self.assertEqual(1, len(calls))
                call = calls[0]
                self.assertEqual(["run", "--rm", "--network", "none", "--mount"], call[:5])
                self.assertEqual(f"type=bind,source={self.images[token]},target=/autobyteus.AppImage,readonly", call[5])
                self.assertEqual("ubuntu:24.04", call[6])

    def test_a_runtime_that_needs_libz_so_fails_the_job_naming_the_library(self) -> None:
        (self.fake / "exit").write_text("127")
        (self.fake / "stderr").write_text(LOADER_ERROR)
        for job in LINUX_JOBS:
            with self.subTest(job=job):
                result = self.run_gate(job)
                self.assertNotEqual(0, result.returncode)
                self.assertIn("does not run in a clean ubuntu:24.04 image (exit 127)", result.stderr)
                self.assertIn("libz.so: cannot open shared object file", result.stderr)

    def test_a_clean_image_that_ships_libz_so_fails_the_job(self) -> None:
        (self.fake / "exit").write_text("3")
        (self.fake / "stderr").write_text("clean image has /usr/lib/aarch64-linux-gnu/libz.so")
        for job in LINUX_JOBS:
            with self.subTest(job=job):
                result = self.run_gate(job)
                self.assertNotEqual(0, result.returncode)
                self.assertIn("(exit 3): clean image has /usr/lib/aarch64-linux-gnu/libz.so", result.stderr)

    def test_a_job_without_its_appimage_fails_before_docker_runs(self) -> None:
        for job, (token, _) in LINUX_JOBS.items():
            with self.subTest(job=job):
                (self.fake / "calls").unlink(missing_ok=True)
                image = self.images[token]
                image.rename(image.with_suffix(".moved"))
                try:
                    result = self.run_gate(job)
                finally:
                    image.with_suffix(".moved").rename(image)
                self.assertNotEqual(0, result.returncode)
                self.assertEqual([], self.docker_calls())


if __name__ == "__main__":
    unittest.main()
