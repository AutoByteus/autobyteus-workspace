#!/usr/bin/env python3
"""Fail when generated or checkout-hostile artifacts are tracked in git, or when tracked code imports an untracked file."""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from dataclasses import dataclass

DEFAULT_MAX_PATH_LENGTH = 200
MAX_SAMPLES_PER_GROUP = 12
GITHUB_ARTIFACT_DIR_RE = re.compile(r"^github-run-\d+-artifacts$")
# Windows checkout rejects these characters, control characters, a trailing dot or
# space, and reserved device names (with or without an extension) in any component.
WINDOWS_INVALID_CHARS_RE = re.compile(r'[<>:"|?*\\\x00-\x1f]')
WINDOWS_RESERVED_NAME_RE = re.compile(r"^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$", re.IGNORECASE)

# Tracked-import check (autobyteus-282): code whose relative imports must resolve to tracked files. An ignore rule
# can hide a source file from `git add` while it stays on the developer's disk, so the build works there and fails
# in a clean checkout; resolving against `git ls-files` catches that in any checkout.
TRACKED_IMPORT_ROOTS = ("autobyteus-server-ts/src/", "autobyteus-server-ts/tests/", "autobyteus-ts/src/", "autobyteus-web/")
TRACKED_IMPORT_SUFFIXES = (".ts", ".mts", ".vue")
# Build output: neither scanned nor required to be tracked (tests import it after building).
MODULE_EXTENSIONS = frozenset({".js", ".mjs", ".cjs", ".ts", ".mts", ".tsx", ".vue", ".json", ".css", ".scss", ".svg", ".png"})
BUILD_OUTPUT_PARTS = frozenset({"node_modules", "dist", ".nuxt", ".output", "electron-dist"})
# Test folders the server's vitest config excludes: their source was deleted (`src/prompt-engineering/`, 2026-03-06),
# so they import files that no longer exist. Follow-up autobyteus-282 FU-001 removes them.
EXCLUDED_DEAD_TEST_DIRS = (
    "autobyteus-server-ts/tests/unit/prompt-engineering/",
    "autobyteus-server-ts/tests/unit/agent-tools/prompt-engineering/",
    "autobyteus-server-ts/tests/integration/prompt-engineering/",
)
# Files whose import-like strings are fixture text, not imports of this repository.
TRACKED_IMPORT_FIXTURE_FILES = {
    "autobyteus-server-ts/tests/architecture/app-data-migration-boundaries.test.ts":
        "writes a synthetic source tree to a temporary folder and checks its imports",
    "autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts":
        "writes synthetic projects to temporary folders and checks their imports",
}
STATIC_IMPORT_RE = re.compile(
    r"""^[ \t]*(?:import|export)\b[^;'"`]*?\bfrom\s*(['"])(\.{1,2}/[^'"\n]+)\1"""
    r"""|^[ \t]*import\s*(['"])(\.{1,2}/[^'"\n]+)\3""",
    re.MULTILINE,
)
DYNAMIC_IMPORT_RE = re.compile(r"""\bimport\(\s*(['"])(\.{1,2}/[^'"\n]+)\1\s*\)""")


@dataclass(frozen=True)
class ViolationGroup:
    title: str
    action: str
    paths: list[str]


