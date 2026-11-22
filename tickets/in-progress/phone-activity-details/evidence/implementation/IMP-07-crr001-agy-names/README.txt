# IMP-07 CRR-001 F-1: Antigravity's TargetFile, DirectoryPath, Query and Pattern in the shared summary
# command: NUXT_TEST=true pnpm exec vitest run (whole web suite) ; pnpm -C autobyteus-web typecheck ;
#          pnpm -C autobyteus-web build:mobile-web ; node tests/e2e/mobile-shell-probe.mjs --cases=MSP-94,MSP-95,MSP-96,MSP-97 --output-dir=<this folder>
# commit: working tree = 70f7040ee1 (run before committing; same files)
# env: macOS, Node v22.23.1, Chrome headless 390x844, scripted AGY (mcp_calls, auto_compaction, linked_skills, native_arguments)
# date: 2026-11-22
# result: Pass. MSP-97 (API/E2E's case, which failed on F-1): every native AGY row shows its summary:
#   write_to_file and both replace_file_content: workspace/marker.txt (TargetFile; the full path in the title);
#   view_file: workspace/marker.txt; grep_search: AFTER (Query); find_by_name: *.txt (Pattern); list_dir: kappa/workspace
#   (DirectoryPath); run_command: its command. MSP-94, MSP-95, MSP-96 still pass. (MSP-97-native-tool-rows.png)

[typecheck] production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)
[typecheck] PASS
 Test Files  796 passed (796)
      Tests  6046 passed (6046)
[mobile-shell] MSP-94 Pass
[mobile-shell] MSP-95 Pass
[mobile-shell] MSP-96 Pass
[mobile-shell] MSP-97 Pass
mobile-shell probe: Pass
