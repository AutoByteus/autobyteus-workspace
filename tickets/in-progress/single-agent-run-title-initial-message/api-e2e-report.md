# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message/review-report.md`
- Current Validation Round: 1
- Trigger: Code-review Round 2 pass plus user request to prove the behavior with a real Codex runtime or an existing runtime harness.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

Round rules:
- First validation round; no prior validation failures to recheck.
- This report path is canonical for API/E2E validation on this ticket.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass; user requested real Codex runtime proof | N/A | None | Pass | Yes | Added and executed live Codex GraphQL/WebSocket history-title E2E. |

## Validation Basis

- Requirements: FR-001 through FR-006 and AC-001 through AC-006.
- Reviewed design: backend atomic first-summary invariant, single-agent read-side active repair, frontend active live summary overlay, unchanged team behavior.
- Implementation handoff legacy check: no backward-compatibility mechanism introduced and no old latest-message behavior intentionally retained.
- Code review Round 2: no open findings; ready for API/E2E.
- User validation direction: use a real Codex runtime test or verify an existing runtime can prove the behavior.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Validation Surfaces / Modes

- Live Codex runtime API/E2E through GraphQL schema, Fastify WebSocket `/ws/agent/:runId`, real `codex app-server` transport, run-history index file, and GraphQL workspace history query.
- Backend focused unit/integration-style service tests for run-history index/list behavior, including team unchanged checks.
- Frontend Nuxt/Vitest projection test for active persisted history row live-context summary overlay.
- Server build and whitespace checks.

## Platform / Runtime Targets

- Local platform: macOS/Darwin worktree under `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message`.
- Node package manager: `pnpm` workspace.
- Codex CLI discovered: `/Users/normy/.nvm/versions/node/v22.21.1/bin/codex`, version `codex-cli 0.130.0`.
- Live Codex E2E environment: `RUN_CODEX_E2E=1`, `CODEX_HISTORY_TITLE_E2E_MODEL=gpt-5.4-mini`.
- Authentication/runtime availability: `OPENAI_API_KEY` was set in the shell environment; live Codex test completed successfully.

## Lifecycle / Upgrade / Restart / Migration Checks

- Active run lifecycle covered: create live Codex single-agent run, attach WebSocket, send initial message, send follow-up message, query history while run remains active, then terminate/cleanup in test teardown.
- Refresh/reload proxy covered: repeated GraphQL `listWorkspaceRunHistory` queries after the first and follow-up messages verify API-side refresh semantics.
- Active stale persisted-row repair covered by intentionally overwriting the live run's index summary with the follow-up message, then querying workspace history and verifying the API returns and persists the recovered initial message.
- Broad migration of inactive historical rows remains out of scope per requirements/design.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-001 | User request; AC-006 | Existing runtime discovery | Pass | Existing Codex live E2E harnesses found under `autobyteus-server-ts/tests/e2e` and Codex CLI version check passed. |
| VAL-002 | FR-001, FR-002, FR-003, AC-001, AC-003 | Live Codex GraphQL + WebSocket + history index | Pass | New live Codex E2E sends initial and follow-up user messages; GraphQL history summary remains the initial user message and index file summary remains initial. |
| VAL-003 | FR-001, FR-004, AC-002, AC-004 | Live Codex projection + active history read repair | Pass | New live Codex E2E corrupts active index summary to the follow-up message; next GraphQL history query returns initial message and repairs index. |
| VAL-004 | FR-004, AC-004 | Frontend live run-tree projection | Pass | `runTreeLiveStatusMerge.spec.ts` verifies live first user message overlays stale row summary while status/time update. |
| VAL-005 | FR-005, AC-005 | Team run-history focused tests | Pass | Team index/service tests pass unchanged. |
| VAL-006 | Build/quality | Server build and whitespace | Pass | Server build passed; `git diff --check` and untracked-file whitespace/conflict-marker scan passed. |

## Test Scope

- Added a durable live Codex runtime E2E test specifically for the reported single-agent history-title behavior.
- Re-ran focused server run-history tests and frontend projection tests that cover the implementation's durable unit-level guarantees.
- Did not add a browser screenshot test because the primary new proof requested was live Codex runtime behavior, and the visible row text is already rendered from the tested GraphQL/projection `summary` field. Full manual/browser sidebar observation remains optional follow-up, not a blocker for this validation result.

## Validation Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message`
- Branch: `codex/single-agent-run-title-initial-message`
- Existing live Codex harnesses inspected:
  - `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/integration/runtime-execution/codex-app-server/thread/*`
- New E2E uses the same project conventions: skip unless `codex --version` succeeds and `RUN_CODEX_E2E=1` is set; build TypeGraphQL schema in a temp app data directory; launch a real Codex app-server runtime through existing services; connect through the real agent WebSocket route.

## Tests Implemented Or Updated

- Added: `autobyteus-server-ts/tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`
  - Creates a real Codex single-agent run via GraphQL.
  - Connects to `/ws/agent/:runId` via Fastify WebSocket.
  - Sends initial and follow-up user messages to the live Codex runtime and waits for Codex assistant responses/status idle.
  - Queries `listWorkspaceRunHistory` after each message.
  - Verifies the row `summary` remains the initial user message, not the follow-up.
  - Verifies the history index file stores the initial summary.
  - Uses `getRunProjection` to verify real Codex projection contains both user messages and summary is initial.
  - Simulates an active stale persisted row by overwriting the index summary with the follow-up message, then verifies the next GraphQL history query repairs both returned and persisted summary back to initial.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/autobyteus-server-ts/tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Pending; this report routes to code_reviewer`
- Post-validation code review artifact: Pending

## Other Validation Artifacts

- Canonical validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message/api-e2e-report.md`

