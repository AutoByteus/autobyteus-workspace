#!/usr/bin/env python3
"""Choose the iOS simulator for the release workflow and the simulator smoke (autobyteus-568).

The device named exactly IOS_SIMULATOR_NAME (default "iPhone 17") on the newest available iOS runtime the selected
Xcode can run: a runtime whose version is not above the Xcode's iOS simulator SDK, so a newer beta runtime on the
machine is not picked. When no runtime has that name, the first iPhone on the newest usable runtime, with a notice.

Prints the UDID only on stdout; the chosen "name (iOS X.Y)" and any notice go to stderr. Exit 1 when nothing fits.
Run after the Xcode is selected (DEVELOPER_DIR): it asks that Xcode's `xcrun`.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys

DEFAULT_NAME = "iPhone 17"
RUNTIME_PATTERN = re.compile(r"^com\.apple\.CoreSimulator\.SimRuntime\.iOS-(\d+(?:-\d+)*)$")
USABLE_STATES = {"Shutdown", "Booted"}


def version_tuple(text: str) -> tuple[int, ...]:
    return tuple(int(part) for part in re.split(r"[.-]", text) if part.isdigit())


def usable_runtimes(devices: dict[str, list[dict]], sdk_version: str) -> list[tuple[tuple[int, ...], list[dict]]]:
    """The iOS runtimes not above the SDK, newest first, each with its available devices."""
    bound = version_tuple(sdk_version)
    runtimes = []
    for key, runtime_devices in devices.items():
        match = RUNTIME_PATTERN.match(key)
        if not match:
            continue
        version = version_tuple(match.group(1))
        if version <= bound:
            available = [
                device for device in runtime_devices
                if device.get("isAvailable", True) and device.get("state") in USABLE_STATES
            ]
            runtimes.append((version, available))
    return sorted(runtimes, key=lambda runtime: runtime[0], reverse=True)


def choose(devices: dict[str, list[dict]], sdk_version: str, wanted: str) -> tuple[dict, tuple[int, ...], bool] | None:
    """(device, runtime version, exact) for the wanted name, else the first iPhone; None when there is no iPhone."""
    runtimes = usable_runtimes(devices, sdk_version)
    for version, available in runtimes:
        for device in available:
            if device.get("name") == wanted:
                return device, version, True
    for version, available in runtimes:
        for device in available:
            if str(device.get("name", "")).startswith("iPhone"):
                return device, version, False
    return None


def xcrun(*args: str) -> str:
    return subprocess.run(["xcrun", *args], check=True, capture_output=True, text=True).stdout


def main() -> int:
    wanted = os.environ.get("IOS_SIMULATOR_NAME") or DEFAULT_NAME
    sdk_version = xcrun("--sdk", "iphonesimulator", "--show-sdk-version").strip()
    devices = json.loads(xcrun("simctl", "list", "devices", "available", "-j")).get("devices", {})
    chosen = choose(devices, sdk_version, wanted)
    if chosen is None:
        print(f"::error::No available iOS simulator found (iOS runtimes up to the iOS {sdk_version} simulator SDK).", file=sys.stderr)
        return 1
    device, version, exact = chosen
    runtime = ".".join(str(part) for part in version)
    if not exact:
        print(f"No '{wanted}' simulator; using '{device['name']}' (iOS {runtime}).", file=sys.stderr)
    print(f"Selected simulator: {device['name']} (iOS {runtime}), UDID {device['udid']}", file=sys.stderr)
    print(device["udid"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
