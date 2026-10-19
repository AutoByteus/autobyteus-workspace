import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = SCRIPTS_DIR / "check_repository_artifact_hygiene.py"
SPEC = importlib.util.spec_from_file_location("check_repository_artifact_hygiene", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load check_repository_artifact_hygiene module")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules["check_repository_artifact_hygiene"] = MODULE
SPEC.loader.exec_module(MODULE)

WINDOWS_TITLE = "Tracked paths that Windows cannot check out"


class WindowsInvalidPathTest(unittest.TestCase):
    def test_rejects_names_windows_checkout_cannot_create(self) -> None:
        invalid = [
            # The v1.5.2-beta.1 Windows desktop build failed at checkout on this name.
            "tickets/done/t/api-e2e-evidence/logs/web-audit:localization-literals.log",
            "docs/what?.md",
            'docs/say "hi".md',
            "docs/a|b.md",
            "docs/a*b.md",
            "docs/a<b>.md",
            "docs/back\\slash.md",
            "docs/tab\tname.md",
            "docs/trailing-dot./file.md",
            "docs/trailing-space /file.md",
            "docs/CON",
            "docs/nul.txt",
            "docs/Com1.log",
            "docs/lpt9/file.md",
        ]
        for path in invalid:
            with self.subTest(path=path):
                self.assertTrue(MODULE.is_windows_invalid_path(path))

    def test_accepts_ordinary_names(self) -> None:
        valid = [
            "tickets/done/t/api-e2e-evidence/logs/web-audit-localization-literals.log",
            "autobyteus-web/.gitignore",
            "docs/console.md",
            "docs/nullable.ts",
            "docs/com10.log",
            "docs/lpt0.log",
            "docs/v1.5.2-beta.1/notes.md",
        ]
        for path in valid:
            with self.subTest(path=path):
                self.assertFalse(MODULE.is_windows_invalid_path(path))

    def test_collect_violations_reports_a_windows_group(self) -> None:
        groups = MODULE.collect_violations(
            ["ok/file.md", "bad/name:with-colon.log"], max_path_length=200
        )
        self.assertEqual([group.title for group in groups], [WINDOWS_TITLE])
        self.assertEqual(groups[0].paths, ["bad/name:with-colon.log"])

    def test_collect_violations_passes_clean_paths(self) -> None:
        self.assertEqual(MODULE.collect_violations(["ok/file.md"], max_path_length=200), [])


if __name__ == "__main__":
    unittest.main()
