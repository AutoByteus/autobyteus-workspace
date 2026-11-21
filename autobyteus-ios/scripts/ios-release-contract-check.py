#!/usr/bin/env python3
"""Static and executable checks for the iOS release workflow contract."""
from __future__ import annotations

import argparse
import json
import os
import plistlib
import re
import struct
import subprocess
import tempfile
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


def require_order(path: Path, text: str, first: str, second: str, label: str) -> None:
    first_index = text.find(first)
    second_index = text.find(second)
    if first_index == -1:
        fail(f"{path} is missing required release-contract text for {label}: {first}")
    if second_index == -1:
        fail(f"{path} is missing required release-contract text for {label}: {second}")
    if first_index > second_index:
        fail(f"{path} must place {first!r} before {second!r} for {label}.")


def workflow_job_block(path: Path, workflow: str, job_key: str) -> str:
    match = re.search(rf"(?m)^  {re.escape(job_key)}:\n", workflow)
    if not match:
        fail(f"{path} is missing required workflow job: {job_key}")
    next_job = re.search(r"(?m)^  [A-Za-z0-9_-]+:\n", workflow[match.end() :])
    end_index = match.end() + next_job.start() if next_job else len(workflow)
    return workflow[match.start() : end_index]


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


RELEASE_XCODE_MAJOR = 27
RELEASE_XCODE_APP = "/Applications/Xcode_27.2.app"
RELEASE_RUNNER = "xcode-27"
SELECT_XCODE_STEP = "      - name: Select Xcode 27 or newer"
SELECT_XCODE_SCRIPT = "autobyteus-ios/scripts/select-release-xcode.sh"


def check_release_toolchain(workflow_path: Path, workflow: str, script_path: Path, script: str) -> None:
    """autobyteus-571: both macOS jobs build with Xcode 27+ and its iPhoneOS 27+ SDK (App Store Connect, ITMS-90725),
    through the one script that owns the rule; the workflow env holds the only default path."""
    require_contains(
        workflow_path,
        workflow,
        f"IOS_XCODE_APP_PATH: ${{{{ vars.IOS_XCODE_APP_PATH || '{RELEASE_XCODE_APP}' }}}}",
    )
    for stale in ("Xcode_26", "Xcode 26"):
        if stale in workflow:
            fail(f"{workflow_path} still names {stale!r}; release builds use Xcode {RELEASE_XCODE_MAJOR} or newer.")
    for job_key in ("build-ios", "upload-testflight"):
        job = workflow_job_block(workflow_path, workflow, job_key)
        require_contains(workflow_path, job, f"    runs-on: {RELEASE_RUNNER}\n")
        require_contains(workflow_path, job, f"{SELECT_XCODE_STEP}\n        shell: bash\n        run: {SELECT_XCODE_SCRIPT}\n")
        require_order(workflow_path, job, SELECT_XCODE_STEP, "      - name: Install XcodeGen", f"{job_key} Xcode setup")
        if "IOS_XCODE_APP_PATH:-" in job:
            fail(f"{workflow_path} {job_key} gives a second default Xcode path; the workflow env owns it.")
    require_contains(script_path, script, f"MINIMUM_MAJOR={RELEASE_XCODE_MAJOR}\n")
    require_contains(script_path, script, "(( xcode_major < MINIMUM_MAJOR ))")
    require_contains(script_path, script, "(( sdk_major < MINIMUM_MAJOR ))")
    require_contains(script_path, script, 'xcode_version_output="$(xcodebuild -version)"')
    require_contains(script_path, script, 'sdk_version="$(xcrun --sdk iphoneos --show-sdk-version)"')
    require_contains(script_path, script, 'echo "DEVELOPER_DIR=$DEVELOPER_DIR" >> "$GITHUB_ENV"')
    require_contains(script_path, script, 'echo "Selected Xcode app: $selected_xcode"')
    require_contains(script_path, script, 'echo "Selected iPhoneOS SDK: $sdk_version"')
    if "xcodebuild -version |" in script:
        fail(f"{script_path} must not pipe xcodebuild -version; capture the full output before parsing.")
    if not os.access(script_path, os.X_OK):
        fail(f"{script_path} must be executable; the workflow runs it directly.")


