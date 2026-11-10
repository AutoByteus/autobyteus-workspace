# IMP-11 — reproduction after IR-002 (SR-003)

- Command: `node evidence/repro/file-open-repro.mjs --output-dir=<this folder>`; commit 5f06b08ce9 (phone bundle rebuilt from it; server dist from e470edf165, no server change since); macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2, headless Chrome; 2026-11-09.
- `"D2_newLinkAfterRewrite":"VERSION-TWO-2222"`, `"P2_newLinkAfterRewrite":"VERSION-THREE-3333"`, `"chipKind":"thumbnail"`, **`"thumbnailRequests":[]`** (IMP-08 had one composer draft `status 401`), `"viewerOpen":1`, `"newWindow":null`, the attached file fetched with `status 200`.
