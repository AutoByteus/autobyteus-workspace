# Case: API-R06, round 2 (real-stack browser probe of Settings → Server Settings → Embedding on the reviewed commit)

- Command: `cd autobyteus-web && env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" COREPACK_HOME=~/.cache/node/corepack node tests/e2e/embedding-settings-probe.mjs --output-dir=<this folder>` (builds the server first)
- Commit tested: `8c283c6acc` (branch `codex/search-model-settings`)
- Environment: Darwin arm64, Node 22.23.1, system Chrome headless; one backend node on a fresh temp data root (removed afterwards), Nuxt dev bound to it; real LEAF-IR downloads
- Date: 2026-10-19
- Result: Pass — 8 of 8 (EMB-001…EMB-008), `browserErrors: []`, cleanup `tempRoot: removed`
- Look for: `result.json` → `"result": "Pass"`; `EMB-006` "A new Task is indexed with no search within 10 s (REQ-011, AC-015)" with `"ms":3257`; screenshots named after the VIS references
