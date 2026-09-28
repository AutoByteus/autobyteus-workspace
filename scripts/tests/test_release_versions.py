import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = SCRIPTS_DIR / "release_versions.py"
SPEC = importlib.util.spec_from_file_location("release_versions", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load release_versions module")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules["release_versions"] = MODULE
SPEC.loader.exec_module(MODULE)

compute_next_beta = MODULE.compute_next_beta
is_newest = MODULE.is_newest
parse_release_tag = MODULE.parse_release_tag
ReleaseVersionError = MODULE.ReleaseVersionError

# Real `v*` tag inventory from origin on 2026-09-27 (301 strict vX.Y.Z tags plus
# v1.1.11-rc1, v1.2.26-rc1..3, v2026.02.26-personal-desktop-e2e.1..3 and
# voice-runtime-v0.1.0/1).
FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "release_tags_origin_v_2026-09-27.txt"
REAL_TAGS = [line.strip() for line in FIXTURE_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
NON_RELEASE_TAGS = [
    "v1.1.11-rc1",
    "v1.2.26-rc1",
    "v1.2.26-rc2",
    "v1.2.26-rc3",
    "v2026.02.26-personal-desktop-e2e.1",
    "v2026.02.26-personal-desktop-e2e.2",
    "v2026.02.26-personal-desktop-e2e.3",
    "voice-runtime-v0.1.0",
    "voice-runtime-v0.1.1",
]


class RealInventoryFixtureTest(unittest.TestCase):
    def test_fixture_matches_recorded_inventory(self):
        self.assertEqual(len(REAL_TAGS), 310)
        recognized = [tag for tag in REAL_TAGS if parse_release_tag(tag) is not None]
        ignored = sorted(tag for tag in REAL_TAGS if parse_release_tag(tag) is None)
        self.assertEqual(len(recognized), 301)
        self.assertEqual(ignored, sorted(NON_RELEASE_TAGS))
        self.assertIn("v1.4.89", REAL_TAGS)


class GrammarTest(unittest.TestCase):
    def test_recognizes_only_canonical_grammar(self):
        for tag in ["v0.0.0", "v1.4.89", "v10.20.30", "v1.4.90-beta.1", "v1.4.90-beta.98"]:
            self.assertIsNotNone(parse_release_tag(tag), tag)
        for tag in [
            "1.4.89",
            "v01.4.89",
            "v1.04.89",
            "v1.4.089",
            "v1.4.90-beta.0",
            "v1.4.90-beta.01",
            "v1.4.90-beta",
            "v1.4.90-beta.1.2",
            "v1.4.90-rc.1",
            "v1.4.90-alpha.1",
            "v1.4",
            "v1.4.90.1",
            *NON_RELEASE_TAGS,
        ]:
            self.assertIsNone(parse_release_tag(tag), tag)

    def test_semver_precedence(self):
        ordered = ["v1.4.90-beta.2", "v1.4.90-beta.9", "v1.4.90-beta.10", "v1.4.90", "v1.4.91-beta.1", "v1.5.0"]
        versions = [parse_release_tag(tag) for tag in ordered]
        self.assertEqual(versions, sorted(versions))
        self.assertGreater(parse_release_tag("v1.4.90-beta.10"), parse_release_tag("v1.4.90-beta.9"))
        self.assertGreater(parse_release_tag("v1.4.90"), parse_release_tag("v1.4.90-beta.98"))


class IsNewestTest(unittest.TestCase):
    def test_real_inventory_ignores_rc_e2e_and_voice_tags(self):
        self.assertTrue(is_newest("v1.4.90-beta.1", REAL_TAGS))
        self.assertTrue(is_newest("v1.4.89", REAL_TAGS))
        self.assertFalse(is_newest("v1.4.88", REAL_TAGS))

    def test_out_of_grammar_candidate_is_false(self):
        self.assertFalse(is_newest("v1.2.26-rc1", REAL_TAGS))
        self.assertFalse(is_newest("v2026.02.26-personal-desktop-e2e.3", REAL_TAGS))
        self.assertFalse(is_newest("1.4.90", REAL_TAGS))
        self.assertFalse(is_newest("v1.4.90-rc1", REAL_TAGS + ["v1.4.90-rc1"]))

    def test_beta_ten_is_newer_than_beta_nine(self):
        tags = REAL_TAGS + ["v1.4.90-beta.9", "v1.4.90-beta.10"]
        self.assertTrue(is_newest("v1.4.90-beta.10", tags))
        self.assertFalse(is_newest("v1.4.90-beta.9", tags))

    def test_stable_is_newer_than_its_betas(self):
        tags = REAL_TAGS + ["v1.4.90-beta.1", "v1.4.90-beta.2", "v1.4.90"]
        self.assertTrue(is_newest("v1.4.90", tags))
        self.assertFalse(is_newest("v1.4.90-beta.2", tags))

    def test_concurrent_later_beta_wins(self):
        tags = REAL_TAGS + ["v1.4.90-beta.1", "v1.4.90-beta.2"]
        self.assertFalse(is_newest("v1.4.90-beta.1", tags))
        self.assertTrue(is_newest("v1.4.90-beta.2", tags))

    def test_republish_of_older_tag_does_not_move_beta(self):
        tags = REAL_TAGS + ["v1.4.90-beta.3"]
        self.assertFalse(is_newest("v1.4.80", tags))
        self.assertFalse(is_newest("v1.4.89", tags))


class NextBetaTest(unittest.TestCase):
    def test_real_inventory_defaults_to_next_patch(self):
        self.assertEqual(compute_next_beta(REAL_TAGS), "1.4.90-beta.1")

    def test_increments_existing_betas_for_base(self):
        tags = REAL_TAGS + ["v1.4.90-beta.1", "v1.4.90-beta.2"]
        self.assertEqual(compute_next_beta(tags), "1.4.90-beta.3")
        tags = REAL_TAGS + ["v1.4.90-beta.9", "v1.4.90-beta.10"]
        self.assertEqual(compute_next_beta(tags), "1.4.90-beta.11")

    def test_default_base_moves_past_new_stable(self):
        tags = REAL_TAGS + ["v1.4.90-beta.1", "v1.4.90-beta.2", "v1.4.90"]
        self.assertEqual(compute_next_beta(tags), "1.4.91-beta.1")

    def test_explicit_base(self):
        self.assertEqual(compute_next_beta(REAL_TAGS, "1.5.0"), "1.5.0-beta.1")
        tags = REAL_TAGS + ["v1.5.0-beta.4"]
        self.assertEqual(compute_next_beta(tags, "1.5.0"), "1.5.0-beta.5")

    def test_rc_tags_do_not_count_as_betas(self):
        self.assertEqual(compute_next_beta(REAL_TAGS + ["v1.4.90-rc5"], "1.4.90"), "1.4.90-beta.1")

    def test_refuses_when_stable_for_base_exists(self):
        with self.assertRaisesRegex(ReleaseVersionError, "v1.4.89 already exists"):
            compute_next_beta(REAL_TAGS, "1.4.89")

    def test_refuses_past_ninety_eight(self):
        tags = REAL_TAGS + ["v1.4.90-beta.98"]
        with self.assertRaisesRegex(ReleaseVersionError, "exceeds 98"):
            compute_next_beta(tags)
        tags = REAL_TAGS + ["v1.4.90-beta.97"]
        self.assertEqual(compute_next_beta(tags), "1.4.90-beta.98")

    def test_refuses_invalid_base(self):
        for base in ["v1.5.0", "1.5", "1.05.0", "1.5.0-beta.1", "latest"]:
            with self.assertRaisesRegex(ReleaseVersionError, "Invalid --base"):
                compute_next_beta(REAL_TAGS, base)

    def test_refuses_without_stable_tag_or_base(self):
        with self.assertRaisesRegex(ReleaseVersionError, "No stable release tag"):
            compute_next_beta(NON_RELEASE_TAGS)
        self.assertEqual(compute_next_beta(NON_RELEASE_TAGS, "1.0.0"), "1.0.0-beta.1")


class CommandLineTest(unittest.TestCase):
    def run_cli(self, *args, tags=None):
        with tempfile.TemporaryDirectory() as tmp:
            tags_file = Path(tmp) / "tags.txt"
            tags_file.write_text("\n".join(tags if tags is not None else REAL_TAGS) + "\n", encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(MODULE_PATH), *args, "--tags-file", str(tags_file)],
                capture_output=True,
                text=True,
                check=False,
            )

    def test_is_newest_prints_true_or_false_with_exit_zero(self):
        result = self.run_cli("is-newest", "v1.4.90-beta.1")
        self.assertEqual((result.returncode, result.stdout), (0, "true\n"))
        result = self.run_cli("is-newest", "v1.2.26-rc1")
        self.assertEqual((result.returncode, result.stdout), (0, "false\n"))

    def test_next_beta_prints_version(self):
        result = self.run_cli("next-beta")
        self.assertEqual((result.returncode, result.stdout), (0, "1.4.90-beta.1\n"))

    def test_next_beta_refusal_exits_non_zero_with_message(self):
        result = self.run_cli("next-beta", "--base", "1.4.89")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertIn("already exists", result.stderr)

    def test_reads_git_tags_when_no_file_given(self):
        with tempfile.TemporaryDirectory() as tmp:
            def git(*git_args):
                subprocess.run(["git", *git_args], cwd=tmp, check=True, capture_output=True)

            git("init", "-q")
            git("-c", "user.email=t@example.invalid", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init")
            for tag in ["v1.4.89", "v1.4.90-beta.1", "v2026.02.26-personal-desktop-e2e.3"]:
                git("tag", tag)
            result = subprocess.run(
                [sys.executable, str(MODULE_PATH), "next-beta"], cwd=tmp, capture_output=True, text=True, check=False
            )
            self.assertEqual((result.returncode, result.stdout), (0, "1.4.90-beta.2\n"))


if __name__ == "__main__":
    unittest.main()
