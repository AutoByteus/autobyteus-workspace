# IMP-10 — Rendered check of Settings → Agent Runtimes (implementation self-validation)

- Date: 2026-10-20. macOS (darwin arm64), headless Chromium tab 739×738 CSS px (wide table inspected with `document.documentElement.style.zoom = 0.5`).
- Surface: `pnpm dev` from the worktree (TESTING.md / README "Local full-stack development"): built backend http://127.0.0.1:8000, Nuxt dev http://127.0.0.1:3000/settings?section=agent-runtimes; data root `<worktree>/.autobyteus/development/`.
- Runtimes: scripted fakes in `/tmp/rlr-fakes` (outside the repo) selected through the existing overrides `CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`, and `CLAUDE_CONFIG_DIR=/tmp/rlr-fakes/claude-config`. The Codex fake answers app-server `initialize`/`account/read` over stdio; its `login` prints a URL containing `FAKE-SECRET` and waits for a state file. No real runtime, install or account was used. Latest-version sources were the real public ones (read-only GETs): GitHub said Codex 0.163.0, downloads.claude.ai said 2.1.304, the Antigravity manifest said 1.4.3.
- Commit: working tree on top of `aac5da3112` (before the IR-001 commit; the code is the IR-001 code except the later Sign-in-disabled-while-updating polish, which is covered by the web spec).

| Step | Observed (DOM sample or API) | Screenshot |
| --- | --- | --- |
| Open page (zh-CN browser locale) at 739 px | Before the fix the five fixed columns (46rem) did not fit; Updates collapsed and overlapped Account | IMP-10a |
| After the container-query fix, 739 px | list width 518 px, column header `display: none`, rows stacked with labels, `scrollWidth > innerWidth` = false | IMP-10b |
| Same, zoom 0.5 (wide) | column header `display: grid`; table as VIS-001 | IMP-10c |
| English, Grok fake "not installed" | rows `update_available, update_available, up_to_date, not_installed`; "Install instructions ↗" + "After installing, restart AutoByteus."; Antigravity "Not signed in" + "Sign in from its command line."; header "Checked just now" | IMP-10d |
| Update Codex | `data-state` `update_running`; button "Updating…"; progress `codex update` | IMP-10e |
| Mid-update DOM sample (second run) | progress `codex update · Downloading codex 0.163.0…` | — |
| Update finished | `0.163.0`, "Up to date", "Updated from 0.150.0 to 0.163.0." | IMP-10f |
| Update Claude (fake fails) | "Update failed. Version 2.1.200 is unchanged." + vendor output box; button "Try again"; status still "Update available (version 2.1.304)" | IMP-10g |
| Sign in Codex | button "Signing in…", line "Finish signing in to Codex in your browser." + Cancel; API `operation {kind: SIGN_IN, state: RUNNING, command: null, step: null}` | IMP-10h, IMP-10i |
| Secret scan while signing in | `grep -c FAKE-SECRET` → API response 0, every file under `server-data/logs/` 0, dev stdout 0 | — |
| Cancel | `pgrep -fl "rlr-fakes/bin/codex login"` → none; API operation `None`, account `SIGNED_OUT` | — |
| Sign in again, fake completes | API account `SIGNED_IN`, operation `None`; DOM account "Signed in", no Sign in button, live region "Codex is signed in." | — |
| Check again after a failed update | Claude's failure cleared; rows re-read | — |
