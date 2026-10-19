# Check: IMP-20 (real-stack browser probe of Settings → Server Settings → Embedding, IR-003)

- Command: `cd autobyteus-web && env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" COREPACK_HOME=<corepack cache> node tests/e2e/embedding-settings-probe.mjs --output-dir=<this folder>` (builds the server first)
- Commit tested: 1b24f59009 (branch codex/search-model-settings; code 70bb03632c + probe case EMB-006 for AC-015)
- Environment: Darwin arm64, node v22.23.1, headless Chrome 155.0.8059.84; one backend node on a fresh temp data root (removed afterwards), Nuxt dev bound to it; real downloads of MongoDB LEAF-IR from huggingface.co
- Date: 2026-10-19 (run 12:08:58Z–12:09:48Z)
- Result: Pass — 8 of 8 cases, no browser errors, cleanup complete (`result.json`). EMB-006 (AC-015): the save returned in < 1 s and the Project showed Ready · 4 Tasks with no search `indexedAfterWriteMs` = 3106 ms after the save
- Look for: `result.json` (`cases`, `indexedAfterWriteMs`); screenshots named after the visual references; `backend.log`
