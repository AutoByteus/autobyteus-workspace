"""Release builds install from the lockfile and make a production-only server package (autobyteus-345).

Run from the repository root with:
python3 -m unittest scripts/tests/test_install_from_lockfile.py -v
Source-only: no network, no Docker daemon, no package installs. Each rule is a function over the text of the file it
guards, so the mutation tests below can show that it fails on a changed copy (REQ-002, REQ-003, REQ-005, REQ-004).

Rules:
- no install of a release build re-resolves (`--no-frozen-lockfile`, `--frozen-lockfile=false`): the Dockerfile, both
  prepare-server scripts and every `pnpm install` of the workflows. The Android Termux script (scripts/android-bootstrap-
  termux.sh) is not a release build and is left alone on purpose;
- the Docker builder copies the manifests it installs AND every workspace package they link to (the lockfile's `link:`
  versions), so a frozen install in the builder sees the whole link closure;
- every `pnpm deploy` of the server package is `--prod` (development packages stay out of the release);
- both prepare-server scripts remove the folder `pnpm deploy` mirrors under the project folder, fail instead of skipping
  when the Prisma CLI is missing (shell), and the Windows script bounds its npm install with `--before`.
"""
import os
import re
import shlex
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = REPO_ROOT / "autobyteus-server-ts/docker/Dockerfile.monorepo"
PREPARE_SH = REPO_ROOT / "autobyteus-web/scripts/prepare-server.sh"
PREPARE_MJS = REPO_ROOT / "autobyteus-web/scripts/prepare-server.mjs"
WORKFLOWS = sorted((REPO_ROOT / ".github/workflows").glob("*.yml"))
LOCKFILE = REPO_ROOT / "pnpm-lock.yaml"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


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


# ---- rules (each takes the text it guards and returns a list of problems) ----

def unfrozen_installs(text: str, name: str) -> list[str]:
    problems = []
    for number, line in enumerate(text.splitlines(), 1):
        if line.strip().startswith("#"):
            continue
        if "--no-frozen-lockfile" in line or "--frozen-lockfile=false" in line:
            problems.append(f"{name}:{number} re-resolves the lockfile: {line.strip()}")
    return problems


def workflow_installs_not_frozen(text: str, name: str) -> list[str]:
    problems = unfrozen_installs(text, name)
    for number, line in enumerate(text.splitlines(), 1):
        if re.search(r"\bpnpm\b.*\binstall\b", line) and "--frozen-lockfile" not in line and not line.strip().startswith("#"):
            problems.append(f"{name}:{number} installs without --frozen-lockfile: {line.strip()}")
    return problems


def direct_copy_sources(dockerfile: str) -> list[str]:
    sources = []
    for instruction in logical_instructions(dockerfile):
        command, _, arguments = instruction.partition(" ")
        if command.upper() != "COPY":
            continue
        tokens = shlex.split(arguments)
        from_stage = any(token == "--from" or token.startswith("--from=") for token in tokens if token.startswith("--"))
        tokens = [token for token in tokens if not token.startswith("--")]
        if not from_stage and len(tokens) >= 2:
            sources.extend(tokens[:-1])
    return sources


def copied_manifest_dirs(dockerfile: str) -> set[str]:
    """Importer folders whose package.json the Dockerfile copies before the install ('.' is the root manifest)."""
    directories = set()
    for source in direct_copy_sources(dockerfile):
        if source == "package.json":
            directories.add(".")
        elif source.endswith("/package.json"):
            directories.add(source[: -len("/package.json")])
    return directories


def lockfile_links(lockfile: str) -> dict[str, set[str]]:
    """importer folder -> importer folders it links to (`version: link:<relative path>` under `importers:`)."""
    links: dict[str, set[str]] = {}
    in_importers, importer = False, None
    for line in lockfile.splitlines():
        if line.startswith("importers:"):
            in_importers = True
            continue
        if in_importers and line and not line.startswith(" "):
            break
        if not in_importers:
            continue
        match = re.match(r"^  (\S+):\s*$", line)
        if match:
            importer = match.group(1).strip("'\"")
            links[importer] = set()
            continue
        link = re.match(r"^\s+version: link:(\S+)\s*$", line)
        if link and importer is not None:
            links[importer].add(os.path.normpath(os.path.join(importer, link.group(1))))
    return links


def missing_link_closure(dockerfile: str, lockfile: str) -> list[str]:
    copied = copied_manifest_dirs(dockerfile)
    links = lockfile_links(lockfile)
    problems = []
    for importer in sorted(copied - {"."}):
        if importer not in links:
            problems.append(f"{importer}: copied by the Dockerfile but not a lockfile importer")
            continue
        for target in sorted(links[importer] - copied):
            problems.append(f"{importer} links to {target}, whose package.json the Dockerfile does not copy")
    return problems


