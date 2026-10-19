# Check: IMP-07 (real-stack browser probe of Settings → Server Settings → Embedding)

- Command: `cd autobyteus-web && env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" COREPACK_HOME=<corepack cache> node tests/e2e/embedding-settings-probe.mjs --output-dir=<this folder>` (builds the server first)
- Commit tested: 8469d4bcf5 (branch codex/search-model-settings)
- Environment: Darwin arm64, node v22.23.1, headless Chrome 155.0.8059.84; one backend node on a fresh temp data root (removed afterwards), Nuxt dev bound to it; real downloads of MongoDB LEAF-IR from huggingface.co
- Date: 2026-10-19 (run 09:50:45Z–09:51:52Z)
- Result: Pass — 8 of 8 cases (EMB-001…EMB-008), no browser errors, all owned processes and the temp root cleaned up (`result.json`)
- Look for: `result.json` cases; screenshots named after the visual references they compare with (VIS-001 fresh / after restart, VIS-002, VIS-004, VIS-005, VIS-006, VIS-009, VIS-010, VIS-017, VIS-020, VIS-021); `backend.log` shows the downloads and indexing
