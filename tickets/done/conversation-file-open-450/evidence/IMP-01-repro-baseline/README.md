# IMP-01 — reproduction before the change

- Command: `node evidence/repro/file-open-repro.mjs --output-dir=<this folder>`; commit 6884309283 (server and phone bundle as the Solution Designer built them); macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2, headless Chrome; 2026-11-09.
- `"D2_newLinkAfterRewrite":"VERSION-ONE-1111"`, `"P2_newLinkAfterRewrite":"VERSION-TWO-2222"`, `"chipKind":"name-chip"`, three image requests with `status 401`, and the tap opens `"newWindow":"/rest/runs/…/attach-450.png"` (a document, 401).
