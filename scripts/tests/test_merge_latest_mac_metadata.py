import tempfile
import unittest
import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "merge_latest_mac_metadata.py"
SPEC = importlib.util.spec_from_file_location("merge_latest_mac_metadata", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load merge_latest_mac_metadata module")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

merge_latest_mac_metadata = MODULE.merge_latest_mac_metadata
parse_latest_mac_metadata = MODULE.parse_latest_mac_metadata
write_latest_mac_metadata = MODULE.write_latest_mac_metadata


ARM64_SAMPLE = """version: 1.2.10
files:
  - url: AutoByteus_personal_macos-arm64-1.2.10.zip
    sha512: ARM_ZIP_SHA
    size: 100
  - url: AutoByteus_personal_macos-arm64-1.2.10.dmg
    sha512: ARM_DMG_SHA
    size: 110
path: AutoByteus_personal_macos-arm64-1.2.10.zip
sha512: ARM_ZIP_SHA
releaseDate: '2026-03-04T12:18:04.562Z'
"""


X64_SAMPLE = """version: 1.2.10
files:
  - url: AutoByteus_personal_macos-x64-1.2.10.zip
    sha512: X64_ZIP_SHA
    size: 120
  - url: AutoByteus_personal_macos-x64-1.2.10.dmg
    sha512: X64_DMG_SHA
    size: 130
path: AutoByteus_personal_macos-x64-1.2.10.zip
sha512: X64_ZIP_SHA
releaseDate: '2026-03-04T12:18:05.123Z'
"""


class MergeLatestMacMetadataTest(unittest.TestCase):
    def test_merge_contains_both_arch_zip_entries(self) -> None:
        arm = parse_latest_mac_metadata(_write_temp_file(ARM64_SAMPLE))
        x64 = parse_latest_mac_metadata(_write_temp_file(X64_SAMPLE))

        merged = merge_latest_mac_metadata(arm, x64)

        urls = [entry["url"] for entry in merged["files"]]
        self.assertIn("AutoByteus_personal_macos-arm64-1.2.10.zip", urls)
        self.assertIn("AutoByteus_personal_macos-x64-1.2.10.zip", urls)
        self.assertEqual("1.2.10", merged["version"])
        self.assertEqual("AutoByteus_personal_macos-arm64-1.2.10.zip", merged["path"])

    def test_merge_fails_when_x64_zip_missing(self) -> None:
        arm = parse_latest_mac_metadata(_write_temp_file(ARM64_SAMPLE))
        x64_missing_zip = parse_latest_mac_metadata(
            _write_temp_file(
                """version: 1.2.10
files:
  - url: AutoByteus_personal_macos-x64-1.2.10.dmg
    sha512: X64_DMG_SHA
    size: 130
path: AutoByteus_personal_macos-x64-1.2.10.dmg
sha512: X64_DMG_SHA
releaseDate: '2026-03-04T12:18:05.123Z'
"""
            )
        )

        with self.assertRaisesRegex(ValueError, "macos-x64 zip entry"):
            merge_latest_mac_metadata(arm, x64_missing_zip)

    def test_write_round_trip_preserves_dual_arch_entries(self) -> None:
        arm = parse_latest_mac_metadata(_write_temp_file(ARM64_SAMPLE))
        x64 = parse_latest_mac_metadata(_write_temp_file(X64_SAMPLE))
        merged = merge_latest_mac_metadata(arm, x64)

        with tempfile.TemporaryDirectory() as tmp_dir:
            output = Path(tmp_dir) / "latest-mac.yml"
            write_latest_mac_metadata(output, merged)
            parsed = parse_latest_mac_metadata(output)

        urls = [entry["url"] for entry in parsed["files"]]
        self.assertEqual(len(parsed["files"]), 4)
        self.assertTrue(any("macos-arm64" in url and url.endswith(".zip") for url in urls))
        self.assertTrue(any("macos-x64" in url and url.endswith(".zip") for url in urls))


def _write_temp_file(contents: str) -> Path:
    temp_dir = tempfile.mkdtemp(prefix="merge-latest-mac-")
    path = Path(temp_dir) / "latest-mac.yml"
    path.write_text(contents, encoding="utf-8")
    return path


if __name__ == "__main__":
    unittest.main()
