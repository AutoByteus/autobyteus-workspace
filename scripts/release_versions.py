#!/usr/bin/env python3
"""Release-version ordering for AutoByteus release tags.

The only recognized release tags are strict stable tags ``vMAJOR.MINOR.PATCH``
and beta tags ``vMAJOR.MINOR.PATCH-beta.N`` (no leading zeros, N >= 1). Every
other tag, including other ``v*`` tags such as ``v1.2.26-rc1`` or
``v2026.02.26-personal-desktop-e2e.3``, is ignored. Precedence follows semver
2.0: ``X.Y.Z-beta.N < X.Y.Z`` and betas compare by numeric N.

Subcommands (read-only; this script never mutates git):

  next-beta [--base X.Y.Z] [--tags-file F]
      Print the next beta version ``X.Y.Z-beta.N``. The default base is the
      next patch after the highest stable tag. Exits non-zero when the stable
      tag for the base already exists, when N would exceed 98, when --base is
      not a strict X.Y.Z, or when no stable tag exists and no --base is given.

  is-newest <tag> [--tags-file F]
      Print ``true`` when <tag> is a recognized release tag and no recognized
      tag has higher precedence; otherwise print ``false``. Always exits 0 on
      a successful evaluation.

Tags are read from ``git tag -l`` in the current directory unless
``--tags-file`` names a file with one tag per line.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

_NUMBER = r"(0|[1-9][0-9]*)"
RELEASE_TAG_PATTERN = re.compile(
    rf"^v{_NUMBER}\.{_NUMBER}\.{_NUMBER}(-beta\.([1-9][0-9]*))?$"
)
STABLE_VERSION_PATTERN = re.compile(rf"^{_NUMBER}\.{_NUMBER}\.{_NUMBER}$")

# Android versionCode reserves two digits for the pre-release number (1..98).
MAX_BETA_NUMBER = 98


class ReleaseVersionError(Exception):
    """A refusal with an operator-facing message."""


@dataclass(frozen=True, order=True)
class ReleaseVersion:
    major: int
    minor: int
    patch: int
    # Stable sorts above every beta of the same core version.
    is_stable: bool
    beta: int

    @property
    def core(self) -> tuple[int, int, int]:
        return (self.major, self.minor, self.patch)

    def __str__(self) -> str:
        core = f"{self.major}.{self.minor}.{self.patch}"
        return core if self.is_stable else f"{core}-beta.{self.beta}"


def parse_release_tag(tag: str) -> Optional[ReleaseVersion]:
    """Return the version for a recognized release tag, else ``None``."""
    match = RELEASE_TAG_PATTERN.match(tag.strip())
    if match is None:
        return None
    major, minor, patch = (int(match.group(i)) for i in (1, 2, 3))
    beta_group = match.group(5)
    if beta_group is None:
        return ReleaseVersion(major, minor, patch, True, 0)
    return ReleaseVersion(major, minor, patch, False, int(beta_group))


def recognized_versions(tags: Iterable[str]) -> list[ReleaseVersion]:
    versions = (parse_release_tag(tag) for tag in tags)
    return [version for version in versions if version is not None]


def parse_base_version(base: str) -> tuple[int, int, int]:
    match = STABLE_VERSION_PATTERN.match(base)
    if match is None:
        raise ReleaseVersionError(
            f"Invalid --base '{base}'. Expected a stable version like 1.4.90 (no 'v', no suffix, no leading zeros)."
        )
    return (int(match.group(1)), int(match.group(2)), int(match.group(3)))


def compute_next_beta(tags: Iterable[str], base: Optional[str] = None) -> str:
    versions = recognized_versions(tags)
    stable_cores = {version.core for version in versions if version.is_stable}

    if base is not None:
        base_core = parse_base_version(base)
    else:
        if not stable_cores:
            raise ReleaseVersionError(
                "No stable release tag found; pass --base X.Y.Z to choose the beta base version."
            )
        major, minor, patch = max(stable_cores)
        base_core = (major, minor, patch + 1)

    base_label = ".".join(str(part) for part in base_core)
    if base_core in stable_cores:
        raise ReleaseVersionError(
            f"Stable tag v{base_label} already exists; a beta for it would sort below the stable release. Choose a higher --base."
        )

    existing_betas = [
        version.beta for version in versions if not version.is_stable and version.core == base_core
    ]
    next_number = max(existing_betas, default=0) + 1
    if next_number > MAX_BETA_NUMBER:
        raise ReleaseVersionError(
            f"Beta number {next_number} for {base_label} exceeds {MAX_BETA_NUMBER} (Android versionCode limit). Release a stable version or choose a higher --base."
        )
    return f"{base_label}-beta.{next_number}"


def is_newest(candidate: str, tags: Iterable[str]) -> bool:
    candidate_version = parse_release_tag(candidate)
    if candidate_version is None:
        return False
    return all(version <= candidate_version for version in recognized_versions(tags))


def read_tags(tags_file: Optional[str]) -> list[str]:
    if tags_file is not None:
        lines = Path(tags_file).read_text(encoding="utf-8").splitlines()
    else:
        result = subprocess.run(
            ["git", "tag", "-l"], check=True, capture_output=True, text=True
        )
        lines = result.stdout.splitlines()
    return [line.strip() for line in lines if line.strip()]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AutoByteus release-version ordering helper.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    next_beta = subparsers.add_parser("next-beta", help="Print the next beta version.")
    next_beta.add_argument("--base", help="Stable base version X.Y.Z for the beta.")
    next_beta.add_argument("--tags-file", help="File with one tag per line (default: git tag -l).")

    newest = subparsers.add_parser("is-newest", help="Print whether a tag is the newest release tag.")
    newest.add_argument("tag", help="Candidate release tag, for example v1.4.90-beta.1.")
    newest.add_argument("--tags-file", help="File with one tag per line (default: git tag -l).")
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        tags = read_tags(args.tags_file)
        if args.command == "next-beta":
            print(compute_next_beta(tags, args.base))
        else:
            print("true" if is_newest(args.tag, tags) else "false")
    except ReleaseVersionError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"Error: could not read tags: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
