#!/usr/bin/env python3
"""Resolve iOS release metadata for GitHub Actions and local validation."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

TAG_RE = re.compile(r"^v(?P<core>[0-9]+\.[0-9]+\.[0-9]+)(?:-(?P<label>[0-9A-Za-z][0-9A-Za-z.-]*))?$")
IOS_MARKETING_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
BUILD_NUMBER_RE = re.compile(r"^[0-9]+$")


@dataclass(frozen=True)
class IOSReleaseMetadata:
    release_tag: str
    release_ref: str
    semantic_version_core: str
    prerelease_label: str
    ios_marketing_version: str
    artifact_version: str
    build_number: str
    publish_requested: str
    prerelease: str


def fail(message: str) -> None:
    prefix = "::error::" if os.environ.get("GITHUB_ACTIONS") == "true" else "error: "
    print(f"{prefix}{message}", file=sys.stderr)
    raise SystemExit(1)


def bool_text(value: str | None, *, default: str = "false") -> str:
    raw = (value if value is not None and value != "" else default).strip().lower()
    if raw in {"true", "1", "yes", "y"}:
        return "true"
    if raw in {"false", "0", "no", "n"}:
        return "false"
    fail(f"Boolean input must be true or false, received '{value}'.")


def parse_release_tag(tag: str) -> tuple[str, str, str]:
    match = TAG_RE.match(tag)
    if not match:
        fail(f"Invalid release_tag '{tag}'. Expected a semantic tag like v1.2.7 or v1.2.7-rc1.")
    core = match.group("core")
    label = match.group("label") or ""
    artifact = tag[1:]
    return core, label, artifact


def resolve_from_env(env: dict[str, str]) -> IOSReleaseMetadata:
    github_ref = env.get("GITHUB_REF", "")
    github_ref_name = env.get("GITHUB_REF_NAME", "")
    github_sha = env.get("GITHUB_SHA", "")
    github_run_number = env.get("GITHUB_RUN_NUMBER", "")
    if not BUILD_NUMBER_RE.match(github_run_number) or int(github_run_number) < 1:
        fail(f"GitHub run number '{github_run_number}' cannot be used as an iOS CFBundleVersion.")

    input_publish = bool_text(env.get("INPUT_PUBLISH_APP_STORE_CONNECT"), default="false")
    input_release_tag = env.get("INPUT_RELEASE_TAG", "").strip()
    input_release_ref = env.get("INPUT_RELEASE_REF", "").strip()
    input_prerelease = bool_text(env.get("INPUT_PRERELEASE"), default="true")

    release_tag = ""
    release_ref = ""
    semantic_version_core = "0.1.0"
    prerelease_label = ""
    artifact_version = f"ci-{github_run_number}"
    publish_requested = "false"
    prerelease = "true" if input_prerelease == "true" else "false"

    if github_ref.startswith("refs/tags/"):
        release_tag = github_ref_name
        semantic_version_core, prerelease_label, artifact_version = parse_release_tag(release_tag)
        release_ref = github_sha or release_tag
        publish_requested = "true"
        prerelease = "true" if prerelease_label else "false"
    else:
        publish_requested = input_publish
        release_tag = input_release_tag
        if publish_requested == "true" and not release_tag:
            fail("release_tag is required when publish_app_store_connect is true.")
        if release_tag:
            semantic_version_core, prerelease_label, artifact_version = parse_release_tag(release_tag)
            release_ref = input_release_ref or release_tag
        else:
            release_ref = input_release_ref or github_ref_name
        if prerelease_label or input_prerelease == "true":
            prerelease = "true"
        else:
            prerelease = "false"

    ios_marketing_version = semantic_version_core
    if not IOS_MARKETING_RE.match(ios_marketing_version):
        fail(f"Resolved ios_marketing_version '{ios_marketing_version}' must be MAJOR.MINOR.PATCH digits only.")
    if not BUILD_NUMBER_RE.match(github_run_number):
        fail(f"Resolved build_number '{github_run_number}' must contain only digits.")

    return IOSReleaseMetadata(
        release_tag=release_tag,
        release_ref=release_ref,
        semantic_version_core=semantic_version_core,
        prerelease_label=prerelease_label,
        ios_marketing_version=ios_marketing_version,
        artifact_version=artifact_version,
        build_number=github_run_number,
        publish_requested=publish_requested,
        prerelease=prerelease,
    )


def write_outputs(metadata: IOSReleaseMetadata, output_path: str | None) -> None:
    if not output_path:
        return
    with Path(output_path).open("a", encoding="utf-8") as output:
        for key, value in asdict(metadata).items():
            output.write(f"{key}={value}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print JSON for local tests.")
    parser.add_argument("--no-github-output", action="store_true", help="Do not write to GITHUB_OUTPUT even when set.")
    args = parser.parse_args()

    metadata = resolve_from_env(dict(os.environ))
    if not args.no_github_output:
        write_outputs(metadata, os.environ.get("GITHUB_OUTPUT"))
    if args.json or not os.environ.get("GITHUB_OUTPUT"):
        print(json.dumps(asdict(metadata), indent=2))


if __name__ == "__main__":
    main()
