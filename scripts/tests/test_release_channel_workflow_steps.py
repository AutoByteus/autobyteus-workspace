"""Executes the release-channel `run:` blocks of the release workflows.

The blocks are extracted from the workflow files and run with bash, so these tests
exercise the exact shell that CI runs:

- desktop "Resolve release metadata": which tags publish as GitHub pre-releases;
- desktop and Android "Resolve release notes mode": pre-release tags use generated notes;
- Docker "Move beta tag": `:beta` only moves forward (fake `docker`, sandbox origin);
- Android "Resolve release metadata": the versionCode it computes, or its refusal,
  matches `release_versions.py android-version-code`, which `desktop-release.sh`
  checks before tagging (so the two copies of the formula cannot drift apart).
"""

import os
import re
import shutil
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path
from typing import Dict, Optional


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = REPO_ROOT / ".github" / "workflows"
DESKTOP_WORKFLOW = WORKFLOWS / "release-desktop.yml"
ANDROID_WORKFLOW = WORKFLOWS / "release-android.yml"
DOCKER_WORKFLOW = WORKFLOWS / "release-server-docker.yml"
RELEASE_VERSIONS_HELPER = REPO_ROOT / "scripts" / "release_versions.py"
IMAGE = "autobyteus/autobyteus-server"


def extract_step(workflow: Path, step_name: str) -> Dict[str, str]:
    """Returns the `if` condition and `run` block of the named step (by indentation)."""
    lines = workflow.read_text(encoding="utf-8").splitlines()
    header = re.compile(r"^(\s*)- name: " + re.escape(step_name) + r"\s*$")
    for index, line in enumerate(lines):
        match = header.match(line)
        if not match:
            continue
        key_indent = len(match.group(1)) + 2
        step: Dict[str, str] = {"if": ""}
        cursor = index + 1
        while cursor < len(lines):
            current = lines[cursor]
            indent = len(current) - len(current.lstrip())
            if current.strip() and indent < key_indent:
                break
            if current.strip().startswith("- ") and indent == key_indent - 2:
                break
            if indent == key_indent and current.strip().startswith("if:"):
                step["if"] = current.strip()[len("if:"):].strip()
            if indent == key_indent and current.strip() == "run: |":
                body = []
                cursor += 1
                while cursor < len(lines):
                    body_line = lines[cursor]
                    body_indent = len(body_line) - len(body_line.lstrip())
                    if body_line.strip() and body_indent <= key_indent:
                        break
                    body.append(body_line[key_indent + 2:] if body_line.strip() else "")
                    cursor += 1
                step["run"] = "\n".join(body) + "\n"
                continue
            cursor += 1
        if "run" not in step:
            raise AssertionError(f"Step '{step_name}' in {workflow.name} has no run block")
        return step
    raise AssertionError(f"Step '{step_name}' not found in {workflow.name}")


def substitute_expressions(script: str, values: Dict[str, str]) -> str:
    """Replaces `${{ expr }}` like GitHub does; an unknown expression fails the test."""

    def replace(match: "re.Match[str]") -> str:
        expression = match.group(1).strip()
        if expression not in values:
            raise AssertionError(f"Unmapped workflow expression: {expression}")
        return values[expression]

    return re.sub(r"\$\{\{\s*(.*?)\s*\}\}", replace, script)


def read_outputs(path: Path) -> Dict[str, str]:
    outputs: Dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            outputs[key] = value
    return outputs


