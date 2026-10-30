"""Source-only monorepo packaging and retirement regressions.

Run from the repository root with:
python3 -m unittest scripts/tests/test_docker_build_context_sources.py -v
No Docker daemon, downloads, provider keys or user state are used. Git ignore
and mutation checks use disposable fixtures; these do not certify an image.
"""
import glob
import json
import os
import shlex
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PRIMARY_DOCKERFILE = REPO_ROOT / "autobyteus-server-ts" / "docker" / "Dockerfile.monorepo"
SUPPORTED_DOCKERFILES = (PRIMARY_DOCKERFILE,)
SERVER_DOCKER_DIR = Path("autobyteus-server-ts/docker")
# Intentional absence expectations, not supported commands or build inputs.
RETIRED_ASSETS = (
    "autobyteus-server-ts/docker/bootstrap.sh",
    "docker/.gitignore",
    "docker/Dockerfile.allinone",
    "docker/Dockerfile.remote-server",
    "docker/README.md",
    "docker/allinone-start-server.sh",
    "docker/allinone-start-web.sh",
    "docker/compose.personal-test.yml",
    "docker/remote-server-entrypoint.sh",
    "docker/supervisor-allinone.conf",
    "scripts/personal-docker.sh",
    "scripts/seed-personal-test-fixtures.py",
)
ENTRYPOINT_EXPECTATIONS = {
    SERVER_DOCKER_DIR / "build.sh": (
        'MONOREPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"',
        'DOCKERFILE_PATH="${SCRIPT_DIR}/Dockerfile.monorepo"',
        '-f "${DOCKERFILE_PATH}"',
        '"${MONOREPO_ROOT}"',
    ),
    SERVER_DOCKER_DIR / "build-multi-arch.sh": (
        'MONOREPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"',
        'DOCKERFILE_PATH="${MONOREPO_ROOT}/autobyteus-server-ts/docker/Dockerfile.monorepo"',
        '-f "${DOCKERFILE_PATH}"',
        '"${MONOREPO_ROOT}"',
    ),
    SERVER_DOCKER_DIR / "docker-start.sh": (
        'COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"',
        '"${SCRIPT_DIR}/build.sh"',
    ),
    SERVER_DOCKER_DIR / "docker-compose.yml": (
        "context: ../..",
        "dockerfile: autobyteus-server-ts/docker/Dockerfile.monorepo",
    ),
    Path(".github/workflows/release-server-docker.yml"): (
        "context: .",
        "file: autobyteus-server-ts/docker/Dockerfile.monorepo",
    ),
}