SIMULATOR_CHOOSER = "autobyteus-ios/scripts/select-ios-simulator.py"
SIMULATOR_FIXTURE = {
    "devices": {
        "com.apple.CoreSimulator.SimRuntime.iOS-27-0": [
            {"name": "iPhone 17e", "udid": "E-27-0", "state": "Shutdown", "isAvailable": True},
            {"name": "iPhone 17", "udid": "17-27-0", "state": "Shutdown", "isAvailable": True},
        ],
        "com.apple.CoreSimulator.SimRuntime.iOS-27-2": [
            {"name": "iPad Air 11-inch (M3)", "udid": "IPAD-27-2", "state": "Shutdown", "isAvailable": True},
            {"name": "iPhone 17e", "udid": "E-27-2", "state": "Shutdown", "isAvailable": True},
            {"name": "iPhone 17 Pro", "udid": "PRO-27-2", "state": "Shutdown", "isAvailable": True},
            {"name": "iPhone 17", "udid": "17-27-2", "state": "Booted", "isAvailable": True},
        ],
        "com.apple.CoreSimulator.SimRuntime.iOS-27-3": [
            {"name": "iPhone 17", "udid": "17-27-3-BETA", "state": "Shutdown", "isAvailable": True},
        ],
        "com.apple.CoreSimulator.SimRuntime.watchOS-27-0": [
            {"name": "iPhone 17", "udid": "NOT-IOS", "state": "Shutdown", "isAvailable": True},
        ],
    }
}


def run_simulator_chooser(chooser: Path, devices: dict, sdk: str, name: str | None) -> subprocess.CompletedProcess:
    """The chooser against a stand-in `xcrun` (an iOS simulator SDK version and a `simctl list -j` fixture)."""
    with tempfile.TemporaryDirectory() as folder:
        fixture = Path(folder) / "devices.json"
        fixture.write_text(json.dumps(devices), encoding="utf-8")
        fake = Path(folder) / "xcrun"
        fake.write_text(
            "#!/bin/sh\n"
            f'case "$*" in *show-sdk-version*) echo "{sdk}";; *simctl*) cat "{fixture}";; *) exit 2;; esac\n',
            encoding="utf-8",
        )
        fake.chmod(0o755)
        env = os.environ.copy()
        env["PATH"] = f"{folder}{os.pathsep}{env.get('PATH', '')}"
        env.pop("IOS_SIMULATOR_NAME", None)
        if name is not None:
            env["IOS_SIMULATOR_NAME"] = name
        return subprocess.run([sys.executable, str(chooser)], env=env, capture_output=True, text=True, check=False)


def check_simulator_chooser(chooser: Path) -> None:
    """autobyteus-568: the exact name on the newest runtime the Xcode can run (not a beta runtime above its SDK, not a
    longer name that contains it), else the first iPhone there with a notice, else a failure."""
    exact = run_simulator_chooser(chooser, SIMULATOR_FIXTURE, "27.2", None)
    if exact.returncode != 0 or exact.stdout.strip() != "17-27-2":
        fail(f"{chooser} must choose iPhone 17 on iOS 27.2 under the 27.2 SDK; got {exact.stdout.strip()!r} ({exact.stderr.strip()}).")
    fallback = run_simulator_chooser(chooser, SIMULATOR_FIXTURE, "27.2", "iPhone 99")
    if fallback.returncode != 0 or fallback.stdout.strip() != "E-27-2" or "No 'iPhone 99' simulator" not in fallback.stderr:
        fail(f"{chooser} must fall back to the first iPhone on iOS 27.2 with a notice; got {fallback.stdout.strip()!r} ({fallback.stderr.strip()}).")
    older_sdk = run_simulator_chooser(chooser, SIMULATOR_FIXTURE, "27.0", None)
    if older_sdk.returncode != 0 or older_sdk.stdout.strip() != "17-27-0":
        fail(f"{chooser} must keep to runtimes not above the SDK; got {older_sdk.stdout.strip()!r} under 27.0.")
    none = run_simulator_chooser(chooser, {"devices": {"com.apple.CoreSimulator.SimRuntime.iOS-27-2": []}}, "27.2", None)
    if none.returncode == 0 or none.stdout.strip():
        fail(f"{chooser} must fail with no UDID when no iPhone is available.")


def check_simulator_wiring(workflow_path: Path, workflow: str, smoke_path: Path, smoke: str, chooser: Path) -> None:
    """Both callers ask the one chooser; no inline device match is left."""
    job = workflow_job_block(workflow_path, workflow, "build-ios")
    require_contains(workflow_path, job, f'UDID="$({SIMULATOR_CHOOSER})"')
    require_order(workflow_path, job, "      - name: Select Xcode 27 or newer", f'UDID="$({SIMULATOR_CHOOSER})"', "build-ios simulator choice")
    require_contains(smoke_path, smoke, 'UDID="$("$ROOT_DIR/scripts/select-ios-simulator.py")"')
    for path, text in ((workflow_path, workflow), (smoke_path, smoke)):
        if re.search(r"simctl list devices[^\n]*\|\s*awk", text):
            fail(f"{path} still matches a simulator inline; use {SIMULATOR_CHOOSER}.")
    if not os.access(chooser, os.X_OK):
        fail(f"{chooser} must be executable; its callers run it directly.")
    check_simulator_chooser(chooser)