def run_bash(script: str, cwd: Path, env: Dict[str, str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", "-e", "-c", script],
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True, check=True,
        env={**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.com",
             "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.com"},
    )
    return result.stdout.strip()


class DesktopReleaseMetadataStepTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="release-meta-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.step = extract_step(DESKTOP_WORKFLOW, "Resolve release metadata")

    def resolve(self, *, ref: str, ref_name: str, input_tag: str = "", input_prerelease: str = "") -> Dict[str, str]:
        output = self.tmp / "output.txt"
        output.write_text("", encoding="utf-8")
        script = substitute_expressions(
            self.step["run"],
            {
                "github.event.inputs.release_tag": input_tag,
                "github.event.inputs.prerelease": input_prerelease,
            },
        )
        env = {**os.environ, "GITHUB_REF": ref, "GITHUB_REF_NAME": ref_name, "GITHUB_OUTPUT": str(output)}
        result = run_bash(script, self.tmp, env)
        self.assertEqual(0, result.returncode, result.stderr)
        return read_outputs(output)

    def test_beta_tag_push_publishes_a_prerelease(self) -> None:
        outputs = self.resolve(ref="refs/tags/v1.4.91-beta.1", ref_name="v1.4.91-beta.1")
        self.assertEqual("true", outputs["prerelease"])
        self.assertEqual("v1.4.91-beta.1", outputs["release_tag"])
        self.assertEqual("true", outputs["enforce_version"])

    def test_stable_tag_push_publishes_a_normal_release(self) -> None:
        outputs = self.resolve(ref="refs/tags/v1.4.91", ref_name="v1.4.91")
        self.assertEqual("false", outputs["prerelease"])
        self.assertEqual("v1.4.91", outputs["release_tag"])

    def test_manual_dispatch_of_a_beta_tag_is_always_a_prerelease(self) -> None:
        outputs = self.resolve(
            ref="refs/heads/personal", ref_name="personal",
            input_tag="v1.4.91-beta.2", input_prerelease="false",
        )
        self.assertEqual("true", outputs["prerelease"])
        self.assertEqual("v1.4.91-beta.2", outputs["release_ref"])

    def test_manual_dispatch_of_a_stable_tag_follows_the_input(self) -> None:
        stable = self.resolve(
            ref="refs/heads/personal", ref_name="personal", input_tag="v1.4.91", input_prerelease="false",
        )
        self.assertEqual("false", stable["prerelease"])
        honored = self.resolve(
            ref="refs/heads/personal", ref_name="personal", input_tag="v1.4.91", input_prerelease="true",
        )
        self.assertEqual("true", honored["prerelease"])

    def test_build_only_dispatch_is_unchanged(self) -> None:
        outputs = self.resolve(ref="refs/heads/personal", ref_name="personal", input_prerelease="true")
        self.assertEqual("", outputs["release_tag"])
        self.assertEqual("false", outputs["enforce_version"])
        self.assertEqual("true", outputs["prerelease"])


class ReleaseNotesModeStepTest(unittest.TestCase):
    CURATED = ".github/release-notes/release-notes.md"

    def run_notes_step(self, workflow: Path, release_tag: str, curated_text: Optional[str]) -> Dict[str, str]:
        step = extract_step(workflow, "Resolve release notes mode")
        tmp = Path(tempfile.mkdtemp(prefix="release-notes-"))
        self.addCleanup(shutil.rmtree, tmp, True)
        if curated_text is not None:
            curated = tmp / self.CURATED
            curated.parent.mkdir(parents=True)
            curated.write_text(curated_text, encoding="utf-8")
        output = tmp / "output.txt"
        summary = tmp / "summary.md"
        output.write_text("", encoding="utf-8")
        env = {**os.environ, "RELEASE_TAG": release_tag, "GITHUB_OUTPUT": str(output),
               "GITHUB_STEP_SUMMARY": str(summary)}
        result = run_bash(substitute_expressions(step["run"], {}), tmp, env)
        self.assertEqual(0, result.returncode, result.stderr)
        return read_outputs(output)

    def test_prerelease_tags_use_generated_notes_even_with_curated_notes_present(self) -> None:
        for workflow in (DESKTOP_WORKFLOW, ANDROID_WORKFLOW):
            with self.subTest(workflow=workflow.name):
                outputs = self.run_notes_step(workflow, "v1.4.91-beta.1", "## Previous stable notes\n")
                self.assertEqual("false", outputs["has_curated_notes"])
                self.assertNotIn("release_notes_path", outputs)

    def test_stable_tags_keep_curated_notes(self) -> None:
        for workflow in (DESKTOP_WORKFLOW, ANDROID_WORKFLOW):
            with self.subTest(workflow=workflow.name):
                outputs = self.run_notes_step(workflow, "v1.4.91", "## Curated notes\n")
                self.assertEqual("true", outputs["has_curated_notes"])
                self.assertEqual(self.CURATED, outputs["release_notes_path"])

    def test_stable_tags_without_curated_notes_fall_back_to_generated(self) -> None:
        for workflow in (DESKTOP_WORKFLOW, ANDROID_WORKFLOW):
            with self.subTest(workflow=workflow.name):
                self.assertEqual("false", self.run_notes_step(workflow, "v1.4.91", None)["has_curated_notes"])


class AndroidVersionCodeStepTest(unittest.TestCase):
    VERSIONS = [
        "1.4.99", "1.4.99-beta.10", "1.5.0-beta.1", "1.5.0", "1.2.26-rc3", "209.999.99",
        "1.4.100-beta.1", "1.4.100", "1.1000.0", "210.0.0", "1.5.0-beta.99", "1.5.0-beta.0", "1.5.0-preview",
    ]

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="android-meta-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.step = extract_step(ANDROID_WORKFLOW, "Resolve release metadata")

    def workflow_code(self, version: str) -> Optional[str]:
        output = self.tmp / "output.txt"
        output.write_text("", encoding="utf-8")
        tag = f"v{version}"
        env = {
            **os.environ,
            "GITHUB_REF": f"refs/tags/{tag}",
            "GITHUB_REF_NAME": tag,
            "GITHUB_OUTPUT": str(output),
            "GITHUB_RUN_NUMBER": "1",
            "INPUT_PUBLISH_RELEASE": "false",
            "INPUT_RELEASE_TAG": "",
            "INPUT_RELEASE_REF": "",
            "INPUT_PRERELEASE": "true",
        }
        result = run_bash(substitute_expressions(self.step["run"], {}), self.tmp, env)
        if result.returncode != 0:
            return None
        return read_outputs(output)["version_code"]

    def helper_code(self, version: str) -> Optional[str]:
        result = subprocess.run(
            ["python3", str(RELEASE_VERSIONS_HELPER), "android-version-code", version],
            capture_output=True, text=True, check=False,
        )
        return result.stdout.strip() if result.returncode == 0 else None

    def test_helper_matches_the_android_workflow(self) -> None:
        for version in self.VERSIONS:
            with self.subTest(version=version):
                self.assertEqual(self.workflow_code(version), self.helper_code(version))

    def test_the_matrix_covers_accepted_and_refused_versions(self) -> None:
        codes = [self.helper_code(version) for version in self.VERSIONS]
        self.assertIn(None, codes)
        self.assertEqual("10050001", self.helper_code("1.5.0-beta.1"))


class DockerMoveBetaTagStepTest(unittest.TestCase):
    """Runs the "Move beta tag" step in a clone of a sandbox origin with a fake docker."""

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="docker-beta-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.step = extract_step(DOCKER_WORKFLOW, "Move beta tag")

        self.origin = self.tmp / "origin.git"
        self.seed = self.tmp / "seed"
        git(self.tmp, "init", "--bare", "-q", str(self.origin))
        git(self.tmp, "init", "-q", "-b", "personal", str(self.seed))
        git(self.seed, "remote", "add", "origin", str(self.origin))

        # An old commit without the helper (a pre-change release), then one with it.
        (self.seed / "README.md").write_text("old\n", encoding="utf-8")
        git(self.seed, "add", "README.md")
        git(self.seed, "commit", "-q", "-m", "old release")
        git(self.seed, "tag", "v1.4.80")
        (self.seed / "scripts").mkdir()
        shutil.copy(RELEASE_VERSIONS_HELPER, self.seed / "scripts" / "release_versions.py")
        git(self.seed, "add", "scripts/release_versions.py")
        git(self.seed, "commit", "-q", "-m", "add helper")
        self.helper_sha = git(self.seed, "rev-parse", "HEAD")
        # Non-release v* tags from the real inventory must not block the move (ARCH-002).
        for tag in ("v2026.02.26-personal-desktop-e2e.3", "v1.2.26-rc3", "voice-runtime-v0.1.1", "v1.4.90"):
            git(self.seed, "tag", tag)
        git(self.seed, "push", "-q", "origin", "personal", "--tags")

        fake_bin = self.tmp / "bin"
        fake_bin.mkdir()
        self.docker_log = self.tmp / "docker-calls.txt"
        fake_docker = fake_bin / "docker"
        fake_docker.write_text('#!/usr/bin/env bash\necho "$*" >> "$FAKE_DOCKER_LOG"\n', encoding="utf-8")
        fake_docker.chmod(fake_docker.stat().st_mode | stat.S_IEXEC)
        self.path = f"{fake_bin}{os.pathsep}{os.environ.get('PATH', '')}"

    def push_tag(self, tag: str) -> None:
        git(self.seed, "tag", tag)
        git(self.seed, "push", "-q", "origin", tag)

    def run_step(self, release_tag: str, checkout_ref: str) -> subprocess.CompletedProcess:
        checkout = self.tmp / f"checkout-{release_tag}"
        git(self.tmp, "clone", "-q", str(self.origin), str(checkout))
        git(checkout, "checkout", "-q", checkout_ref)
        runner_temp = self.tmp / f"runner-{release_tag}"
        runner_temp.mkdir()
        summary = self.tmp / f"summary-{release_tag}.md"
        env = {
            **os.environ,
            "PATH": self.path,
            "FAKE_DOCKER_LOG": str(self.docker_log),
            "IMAGE_NAME": IMAGE,
            "RELEASE_TAG": release_tag,
            "NORMALIZED_TAG": release_tag[1:] if release_tag.startswith("v") else release_tag,
            "RUNNER_TEMP": str(runner_temp),
            "GITHUB_SHA": self.helper_sha,
            "GITHUB_STEP_SUMMARY": str(summary),
        }
        result = run_bash(substitute_expressions(self.step["run"], {}), checkout, env)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("### Beta tag", summary.read_text(encoding="utf-8"))
        return result

    def docker_calls(self) -> list:
        if not self.docker_log.exists():
            return []
        return self.docker_log.read_text(encoding="utf-8").splitlines()

    def test_step_runs_only_for_the_default_variant(self) -> None:
        self.assertEqual("${{ needs.prepare-release.outputs.build_variant == '' }}", self.step["if"])

    def test_newest_beta_moves_beta_to_its_version_image(self) -> None:
        self.push_tag("v1.4.91-beta.1")
        self.run_step("v1.4.91-beta.1", "v1.4.91-beta.1")
        self.assertEqual(
            [f"buildx imagetools create -t {IMAGE}:beta {IMAGE}:1.4.91-beta.1"], self.docker_calls()
        )

    def test_newest_stable_moves_beta_too(self) -> None:
        self.push_tag("v1.4.91-beta.1")
        self.push_tag("v1.4.91")
        self.run_step("v1.4.91", "v1.4.91")
        self.assertEqual([f"buildx imagetools create -t {IMAGE}:beta {IMAGE}:1.4.91"], self.docker_calls())

    def test_older_republish_leaves_beta_unchanged_even_without_the_helper_in_its_checkout(self) -> None:
        # v1.4.80 predates scripts/release_versions.py; the step loads it from GITHUB_SHA (ARCH-005).
        self.push_tag("v1.4.91-beta.1")
        result = self.run_step("v1.4.80", "v1.4.80")
        self.assertEqual([], self.docker_calls())
        self.assertIn("Left `autobyteus/autobyteus-server:beta` unchanged", result.stdout)

    def test_a_later_tag_pushed_during_the_build_wins(self) -> None:
        # beta.1's run started before beta.2 existed; its final step re-fetches tags and skips.
        self.push_tag("v1.4.91-beta.1")
        checkout = self.tmp / "early-checkout"
        git(self.tmp, "clone", "-q", str(self.origin), str(checkout))
        self.push_tag("v1.4.91-beta.2")
        runner_temp = self.tmp / "runner-early"
        runner_temp.mkdir()
        env = {
            **os.environ, "PATH": self.path, "FAKE_DOCKER_LOG": str(self.docker_log), "IMAGE_NAME": IMAGE,
            "RELEASE_TAG": "v1.4.91-beta.1", "NORMALIZED_TAG": "1.4.91-beta.1", "RUNNER_TEMP": str(runner_temp),
            "GITHUB_SHA": self.helper_sha, "GITHUB_STEP_SUMMARY": str(self.tmp / "summary-early.md"),
        }
        result = run_bash(substitute_expressions(self.step["run"], {}), checkout, env)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([], self.docker_calls())
        self.run_step("v1.4.91-beta.2", "v1.4.91-beta.2")
        self.assertEqual(
            [f"buildx imagetools create -t {IMAGE}:beta {IMAGE}:1.4.91-beta.2"], self.docker_calls()
        )


if __name__ == "__main__":
    unittest.main()
