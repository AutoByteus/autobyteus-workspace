# Case: API-R06 (real-stack browser probe of Settings → Server Settings → Embedding, rerun on the reviewed commit)

- Command: `cd autobyteus-web && env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" COREPACK_HOME=~/.cache/node/corepack node tests/e2e/embedding-settings-probe.mjs --output-dir=<this folder>` (builds the server first)
- Commit tested: `d2bcb95d3a` (branch `codex/search-model-settings`)
- Environment: Darwin arm64, Node 22.23.1, system Chrome headless; one backend node on a fresh temp data root (removed afterwards), Nuxt dev bound to it; real downloads of MongoDB LEAF-IR from huggingface.co
- Date: 2026-10-19
- Result: Pass — 8 of 8 cases (EMB-001…EMB-008), `browserErrors: []`, cleanup `{"browser":"closed","frontend":"terminated:…","backend":"terminated:…","tempRoot":"removed"}`
- Look for: `result.json` → `"result": "Pass"` and each `EMB-00x` case; screenshots named after the visual references they compare with (VIS-001 fresh / after restart, VIS-002, VIS-004, VIS-005, VIS-006, VIS-009, VIS-010, VIS-017, VIS-020, VIS-021); `backend.log` shows the downloads and indexing