APP_ICON_SET = "autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset"
APP_INFO_PLIST = "autobyteus-ios/AutoByteusMobile/Info.plist"
ICON_CHECK_STEP = "      - name: Check the app icon against the logo"
ICON_CHECK_COMMAND = "pnpm --dir autobyteus-web ios-icon:check"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def png_structure(path: Path) -> tuple[int, int, int, int, set[bytes]]:
    """(width, height, bit depth, color type, chunk types) from a PNG's chunks, without decoding its pixels."""
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        fail(f"{path} is not a PNG file.")
    offset = len(PNG_SIGNATURE)
    chunks: set[bytes] = set()
    header = None
    while offset + 8 <= len(data):
        length, kind = struct.unpack(">I4s", data[offset : offset + 8])
        if kind == b"IHDR":
            header = struct.unpack(">IIBB", data[offset + 8 : offset + 18])
        chunks.add(kind)
        offset += 12 + length
        if kind == b"IEND":
            break
    if header is None:
        fail(f"{path} has no IHDR chunk.")
    width, height, bit_depth, color_type = header
    return width, height, bit_depth, color_type, chunks


def check_app_icon(repo_root: Path) -> None:
    """autobyteus-594: every slot of the app icon set exists at its exact pixel size, 8-bit RGB without alpha (App Store
    Connect refuses an icon with alpha). Whether the pixels match the logo is ios-icon:check's (it needs sharp)."""
    icon_set = repo_root / APP_ICON_SET
    contents_path = icon_set / "Contents.json"
    contents = json.loads(read_required(contents_path))
    images = contents.get("images") or []
    if not images:
        fail(f"{contents_path} lists no icon images.")
    for image in images:
        label = f"{image.get('idiom')} {image.get('size')}@{image.get('scale')}"
        filename = image.get("filename")
        if not filename:
            fail(f"{contents_path} slot {label} has no filename.")
        path = icon_set / filename
        if not path.is_file():
            fail(f"{contents_path} slot {label} names {filename}, which does not exist.")
        points = float(str(image["size"]).split("x")[0])
        pixels = round(points * int(str(image["scale"]).rstrip("x")))
        width, height, bit_depth, color_type, chunks = png_structure(path)
        if (width, height) != (pixels, pixels):
            fail(f"{path} is {width}x{height}; slot {label} needs {pixels}x{pixels}.")
        if color_type != 2 or bit_depth != 8:
            fail(f"{path} must be 8-bit RGB without alpha (PNG color type 2, bit depth 8); found color type {color_type}, bit depth {bit_depth}.")
        if b"tRNS" in chunks:
            fail(f"{path} has a tRNS chunk (transparency); the app icon must be opaque.")


def check_export_compliance(repo_root: Path) -> None:
    """autobyteus-594 DEC-002: the app declares it uses no non-exempt encryption (only the OS's and authentication-only
    encryption), so App Store Connect does not ask for each build."""
    path = repo_root / APP_INFO_PLIST
    with path.open("rb") as handle:
        info = plistlib.load(handle)
    if info.get("ITSAppUsesNonExemptEncryption") is not False:
        fail(f"{path} must declare ITSAppUsesNonExemptEncryption = false; found {info.get('ITSAppUsesNonExemptEncryption')!r}.")


def check_icon_step(workflow_path: Path, workflow: str) -> None:
    """The release build checks the icon set against the logo before building the app."""
    job = workflow_job_block(workflow_path, workflow, "build-ios")
    require_contains(workflow_path, job, f"{ICON_CHECK_STEP}\n        run: {ICON_CHECK_COMMAND}\n")
    require_order(workflow_path, job, "      - name: Install workspace dependencies", ICON_CHECK_STEP, "build-ios icon check")
    require_order(workflow_path, job, ICON_CHECK_STEP, "      - name: Generate, build, and run implementation checks", "build-ios icon check")


def check_static_files(repo_root: Path) -> None:
    workflow_path = repo_root / ".github/workflows/release-ios.yml"
    project_path = repo_root / "autobyteus-ios/project.yml"
    smoke_path = repo_root / "autobyteus-ios/scripts/ios-simulator-smoke.sh"
    workflow = read_required(workflow_path)
    project = read_required(project_path)
    smoke = read_required(smoke_path)
    select_xcode_path = repo_root / "autobyteus-ios/scripts/select-release-xcode.sh"
    select_xcode = read_required(select_xcode_path)

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
        "IOS_XCODE_APP_PATH",
    ):
        require_contains(workflow_path, workflow, key)

    check_release_toolchain(workflow_path, workflow, select_xcode_path, select_xcode)

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

    check_simulator_wiring(workflow_path, workflow, smoke_path, smoke, repo_root / SIMULATOR_CHOOSER)
    check_icon_step(workflow_path, workflow)
    check_app_icon(repo_root)
    check_export_compliance(repo_root)


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
