# IMP-09 existing file-open cases with the change (phone and desktop)
# command: cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-16,MSP-28,MSP-29,MSP-30,MSP-31,MSP-37 --output-dir=<this folder>
#          (after pnpm -C autobyteus-server-ts build and pnpm -C autobyteus-web build:mobile-web)
# commit: working tree = the server and web commits of IMP-001 (run before committing)
# env: macOS, Node v22.23.1, Chrome 158 headless, loopback
# date: 2026-11-20
# result: Pass, all six cases. MSP-16 uses the settle check changed in mobile-shell-probe.mjs (a non-text file on its way
#   now says "Loading file…" instead of "Opening…"); MSP-28/30 open images and PDFs on the phone (the node-file loading
#   view); MSP-31/37 are the desktop window's link and Files-panel cases.