class DockerBuildContextSourcesTest(unittest.TestCase):
    def test_direct_copy_sources_exist_in_repository_root_context(self) -> None:
        for dockerfile in SUPPORTED_DOCKERFILES:
            direct_sources = list(direct_copy_sources(dockerfile))
            self.assertTrue(direct_sources, f"{dockerfile} has no direct COPY sources")

            for source in direct_sources:
                with self.subTest(dockerfile=dockerfile.relative_to(REPO_ROOT), source=source):
                    matches = glob.glob(str(REPO_ROOT / source), recursive=True)
                    self.assertTrue(
                        matches,
                        f"{dockerfile.relative_to(REPO_ROOT)} copies missing repository-root source {source!r}",
                    )

    def test_workspace_contracts_are_built_and_materialized_in_monorepo(self) -> None:
        server_manifest = json.loads(
            (REPO_ROOT / "autobyteus-server-ts/package.json").read_text(encoding="utf-8")
        )
        instructions = set(logical_instructions(PRIMARY_DOCKERFILE.read_text(encoding="utf-8")))
        for contract in ("agent-presentation", "collaboration-stream", "team-stream"):
            package = f"autobyteus-{contract}-contracts"
            with self.subTest(package=package):
                self.assertEqual(server_manifest["dependencies"][f"@autobyteus/{contract}-contracts"], "workspace:*")
                expected = (
                    f"COPY {package}/package.json {package}/tsconfig.build.json {package}/tsconfig.json ./{package}/",
                    f"COPY {package} ./{package}",
                    f"RUN pnpm -C {package} build",
                )
                for instruction in expected:
                    self.assertIn(instruction, instructions)
        # The deployed server package carries the built contracts into the image.
        self.assertTrue(any(i.startswith("RUN pnpm --filter autobyteus-server-ts deploy /out/server-package --legacy")
                            for i in instructions))
        self.assertIn("COPY --from=builder /out/server-package /", instructions)
        self.assertIn("COPY --from=server-package / /opt/autobyteus/server-package", instructions)

    def assert_retired_assets_absent(self, root: Path) -> None:
        for asset in RETIRED_ASSETS:
            # lexists also catches a reintroduced dangling compatibility symlink.
            self.assertFalse(os.path.lexists(root / asset), f"Retired asset reintroduced: {asset}")

    def test_retired_assets_are_absent(self) -> None:
        self.assert_retired_assets_absent(REPO_ROOT)

    def assert_retained_entrypaths(self, root: Path) -> None:
        required = (
            SERVER_DOCKER_DIR / "Dockerfile.monorepo",
            Path("scripts/public/docker/autobyteus-docker.sh"),
            Path("scripts/public/docker/autobyteus-docker.ps1"),
            *ENTRYPOINT_EXPECTATIONS,
        )
        for path in required:
            self.assertTrue((root / path).is_file(), f"Missing retained entrypath: {path}")
        for path, expected in ENTRYPOINT_EXPECTATIONS.items():
            text = (root / path).read_text(encoding="utf-8")
            for fragment in expected:
                self.assertIn(fragment, text, f"Broken retained entrypath: {path}: {fragment}")
        workflow = (root / ".github/workflows/release-server-docker.yml").read_text(encoding="utf-8")
        self.assertEqual(workflow.count("file: autobyteus-server-ts/docker/Dockerfile.monorepo"), 2)
        self.assertEqual(workflow.count("context: .\n"), 2)

    def test_retained_entrypaths_use_monorepo_root_context(self) -> None:
        self.assert_retained_entrypaths(REPO_ROOT)

    def test_current_guides_keep_supported_paths_and_no_retired_instructions(self) -> None:
        docs = (Path("README.md"), Path("autobyteus-server-ts/README.md"), SERVER_DOCKER_DIR / "README.md")
        for doc in docs:
            text = (REPO_ROOT / doc).read_text(encoding="utf-8")
            for asset in RETIRED_ASSETS:
                if asset in ("docker/.gitignore", "docker/README.md"):
                    continue  # Package-relative guide/ignore names are not retired root references.
                self.assertNotIn(Path(asset).name, text, f"Retired instruction in {doc}: {asset}")
        root_readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
        self.assertNotIn("(docker/README.md)", root_readme)
        self.assertIn("(autobyteus-server-ts/docker/README.md)", root_readme)
        self.assertIn("./docker-start.sh up --build-local", root_readme)
        self.assertIn("./docker-start.sh up --pull-remote", root_readme)
        server_readme = (REPO_ROOT / "autobyteus-server-ts/README.md").read_text(encoding="utf-8")
        self.assertIn("(docker/README.md)", server_readme)
        self.assertTrue((REPO_ROOT / "autobyteus-server-ts" / "docker/README.md").is_file())

    def assert_saved_state_exclusions(self, root: Path) -> None:
        for filename, rule in ((".gitignore", "docker/.runtime/"), (".dockerignore", "docker/.runtime")):
            lines = (root / filename).read_text(encoding="utf-8").splitlines()
            self.assertIn(rule, lines, f"Missing saved-state exclusion: {filename}: {rule}")

    def test_saved_state_exclusions_remain_effective(self) -> None:
        self.assert_saved_state_exclusions(REPO_ROOT)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(REPO_ROOT / ".gitignore", root / ".gitignore")
            env = {"PATH": os.defpath, "HOME": directory, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull}
            subprocess.run(["git", "init", "-q", directory], check=True, env=env, capture_output=True)
            result = subprocess.run(
                ["git", "-c", f"core.excludesFile={os.devnull}", "check-ignore", "-v", "--no-index", "docker/.runtime/fixture.env"],
                cwd=root, env=env, capture_output=True, text=True, check=True,
            )
            self.assertRegex(result.stdout, r"^\.gitignore:\d+:docker/\.runtime/\tdocker/\.runtime/fixture\.env\n$")

    def test_retirement_guard_rejects_reintroduced_asset_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assert_retired_assets_absent(root)
            for asset in RETIRED_ASSETS:
                path = root / asset
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("reintroduced fixture", encoding="utf-8")
                with self.assertRaisesRegex(AssertionError, f"Retired asset reintroduced: {asset}"):
                    self.assert_retired_assets_absent(root)
                path.unlink()

    def test_entrypath_guard_rejects_broken_build_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            paths = (*ENTRYPOINT_EXPECTATIONS, SERVER_DOCKER_DIR / "Dockerfile.monorepo",
                     Path("scripts/public/docker/autobyteus-docker.sh"), Path("scripts/public/docker/autobyteus-docker.ps1"))
            for path in paths:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(REPO_ROOT / path, target)
            self.assert_retained_entrypaths(root)
            build = root / SERVER_DOCKER_DIR / "build.sh"
            build.write_text(build.read_text(encoding="utf-8").replace("Dockerfile.monorepo", "Dockerfile.missing"), encoding="utf-8")
            with self.assertRaisesRegex(AssertionError, "Broken retained entrypath: autobyteus-server-ts/docker/build.sh"):
                self.assert_retained_entrypaths(root)

    def test_ignore_guard_rejects_saved_state_protection_loss_fixtures(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for filename in (".gitignore", ".dockerignore"):
                shutil.copyfile(REPO_ROOT / filename, root / filename)
            self.assert_saved_state_exclusions(root)
            for filename, rule in ((".gitignore", "docker/.runtime/"), (".dockerignore", "docker/.runtime")):
                path = root / filename
                original = path.read_text(encoding="utf-8")
                path.write_text(original.replace(rule + "\n", ""), encoding="utf-8")
                with self.assertRaisesRegex(AssertionError, f"Missing saved-state exclusion: {filename}"):
                    self.assert_saved_state_exclusions(root)
                path.write_text(original, encoding="utf-8")


def direct_copy_sources(dockerfile: Path):
    for instruction in logical_instructions(dockerfile.read_text(encoding="utf-8")):
        command, separator, arguments = instruction.partition(" ")
        if not separator or command.upper() != "COPY":
            continue

        tokens = copy_tokens(arguments)
        from_stage = False
        while tokens and tokens[0].startswith("--"):
            flag = tokens.pop(0)
            from_stage = from_stage or flag == "--from" or flag.startswith("--from=")
            if flag in {"--from", "--chown", "--chmod", "--exclude"}:
                if not tokens:
                    raise AssertionError(f"{dockerfile}: COPY flag {flag!r} has no value")
                tokens.pop(0)

        if from_stage:
            continue
        if len(tokens) < 2:
            raise AssertionError(f"{dockerfile}: COPY must declare a source and destination: {instruction!r}")

        yield from tokens[:-1]


def logical_instructions(dockerfile: str):
    pending = ""
    for raw_line in dockerfile.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        pending = f"{pending} {stripped}".strip()
        if pending.endswith("\\"):
            pending = pending[:-1].rstrip()
            continue

        yield pending
        pending = ""

    if pending:
        yield pending


def copy_tokens(arguments: str) -> list[str]:
    arguments = arguments.strip()
    if arguments.startswith("["):
        tokens = json.loads(arguments)
        if not isinstance(tokens, list) or not all(isinstance(token, str) for token in tokens):
            raise AssertionError(f"COPY JSON form must be an array of strings: {arguments!r}")
        return tokens
    return shlex.split(arguments)


if __name__ == "__main__":
    unittest.main()