def run_git_ls_files() -> list[str]:
    completed = subprocess.run(
        ["git", "ls-files", "-z"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="replace").strip()
        print(f"error: git ls-files failed: {stderr}", file=sys.stderr)
        raise SystemExit(completed.returncode)
    raw_paths = completed.stdout.decode("utf-8", errors="surrogateescape").split("\0")
    return [path for path in raw_paths if path]


def has_xcresult_component(path: str) -> bool:
    return any(part.endswith(".xcresult") for part in path.split("/"))


def is_generated_ticket_zip(path: str) -> bool:
    if not path.endswith(".zip"):
        return False
    parts = path.split("/")
    if not parts or parts[0] != "tickets":
        return False
    return any(GITHUB_ARTIFACT_DIR_RE.match(part) for part in parts)


def is_windows_invalid_path(path: str) -> bool:
    for part in path.split("/"):
        if WINDOWS_INVALID_CHARS_RE.search(part):
            return True
        if part.endswith((".", " ")):
            return True
        if WINDOWS_RESERVED_NAME_RE.match(part):
            return True
    return False


def import_specifiers(text: str) -> list[str]:
    """Relative specifiers of the static imports and re-exports, side-effect imports, and dynamic imports in `text`."""
    specifiers = [match.group(2) or match.group(4) for match in STATIC_IMPORT_RE.finditer(text)]
    specifiers += [match.group(2) for match in DYNAMIC_IMPORT_RE.finditer(text)]
    return specifiers


def import_candidates(target: str) -> list[str]:
    """The files a relative import of `target` (already joined and normalized) may name, as TypeScript and Vite resolve it."""
    candidates = [target]
    stem, extension = os.path.splitext(target)
    if extension == ".js":
        candidates += [f"{stem}.ts", f"{stem}.mts", f"{stem}.tsx", f"{stem}.vue"]
    elif extension == ".mjs":
        candidates.append(f"{stem}.mts")
    elif extension not in MODULE_EXTENSIONS:
        # No extension, or a dotted name such as `./common.generated` or `../feature-flags.global`.
        candidates += [f"{target}{suffix}" for suffix in (".ts", ".mts", ".tsx", ".vue", ".js", ".mjs", ".json")]
        candidates += [f"{target}/index.ts", f"{target}/index.js"]
    return candidates


def is_build_output(path: str) -> bool:
    return any(part in BUILD_OUTPUT_PARTS for part in path.split("/"))


def collect_untracked_imports(paths: list[str], read_text=None) -> list[str]:
    """`importer -> target` for every relative import in tracked code that resolves to no tracked file."""
    read = read_text or (lambda path: open(path, encoding="utf-8", errors="replace").read())
    tracked = set(paths)
    tracked_dirs = {path.rsplit("/", 1)[0] for path in paths if "/" in path}
    found: list[str] = []
    for importer in paths:
        if not importer.startswith(TRACKED_IMPORT_ROOTS) or not importer.endswith(TRACKED_IMPORT_SUFFIXES):
            continue
        if is_build_output(importer) or importer in TRACKED_IMPORT_FIXTURE_FILES or importer.startswith(EXCLUDED_DEAD_TEST_DIRS):
            continue
        try:
            text = read(importer)
        except OSError:
            continue
        base = importer.rsplit("/", 1)[0] if "/" in importer else ""
        for specifier in import_specifiers(text):
            target = os.path.normpath(os.path.join(base, specifier)).replace(os.sep, "/")
            if target.startswith("../") or is_build_output(target) or target in tracked_dirs:
                continue
            if not any(candidate in tracked for candidate in import_candidates(target)):
                found.append(f"{importer} -> {specifier}")
    return sorted(set(found))


def tracked_import_group(paths: list[str]) -> list[ViolationGroup]:
    untracked = collect_untracked_imports(paths)
    if not untracked:
        return []
    return [
        ViolationGroup(
            title="Tracked code importing files that are not tracked",
            action=(
                "Add the imported file to git (check `git check-ignore -v <file>`: an ignore rule may hide it), "
                "or fix the import. A clean checkout cannot build while these are missing."
            ),
            paths=untracked,
        )
    ]


def collect_violations(paths: list[str], max_path_length: int) -> list[ViolationGroup]:
    xcresult_paths = [path for path in paths if has_xcresult_component(path)]
    generated_ticket_zips = [path for path in paths if is_generated_ticket_zip(path)]
    windows_invalid_paths = [path for path in paths if is_windows_invalid_path(path)]
    long_paths = [path for path in paths if len(path) > max_path_length]

    groups: list[ViolationGroup] = []
    if xcresult_paths:
        groups.append(
            ViolationGroup(
                title="Tracked raw Xcode .xcresult bundles/files",
                action=(
                    "Remove generated .xcresult bundles from git, for example "
                    "`git rm -r <path>.xcresult`, and keep summary/log artifacts instead."
                ),
                paths=xcresult_paths,
            )
        )
    if generated_ticket_zips:
        groups.append(
            ViolationGroup(
                title="Tracked generated ticket artifact zip files",
                action=(
                    "Remove downloaded/generated build archives from ticket evidence, for example "
                    "`git rm <path>.zip`, and keep durable summaries/logs or external artifact links."
                ),
                paths=generated_ticket_zips,
            )
        )
    if windows_invalid_paths:
        groups.append(
            ViolationGroup(
                title="Tracked paths that Windows cannot check out",
                action=(
                    "Rename these paths with `git mv` before release: no < > : \" | ? * \\ or "
                    "control characters, no trailing dot or space, and no reserved device names "
                    "such as CON, NUL, COM1 or LPT1. GitHub-hosted Windows checkout fails on them."
                ),
                paths=sorted(windows_invalid_paths),
            )
        )
    if long_paths:
        groups.append(
            ViolationGroup(
                title=f"Tracked checkout-risk paths longer than {max_path_length} characters",
                action=(
                    "Shorten, move, or remove these paths before release. "
                    "GitHub-hosted Windows checkout can fail before repository scripts can run."
                ),
                paths=sorted(long_paths, key=lambda item: (-len(item), item)),
            )
        )
    groups.extend(tracked_import_group(paths))
    return groups


def print_group(group: ViolationGroup) -> None:
    print(f"\n{group.title}: {len(group.paths)}")
    print(f"Action: {group.action}")
    for path in group.paths[:MAX_SAMPLES_PER_GROUP]:
        print(f" - {path}" if " -> " in path else f" - {len(path)} chars: {path}")
    remaining = len(group.paths) - MAX_SAMPLES_PER_GROUP
    if remaining > 0:
        print(f" - ... {remaining} more")


def emit_github_error(groups: list[ViolationGroup]) -> None:
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    total = sum(len(group.paths) for group in groups)
    print(f"::error::Repository artifact hygiene failed with {total} tracked violation(s).")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--max-path-length",
        type=int,
        default=DEFAULT_MAX_PATH_LENGTH,
        help=f"Fail tracked relative paths longer than this value. Default: {DEFAULT_MAX_PATH_LENGTH}.",
    )
    parser.add_argument(
        "--only",
        choices=["tracked-imports"],
        help="Run only one check: `tracked-imports` (tracked code importing an untracked file).",
    )
    args = parser.parse_args()
    if args.max_path_length < 80:
        print("error: --max-path-length must be at least 80.", file=sys.stderr)
        raise SystemExit(2)

    paths = run_git_ls_files()
    if args.only == "tracked-imports":
        groups = tracked_import_group(paths)
        if groups:
            print("Tracked-import check failed.")
            for group in groups:
                print_group(group)
            emit_github_error(groups)
            raise SystemExit(1)
        print(f"Tracked-import check passed. Tracked files scanned: {len(paths)}")
        return
    groups = collect_violations(paths, args.max_path_length)

    if groups:
        print("Repository artifact hygiene check failed.")
        print(f"Tracked files scanned: {len(paths)}")
        print(f"Path-length threshold: {args.max_path_length}")
        for group in groups:
            print_group(group)
        emit_github_error(groups)
        raise SystemExit(1)

    longest = max(paths, key=len, default="")
    print("Repository artifact hygiene check passed.")
    print(f"Tracked files scanned: {len(paths)}")
    print(f"Path-length threshold: {args.max_path_length}")
    if longest:
        print(f"Longest tracked path: {len(longest)} chars: {longest}")


if __name__ == "__main__":
    main()
