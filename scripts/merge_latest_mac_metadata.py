#!/usr/bin/env python3
"""Merge arm64 + x64 latest-mac.yml metadata into one canonical file."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict, List


def _coerce_scalar(raw: str) -> Any:
    value = raw.strip().strip("'").strip('"')
    if value.isdigit():
        return int(value)
    return value


def parse_latest_mac_metadata(path: Path) -> Dict[str, Any]:
    lines = path.read_text(encoding="utf-8").splitlines()
    data: Dict[str, Any] = {}
    files: List[Dict[str, Any]] = []
    current_file: Dict[str, Any] | None = None
    in_files = False

    for line in lines:
        if not line.strip():
            continue

        if line.strip() == "files:":
            in_files = True
            continue

        if in_files:
            if line.startswith("  - "):
                if current_file is not None:
                    files.append(current_file)
                current_file = {}
                raw = line.strip()[2:]
                if ": " not in raw:
                    raise ValueError(f"Invalid file entry in {path}: {line}")
                key, value = raw.split(": ", 1)
                current_file[key] = _coerce_scalar(value)
                continue

            if line.startswith("    "):
                if current_file is None:
                    raise ValueError(f"Found file field without file item in {path}: {line}")
                raw = line.strip()
                if ": " not in raw:
                    raise ValueError(f"Invalid file field in {path}: {line}")
                key, value = raw.split(": ", 1)
                current_file[key] = _coerce_scalar(value)
                continue

            if current_file is not None:
                files.append(current_file)
                current_file = None
            in_files = False

        if ": " in line:
            key, value = line.split(": ", 1)
            data[key.strip()] = _coerce_scalar(value)

    if in_files and current_file is not None:
        files.append(current_file)

    if not files:
        raise ValueError(f"No files entries found in {path}")
    if "version" not in data:
        raise ValueError(f"Missing version in {path}")

    data["files"] = files
    return data


def merge_latest_mac_metadata(arm64_data: Dict[str, Any], x64_data: Dict[str, Any]) -> Dict[str, Any]:
    arm64_version = str(arm64_data.get("version"))
    x64_version = str(x64_data.get("version"))
    if arm64_version != x64_version:
        raise ValueError(f"Version mismatch: arm64={arm64_version} x64={x64_version}")

    merged_files: List[Dict[str, Any]] = []
    seen_urls = set()
    for file_info in [*arm64_data["files"], *x64_data["files"]]:
        url = str(file_info.get("url", "")).strip()
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        merged_files.append(dict(file_info))

    if not merged_files:
        raise ValueError("Merged metadata produced no files entries")

    def has_arch_zip(arch_fragment: str) -> bool:
        return any(
            str(file_info.get("url", "")).endswith(".zip") and arch_fragment in str(file_info.get("url", ""))
            for file_info in merged_files
        )

    if not has_arch_zip("macos-arm64"):
        raise ValueError("Merged metadata missing macos-arm64 zip entry")
    if not has_arch_zip("macos-x64"):
        raise ValueError("Merged metadata missing macos-x64 zip entry")

    path_value = str(arm64_data.get("path", "")).strip()
    top_level_sha = str(arm64_data.get("sha512", "")).strip()

    if not path_value:
        for file_info in merged_files:
            url = str(file_info.get("url", ""))
            if url.endswith(".zip"):
                path_value = url
                break

    if not top_level_sha:
        for file_info in merged_files:
            if str(file_info.get("url", "")) == path_value:
                top_level_sha = str(file_info.get("sha512", "")).strip()
                break

    if not path_value or not top_level_sha:
        raise ValueError("Unable to determine canonical path/sha512 for merged metadata")

    release_date = max(str(arm64_data.get("releaseDate", "")), str(x64_data.get("releaseDate", ""))).strip()
    if not release_date:
        raise ValueError("Missing releaseDate in source metadata")

    return {
        "version": arm64_version,
        "files": merged_files,
        "path": path_value,
        "sha512": top_level_sha,
        "releaseDate": release_date,
    }


def write_latest_mac_metadata(path: Path, metadata: Dict[str, Any]) -> None:
    lines: List[str] = [f"version: {metadata['version']}", "files:"]
    known_file_keys = {"url", "sha512", "size", "blockMapSize"}

    for file_info in metadata["files"]:
        url = str(file_info["url"])
        lines.append(f"  - url: {url}")
        for key in ("sha512", "size", "blockMapSize"):
            if key in file_info:
                lines.append(f"    {key}: {file_info[key]}")
        for key in sorted(file_info.keys()):
            if key in known_file_keys:
                continue
            lines.append(f"    {key}: {file_info[key]}")

    lines.append(f"path: {metadata['path']}")
    lines.append(f"sha512: {metadata['sha512']}")
    lines.append(f"releaseDate: '{metadata['releaseDate']}'")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arm64", required=True, help="Path to arm64 latest-mac.yml")
    parser.add_argument("--x64", required=True, help="Path to x64 latest-mac.yml")
    parser.add_argument("--output", required=True, help="Path to merged latest-mac.yml output")
    args = parser.parse_args()

    arm64_path = Path(args.arm64)
    x64_path = Path(args.x64)
    output_path = Path(args.output)

    if not arm64_path.exists():
        raise FileNotFoundError(f"Missing arm64 metadata file: {arm64_path}")
    if not x64_path.exists():
        raise FileNotFoundError(f"Missing x64 metadata file: {x64_path}")

    arm64_data = parse_latest_mac_metadata(arm64_path)
    x64_data = parse_latest_mac_metadata(x64_path)
    merged = merge_latest_mac_metadata(arm64_data, x64_data)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    write_latest_mac_metadata(output_path, merged)
    print(f"Merged mac metadata written to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
