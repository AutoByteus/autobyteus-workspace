#!/usr/bin/env python3
"""Static and executable checks for the iOS release workflow contract."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def fail(message: str) -> None:
    prefix = "::error::" if os.environ.get("GITHUB_ACTIONS") == "true" else "error: "
    print(f"{prefix}{message}", file=sys.stderr)
    raise SystemExit(1)


def require_contains(path: Path, text: str, needle: str) -> None:
    if needle not in text:
        fail(f"{path} is missing required release-contract text: {needle}")


def require_count_at_least(path: Path, text: str, needle: str, minimum: int) -> None:
    count = text.count(needle)
    if count < minimum:
        fail(f"{path} must contain {needle!r} at least {minimum} times; found {count}.")


def read_required(path: Path) -> str:
    if not path.is_file():
        fail(f"Required file does not exist: {path}")
    return path.read_text(encoding="utf-8")


def run_metadata_case(script: Path, env: dict[str, str]) -> dict[str, str]:
    case_env = os.environ.copy()
    case_env.update(env)
    case_env.pop("GITHUB_OUTPUT", None)
    completed = subprocess.run(
        [sys.executable, str(script), "--json", "--no-github-output"],
        env=case_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        fail(
            "resolve-ios-release-metadata.py failed for executable contract case: "
            f"{completed.stderr.strip() or completed.stdout.strip()}"
        )
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        fail(f"Metadata resolver did not produce JSON: {exc}")


def run_invalid_metadata_case(script: Path) -> None:
    case_env = os.environ.copy()
    case_env.update(
        {
            "GITHUB_ACTIONS": "false",
            "GITHUB_REF": "refs/heads/personal",
            "GITHUB_REF_NAME": "personal",
            "GITHUB_SHA": "deadbeef",
            "GITHUB_RUN_NUMBER": "999",
            "INPUT_PUBLISH_APP_STORE_CONNECT": "true",
            "INPUT_RELEASE_TAG": "v1.2.7.4",
            "INPUT_RELEASE_REF": "",
            "INPUT_PRERELEASE": "true",
        }
    )
    case_env.pop("GITHUB_OUTPUT", None)
    completed = subprocess.run(
        [sys.executable, str(script), "--json", "--no-github-output"],
        env=case_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if completed.returncode == 0:
        fail("Metadata resolver accepted invalid release tag v1.2.7.4.")


def require_metadata_values(actual: dict[str, str], expected: dict[str, str], label: str) -> None:
    for key, expected_value in expected.items():
        actual_value = actual.get(key)
        if actual_value != expected_value:
            fail(f"{label} metadata {key} must be {expected_value!r}; found {actual_value!r}.")


def check_metadata(script: Path) -> None:
    prerelease = run_metadata_case(
        script,
        {
            "GITHUB_ACTIONS": "false",
            "GITHUB_REF": "refs/tags/v1.2.7-rc1",
            "GITHUB_REF_NAME": "v1.2.7-rc1",
            "GITHUB_SHA": "abc123",
            "GITHUB_RUN_NUMBER": "456",
            "INPUT_PUBLISH_APP_STORE_CONNECT": "false",
            "INPUT_RELEASE_TAG": "",
            "INPUT_RELEASE_REF": "",
            "INPUT_PRERELEASE": "true",
        },
    )
    require_metadata_values(
        prerelease,
        {
            "release_tag": "v1.2.7-rc1",
            "release_ref": "abc123",
            "semantic_version_core": "1.2.7",
            "prerelease_label": "rc1",
            "ios_marketing_version": "1.2.7",
            "artifact_version": "1.2.7-rc1",
            "build_number": "456",
            "publish_requested": "true",
            "prerelease": "true",
        },
        "prerelease tag",
    )

    build_only = run_metadata_case(
        script,
        {
            "GITHUB_ACTIONS": "false",
            "GITHUB_REF": "refs/heads/personal",
            "GITHUB_REF_NAME": "personal",
            "GITHUB_SHA": "def456",
            "GITHUB_RUN_NUMBER": "789",
            "INPUT_PUBLISH_APP_STORE_CONNECT": "false",
            "INPUT_RELEASE_TAG": "",
            "INPUT_RELEASE_REF": "",
            "INPUT_PRERELEASE": "true",
        },
    )
    require_metadata_values(
        build_only,
        {
            "release_tag": "",
            "release_ref": "personal",
            "semantic_version_core": "0.1.0",
            "prerelease_label": "",
            "ios_marketing_version": "0.1.0",
            "artifact_version": "ci-789",
            "build_number": "789",
            "publish_requested": "false",
            "prerelease": "true",
        },
        "build-only",
    )

    run_invalid_metadata_case(script)


def check_static_files(repo_root: Path) -> None:
    workflow_path = repo_root / ".github/workflows/release-ios.yml"
    project_path = repo_root / "autobyteus-ios/project.yml"
    smoke_path = repo_root / "autobyteus-ios/scripts/ios-simulator-smoke.sh"
    workflow = read_required(workflow_path)
    project = read_required(project_path)
    smoke = read_required(smoke_path)

    stale_version_key = "version" + "_name"
    if stale_version_key in workflow:
        fail(f"{workflow_path} still contains stale {stale_version_key} metadata.")

    for key in (
        "resolve-ios-release-metadata.py",
        "semantic_version_core",
        "prerelease_label",
        "ios_marketing_version",
        "artifact_version",
        "build_number",
    ):
        require_contains(workflow_path, workflow, key)

    require_count_at_least(workflow_path, workflow, 'IOS_BUNDLE_ID="$IOS_BUNDLE_ID"', 3)
    require_count_at_least(workflow_path, workflow, 'IOS_SHARE_EXTENSION_BUNDLE_ID="$IOS_SHARE_EXTENSION_BUNDLE_ID"', 3)
    require_count_at_least(workflow_path, workflow, 'MARKETING_VERSION="$MARKETING_VERSION"', 2)
    require_count_at_least(workflow_path, workflow, 'CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION"', 2)
    require_contains(workflow_path, workflow, 'MARKETING_VERSION="${{ needs.prepare-release.outputs.ios_marketing_version }}"')
    require_contains(workflow_path, workflow, 'CURRENT_PROJECT_VERSION="${{ needs.prepare-release.outputs.build_number }}"')
    require_contains(workflow_path, workflow, '--bundle-id "$IOS_BUNDLE_ID"')
    require_contains(workflow_path, workflow, '--bundle-id "$IOS_SHARE_EXTENSION_BUNDLE_ID"')
    require_contains(workflow_path, workflow, 'os.environ["IOS_BUNDLE_ID"]')
    require_contains(workflow_path, workflow, 'os.environ["IOS_SHARE_EXTENSION_BUNDLE_ID"]')
    require_contains(workflow_path, workflow, 'API_PRIVATE_KEYS_DIR')

    require_contains(project_path, project, "IOS_BUNDLE_ID: ${IOS_BUNDLE_ID}")
    require_contains(project_path, project, "IOS_SHARE_EXTENSION_BUNDLE_ID: ${IOS_SHARE_EXTENSION_BUNDLE_ID}")
    require_contains(project_path, project, 'PRODUCT_BUNDLE_IDENTIFIER: "$(IOS_BUNDLE_ID)"')
    require_contains(project_path, project, 'PRODUCT_BUNDLE_IDENTIFIER: "$(IOS_SHARE_EXTENSION_BUNDLE_ID)"')

    require_contains(smoke_path, smoke, 'MARKETING_VERSION" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$')
    require_contains(smoke_path, smoke, 'CURRENT_PROJECT_VERSION" =~ ^[0-9]+$')
    require_contains(smoke_path, smoke, 'IOS_BUNDLE_ID="$IOS_BUNDLE_ID"')
    require_contains(smoke_path, smoke, 'IOS_SHARE_EXTENSION_BUNDLE_ID="$IOS_SHARE_EXTENSION_BUNDLE_ID"')
    require_contains(smoke_path, smoke, 'MARKETING_VERSION="$MARKETING_VERSION"')
    require_contains(smoke_path, smoke, 'CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION"')
    require_contains(smoke_path, smoke, "App bundle ID: $IOS_BUNDLE_ID")
    require_contains(smoke_path, smoke, "iOS marketing version: $MARKETING_VERSION")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
        help="Repository root. Defaults to the current script's repository.",
    )
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    metadata_script = repo_root / "autobyteus-ios/scripts/resolve-ios-release-metadata.py"
    check_metadata(metadata_script)
    check_static_files(repo_root)
    print("iOS release contract checks passed.")


if __name__ == "__main__":
    main()
