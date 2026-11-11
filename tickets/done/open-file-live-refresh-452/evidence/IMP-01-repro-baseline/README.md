# Check: IMP-01 (reproduction before the change)
# Command: node evidence/repro/open-viewer-refresh-repro.mjs --output-dir=evidence/IMP-01-repro-baseline (after pnpm -C autobyteus-server-ts build and pnpm -C autobyteus-web build:mobile-web)
# Commit: 827f1e68dc (base, no change)
# Environment: macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2; isolated node from this worktree, headless Chrome (nuxt dev desktop window and the node's /mobile bundle)
# Date: 2026-11-11

Files: `repro-stdout.log` (the `desktop` and `phone` result lines), `server.log`, `frontend.log`, screenshots per case and surface.

Look for, on both surfaces: `A` `textAfter8s: "A-VERSION-1"` and `contentReadsAfterChangeMs: []`; `C` and `D` `contentReadsAfterChangeMs: []`; the controls `B` and `E` re-read in about 0.5 s.
