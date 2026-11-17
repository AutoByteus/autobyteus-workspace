# Release Report — release-v1.5.13-beta.9 (autobyteus-519): beta v1.5.13-beta.9

Status: **in progress (hold before cutting: the founder's decision on autobyteus-514 pending).** Nothing bumped, tagged or pushed.

## Scope

- Release request (`Release Requested`, Solution Designer; `handoff-release-requested.md`): one beta, v1.5.13-beta.9, from `origin/personal`. The founder's words (2026-11-17): "Let's release one beta version."
- No validated package: docs sync, the handoff summary and Verify From Evidence do not apply; the release guide's checks are the verification.
- Content since `v1.5.13-beta.8`: autobyteus-448 part 1 (restart reminder), autobyteus-483 (shell command time limits, background-task end reasons), autobyteus-458 with 506 (phone Settings, Text size, readable conversation, the stop rule); then autobyteus-514 (desktop and Docker packages without the Claude Agent SDK's platform binaries), merged into `personal` during this release: whether beta.9 carries it is the founder's pending decision.

## Project Release Guide

- `RELEASE.md` on `origin/personal` (read at `2b73308ce5`, unchanged at `fc9da63bd2`). New since the previous delivery read it: both typechecks after new base commits; record the released migrations before the script.
- Deviations: `None` so far.

## Before Cutting

- Apple developer agreement: beta.7's notarization was refused (`HTTP status code: 403. A required agreement is missing or has expired`); the founder accepted the agreement on 2026-11-17 and beta.8's notarization passed the same day (`tickets/done/search-memory-default-tool-496/release-deployment-report.md`, line 208). Delivery cannot query Apple from this machine (no notarization credentials outside the runners); the macOS jobs are the next proof.
- Released migrations: no migration added since `v1.5.13-beta.8` (`git diff v1.5.13-beta.8 HEAD -- autobyteus-server-ts/src/app-data-migrations` empty); `RELEASED` in `app-data-migration-registry-order.test.ts` unchanged, as the guide says for a release that adds none; the test passes.

## Checks Before Tagging — Run 1 (on `1c1f6f27cb`, base `2b73308ce5`)

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`: pass.
- Typechecks: server `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; web `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`.
- Registry-order test: 3/3 pass. `check_licensing.py`, `check_repository_artifact_hygiene.py`, `check_secrets.sh v1.5.13-beta.8..HEAD`: pass.
- `release_smoke.py`, run 1: Claude 3/3, Codex 3/3, AutoByteus 2/2 PASS; Grok 0/3 `Grok Build model discovery timed out`; Antigravity `agy-linked-skills-transport.e2e.test.ts` `Hook timed out in 60000ms`; the AutoByteus e2e `configured-skill-on-demand-loading.e2e.test.ts` › "keeps ordinary native tools and configured skill reads explicit in the same active run" FAIL at line 291: `expected [ '## Agent Identity', …(5) ] to deeply equal [ '## Agent Identity', …(4) ]`, received `+ "## Long-Running Commands"`. Load average 99–142.
- Run 2 (the same commit, the one rerun that decides): Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2 PASS; Grok 2/3 (one `ACP_REQUEST_TIMEOUT: initialize did not respond in time`); the same e2e failure, identical.

| Failure | Classification | Log Lines | Action | Result |
| --- | --- | --- | --- | --- |
| Antigravity `agy-linked-skills-transport` hook timeout (run 1) | Platform (this machine's load, 85–140) | `Error: Hook timed out in 60000ms.` | one rerun | Pass on run 2 |
| Grok model discovery / ACP initialize timeouts | Platform-shaped (load), not a usage limit: the founder's standing waiver ("Waive grok if no usage limit anymore") does not cover it | `Grok Build model discovery timed out`; `ACP_REQUEST_TIMEOUT: initialize did not respond in time` | rerun on the final merged state; if it still fails, ask the founder | pending |
| `configured-skill-on-demand-loading.e2e.test.ts:291` | **Ours**: autobyteus-483 deliberately added "## Long-Running Commands" to every runtime prompt; this e2e still expects the old four sections (identical on both runs) | the assertion above | sent to the Solution Designer as a new change with the local check (the stage that changes a runtime prompt reruns the prompt-section e2e) | **Waived for this release by the founder**, in his words (2026-11-17, relayed by the Solution Designer): "Let's release without a fixing the test and creator follow up follow up we'll fix the stale tests". The fix becomes a follow-up Task through the PM. |

## Release Notes

- `tickets/done/release-v1.5.13-beta.9/release-notes.md`: the user-action section placed above the generated notes ("What you need to do" first; point (b) checked in code, see the release request's reply).
