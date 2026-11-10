# Delivery / Release / Deployment Report — server-e2e-node-credential-447

## Release / Publication / Deployment Scope

Finalize Project Task `autobyteus-447` (server E2E suites present the node credential and the MCP gateway token; test harness and docs only) into `origin/personal`. No release was requested.

**Current state: Blocked before finalization.** On the integrated state the whole server E2E suite has one failing test, E-002. autobyteus-455 caused it after this ticket's validation and merged it into `personal`. This ticket's REQ-006 (Must) and AC-001 require that suite to have no failed file on `personal`. Nothing has been pushed or merged.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` @ `df789a89a5` (2026-11-07), read in the ticket worktree after integrating `origin/personal`
- Deviations from the guide and why: `None` so far (finalization not reached)
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: not written yet. It is written once the branch state is verified (blocked below).
- Handoff summary status: `Blocked`
- Delivery revision record: `tickets/in-progress/server-e2e-node-credential-447/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `310fc27452`
- Latest tracked remote base reference checked: `origin/personal` @ `f78b60dddd` (fetched 2026-11-10)
- Base advanced since bootstrap or previous refresh: `Yes` (16 commits: autobyteus-455 daily-assistant-delegation-target, its delivery records, release-beta-456 records and the `1.5.13-beta.2` version bump)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the candidate state was committed at `2b70ffdab4`; only untracked logs and `dist/` were in the worktree)
- Integration method: `Merge` (`git merge origin/personal` → `5c29d6fca2`, no conflicts)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. After `pnpm install --frozen-lockfile`, `prebuild`, `build`, `test:integration:prepare` on the merged src:

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DEL-01 whole server E2E suite (AC-001, REQ-006, REQ-008; required of delivery by the ticket) | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" NO_COLOR=1 pnpm test:e2e` | **Fail, 1 test**: `Test Files  1 failed \| 122 passed \| 124 skipped (247)`, `Tests  1 failed \| 546 passed \| 606 skipped (1153)`. 0 `MCP_GATEWAY_TOKEN_REQUIRED`; 3 `NODE_CREDENTIAL_REQUIRED`, all from the deliberate refusal case NAS-14 (passes). All 15 FU-004 files and the five refusal suites `✓` | `evidence/delivery/DEL-01-full-e2e-integrated-summary.log` (full log in the worktree, not committed) |
| DEL-02 the failing file alone (Rule 9) | `… vitest run tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | Fail, deterministic: E-001, E-003, E-004 `✓`; E-002 `×` at `:332` | `evidence/delivery/DEL-02-e002-alone.log` |
| DEL-03 guard on the integrated tree (AC-005) | `vitest run tests/architecture/e2e-node-credential-paths.test.ts` | Pass, `Tests  4 passed (4)` (covers the new base E2E files) | `evidence/delivery/DEL-03-guard-integrated.log` |
| DEL-04 the gated suites 455 brought in, with this ticket's harness | `RUN_AGY_FAILURE_E2E=1` scripted AGY: `daily-assistant-collaborator`, `remote-delegation-two-server` | Pass, `Test Files  2 passed (2)`, `Tests  48 passed (48)`; 0 credential/token refusals | `evidence/delivery/DEL-04-455-gated-suites-summary.log` |

- Post-integration verification result: `Blocked` (DEL-01)
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (as of `f78b60dddd`)
- Blocker: E-002, below.

### The failure and its cause (TESTING.md Rule 9)

- Failing test: `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` E-002, `:332`: `AssertionError: expected [ 'autobyteus-daily-assistant', …(1) ] to not include 'autobyteus-daily-assistant'`.
- The assertion (AC-009 of the retired-PTM migration ticket): `BUILT_IN_IDS = ["autobyteus-daily-assistant"]` (`:24`) must not be among a user agent run's `collaboratorMentionCandidates`.
- Cause: autobyteus-455 (`fbc9b3c2e9`, on `personal`) deliberately made the Daily Assistant an ordinary collaborator (`collaborationEligible: true` in `src/built-in-agents/built-in-agent-registry.ts`; `CollaboratorCandidatePolicy` excludes only the Model Router; its DAC-06 asserts the Daily Assistant *is* a PM run's `@` candidate). 455 did not update this older assertion. 455's delivery found its branch already current and reran nothing, and the file is in the default run, so the stale assertion reached `personal`.
- Not caused by this ticket: this ticket changes no `src/` (AC-004). The merge's only `src/` changes are 455's two files. The request was admitted and answered `AVAILABLE`; the failure is in the returned list. The same file passed in IMP-07 on base `310fc27452` with this ticket's harness (`✓ … (4 tests)`). So `origin/personal` @ `f78b60dddd` fails the same way without this ticket.

## Verification

- Evidence judged: `Sufficient` for this ticket's own change. It does not prove AC-001 on the integrated state, because of E-002.
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-002, final confidence 95%, no category below 95%). Opened and checked: `IMP-07-full-e2e-summary.log` (`Test Files  122 passed | 123 skipped (245)`), `API-07-mcp-gateway-token-e2e.log` (4 `✓`, three refusals and the admission), `API-08-guard-planted-file.log` (file:line, cause and helper messages; clean rerun `4 passed`), `API-10-scripted-agy-gated-all-summary.log` (header `NODE_CREDENTIAL_REQUIRED|MCP_GATEWAY_TOKEN_REQUIRED: 0`; 3 failures with causes in FU-002…FU-004), `API-11-codex-native-fixture-probe.log` / `-receipt.json` (only the header's round-1 note mentions the refusal; receipt `teamId` and stand-in Codex timeout). Delivery's DEL-01…DEL-04.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | IMP-07 (branch); DEL-01, DEL-02 (integrated) | Branch: 0 failed. Integrated: the 15 files pass; 1 failure (E-002), caused by autobyteus-455 | **Not Proven on the integrated state** (blocked by a prerequisite outside this ticket) |
| AC-002 | API-10 summary header; IMP-05; DEL-04 | 0 credential/token refusals in 59 gated files; 455's gated suites pass | Proven |
| AC-003 | API-07 log; IMP-07 / DEL-01 `tool-management/mcp-*` `✓` | Token admitted; owner credential, none and wrong token refused 401 | Proven |
| AC-004 | API-12; `git diff 310fc27452 2b70ffdab4 -- autobyteus-server-ts/src` empty; DEL-01 refusal suites `✓` | No product change | Proven |
| AC-005 | API-08, API-08b, DEL-03 | Planted file flagged with file:line, cause, helper; integrated tree clean | Proven |
| AC-006 | API-12; grep of all delivery logs | 0 `own_…`/`mcpg_…` | Proven |
| AC-007, AC-008 | TESTING.md read on the integrated state | Rules present in global style | Proven |

- More evidence requested: `None` from API/E2E (the gap is not evidence quality; it is a failing test outside this ticket).
- User check needed: `No`
- Re-verification after later re-integration: pending

## Release Decision

- Decision: `No release`
- Decided by: `RELEASE.md` default (the request does not ask for one). A release stays available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/in-progress/server-e2e-node-credential-447/docs-sync-report.md`
- Docs sync result: `No impact` in docs sync (implementation's TESTING.md and design-cases updates checked and current)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `No` (blocked)

## Version / Tag / Release Commit

Not applicable (no release).

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (`origin`, `personal`, `codex/<ticket-name>`)
- Ticket branch: `codex/server-e2e-node-credential-447` @ the local delivery commit after `5c29d6fca2` (not pushed)
- Ticket branch push result: not run (blocked; Secret Gate not yet run)
- Merge into target / push target: not run
- User's checkout of the target branch: not touched (no finalization)
- Repository finalization status: `Blocked`
- Blocker: E-002 (prerequisite, below)

## Release / Publication / Deployment

- Applicable: `No` (no release requested; RELEASE.md default)
- Release/publication/deployment result: `Not required`

## Post-Finalization Cleanup

- Not started (blocked). The worktree and branch stay for the resumed delivery.

## Escalation / Reroute

- Classification: `Requirement Gap`, named a **prerequisite** (`ticket-scope.md`): it blocks a Must requirement of this ticket (REQ-006 / AC-001: no failed file in `pnpm test:e2e` on `personal`), and it belongs to other functionality: autobyteus-455's collaborator eligibility against the retired-PTM migration suite's AC-009 assertion. It is not a follow-up (this ticket's goal cannot be reached without it). Delivery does not fix it inside this ticket.
- Recommended recipient: the Solution Designer, which decides between: (a) a prerequisite Task for the test fix first (preferred by the scope rules), or (b) another decision it owns (for example, folding the one-line test correction into this ticket with an approved scope note).
- Suggested fix (for whoever owns it): in E-002's `@` check, assert the Daily Assistant **is** a candidate of the user agent run (455 DAC-06 behavior) and that the Model Router (`autobyteus-model-router`) and `RETIRED_ID` are not; keep `BUILT_IN_IDS` for the catalog checks at `:251`/`:302`. Check by running that file alone (DEL-02's command).
- Resume plan for delivery once it lands on `personal`: integrate `origin/personal` again. Rerun by impact: that file, plus the whole suite only if more server code came in. Then write the handoff summary, finalize per `RELEASE.md` (Secret Gate, `finalize/` branch, `--no-ff` merge, push) and update the main checkout.

## Release Notes Summary

- Release notes status: `Not required` (no release; test harness only)

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`; delivery action `None`

## Rollback Criteria

Not finalized. Once merged, a rollback is a revert of the merge on `personal`. It is test harness and docs only, with no product or data effect.

## Final Status

- Verification complete: `No` (AC-001 not met on the integrated state)
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `No` (pending finalization)
- Unresolved blocker: E-002 prerequisite (above)
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No` (a `Blocked` handoff is sent instead)
