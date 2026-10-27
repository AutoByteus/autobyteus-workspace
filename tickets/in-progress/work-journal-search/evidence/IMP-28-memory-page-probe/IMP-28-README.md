# IMP-28 Memory page browser probe after SR-006 (rendered check of the Product revision)

- Command: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" node autobyteus-web/tests/e2e/memory-search-probe.mjs --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --embedding-models /tmp/wjs-eval/index/embeddings/models --output-dir <dir>`
- Commit: 606d13b937 (web and probe; source as e7a15930c3); server `dist` built at e7a15930c3 (IMP-26)
- Environment: macOS (Darwin 25.5.0, arm64), Node v22.23.1, headless Google Chrome; probe-owned real stack (built server on a temp data dir, `pnpm dev` Nuxt, a hand-written memory folder of 4 runs); embedding model files copied from the evaluation's download (no network)
- Date: 2026-10-27
- Result: `Pass`, 23 checks (`memory-search-probe-evidence.json`), no page errors. New or changed checks:
  - MS-PROBE-021: a text match shows `Words: …` with its found words and lines, and no grade (no Strong / Fair / Weak, no Meaning label).
  - MS-PROBE-025: the off-topic cue's words are named in the amber `None of these words appear in your memory: purple, elephant, saxophone.`.
  - MS-PROBE-026: `DDNS updater saxophone` shows the gray `Not found in your memory: saxophone.`, and its text matches list their words.
- Screenshots, compared with the revised VIS references (design repository `a0b6410395`):
  - VIS-006 and VIS-022 (narrow): the `Words:` pill on text matches only (wrapping under the file line when narrow), `run ID · workspace` on one line, dates without "Mentioned", a match day only when the card's date does not say it, no Open line.
  - VIS-007: the amber note, with meaning matches that carry no label.
  - VIS-025: the gray note.
  - VIS-017 and VIS-024: the banner `lines 41–64 · Words: ddns, updater, domain`.
  - Unchanged states: VIS-001, 010, 011, 012, 014, 018, 019, 021, 023.
  - Names, IDs, dates and journal content are the fixture's, a permitted variation. The fixture runs have no workspace, so no `· workspace` part shows.
- Not rendered by the probe: VIS-026 (a Work Journal opened from a meaning match: the banner shows only the lines). The WorkJournalTab spec covers its banner rule.