## Temporary Validation Methods / Scaffolding

- No repository-external temporary scaffolding retained.
- The live E2E creates temp app-data/workspace directories and removes them in test teardown.

## Dependencies Mocked Or Emulated

- The new Codex E2E does not mock the Codex runtime transport; it uses the real `codex app-server` path through existing services.
- The test creates an isolated temp app-data directory and test GraphQL schema, which matches existing E2E harness style.
- Existing focused unit tests continue to mock service dependencies where already appropriate.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First validation round. |

## Scenarios Checked

### VAL-001 — Existing Codex Runtime Harness Discovery

- Checked repository for existing Codex runtime validation.
- Found live Codex E2E/integration infrastructure gated by `RUN_CODEX_E2E=1`.
- Verified local Codex binary: `codex-cli 0.130.0`.

Result: Pass.

### VAL-002 — Real Codex Single-Agent Initial And Follow-Up History Title

- Created a real Codex single-agent run through GraphQL.
- Connected a real WebSocket session to `/ws/agent/:runId`.
- Sent initial user prompt and waited for Codex assistant token response and `AGENT_STATUS` `IDLE`.
- Queried GraphQL workspace history; row summary equaled the initial user message and active status was exposed.
- Sent follow-up user prompt and waited for Codex assistant token response and `AGENT_STATUS` `IDLE`.
- Queried GraphQL workspace history again; row summary still equaled initial user message and did not equal follow-up message.
- Confirmed persisted `run_history_index.json` row summary stayed initial.

Result: Pass.

### VAL-003 — Real Codex Active Stale-Row Repair

- Waited for `getRunProjection` to include both real Codex user messages and initial projection summary.
- Overwrote the active run index summary to the follow-up message to simulate the reported stale latest-message persisted row.
- Queried GraphQL workspace history.
- Verified returned row summary was repaired to the initial message.
- Verified persisted index summary was repaired back to the initial message.

Result: Pass.

### VAL-004 — Frontend Live Sidebar Projection Guard

- Ran frontend focused test for `mergeRunTreeWithLiveContexts`.
- Verified active persisted history row with stale `summary: do it` is overlaid from the live conversation's first user message while `lastActivityAt` and active status update.

Result: Pass.

### VAL-005 — Agent-Team Summary Behavior Unchanged

- Ran focused team run-history service/index tests alongside single-agent run-history tests.
- No regressions observed.

Result: Pass.

## Passed

- `RUN_CODEX_E2E=1 CODEX_HISTORY_TITLE_E2E_MODEL=gpt-5.4-mini pnpm -C autobyteus-server-ts test tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts --run` — Passed: 1 test.
- `pnpm -C autobyteus-server-ts test tests/unit/run-history/services/agent-run-history-index-service.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts tests/unit/run-history/services/team-run-history-index-service.test.ts tests/unit/run-history/services/team-run-history-service.test.ts --run` — Passed: 25 tests across 4 files.
- `pnpm -C autobyteus-web test:nuxt utils/__tests__/runTreeLiveStatusMerge.spec.ts --run` — Passed: 3 tests.
- `pnpm -C autobyteus-server-ts build` — Passed.
- `git diff --check` — Passed for tracked changes.
- `perl -ne 'print "$ARGV:$.: trailing whitespace\n" if /[ \t]$/; print "$ARGV:$.: conflict marker\n" if /^(<<<<<<<|=======|>>>>>>>)($| )/' autobyteus-server-ts/tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts autobyteus-web/utils/runTreeSummary.ts` — Passed; no output.

## Failed

None.

## Not Tested / Out Of Scope

- Manual visual screenshot of the full Nuxt sidebar in a browser was not executed in this round. The row label source is covered by live GraphQL history plus frontend projection tests; a full-browser visual smoke remains optional if delivery wants extra UI evidence.
- Broad migration/repair of inactive historical rows already mutated to later-message summaries remains out of scope by requirements/design.
- Every possible Codex model was not tested; live validation used `gpt-5.4-mini`.

## Blocked

None.

## Cleanup Performed

- Live E2E test teardown terminates created agent runs, deletes created test agent definitions, closes Codex app-server client manager, removes temp workspaces, and removes temp app-data directory.
- No temporary validation files outside durable test/report artifacts were retained.

## Classification

- No validation failure classification needed.
- Because this round added repository-resident durable validation after code review, workflow requires returning to `code_reviewer` before delivery.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- Existing live Codex runtime harness exists and was reusable; the new test follows the established gated live-runtime pattern.
- The added E2E directly exercises the reported path with real Codex runtime: GraphQL run creation, WebSocket follow-up messages, history query refresh, persisted index summary, and projection-based active repair.
- No compatibility wrapper, dual title field, or latest-message fallback was introduced or validated.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E validation passes. Repository-resident durable validation was added, so the cumulative package must return to `code_reviewer` for review of the new E2E test before delivery.
