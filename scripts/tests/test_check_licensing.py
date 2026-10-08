import contextlib
import hashlib
import importlib.util
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = SCRIPTS_DIR / "check_licensing.py"
SPEC = importlib.util.spec_from_file_location("check_licensing", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load check_licensing module")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules["check_licensing"] = MODULE
SPEC.loader.exec_module(MODULE)

# Fake licence texts whose hashes are patched in as the "official" ones, so the
# fixture repos stay small and the real texts are not duplicated in this test.
FAKE_AGPL = b"fake agpl text\n"
FAKE_APACHE = b"fake permissive text\n"


class CheckLicensingTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self._saved_hashes = (MODULE.AGPL_SHA256, MODULE.APACHE_SHA256)
        MODULE.AGPL_SHA256 = hashlib.sha256(FAKE_AGPL).hexdigest()
        MODULE.APACHE_SHA256 = hashlib.sha256(FAKE_APACHE).hexdigest()
        self._build_consistent_repo()

    def tearDown(self) -> None:
        MODULE.AGPL_SHA256, MODULE.APACHE_SHA256 = self._saved_hashes
        self._tmp.cleanup()

    # -- fixture helpers -------------------------------------------------

    def write(self, path: str, content: "bytes | str") -> None:
        full_path = self.root / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, str):
            content = content.encode("utf-8")
        full_path.write_bytes(content)

    def write_manifest(self, path: str, license_value: "str | None") -> None:
        manifest = {"name": path}
        if license_value is not None:
            manifest["license"] = license_value
        self.write(path, json.dumps(manifest, indent=2) + "\n")

    def git(self, *args: str) -> None:
        subprocess.run(["git", *args], cwd=self.root, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def stage_all(self) -> None:
        self.git("add", "-A")

    def _build_consistent_repo(self) -> None:
        self.git("init", "-q")
        for directory in MODULE.AGPL_LICENSE_DIRS:
            self.write(MODULE.license_path(directory), FAKE_AGPL)
            self.write_manifest(f"{directory}/package.json" if directory else "package.json", "AGPL-3.0-only")
        for component in MODULE.APACHE_COMPONENTS:
            self.write(f"{component}/LICENSE", FAKE_APACHE)
            self.write_manifest(f"{component}/package.json", "Apache-2.0")
            self.write(f"{component}/README.md", "Licensed under the Apache License 2.0.\n")
        self.write(
            "LICENSING.md",
            "AGPL-3.0-only, except Apache-2.0 components:\n"
            + "".join(f"- {component}\n" for component in MODULE.APACHE_COMPONENTS),
        )
        self.write("NOTICE", "Some packages are licensed under the Apache License 2.0.\n")
        self.write("README.md", "Releases up to v1.4.97 remain Apache-2.0.\n")
        self.write("autobyteus-ts/src/index.ts", "export const answer = 42;\n")
        self.stage_all()

    def check(self) -> "tuple[int, list[str], str]":
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exit_code = MODULE.main(["--root", str(self.root)])
        _, groups = MODULE.collect_violations(self.root)
        return exit_code, [group.title for group in groups], output.getvalue()

    def violation_paths(self) -> "list[str]":
        _, groups = MODULE.collect_violations(self.root)
        return [path for group in groups for path in group.paths]

    # -- cases -----------------------------------------------------------

    def test_consistent_tree_passes(self) -> None:
        exit_code, titles, output = self.check()
        self.assertEqual(exit_code, 0, output)
        self.assertEqual(titles, [])
        self.assertIn("Licensing is consistent.", output)

    def test_wrong_agpl_license_text_fails(self) -> None:
        self.write("autobyteus-server-ts/LICENSE", FAKE_AGPL + b"extra line\n")
        self.stage_all()
        exit_code, titles, output = self.check()
        self.assertEqual(exit_code, 1)
        self.assertEqual(titles, ["LICENSE files that are not the verbatim official GNU AGPL v3 text"])
        self.assertIn("autobyteus-server-ts/LICENSE (text differs)", output)

    def test_missing_apache_license_fails(self) -> None:
        self.git("rm", "-q", "-f", "autobyteus-application-devkit/LICENSE")
        exit_code, titles, output = self.check()
        self.assertEqual(exit_code, 1)
        self.assertEqual(titles, ["LICENSE files that are not the verbatim official Apache License 2.0 text"])
        self.assertIn("autobyteus-application-devkit/LICENSE (missing)", output)

    def test_wrong_and_missing_manifest_license_fail(self) -> None:
        self.write_manifest("autobyteus-ts/package.json", "MIT")
        self.write_manifest("autobyteus-web/modules/electron/package.json", None)
        self.write_manifest("applications/brief-studio/package.json", "AGPL-3.0-only")
        self.stage_all()
        exit_code, titles, _ = self.check()
        self.assertEqual(exit_code, 1)
        self.assertEqual(titles, ["package.json files with the wrong license field"])
        self.assertEqual(
            sorted(self.violation_paths()),
            [
                'applications/brief-studio/package.json (license "AGPL-3.0-only"; expected Apache-2.0)',
                'autobyteus-ts/package.json (license "MIT"; expected AGPL-3.0-only)',
                "autobyteus-web/modules/electron/package.json (license missing; expected AGPL-3.0-only)",
            ],
        )

    def test_devkit_template_manifest_is_ignored(self) -> None:
        self.write_manifest("autobyteus-application-devkit/templates/basic/package.json", None)
        self.stage_all()
        exit_code, _, output = self.check()
        self.assertEqual(exit_code, 0, output)

    def test_ticket_paths_are_ignored(self) -> None:
        self.write("tickets/done/old/notes.md", "This repository is licensed under the Apache License 2.0.\n")
        self.write_manifest("autobyteus-server-ts/tickets/old/package.json", None)
        self.stage_all()
        exit_code, _, output = self.check()
        self.assertEqual(exit_code, 0, output)

    def test_stray_claim_in_agpl_file_fails(self) -> None:
        self.write("autobyteus-ts/README.md", "This package is licensed under the Apache License.\n")
        self.write("docs/guide.md", "SPDX: Apache-2.0\n")
        self.stage_all()
        exit_code, titles, output = self.check()
        self.assertEqual(exit_code, 1)
        self.assertEqual(titles, ["Stray Apache-2.0 claim in AGPL component files"])
        self.assertEqual(sorted(self.violation_paths()), ["autobyteus-ts/README.md", "docs/guide.md"])
        self.assertIn("  autobyteus-ts/README.md", output)

    def test_allowlisted_files_are_not_flagged(self) -> None:
        self.write("autobyteus-android/gradlew", "#   https://www.apache.org/licenses/LICENSE-2.0\n")
        self.write("autobyteus-web/public/THIRD_PARTY_NOTICES/lib.txt", "Apache License Version 2.0\n")
        self.stage_all()
        exit_code, _, output = self.check()
        self.assertEqual(exit_code, 0, output)

    def test_binary_file_is_skipped(self) -> None:
        self.write("autobyteus-web/assets/image.bin", b"\x89PNG\0\0Apache License\0")
        self.stage_all()
        exit_code, _, output = self.check()
        self.assertEqual(exit_code, 0, output)

    def test_untracked_file_is_ignored(self) -> None:
        self.write("autobyteus-ts/scratch.md", "Apache License\n")
        exit_code, _, output = self.check()
        self.assertEqual(exit_code, 0, output)

    def test_apache_component_missing_from_licensing_doc_fails(self) -> None:
        text = (self.root / "LICENSING.md").read_text(encoding="utf-8")
        self.write("LICENSING.md", text.replace("- autobyteus-team-stream-contracts\n", ""))
        self.stage_all()
        exit_code, titles, output = self.check()
        self.assertEqual(exit_code, 1)
        self.assertEqual(titles, ["Apache-2.0 components not named in LICENSING.md"])
        self.assertIn("  autobyteus-team-stream-contracts", output)


class RealTreeTest(unittest.TestCase):
    def test_current_repository_is_consistent(self) -> None:
        repo_root = SCRIPTS_DIR.parent
        if not (repo_root / ".git").exists():
            self.skipTest("not running inside the git checkout")
        scanned, groups = MODULE.collect_violations(repo_root)
        self.assertGreater(scanned, 0)
        self.assertEqual([(group.title, group.paths) for group in groups], [])


if __name__ == "__main__":
    unittest.main()
