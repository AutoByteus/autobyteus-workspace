#!/usr/bin/env python3
"""Validate Linux AppImage updater metadata emitted by electron-builder.

Linux AppImage differential update data is embedded in the AppImage itself and
is represented in `latest-linux*.yml` by a numeric `blockMapSize` field. Unlike
macOS DMG/ZIP outputs, Linux AppImage builds do not publish standalone
`*.AppImage.blockmap` files.
"""

from __future__ import annotations

import argparse
import subprocess
import hashlib
import base64
import json
import re
import sys
from pathlib import Path


APPIMAGE_SUFFIX = ".AppImage"
BLOCKMAP_SUFFIX = ".AppImage.blockmap"


def _strip_yaml_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _file_entries(metadata_text: str) -> list[dict[str, str | int]]:
    entries: list[dict[str, str | int]] = []
    current: dict[str, str | int] | None = None
    in_files = False

    for raw_line in metadata_text.splitlines():
        line = raw_line.rstrip()

        if line == "files:":
            in_files = True
            continue

        if in_files and line and not line.startswith((" ", "-")):
            break

        if not in_files:
            continue

        inline_url = re.match(r"^\s*-\s+url:\s*(.+?)\s*$", line)
        if inline_url:
            if current is not None:
                entries.append(current)
            current = {"url": _strip_yaml_scalar(inline_url.group(1))}
            continue

        item_start = re.match(r"^\s*-\s*$", line)
        if item_start:
            if current is not None:
                entries.append(current)
            current = {}
            continue

        if current is None:
            continue

        field = re.match(r"^\s+([A-Za-z0-9_]+):\s*(.+?)\s*$", line)
        if not field:
            continue

        key = field.group(1)
        value = _strip_yaml_scalar(field.group(2))
        if key == "blockMapSize":
            if not re.fullmatch(r"[1-9][0-9]*", value):
                raise ValueError(f"blockMapSize must be a positive integer, got {value!r}")
            current[key] = int(value)
        else:
            current[key] = value

    if current is not None:
        entries.append(current)

    return entries


def _top_level_path(metadata_text: str) -> str | None:
    for raw_line in metadata_text.splitlines():
        match = re.match(r"^path:\s*(.+?)\s*$", raw_line.rstrip())
        if match:
            return _strip_yaml_scalar(match.group(1))
    return None


def validate(metadata_path: Path, arch_token: str) -> None:
    metadata_text = metadata_path.read_text(encoding="utf-8")

    if BLOCKMAP_SUFFIX in metadata_text:
        raise ValueError(
            f"{metadata_path} references a standalone Linux {BLOCKMAP_SUFFIX} asset; "
            "Linux AppImage blockmaps must be embedded and represented by blockMapSize"
        )

    entries = _file_entries(metadata_text)
    matching_entries = [
        entry
        for entry in entries
        if arch_token in str(entry.get("url", "")) and str(entry.get("url", "")).endswith(APPIMAGE_SUFFIX)
    ]

    if not matching_entries:
        raise ValueError(
            f"{metadata_path} does not contain a files[] AppImage url with architecture token {arch_token!r}"
        )

    entries_with_blockmap_size = [
        entry
        for entry in matching_entries
        if isinstance(entry.get("blockMapSize"), int) and int(entry["blockMapSize"]) > 0
    ]

    if not entries_with_blockmap_size:
        raise ValueError(
            f"{metadata_path} has no {arch_token} AppImage file entry with numeric blockMapSize"
        )

    top_path = _top_level_path(metadata_text)
    if top_path is not None and (arch_token not in top_path or not top_path.endswith(APPIMAGE_SUFFIX)):
        raise ValueError(
            f"{metadata_path} top-level path {top_path!r} does not reference a {arch_token} AppImage"
        )

    print(
        f"Validated {metadata_path}: {arch_token} AppImage metadata includes embedded blockMapSize"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metadata", required=True, type=Path, help="Path to latest-linux*.yml")
    parser.add_argument(
        "--arch-token",
        required=True,
        choices=("linux-x64", "linux-arm64"),
        help="Architecture token that must appear in the AppImage url/path",
    )
    parser.add_argument("--image", type=Path, help="Final AppImage for exact-byte metadata verification")
    parser.add_argument("--public-key", type=Path, help="Require authenticated desktop sidecars with this pinned public key")
    args = parser.parse_args()

    try:
        validate(args.metadata, args.arch_token)
        if args.public_key and not args.image:
            raise ValueError("--public-key requires --image")
        if args.image:
            text = args.metadata.read_text(encoding="utf-8")
            entries = _file_entries(text)
            entry = entries[0] if len(entries) == 1 else None
            if entry is None or entry.get("url") != args.image.name:
                raise ValueError("Metadata does not name this exact final artifact")
            digest = hashlib.sha512()
            with args.image.open("rb") as image:
                for chunk in iter(lambda: image.read(1024 * 1024), b""):
                    digest.update(chunk)
            encoded_digest = base64.b64encode(digest.digest()).decode("ascii")
            if entry.get("sha512") != encoded_digest or int(entry.get("size", -1)) != args.image.stat().st_size:
                raise ValueError("Metadata hash/size differs from final artifact")
            if _top_level_path(text) not in (None, args.image.name):
                raise ValueError("Top-level metadata path differs from final artifact")
            top_hash = re.search(r"^sha512:\s*(.+)$", text, re.M)
            if top_hash and _strip_yaml_scalar(top_hash.group(1)) != encoded_digest:
                raise ValueError("Top-level metadata digest differs from final artifact")
            if args.public_key:
                record = json.loads(Path(str(args.image) + ".release.json").read_text(encoding="utf-8"))
                version_line = re.search(r"^version:\s*(.+)$", text, re.M)
                if not version_line or _strip_yaml_scalar(version_line.group(1)) != record["version"]:
                    raise ValueError("Metadata and signed version differ")
                subprocess.run(["node", str(Path(__file__).parent / "desktop-package/verify-release.mjs"), str(args.image), record["version"], args.arch_token.removeprefix("linux-"), str(args.public_key)], check=True)
    except Exception as exc:  # noqa: BLE001 - CLI should print a concise validation failure.
        print(f"Linux updater metadata validation failed: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
