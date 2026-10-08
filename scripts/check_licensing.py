#!/usr/bin/env python3
"""Fail when the repository's licensing statements are inconsistent.

AutoByteus is AGPL-3.0-only (or commercial), except the Apache-2.0 components
listed in APACHE_COMPONENTS. This script is the single machine-readable owner of
that component-to-license map. LICENSING.md is the human statement; rule 4
keeps the two from drifting apart. Paths with a `tickets` segment are
historical records and are ignored by every rule.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

AGPL_SHA256 = "0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0"
APACHE_SHA256 = "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30"

AGPL_LICENSE = "AGPL-3.0-only"
APACHE_LICENSE = "Apache-2.0"

AGPL_LICENSE_DIRS = [
    "",
    "autobyteus-ts",
    "autobyteus-server-ts",
    "autobyteus-web",
    "autobyteus-message-gateway",
]
APACHE_COMPONENTS = [
    "autobyteus-application-backend-sdk",
    "autobyteus-application-frontend-sdk",
    "autobyteus-application-sdk-contracts",
    "autobyteus-application-devkit",
    "autobyteus-agent-presentation-contracts",
    "autobyteus-collaboration-stream-contracts",
    "autobyteus-team-stream-contracts",
    "applications/brief-studio",
    "applications/socratic-math-teacher",
]
# Developer-owned manifests: the developer chooses the license of their own app.
MANIFEST_EXCLUDES = ["autobyteus-application-devkit/templates/"]

CLAIM_PATTERN = re.compile(r"Apache[- ]2\.0|Apache License|apache\.org/licenses")
CLAIM_ALLOWED_FILES = {
    "LICENSING.md",
    "NOTICE",
    "README.md",
    "autobyteus-android/gradlew",
    "autobyteus-android/gradlew.bat",
    "scripts/check_licensing.py",
    "scripts/tests/test_check_licensing.py",
}
CLAIM_ALLOWED_PREFIXES = ["autobyteus-web/public/THIRD_PARTY_NOTICES/"] + [
    component + "/" for component in APACHE_COMPONENTS
]

LICENSING_DOC = "LICENSING.md"
MAX_SAMPLES_PER_GROUP = 25


@dataclass(frozen=True)
class ViolationGroup:
    title: str
    action: str
    paths: list[str]


def is_ticket_path(path: str) -> bool:
    return "tickets" in path.split("/")


def license_path(directory: str) -> str:
    return f"{directory}/LICENSE" if directory else "LICENSE"


def is_apache_path(path: str) -> bool:
    return any(path.startswith(component + "/") for component in APACHE_COMPONENTS)


def read_bytes(root: Path, path: str) -> bytes | None:
    """Return file content, or None for paths that are not regular files on disk."""
    full_path = root / path
    if full_path.is_symlink() or not full_path.is_file():
        return None
    return full_path.read_bytes()


def run_git_ls_files(root: Path) -> list[str]:
    completed = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="replace").strip()
        print(f"error: git ls-files failed: {stderr}", file=sys.stderr)
        raise SystemExit(2)
    raw_paths = completed.stdout.decode("utf-8", errors="surrogateescape").split("\0")
    return [path for path in raw_paths if path and not is_ticket_path(path)]


def check_license_texts(root: Path, tracked: set[str]) -> list[ViolationGroup]:
    groups: list[ViolationGroup] = []
    for directories, expected_hash, name in (
        (AGPL_LICENSE_DIRS, AGPL_SHA256, "GNU AGPL v3"),
        (APACHE_COMPONENTS, APACHE_SHA256, "Apache License 2.0"),
    ):
        wrong: list[str] = []
        for directory in directories:
            path = license_path(directory)
            content = read_bytes(root, path) if path in tracked else None
            if content is None:
                wrong.append(f"{path} (missing)")
            elif hashlib.sha256(content).hexdigest() != expected_hash:
                wrong.append(f"{path} (text differs)")
        if wrong:
            groups.append(
                ViolationGroup(
                    title=f"LICENSE files that are not the verbatim official {name} text",
                    action=f"Restore the official {name} text, unmodified (sha256 {expected_hash}).",
                    paths=wrong,
                )
            )
    return groups


def check_manifests(root: Path, paths: list[str]) -> list[ViolationGroup]:
    wrong: list[str] = []
    for path in paths:
        if path.split("/")[-1] != "package.json":
            continue
        if any(path.startswith(prefix) for prefix in MANIFEST_EXCLUDES):
            continue
        expected = APACHE_LICENSE if is_apache_path(path) else AGPL_LICENSE
        content = read_bytes(root, path)
        if content is None:
            continue
        try:
            actual = json.loads(content.decode("utf-8")).get("license")
        except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            wrong.append(f"{path} (unreadable JSON; expected {expected})")
            continue
        if actual != expected:
            shown = "missing" if actual is None else json.dumps(actual)
            wrong.append(f"{path} (license {shown}; expected {expected})")
    if not wrong:
        return []
    return [
        ViolationGroup(
            title="package.json files with the wrong license field",
            action=(
                f'Set "license" to "{APACHE_LICENSE}" for the Apache-2.0 components and '
                f'"{AGPL_LICENSE}" for everything else (see {LICENSING_DOC}).'
            ),
            paths=wrong,
        )
    ]


def check_licensing_doc_mentions(root: Path, tracked: set[str]) -> list[ViolationGroup]:
    content = read_bytes(root, LICENSING_DOC) if LICENSING_DOC in tracked else None
    if content is None:
        return [
            ViolationGroup(
                title=f"Missing {LICENSING_DOC}",
                action=f"Restore {LICENSING_DOC}, the human-readable licensing statement.",
                paths=[LICENSING_DOC],
            )
        ]
    text = content.decode("utf-8", errors="replace")
    missing = [component for component in APACHE_COMPONENTS if component not in text]
    if not missing:
        return []
    return [
        ViolationGroup(
            title=f"Apache-2.0 components not named in {LICENSING_DOC}",
            action=f"Name each Apache-2.0 component in the {LICENSING_DOC} component table.",
            paths=missing,
        )
    ]


def is_claim_allowed(path: str) -> bool:
    return path in CLAIM_ALLOWED_FILES or any(path.startswith(prefix) for prefix in CLAIM_ALLOWED_PREFIXES)


def scan_stray_claims(root: Path, paths: list[str]) -> list[ViolationGroup]:
    stray: list[str] = []
    for path in paths:
        if is_claim_allowed(path):
            continue
        content = read_bytes(root, path)
        if content is None or b"\0" in content:
            continue
        if CLAIM_PATTERN.search(content.decode("utf-8", errors="replace")):
            stray.append(path)
    if not stray:
        return []
    return [
        ViolationGroup(
            title="Stray Apache-2.0 claim in AGPL component files",
            action=(
                "Remove the Apache-2.0 statement, or, if the file is third-party or an "
                "Apache-2.0 component, move it or extend the allowlist in scripts/check_licensing.py."
            ),
            paths=stray,
        )
    ]


def collect_violations(root: Path) -> tuple[int, list[ViolationGroup]]:
    paths = run_git_ls_files(root)
    tracked = set(paths)
    groups = (
        check_license_texts(root, tracked)
        + check_manifests(root, paths)
        + check_licensing_doc_mentions(root, tracked)
        + scan_stray_claims(root, paths)
    )
    return len(paths), groups


def print_group(group: ViolationGroup) -> None:
    print(f"\n{group.title}: {len(group.paths)}")
    print(f"Action: {group.action}")
    for path in group.paths[:MAX_SAMPLES_PER_GROUP]:
        print(f"  {path}")
    remaining = len(group.paths) - MAX_SAMPLES_PER_GROUP
    if remaining > 0:
        print(f"  ... {remaining} more")


def emit_github_error(groups: list[ViolationGroup]) -> None:
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return
    total = sum(len(group.paths) for group in groups)
    print(f"::error::Licensing consistency check failed with {total} violation(s).")


def resolve_default_root() -> Path:
    completed = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        print("error: not inside a git repository; pass --root.", file=sys.stderr)
        raise SystemExit(2)
    return Path(completed.stdout.decode("utf-8").strip())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, help="Repository root. Default: git toplevel of the current directory.")
    args = parser.parse_args(argv)
    root = (args.root or resolve_default_root()).resolve()

    scanned, groups = collect_violations(root)
    if groups:
        print("Licensing consistency check failed.")
        print(f"Tracked files scanned: {scanned}")
        for group in groups:
            print_group(group)
        emit_github_error(groups)
        return 1

    print("Licensing is consistent.")
    print(f"Tracked files scanned: {scanned}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
