# IMP-12 Memory page browser probe (rendered check)

- Command: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" node autobyteus-web/tests/e2e/memory-search-probe.mjs --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --embedding-models /tmp/wjs-eval/index/embeddings/models --output-dir <dir>` (also `pnpm -C autobyteus-web test:e2e:memory-search`)
- Commit: c66708b44b (web and probe); server `dist` built at ecbf5a57bd (IMP-05; server source unchanged since)
- Environment: macOS (Darwin 25.5.0, arm64), Node v22.23.1, headless Google Chrome; probe-owned real stack: built server on a temp data dir with a SQLite database, `pnpm dev` Nuxt, a hand-written memory folder of 4 runs (an agent run over 3 days, a run with a 6,000+ line journal, a Chinese run, an old-format team folder no record names); embedding model files copied from the evaluation's download (no network)
- Date: 2026-10-26
- Result: `Pass`, 21 checks (`memory-search-probe-evidence.json`), no page errors
- Screenshots (desktop 1440×900, narrow 390×844, locale en-GB, UTC), compared with the VIS references of the UI/UX spec: VIS-001, 006, 007, 010, 011, 012, 014, 017, 018, 019, 021, 022, 023, 024. Names, IDs, dates and journal content are the fixture's (permitted variation).