def deploys_without_prod(text: str, name: str, pattern: str) -> list[str]:
    problems = []
    lines = [line for line in text.splitlines() if re.search(pattern, line) and not line.strip().startswith(("#", "//"))]
    if not lines:
        problems.append(f"{name}: no deploy of the server package found")
    for line in lines:
        if "--prod" not in line:
            problems.append(f"{name}: deploy without --prod: {line.strip()}")
    return problems


# ---- the tests ----

class InstallFromLockfileTest(unittest.TestCase):
    def test_no_release_install_resolves_again(self) -> None:
        for path in (DOCKERFILE, PREPARE_SH, PREPARE_MJS):
            with self.subTest(file=path.name):
                self.assertEqual(unfrozen_installs(read(path), path.name), [])
        for path in WORKFLOWS:
            with self.subTest(workflow=path.name):
                self.assertEqual(workflow_installs_not_frozen(read(path), path.name), [])
        self.assertEqual(sum(1 for line in read(REPO_ROOT / ".github/workflows/release-desktop.yml").splitlines()
                             if "pnpm install --frozen-lockfile" in line), 5)

    def test_the_docker_builder_installs_frozen_with_the_whole_link_closure(self) -> None:
        text = read(DOCKERFILE)
        self.assertIn("RUN pnpm install --frozen-lockfile", set(logical_instructions(text)))
        self.assertEqual(missing_link_closure(text, read(LOCKFILE)), [])
        # The importers the server needs are really in the copied set.
        self.assertTrue({"autobyteus-server-ts", "autobyteus-ts", "autobyteus-application-backend-sdk"} <= copied_manifest_dirs(text))

    def test_the_closure_check_fails_when_a_linked_manifest_is_not_copied(self) -> None:
        text = read(DOCKERFILE)
        mutated = "\n".join(line for line in text.splitlines()
                            if not line.startswith("COPY autobyteus-application-backend-sdk/package.json")) + "\n"
        self.assertNotEqual(mutated, text)
        problems = missing_link_closure(mutated, read(LOCKFILE))
        self.assertTrue(any("autobyteus-application-backend-sdk" in problem for problem in problems), problems)

    def test_the_source_checks_fail_on_a_returned_unfrozen_install(self) -> None:
        for mutation in ("pnpm install --no-frozen-lockfile", "pnpm install --frozen-lockfile=false"):
            self.assertTrue(unfrozen_installs(f"RUN {mutation}\n", "Dockerfile"))
        self.assertTrue(workflow_installs_not_frozen("        run: pnpm install\n", "w.yml"))
        self.assertEqual(workflow_installs_not_frozen("        run: pnpm install --frozen-lockfile\n", "w.yml"), [])

    def test_the_server_package_is_deployed_production_only(self) -> None:
        self.assertEqual(deploys_without_prod(read(DOCKERFILE), "Dockerfile", r"pnpm .*--filter autobyteus-server-ts deploy"), [])
        self.assertEqual(deploys_without_prod(read(PREPARE_SH), "prepare-server.sh", r"\bdeploy\b.*--legacy"), [])
        self.assertEqual(deploys_without_prod(read(PREPARE_MJS), "prepare-server.mjs", r"'deploy'"), [])
        self.assertTrue(deploys_without_prod("RUN pnpm --filter autobyteus-server-ts deploy /out --legacy\n", "x",
                                             r"pnpm .*--filter autobyteus-server-ts deploy"))

    def test_both_prepare_scripts_remove_the_folder_pnpm_deploy_mirrors(self) -> None:
        self.assertIn('rm -rf "${SERVER_REPO_DIR}/autobyteus-web"', read(PREPARE_SH))
        self.assertRegex(read(PREPARE_MJS), r"rm\(path\.join\(serverSourceRoot, 'autobyteus-web'\)")
        # and it is removed after the deploy, not before it
        sh = read(PREPARE_SH)
        self.assertLess(sh.index("--legacy --prod"), sh.index('rm -rf "${SERVER_REPO_DIR}/autobyteus-web"'))

    def test_the_shell_script_fails_when_the_prisma_cli_is_missing(self) -> None:
        sh = read(PREPARE_SH)
        self.assertNotIn("skipping generate", sh)
        self.assertRegex(sh, r'Prisma CLI not found[^\n]*\n\s*exit 1')

    def test_the_windows_staging_install_is_bounded_and_not_pruned(self) -> None:
        mjs = read(PREPARE_MJS)
        self.assertIn("resolveNpmBefore", mjs)
        self.assertRegex(mjs, r"'install', '--no-audit', '--no-fund', `--before=\$\{npmBefore\}`")
        self.assertNotIn("'prune'", mjs)
        self.assertNotIn("sourceManifest.devDependencies", mjs)


if __name__ == "__main__":
    unittest.main()
