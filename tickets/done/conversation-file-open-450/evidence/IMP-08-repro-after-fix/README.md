# IMP-08 — reproduction after the fix

- Command: `node evidence/repro/file-open-repro.mjs --output-dir=<this folder>`; commit e470edf165 (builds IMP-09; the desktop window runs `nuxt dev` on the same source); macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2, headless Chrome; 2026-11-09.
- Desktop: `"D2_newLinkAfterRewrite":"VERSION-TWO-2222"` (was ONE). Phone: `"P2_newLinkAfterRewrite":"VERSION-THREE-3333"` (was TWO).
- Phone attachment: `"chipKind":"thumbnail"`; tap → `"phoneUrl":"/mobile/?screen=files&contextFile=/rest/runs/…/ctx_…__attach-450.png&contextFileName=attach-450.png"`, `"viewerOpen":1`, `"newWindow":null`, the file fetched (`status 200, type fetch`).
- Still one `status 401` image request: `/rest/drafts/…/attach-450.png`, the **composer's** draft preview before sending (`ContextFilePathInputArea.vue`), outside the design's scope: DI-001 in the handoff.
- Screenshots: `phone-bug1-chip.png` (thumbnail), `phone-bug1-after-tap.png` (viewer; the test PNG is 1×1 px).
