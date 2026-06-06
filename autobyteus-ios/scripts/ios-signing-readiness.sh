#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/build/signing-readiness}"
mkdir -p "$OUT_DIR"

python3 - "$ROOT_DIR" "$OUT_DIR" <<'PY'
from __future__ import annotations

import datetime as dt
import json
import os
import plistlib
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

root_dir = Path(sys.argv[1])
out_dir = Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
report_path = out_dir / "ios-signing-readiness.txt"
json_path = out_dir / "ios-signing-readiness.json"

app_bundle_id = os.environ.get("IOS_BUNDLE_ID", "org.autobyteus.mobile")
share_extension_bundle_id = os.environ.get(
    "IOS_SHARE_EXTENSION_BUNDLE_ID", "org.autobyteus.mobile.share"
)
app_group_id = os.environ.get("IOS_APP_GROUP_ID", "group.org.autobyteus.mobile")
team_id = os.environ.get("IOS_DEVELOPMENT_TEAM", "")
archive_requested = os.environ.get("IOS_SIGNING_READINESS_ARCHIVE", "0") == "1"

profile_search_dirs = [
    {
        "kind": "legacyMobileDevice",
        "path": str(Path.home() / "Library/MobileDevice/Provisioning Profiles"),
    },
    {
        "kind": "xcodeUserData",
        "path": str(Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles"),
    },
]


def run_text(command: list[str], *, timeout: int = 30) -> str:
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return completed.stdout.decode("utf-8", errors="replace").strip()


def run_bytes(command: list[str], *, timeout: int = 30) -> bytes:
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired):
        return b""
    if completed.returncode != 0:
        return b""
    return completed.stdout


def clean_lines(value: str, limit: int | None = None) -> str:
    lines = value.splitlines()
    if limit is not None:
        lines = lines[:limit]
    return "\n".join(lines)


def jsonable_date(value: Any) -> str:
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone.utc)
        return value.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return str(value) if value else ""


