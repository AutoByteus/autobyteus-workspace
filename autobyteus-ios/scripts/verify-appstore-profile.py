#!/usr/bin/env python3
"""Verify a decoded App Store provisioning profile before iOS CI publish."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import plistlib
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def error(message: str) -> None:
    prefix = "::error::" if os.environ.get("GITHUB_ACTIONS") == "true" else "error: "
    print(f"{prefix}{message}", file=sys.stderr)


def fail(message: str) -> None:
    error(message)
    raise SystemExit(1)


def decode_profile(path: Path) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            ["security", "cms", "-D", "-i", str(path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except OSError as exc:
        fail(f"Unable to run security cms for {path.name}: {exc}")
    if completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="replace").strip()
        fail(f"Unable to decode provisioning profile {path.name}: {stderr or 'security cms failed'}")
    try:
        return plistlib.loads(completed.stdout)
    except Exception as exc:  # pragma: no cover - defensive for malformed profiles
        fail(f"Decoded provisioning profile {path.name} is not a readable plist: {exc}")


def list_value(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def iso_date(value: Any) -> str:
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone.utc)
        return value.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return str(value) if value else ""


def app_identifier_from(entitlements: dict[str, Any]) -> str:
    value = entitlements.get("application-identifier")
    if not value:
        value = entitlements.get("com.apple.application-identifier")
    return str(value) if value else ""


def verify_profile(profile: dict[str, Any], *, label: str, team_id: str, bundle_id: str) -> dict[str, Any]:
    entitlements = profile.get("Entitlements") or {}
    app_identifier = app_identifier_from(entitlements)
    team_ids = [str(item) for item in list_value(profile.get("TeamIdentifier"))]
    platforms = [str(item) for item in list_value(profile.get("Platform"))]
    profile_name = str(profile.get("Name") or "")
    uuid = str(profile.get("UUID") or "")
    expiration = profile.get("ExpirationDate")
    device_count = len(list_value(profile.get("ProvisionedDevices")))
    provisions_all_devices = bool(profile.get("ProvisionsAllDevices", False))
    get_task_allow = entitlements.get("get-task-allow")

    if not uuid:
        fail(f"{label} profile is missing UUID")
    if "iOS" not in platforms and "iPhoneOS" not in platforms:
        fail(f"{label} profile {profile_name or uuid} is not an iOS profile (platforms: {platforms or ['none']})")
    if team_id not in team_ids:
        fail(f"{label} profile {profile_name or uuid} does not include team {team_id}; found {team_ids or ['none']}")
    expected_identifier = f"{team_id}.{bundle_id}"
    if app_identifier != expected_identifier:
        fail(
            f"{label} profile {profile_name or uuid} application-identifier must be {expected_identifier}; "
            f"found {app_identifier or 'none'}"
        )
    if get_task_allow is not False:
        fail(f"{label} profile {profile_name or uuid} must have get-task-allow=false for App Store export")
    if device_count > 0:
        fail(f"{label} profile {profile_name or uuid} contains provisioned devices and is not an App Store profile")
    if provisions_all_devices:
        fail(f"{label} profile {profile_name or uuid} provisions all devices and is not an App Store profile")
    if not isinstance(expiration, dt.datetime):
        fail(f"{label} profile {profile_name or uuid} is missing a valid expiration date")
    expiration_utc = expiration.replace(tzinfo=dt.timezone.utc) if expiration.tzinfo is None else expiration.astimezone(dt.timezone.utc)
    if expiration_utc <= dt.datetime.now(dt.timezone.utc):
        fail(f"{label} profile {profile_name or uuid} expired at {iso_date(expiration_utc)}")

    app_groups = [str(item) for item in list_value(entitlements.get("com.apple.security.application-groups"))]
    return {
        "label": label,
        "name": profile_name,
        "uuid": uuid,
        "teamIds": team_ids,
        "teamName": str(profile.get("TeamName") or ""),
        "bundleId": bundle_id,
        "appIdentifier": app_identifier,
        "platforms": platforms,
        "expirationDate": iso_date(expiration_utc),
        "appGroups": app_groups,
        "getTaskAllow": get_task_allow,
        "deviceCount": device_count,
        "provisionsAllDevices": provisions_all_devices,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True, type=Path)
    parser.add_argument("--team-id", required=True)
    parser.add_argument("--bundle-id", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--install-dir", type=Path)
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()

    if not args.profile.is_file():
        fail(f"{args.label} profile file does not exist: {args.profile}")

    profile = decode_profile(args.profile)
    summary = verify_profile(
        profile,
        label=args.label,
        team_id=args.team_id,
        bundle_id=args.bundle_id,
    )

    if args.install_dir:
        args.install_dir.mkdir(parents=True, exist_ok=True)
        installed_path = args.install_dir / f"{summary['uuid']}.mobileprovision"
        shutil.copyfile(args.profile, installed_path)
        installed_path.chmod(0o600)
        summary["installedPath"] = str(installed_path)

    payload = json.dumps(summary, indent=2) + "\n"
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(payload, encoding="utf-8")
    print(payload, end="")


if __name__ == "__main__":
    main()
