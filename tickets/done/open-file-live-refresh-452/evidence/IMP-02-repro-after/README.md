# Check: IMP-02 (reproduction after the change)
# Command: node evidence/repro/open-viewer-refresh-repro.mjs --output-dir=evidence/IMP-02-repro-after (after pnpm -C autobyteus-server-ts build and pnpm -C autobyteus-web build:mobile-web, IMP-06)
# Commit: base 827f1e68dc + the IR-001 working tree = e0bb6399c7
# Environment: as IMP-01
# Date: 2026-11-11

Files: `repro-stdout.log`, `repro-summary.json`, `server.log`, `frontend.log`, screenshots per case and surface.

Look for, on both surfaces: every case re-read once, 463-521 ms after the change (`contentReadsAfterChangeMs`), and `A` `textAfter8s: "A-VERSION-2"`.
The test PNG is 1-2 px, so `phone-C.png` shows it as a dot; the re-read is the evidence, not the picture.
