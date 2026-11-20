# IMP-13 the phone's existing file-open cases with D-7 (MobileFiles and MobileFileViewer changed)
# command: cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-16,MSP-28,MSP-29,MSP-30 --output-dir=<this folder>
# commit: working tree = f2894c65e1 (run before committing)
# env: macOS, Node v22.23.1, Chrome 158 headless, loopback
# date: 2026-11-20
# result: Pass, all four (files inside and outside the folder, attachments, a path on another node, reopen after rewrite).
#   The desktop cases (MSP-31, MSP-37, MSP-90) were not rerun: D-7 changes only phone components.
