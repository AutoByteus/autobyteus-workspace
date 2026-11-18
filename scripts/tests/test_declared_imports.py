"""Imports are declared where they are imported (autobyteus-345, REQ-008, AC-010).

Run from the repository root with:
python3 -m unittest scripts/tests/test_declared_imports.py -v
Runs scripts/check-declared-imports.mjs (node only: no network, no installs) on the real packages and on disposable fixture
packages that show each way it must fail.
"""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CHECK = REPO_ROOT / "scripts/check-declared-imports.mjs"


def run_check(root: Path, *packages: str) -> subprocess.CompletedProcess:
    return subprocess.run(["node", str(CHECK), "--root", str(root), *packages], capture_output=True, text=True)


def write(root: Path, relative: str, text: str) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def fixture_package(root: Path, folder: str, manifest: dict, files: dict[str, str]) -> None:
    write(root, f"{folder}/package.json", json.dumps({"name": folder, **manifest}))
    for relative, text in files.items():
        write(root, f"{folder}/{relative}", text)


class DeclaredImportsTest(unittest.TestCase):
    def test_the_repository_packages_declare_what_they_import(self) -> None:
        result = run_check(REPO_ROOT, "autobyteus-server-ts", "autobyteus-web")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_an_import_nothing_declares_fails_and_names_the_package(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture_package(root, "autobyteus-web", {"dependencies": {"declared": "1"}},
                            {"components/A.vue": "<script setup>\nimport { ref } from 'vue'\nimport d from 'declared'\n</script>\n"})
            result = run_check(root, "autobyteus-web")
            self.assertEqual(result.returncode, 1)
            self.assertIn("vue is imported but not declared", result.stderr)
            self.assertNotIn("declared is imported", result.stderr)

    def test_server_runtime_code_may_not_import_a_development_dependency(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = {"dependencies": {"fastify": "1"}, "devDependencies": {"ws": "1", "vitest": "1"}}
            fixture_package(root, "autobyteus-server-ts", manifest, {
                "src/server.ts": "import Fastify from 'fastify'\nimport WebSocket from 'ws'\n",
                "tests/server.test.ts": "import { it } from 'vitest'\nimport WebSocket from 'ws'\n",
            })
            result = run_check(root, "autobyteus-server-ts")
            self.assertEqual(result.returncode, 1)
            self.assertIn("src/server.ts: ws is a development dependency but runtime code imports it", result.stderr)
            self.assertNotIn("tests/server.test.ts", result.stderr)

    def test_development_dependencies_are_fine_in_tests_scripts_and_type_only_imports(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = {"dependencies": {"fastify": "1"}, "devDependencies": {"ws": "1", "@types/node": "1", "vitest": "1"}}
            fixture_package(root, "autobyteus-server-ts", manifest, {
                "src/types.ts": "import type { WebSocket } from 'ws'\nimport { type A, type B } from 'ws'\nexport type { C } from 'ws'\n",
                "src/a.test.ts": "import { it } from 'vitest'\n",
                "src/__tests__/b.ts": "import ws from 'ws'\n",
                "scripts/tool.mjs": "import ws from 'ws'\n",
                "tests/x.test.ts": "import { it } from 'vitest'\nvi.mock('ws')\n",
            })
            result = run_check(root, "autobyteus-server-ts")
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_a_value_import_beside_a_type_import_is_still_a_runtime_import(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture_package(root, "autobyteus-server-ts", {"dependencies": {}, "devDependencies": {"ws": "1"}},
                            {"src/mixed.ts": "import WebSocket, { type Data } from 'ws'\n"})
            self.assertEqual(run_check(root, "autobyteus-server-ts").returncode, 1)

    def test_builtins_relative_paths_the_package_itself_and_text_in_strings_are_not_imports(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture_package(root, "autobyteus-server-ts", {"dependencies": {}}, {
                "src/a.ts": "import fs from 'node:fs'\nimport path from 'path'\nimport b from './b.js'\nimport self from 'autobyteus-server-ts/x'\n",
                "src/b.ts": "const text = \"import 'not-a-package'\"\n// import 'in-a-comment'\nrequire.resolve('x')\nsomething.require('y')\n",
            })
            result = run_check(root, "autobyteus-server-ts")
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_without_arguments_it_explains_its_usage(self) -> None:
        result = subprocess.run(["node", str(CHECK)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("Usage", result.stderr)


if __name__ == "__main__":
    unittest.main()
