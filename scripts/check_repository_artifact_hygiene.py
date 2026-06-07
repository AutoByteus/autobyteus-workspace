#!/usr/bin/env python3
"""Fail when generated or checkout-hostile artifacts are tracked in git."""
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


def collect_violations(paths: list[str], max_path_length: int) -> list[ViolationGroup]:
    xcresult_paths = [path for path in paths if has_xcresult_component(path)]
    generated_ticket_zips = [path for path in paths if is_generated_ticket_zip(path)]
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
    return groups


def print_group(group: ViolationGroup) -> None:
    print(f"\n{group.title}: {len(group.paths)}")
    print(f"Action: {group.action}")
    for path in group.paths[:MAX_SAMPLES_PER_GROUP]:
        print(f" - {len(path)} chars: {path}")
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
    args = parser.parse_args()
    if args.max_path_length < 80:
        print("error: --max-path-length must be at least 80.", file=sys.stderr)
        raise SystemExit(2)

    paths = run_git_ls_files()
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