def list_value(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def entitlements_app_identifier(entitlements: dict[str, Any]) -> str:
    value = entitlements.get("application-identifier")
    if not value:
        value = entitlements.get("com.apple.application-identifier")
    return str(value) if value else ""


def app_identifier_matches_bundle(app_identifier: str, bundle_id: str, *, exact: bool) -> bool:
    if not app_identifier:
        return False
    if app_identifier.endswith(f".{bundle_id}"):
        return True
    if not exact and app_identifier.endswith(".*"):
        return True
    return False


def profile_team_matches(profile: dict[str, Any]) -> bool:
    if not team_id:
        return True
    if team_id in profile["teamIds"]:
        return True
    if profile["appIdentifier"].startswith(f"{team_id}."):
        return True
    return False


def profile_has_app_group(profile: dict[str, Any]) -> bool:
    return app_group_id in profile["appGroups"]


def is_ios_profile(profile: dict[str, Any]) -> bool:
    platforms = {str(item) for item in profile["platforms"]}
    if "iOS" in platforms or "iPhoneOS" in platforms:
        return True
    # Some profile formats omit Platform. Treat mobileprovision files with an iOS-style
    # application identifier as iOS so older local profile caches are still classified.
    if not platforms and profile["path"].endswith(".mobileprovision") and profile["appIdentifier"]:
        return True
    return False


def is_development_profile(profile: dict[str, Any]) -> bool:
    return is_ios_profile(profile) and profile["getTaskAllow"] is True and profile["deviceCount"] > 0


def is_app_store_distribution_candidate(profile: dict[str, Any]) -> bool:
    return is_ios_profile(profile) and profile["getTaskAllow"] is False and bool(profile["appIdentifier"])


def parse_profile(path: Path, source_kind: str) -> dict[str, Any] | None:
    plist_bytes = run_bytes(["security", "cms", "-D", "-i", str(path)])
    if not plist_bytes:
        return None
    try:
        plist = plistlib.loads(plist_bytes)
    except Exception:
        return None

    entitlements = plist.get("Entitlements") or {}
    app_identifier = entitlements_app_identifier(entitlements)
    team_ids = [str(item) for item in list_value(plist.get("TeamIdentifier"))]
    app_groups = [
        str(item)
        for item in list_value(entitlements.get("com.apple.security.application-groups"))
    ]
    platforms = [str(item) for item in list_value(plist.get("Platform"))]
    devices = list_value(plist.get("ProvisionedDevices"))
    get_task_allow = entitlements.get("get-task-allow")
    if isinstance(get_task_allow, bool):
        normalized_get_task_allow = get_task_allow
    else:
        normalized_get_task_allow = None

    return {
        "path": str(path),
        "sourceKind": source_kind,
        "fileName": path.name,
        "name": str(plist.get("Name") or ""),
        "uuid": str(plist.get("UUID") or path.name),
        "teamIds": team_ids,
        "teamName": str(plist.get("TeamName") or ""),
        "platforms": platforms,
        "expirationDate": jsonable_date(plist.get("ExpirationDate")),
        "appIdentifier": app_identifier,
        "getTaskAllow": normalized_get_task_allow,
        "deviceCount": len(devices),
        "appGroups": app_groups,
        "isXcodeManaged": bool(plist.get("IsXcodeManaged", False)),
    }


xcode_path = run_text(["xcode-select", "-p"])
xcode_version = run_text(["xcodebuild", "-version"]).replace("\n", " ")
simulators = clean_lines(run_text(["xcrun", "simctl", "list", "devices", "available"]), limit=80)
identities = run_text(["security", "find-identity", "-v", "-p", "codesigning"])
development_identity_count = len(
    re.findall(r"Apple Development|iPhone Developer", identities)
)
distribution_identity_count = len(
    re.findall(r"Apple Distribution|iPhone Distribution", identities)
)

discovered_profiles: list[dict[str, Any]] = []
seen_profile_keys: set[str] = set()
for search_dir in profile_search_dirs:
    directory = Path(search_dir["path"])
    search_dir["exists"] = directory.is_dir()
    search_dir["filesDiscovered"] = 0
    if not directory.is_dir():
        continue
    candidates = sorted(
        path
        for path in directory.rglob("*")
        if path.is_file() and path.suffix in {".mobileprovision", ".provisionprofile"}
    )
    search_dir["filesDiscovered"] = len(candidates)
    for candidate in candidates:
        parsed = parse_profile(candidate, search_dir["kind"])
        if not parsed:
            continue
        key = parsed["uuid"] or parsed["path"]
        if key in seen_profile_keys:
            continue
        seen_profile_keys.add(key)
        discovered_profiles.append(parsed)

for profile in discovered_profiles:
    profile["isIosProfile"] = is_ios_profile(profile)
    profile["isDevelopmentProfile"] = is_development_profile(profile)
    profile["isAppStoreDistributionCandidate"] = is_app_store_distribution_candidate(profile)
    profile["matchesTeamFilter"] = profile_team_matches(profile)
    profile["matchesAppBundleDevelopment"] = (
        profile["matchesTeamFilter"]
        and profile["isDevelopmentProfile"]
        and app_identifier_matches_bundle(profile["appIdentifier"], app_bundle_id, exact=False)
    )
    profile["matchesShareExtensionDevelopment"] = (
        profile["matchesTeamFilter"]
        and profile["isDevelopmentProfile"]
        and app_identifier_matches_bundle(
            profile["appIdentifier"], share_extension_bundle_id, exact=False
        )
    )
    profile["matchesAppBundleAppStore"] = (
        profile["matchesTeamFilter"]
        and profile["isAppStoreDistributionCandidate"]
        and app_identifier_matches_bundle(profile["appIdentifier"], app_bundle_id, exact=True)
    )
    profile["matchesShareExtensionAppStore"] = (
        profile["matchesTeamFilter"]
        and profile["isAppStoreDistributionCandidate"]
        and app_identifier_matches_bundle(
            profile["appIdentifier"], share_extension_bundle_id, exact=True
        )
    )

ios_profiles = [profile for profile in discovered_profiles if profile["isIosProfile"]]
team_filtered_ios_profiles = [
    profile for profile in ios_profiles if profile["matchesTeamFilter"]
]
development_profiles = [
    profile for profile in team_filtered_ios_profiles if profile["isDevelopmentProfile"]
]
development_wildcard_profiles = [
    profile for profile in development_profiles if profile["appIdentifier"].endswith(".*")
]
app_development_profiles = [
    profile for profile in development_profiles if profile["matchesAppBundleDevelopment"]
]
share_development_profiles = [
    profile for profile in development_profiles if profile["matchesShareExtensionDevelopment"]
]
app_development_profiles_with_app_group = [
    profile for profile in app_development_profiles if profile_has_app_group(profile)
]
share_development_profiles_with_app_group = [
    profile for profile in share_development_profiles if profile_has_app_group(profile)
]
app_store_app_profiles = [
    profile for profile in team_filtered_ios_profiles if profile["matchesAppBundleAppStore"]
]
app_store_share_profiles = [
    profile for profile in team_filtered_ios_profiles if profile["matchesShareExtensionAppStore"]
]
app_store_app_profiles_with_app_group = [
    profile for profile in app_store_app_profiles if profile_has_app_group(profile)
]
app_store_share_profiles_with_app_group = [
    profile for profile in app_store_share_profiles if profile_has_app_group(profile)
]

detected_teams = sorted(
    {
        team
        for profile in discovered_profiles
        for team in profile["teamIds"]
        if team
    }
)

development_device_profile_ready = (
    bool(xcode_path)
    and development_identity_count > 0
    and len(app_development_profiles) > 0
    and len(share_development_profiles) > 0
)
development_device_app_group_ready = (
    development_device_profile_ready
    and len(app_development_profiles_with_app_group) > 0
    and len(share_development_profiles_with_app_group) > 0
)
archive_prerequisites_ready = (
    distribution_identity_count > 0
    and len(app_store_app_profiles_with_app_group) > 0
    and len(app_store_share_profiles_with_app_group) > 0
)

archive_status = "skipped"
archive_reason = "Set IOS_DEVELOPMENT_TEAM and IOS_SIGNING_READINESS_ARCHIVE=1 to attempt a local archive dry run."
if archive_requested:
    if not team_id:
        archive_status = "skipped"
        archive_reason = "IOS_SIGNING_READINESS_ARCHIVE=1 was set, but IOS_DEVELOPMENT_TEAM was not provided."
    elif not (root_dir / "AutoByteusMobile.xcodeproj").is_dir():
        archive_status = "skipped"
        archive_reason = "Project has not been generated. Run autobyteus-ios/scripts/generate-project.sh first."
    else:
        archive_path = out_dir / "AutoByteusMobile.xcarchive"
        archive_log = out_dir / "archive.log"
        command = [
            "xcodebuild",
            "-project",
            str(root_dir / "AutoByteusMobile.xcodeproj"),
            "-scheme",
            "AutoByteusMobile",
            "-destination",
            "generic/platform=iOS",
            "-archivePath",
            str(archive_path),
            f"DEVELOPMENT_TEAM={team_id}",
            "archive",
        ]
        with archive_log.open("w", encoding="utf-8") as log_file:
            completed = subprocess.run(
                command,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                check=False,
            )
        if completed.returncode == 0:
            archive_status = "passed"
            archive_reason = "Archive completed locally; no upload attempted. Passing archive supersedes local profile-directory heuristics."
        else:
            archive_status = "failed"
            archive_reason = f"Archive failed; see {archive_log}."

readiness_reasons: list[str] = []
if not xcode_path:
    readiness_reasons.append("Xcode command-line tools not found")
if development_identity_count <= 0:
    readiness_reasons.append("No Apple Development/iPhone Developer signing identity detected")
if len(development_profiles) <= 0:
    readiness_reasons.append("No iOS development provisioning profile detected in configured profile directories")
if len(app_development_profiles) <= 0:
    readiness_reasons.append(
        f"No iOS development provisioning profile detected for app bundle {app_bundle_id} (exact or wildcard)"
    )
if len(share_development_profiles) <= 0:
    readiness_reasons.append(
        f"No iOS development provisioning profile detected for share extension bundle {share_extension_bundle_id} (exact or wildcard)"
    )
if len(app_development_profiles_with_app_group) <= 0:
    readiness_reasons.append(
        f"No app development profile with App Group {app_group_id} detected"
    )
if len(share_development_profiles_with_app_group) <= 0:
    readiness_reasons.append(
        f"No share-extension development profile with App Group {app_group_id} detected"
    )
if distribution_identity_count <= 0:
    readiness_reasons.append("No Apple/iOS Distribution signing identity detected")
if len(app_store_app_profiles) <= 0:
    readiness_reasons.append(
        f"No exact App Store/TestFlight distribution profile detected for app bundle {app_bundle_id}"
    )
if len(app_store_share_profiles) <= 0:
    readiness_reasons.append(
        f"No exact App Store/TestFlight distribution profile detected for share extension bundle {share_extension_bundle_id}"
    )
if len(app_store_app_profiles_with_app_group) <= 0:
    readiness_reasons.append(
        f"No app App Store/TestFlight profile with App Group {app_group_id} detected"
    )
if len(app_store_share_profiles_with_app_group) <= 0:
    readiness_reasons.append(
        f"No share-extension App Store/TestFlight profile with App Group {app_group_id} detected"
    )

if archive_status == "passed":
    readiness = "app-store-archive-dry-run-passed"
elif archive_status == "failed":
    readiness = "app-store-archive-dry-run-failed"
elif archive_prerequisites_ready:
    readiness = "app-store-archive-prerequisites-present-not-archived"
elif development_device_app_group_ready:
    readiness = "development-device-ready-app-store-incomplete"
elif development_device_profile_ready:
    readiness = "development-device-profile-ready-app-group-incomplete"
elif development_identity_count > 0 or len(development_profiles) > 0:
    readiness = "simulator-ready-development-signing-partial"
else:
    readiness = "simulator-ready-signing-assets-missing"

if not readiness_reasons and archive_status != "passed":
    readiness_reasons.append(
        "Development-device and App Store profile/App Group prerequisites appear present; archive dry run was not requested"
    )

profile_summaries = [
    {
        "name": profile["name"],
        "uuid": profile["uuid"],
        "sourceKind": profile["sourceKind"],
        "fileName": profile["fileName"],
        "teamIds": profile["teamIds"],
        "teamName": profile["teamName"],
        "platforms": profile["platforms"],
        "expirationDate": profile["expirationDate"],
        "appIdentifier": profile["appIdentifier"],
        "getTaskAllow": profile["getTaskAllow"],
        "deviceCount": profile["deviceCount"],
        "appGroups": profile["appGroups"],
        "isIosProfile": profile["isIosProfile"],
        "isDevelopmentProfile": profile["isDevelopmentProfile"],
        "isAppStoreDistributionCandidate": profile["isAppStoreDistributionCandidate"],
        "matchesTeamFilter": profile["matchesTeamFilter"],
        "matchesAppBundleDevelopment": profile["matchesAppBundleDevelopment"],
        "matchesShareExtensionDevelopment": profile["matchesShareExtensionDevelopment"],
        "matchesAppBundleAppStore": profile["matchesAppBundleAppStore"],
        "matchesShareExtensionAppStore": profile["matchesShareExtensionAppStore"],
    }
    for profile in discovered_profiles
]

report_lines = [
    "# iOS Signing Readiness",
    "",
    f"Date: {dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
    f"App bundle ID: {app_bundle_id}",
    f"Share extension bundle ID: {share_extension_bundle_id}",
    f"Requested App Group: {app_group_id}",
    f"Development team input: {team_id or 'not provided'}",
    f"Detected provisioning teams: {', '.join(detected_teams) if detected_teams else 'none'}",
    f"Xcode path: {xcode_path or 'not found'}",
    f"Xcode version: {xcode_version or 'not found'}",
    f"Development signing identities detected: {development_identity_count}",
    f"Distribution signing identities detected: {distribution_identity_count}",
    "Provisioning profile search directories:",
]
for search_dir in profile_search_dirs:
    report_lines.append(
        f" - {search_dir['kind']}: {search_dir['path']} "
        f"({'found' if search_dir['exists'] else 'missing'}, files: {search_dir['filesDiscovered']})"
    )
report_lines.extend(
    [
        f"Provisioning profiles discovered: {len(discovered_profiles)}",
        f"iOS provisioning profiles detected: {len(ios_profiles)}",
        f"Team-filtered iOS profiles considered: {len(team_filtered_ios_profiles)}",
        f"iOS development profiles detected: {len(development_profiles)}",
        f"iOS development wildcard profiles detected: {len(development_wildcard_profiles)}",
        f"App development profiles matching bundle exact-or-wildcard: {len(app_development_profiles)}",
        f"App development profiles with requested App Group: {len(app_development_profiles_with_app_group)}",
        f"Share extension development profiles matching bundle exact-or-wildcard: {len(share_development_profiles)}",
        f"Share extension development profiles with requested App Group: {len(share_development_profiles_with_app_group)}",
        f"App Store/TestFlight app profiles matching exact bundle: {len(app_store_app_profiles)}",
        f"App Store/TestFlight app profiles with requested App Group: {len(app_store_app_profiles_with_app_group)}",
        f"App Store/TestFlight share-extension profiles matching exact bundle: {len(app_store_share_profiles)}",
        f"App Store/TestFlight share-extension profiles with requested App Group: {len(app_store_share_profiles_with_app_group)}",
        f"Development-device profile prerequisites complete: {str(development_device_profile_ready).lower()}",
        f"Development-device App Group prerequisites complete: {str(development_device_app_group_ready).lower()}",
        f"Profile/App Group entitlement prerequisites complete: {str(development_device_app_group_ready).lower()}",
        f"App Store/TestFlight archive prerequisites complete without dry run: {str(archive_prerequisites_ready).lower()}",
        f"Archive dry run: {archive_status}",
        f"Archive note: {archive_reason}",
        f"Final readiness classification: {readiness}",
        "Readiness reasons:",
    ]
)
report_lines.extend(f" - {reason}" for reason in readiness_reasons)
report_lines.extend(
    [
        "",
        "Provisioning profile summaries (public metadata only):",
    ]
)
if profile_summaries:
    for profile in profile_summaries:
        report_lines.append(
            " - "
            f"{profile['name'] or profile['fileName']} | uuid {profile['uuid']} | "
            f"source {profile['sourceKind']} | team {','.join(profile['teamIds']) or 'none'} "
            f"{profile['teamName'] or ''} | platforms {','.join(profile['platforms']) or 'unspecified'} | "
            f"app-id {profile['appIdentifier'] or 'none'} | get-task-allow {profile['getTaskAllow']} | "
            f"devices {profile['deviceCount']} | app-groups {','.join(profile['appGroups']) or 'none'} | "
            f"expires {profile['expirationDate'] or 'unknown'}"
        )
else:
    report_lines.append(" - none")
report_lines.extend(
    [
        "",
        "Simulator inventory excerpt:",
        simulators or "not available",
        "",
        "Codesigning identities (public certificate names/hashes only; no private keys):",
        identities or "not available",
    ]
)
report = "\n".join(report_lines) + "\n"
report_path.write_text(report, encoding="utf-8")

data = {
    "appBundleId": app_bundle_id,
    "shareExtensionBundleId": share_extension_bundle_id,
    "requestedAppGroup": app_group_id,
    "developmentTeamProvided": bool(team_id),
    "developmentTeamInput": team_id,
    "detectedProvisioningTeams": detected_teams,
    "xcodePath": xcode_path,
    "xcodeVersion": xcode_version,
    "developmentIdentityCount": development_identity_count,
    "distributionIdentityCount": distribution_identity_count,
    "profileSearchDirectories": profile_search_dirs,
    "profileCount": len(discovered_profiles),
    "iosProfileCount": len(ios_profiles),
    "teamFilteredIosProfileCount": len(team_filtered_ios_profiles),
    "developmentProfileCount": len(development_profiles),
    "developmentWildcardProfileCount": len(development_wildcard_profiles),
    "appProfileCount": len(app_development_profiles),
    "appProfileWithAppGroupCount": len(app_development_profiles_with_app_group),
    "shareExtensionProfileCount": len(share_development_profiles),
    "shareExtensionProfileWithAppGroupCount": len(share_development_profiles_with_app_group),
    "appDevelopmentProfileCount": len(app_development_profiles),
    "appDevelopmentProfileWithAppGroupCount": len(app_development_profiles_with_app_group),
    "shareExtensionDevelopmentProfileCount": len(share_development_profiles),
    "shareExtensionDevelopmentProfileWithAppGroupCount": len(share_development_profiles_with_app_group),
    "appStoreAppProfileCount": len(app_store_app_profiles),
    "appStoreAppProfileWithAppGroupCount": len(app_store_app_profiles_with_app_group),
    "appStoreShareExtensionProfileCount": len(app_store_share_profiles),
    "appStoreShareExtensionProfileWithAppGroupCount": len(app_store_share_profiles_with_app_group),
    "developmentDeviceProfileReady": development_device_profile_ready,
    "developmentDeviceAppGroupReady": development_device_app_group_ready,
    "profileEntitlementsReady": development_device_app_group_ready,
    "archivePrerequisitesReady": archive_prerequisites_ready,
    "archiveStatus": archive_status,
    "archiveReason": archive_reason,
    "readiness": readiness,
    "readinessReasons": readiness_reasons,
    "profileSummaries": profile_summaries,
}
json_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

print(report, end="")
print(f"JSON report: {json_path}")
PY
