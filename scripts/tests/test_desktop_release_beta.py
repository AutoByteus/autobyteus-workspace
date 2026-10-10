"""Runs `scripts/desktop-release.sh beta` in a sandbox repository with a bare origin."""

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
RELEASE_SCRIPT = REPO_ROOT / "scripts" / "desktop-release.sh"
RELEASE_VERSIONS_HELPER = REPO_ROOT / "scripts" / "release_versions.py"
CURATED_NOTES = ".github/release-notes/release-notes.md"
GIT_ENV = {
    "GIT_AUTHOR_NAME": "release-test",
    "GIT_AUTHOR_EMAIL": "release-test@example.com",
    "GIT_COMMITTER_NAME": "release-test",
    "GIT_COMMITTER_EMAIL": "release-test@example.com",
}


class DesktopReleaseBetaCommandTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="desktop-release-beta-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.env = {**os.environ, **GIT_ENV}
        self.origin = self.tmp / "origin.git"
        self.repo = self.tmp / "workspace"
        self.git(self.tmp, "init", "--bare", "-q", str(self.origin))
        self.git(self.tmp, "init", "-q", "-b", "personal", str(self.repo))
        self.git(self.repo, "remote", "add", "origin", str(self.origin))

        (self.repo / "scripts").mkdir()
        shutil.copy(RELEASE_SCRIPT, self.repo / "scripts" / "desktop-release.sh")
        shutil.copy(RELEASE_VERSIONS_HELPER, self.repo / "scripts" / "release_versions.py")
        (self.repo / "autobyteus-web").mkdir()
        self.write_version("1.4.90")
        notes = self.repo / CURATED_NOTES
        notes.parent.mkdir(parents=True)
        notes.write_text("## 1.4.90 curated notes\n", encoding="utf-8")
        self.git(self.repo, "add", "scripts", "autobyteus-web/package.json", CURATED_NOTES)
        self.git(self.repo, "commit", "-q", "-m", "chore(release): bump workspace release version to 1.4.90")
        for tag in ("v1.4.89", "v1.4.90", "v2026.02.26-personal-desktop-e2e.3", "v1.2.26-rc3"):
            self.git(self.repo, "tag", tag)
        self.git(self.repo, "push", "-q", "origin", "personal", "--tags")

    def git(self, cwd: Path, *args: str) -> str:
        result = subprocess.run(["git", *args], cwd=str(cwd), env=self.env, capture_output=True, text=True, check=True)
        return result.stdout.strip()

    def write_version(self, version: str) -> None:
        package = {"name": "autobyteus-web", "version": version, "private": True}
        (self.repo / "autobyteus-web" / "package.json").write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

    def package_version(self) -> str:
        return json.loads((self.repo / "autobyteus-web" / "package.json").read_text(encoding="utf-8"))["version"]

    def release(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["bash", "scripts/desktop-release.sh", *args],
            cwd=str(self.repo), env=self.env, capture_output=True, text=True, check=False,
        )

    def origin_tags(self) -> set:
        output = self.git(self.repo, "ls-remote", "--tags", "--refs", "origin")
        return {line.split("refs/tags/")[1] for line in output.splitlines() if "refs/tags/" in line}

    def test_beta_twice_publishes_consecutive_betas_without_curated_notes(self) -> None:
        notes_before = (self.repo / CURATED_NOTES).read_text(encoding="utf-8")

        first = self.release("beta")
        self.assertEqual(0, first.returncode, first.stdout + first.stderr)
        self.assertIn("v1.4.91-beta.1", self.origin_tags())
        self.assertEqual("1.4.91-beta.1", self.package_version())
        self.assertEqual(
            "autobyteus-web/package.json",
            self.git(self.repo, "show", "--name-only", "--format=", "HEAD"),
        )
        self.assertEqual(self.git(self.repo, "rev-parse", "HEAD"), self.git(self.repo, "rev-parse", "origin/personal"))

        second = self.release("beta")
        self.assertEqual(0, second.returncode, second.stdout + second.stderr)
        self.assertIn("v1.4.91-beta.2", self.origin_tags())
        self.assertEqual("1.4.91-beta.2", self.package_version())
        self.assertEqual("tag", self.git(self.repo, "cat-file", "-t", "v1.4.91-beta.2"))
        self.assertEqual(notes_before, (self.repo / CURATED_NOTES).read_text(encoding="utf-8"))

    def test_explicit_base_and_no_push(self) -> None:
        result = self.release("beta", "--base", "1.5.0", "--no-push")
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertEqual("1.5.0-beta.1", self.package_version())
        self.assertEqual("v1.5.0-beta.1", self.git(self.repo, "tag", "-l", "v1.5.0-beta.1"))
        self.assertNotIn("v1.5.0-beta.1", self.origin_tags())

    def test_refuses_a_base_whose_stable_release_exists(self) -> None:
        result = self.release("beta", "--base", "1.4.90")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Stable tag v1.4.90 already exists", result.stderr)
        self.assertEqual("1.4.90", self.package_version())
        self.assertFalse(any(tag.startswith("v1.4.90-beta") for tag in self.origin_tags()))

    def test_refuses_a_dirty_worktree_and_the_wrong_branch(self) -> None:
        (self.repo / "scratch.txt").write_text("dirty\n", encoding="utf-8")
        dirty = self.release("beta")
        self.assertNotEqual(0, dirty.returncode)
        self.assertIn("working tree is not clean", dirty.stderr)
        (self.repo / "scratch.txt").unlink()

        self.git(self.repo, "checkout", "-q", "-b", "feature")
        wrong_branch = self.release("beta")
        self.assertNotEqual(0, wrong_branch.returncode)
        self.assertIn("Switch to 'personal' first", wrong_branch.stderr)
        self.assertEqual({"v1.4.89", "v1.4.90", "v2026.02.26-personal-desktop-e2e.3", "v1.2.26-rc3"}, self.origin_tags())

    def test_refuses_a_version_android_cannot_encode_before_committing_or_tagging(self) -> None:
        self.git(self.repo, "tag", "v1.4.99")
        self.git(self.repo, "push", "-q", "origin", "v1.4.99")
        head_before = self.git(self.repo, "rev-parse", "HEAD")

        default_beta = self.release("beta")
        self.assertNotEqual(0, default_beta.returncode)
        self.assertIn("--base 1.5.0", default_beta.stderr)

        stable = self.release("release", "1.4.100", "--release-notes", CURATED_NOTES)
        self.assertNotEqual(0, stable.returncode)
        self.assertIn("patch <= 99", stable.stderr)
        self.assertIn("nothing was committed or tagged", stable.stderr)

        self.assertEqual(head_before, self.git(self.repo, "rev-parse", "HEAD"))
        self.assertEqual("1.4.90", self.package_version())
        self.assertEqual("", self.git(self.repo, "tag", "-l", "v1.4.100*"))
        self.assertFalse(any(tag.startswith("v1.4.100") for tag in self.origin_tags()))

        next_minor = self.release("beta", "--base", "1.5.0", "--no-push")
        self.assertEqual(0, next_minor.returncode, next_minor.stdout + next_minor.stderr)
        self.assertEqual("1.5.0-beta.1", self.package_version())


if __name__ == "__main__":
    unittest.main()
