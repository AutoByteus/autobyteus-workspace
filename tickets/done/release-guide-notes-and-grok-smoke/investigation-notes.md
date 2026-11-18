# Investigation Notes — autobyteus-355 (RELEASE.md: beta notes with user actions; Grok in the release smoke check)

## Investigation Meta

- Package: `release-guide-notes-and-grok-smoke`
- Task: `autobyteus-355` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-guide-notes-and-grok-smoke`, branch `codex/release-guide-notes-and-grok-smoke`, base `origin/personal` @ `efd28d5c4a` (fetched 2026-11-01), target `personal`
- Authorities read:
  - `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md` (read in this conversation);
  - `SKILL.md` re-read after the 2026-10-31 update;
  - `RELEASE.md`, `DESIGN.md`, `TESTING.md` (read in this conversation).
- Status: complete

## Source Log

| ID | Source | Finding | Established |
| --- | --- | --- | --- |
| E-01 | `RELEASE.md:82-86, 337-341` | A beta uses GitHub's generated notes; a stable uses the curated notes copied from the ticket's `release-notes.md` to `.github/release-notes/release-notes.md` | Read |
| E-02 | `.github/workflows/release-desktop.yml:636-705` | A pre-release tag always takes `generate_release_notes: true`, because the curated file persists after each stable release; a stable takes `body_path` | Read |
| E-03 | `scripts/desktop-release.sh:21-25` | `beta` writes no notes file | Read |
| E-04 | `.github/release-notes/template.md` | Sections: What's New / Improvements / Fixes; no place for user actions | Read |
| E-05 | `tickets/done/release-v1.5.11-beta.8/release-deployment-report.md:16-22, 69` | Delivery added a section above the generated notes with `gh release edit` after all four workflows finished; no asset or tag changed; recorded as a deviation (also beta.6, beta.7) | Read |
| E-06 | `gh release view v1.5.11-beta.8` body | The hand-added section held full "What's new" text plus the user actions (Docker update while idle; reinstall the launcher; update nodes with the desktop) | Read |
| E-07 | `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts:45-55, 98-145` | Model pins `haiku`, `gpt-5.6-luna`, `grok-4.7` (overrides `*_E2E_MODEL`). One top-level `beforeAll` checks each enabled runtime's catalog (`providerModelCatalogSnapshots`) and **throws** when a pin is not offered ("there is no fallback", header line 27). So one runtime's miss fails the whole suite's setup | Read |
| E-08 | `scripts/release_smoke.py:14-17, 149-243` | Fail-closed runner: every required case must pass. A suite whose `beforeAll` threw has all tests `skipped`; `failed_suite_error` takes the error from the log and attaches it to every skipped case. `read_models` reads one `SKILL_LINKS_LIVE_MODELS {…}` line. `scripts/tests/test_release_smoke.py` has 20 unit tests | Read |
| E-09 | `tickets/done/release-v1.5.11-beta.8/evidence/REL-01-…` | Run 1: every Claude, Codex and Grok case skipped with "grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6". Run 2 (`GROK_E2E_MODEL=grok-4.6`): "available: grok-4.7". Run 3 passed | Read |
| E-10 | `autobyteus-server-ts/src/runtime-management/grok/grok-build-launch-profile.ts:46-89`, `grok-build-capability.ts:111-130` | The server reads Grok's models from the CLI's ACP `initialize._meta.modelState.availableModels` (fresh handshake, no cache); `grok agent --no-leader [--model …] stdio`; `GROK_BUILD_COMMAND` overrides the command | Read |
| E-11 | `~/.grok/models_cache.json` (structure only) | The CLI caches its list from `https://cli-chat-proxy.grok.com/v1/models` per account (`identity`, `etag`, `fetched_at` refreshed on use) | Read (keys only; no secret values printed) |
| E-12 | probe `/tmp/ab305-run/grok-models-probe.mjs` (ACP `initialize` only, 8 times, 2026-11-01) | Every answer `["grok-4.7"]`, `currentModelId: grok-4.7`, 190–320 ms; no tokens | Reproduced |
| E-13 | FU-005 of `tickets/done/work-journal-neutral-vocabulary/follow-ups.md` | The same flip at beta.5; cause unknown | Read |

## Findings

- **F-01 (cause, Read):** the whole live suite stops because model availability is checked in one shared `beforeAll` (E-07); the runner then marks every runtime's cases failed (E-08, E-09).
- **F-02 (cause, outside our code):** Grok's offered models are decided by xAI's server per account and moment (E-10..E-13). Flips are rare but real, so a fixed Grok pin with no fallback will fail again.
- **F-03:** user-action beta notes are a manual step done three times without a rule (E-05, E-06); the workflows correctly avoid stale curated files for betas (E-02).

## Notes For Design

- A per-runtime check moves the catalog check into each runtime's `describe.each` group, so a miss fails only that group.
- The Grok fallback must not hide an explicit `GROK_E2E_MODEL` choice.
- The runner must read per-runtime model lines.
- Token-free proof: a fake Grok CLI answering ACP `initialize` with a list that lacks `grok-4.7`.

## Architecture Investigation Findings

| ID | Method | Finding |
| --- | --- | --- |
| A-01 | Reproduced: a vitest probe (`investigation-probe-nested-beforeall.test.ts.txt`, run with the server's vitest, 2026-11-01) | A throwing `beforeAll` inside the `describe.each` group `grok` skips only `grok`'s tests; `claude` and `codex` pass. The JSON report marks Grok's tests `skipped` with no message. The console's "Failed Suites" names `nested.test.ts > live suite > grok` with the error line |
| A-02 | Read: `scripts/release_smoke.py:206-220` | `failed_suite_error` returns the first error after "Failed Suites" and attaches it to every skipped case. With per-runtime failures, it must attribute each error to its runtime from the `> <runtime>` suffix of the `FAIL` line |
| A-03 | Read: `release_smoke.py:45, 222-224` | `read_models` expects one `SKILL_LINKS_LIVE_MODELS {…}` line |
