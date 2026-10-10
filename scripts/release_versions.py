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
      not a strict X.Y.Z, when no stable tag exists and no --base is given, or
      when the Android versionCode cannot encode the result (for example the
      default base after vX.Y.99; pass --base X.(Y+1).0 instead).

  android-version-code <version>
      Print the Android versionCode for a release version (``X.Y.Z`` or
      ``X.Y.Z-<prerelease>``), the same value the Android release workflow
      computes. Exits non-zero, with the reason, when Android cannot encode the
      version. ``desktop-release.sh`` runs it before it commits or tags, so a
      version that one platform cannot publish is refused up front.

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

# Android versionCode = MAJOR*10000000 + MINOR*10000 + PATCH*100 + SUFFIX, where
# SUFFIX is the pre-release number (1..98) or 99 for a stable release. This must
# match `calculate_android_version_code` in .github/workflows/release-android.yml;
# scripts/tests/test_release_channel_workflow_steps.py runs that shell function
# against android_version_code() so the two cannot drift apart.
MAX_BETA_NUMBER = 98
ANDROID_MAX_MAJOR = 209
ANDROID_MAX_MINOR = 999
ANDROID_MAX_PATCH = 99
ANDROID_MAX_VERSION_CODE = 2100000000
ANDROID_VERSION_PATTERN = re.compile(
    r"^([0-9]+)\.([0-9]+)\.([0-9]+)(-([0-9A-Za-z][0-9A-Za-z.-]*))?$"
)


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


def android_version_code(version: str) -> int:
    """Return the Android versionCode for a release version, or refuse it."""
    match = ANDROID_VERSION_PATTERN.match(version)
    if match is None:
        raise ReleaseVersionError(
            f"Invalid Android version '{version}'. Expected X.Y.Z or X.Y.Z-prerelease."
        )
    major, minor, patch = (int(match.group(i)) for i in (1, 2, 3))
    prerelease_label = match.group(5)
    if major > ANDROID_MAX_MAJOR:
        raise ReleaseVersionError(
            f"Android versionCode supports major <= {ANDROID_MAX_MAJOR}; '{version}' has major {major}."
        )
    if minor > ANDROID_MAX_MINOR:
        raise ReleaseVersionError(
            f"Android versionCode supports minor <= {ANDROID_MAX_MINOR}; '{version}' has minor {minor}."
        )
    if patch > ANDROID_MAX_PATCH:
        raise ReleaseVersionError(
            f"Android versionCode supports patch <= {ANDROID_MAX_PATCH}; '{version}' has patch {patch}. "
            f"Release the next minor instead (for example {major}.{minor + 1}.0)."
        )
    suffix = 99
    if prerelease_label is not None:
        numbers = re.findall(r"[0-9]+", prerelease_label)
        if not numbers:
            raise ReleaseVersionError(
                f"Pre-release '{prerelease_label}' must include a number from 1 to {MAX_BETA_NUMBER} for the Android versionCode."
            )
        suffix = int(numbers[-1])
        if not 1 <= suffix <= MAX_BETA_NUMBER:
            raise ReleaseVersionError(
                f"Pre-release number {suffix} must be in 1..{MAX_BETA_NUMBER} for the Android versionCode."
            )
    code = major * 10000000 + minor * 10000 + patch * 100 + suffix
    if not 1 <= code <= ANDROID_MAX_VERSION_CODE:
        raise ReleaseVersionError(
            f"Android versionCode {code} for '{version}' is outside 1..{ANDROID_MAX_VERSION_CODE}."
        )
    return code


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
        if patch + 1 > ANDROID_MAX_PATCH:
            raise ReleaseVersionError(
                f"The next patch after v{major}.{minor}.{patch} would be {major}.{minor}.{patch + 1}, "
                f"which the Android versionCode cannot encode (patch <= {ANDROID_MAX_PATCH}). "
                f"Choose the next version line explicitly, for example --base {major}.{minor + 1}.0."
            )
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
    next_beta = f"{base_label}-beta.{next_number}"
    android_version_code(next_beta)
    return next_beta


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

    android = subparsers.add_parser(
        "android-version-code", help="Print the Android versionCode for a release version, or refuse it."
    )
    android.add_argument("version", help="Release version without 'v', for example 1.5.0-beta.1.")

    newest = subparsers.add_parser("is-newest", help="Print whether a tag is the newest release tag.")
    newest.add_argument("tag", help="Candidate release tag, for example v1.4.90-beta.1.")
    newest.add_argument("--tags-file", help="File with one tag per line (default: git tag -l).")
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "android-version-code":
            print(android_version_code(args.version))
            return 0
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
