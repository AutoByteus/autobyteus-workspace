# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/code-review-report.md`
- Current Validation Round: Round 2
- Trigger: Code review Round 3 passed the API/E2E Round 1 local fix and the repository-resident durable validation updates; API/E2E resumed from prior Round 1 failure.
- Prior Round Reviewed: Round 1 validation updates and local fix were reviewed by `code_reviewer` in Round 3.
- Latest Authoritative Round: Round 2

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review Round 2 pass + user request for profound real E2E coverage | N/A | 1 standalone Codex run-history-title failure outside the mixed-team happy path | Fail | No | Mixed-only team execution and real mixed team/task flows passed; standalone Codex history title E2E exposed FAIL-001. |
| 2 | Code review Round 3 pass for FAIL-001 local fix and validation updates | FAIL-001 | 0 | Pass | Yes | Rechecked FAIL-001, reran real all-AutoByteus/all-Codex/all-Claude/mixed/nested/task-delegation E2Es, projection/build/static checks, and external-channel boundary check. |

## Validation Basis

Validated against the reviewed design/implementation goal: all team executions route through the mixed team manager, historical same-runtime and mixed teams restore with member platform run IDs, runtime-specific members expose the correct prompt/tools, nested teams and task delegation still route correctly, and run-history/file-change projections remain coherent.

The user explicitly requested real, non-mocked Codex/Claude/AutoByteus E2E. Round 2 therefore reran the high-value live suites after the local fix, not only the prior failing single-agent check. Final AutoByteus live validation used the requested/usual `qwen3.6-35b-a3b` model with `AUTOBYTEUS_STREAM_PARSER=api_tool_call`; the earlier exploratory `lmstudio-community/qwen3-next-80b-a3b-thinking` attempt is not the final evidence.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: Yes, through this report and handoff.

Legacy E2E assumptions were updated in Round 1 and returned through code review in Round 3:

- WebSocket `SEND_MESSAGE` now includes required `message_id` and `dedupe_key` in affected E2Es.
- Team metadata assertions now understand canonical recursive `memberTree` while tolerating old `memberMetadata` for test reads only.
- Team websocket delivery assertions now use current `TEAM_COMMUNICATION_MESSAGE`, recipient external-message, and member stream shapes instead of stale `INTER_AGENT_MESSAGE` assumptions.
- Mixed task delegation validates provider-native `delegate_tasks` with `api_tool_call` and `tool_choice: "required"`, not deprecated local task-plan JSON/raw parser paths.
- Codex MCP E2E now matches current `item.type === "mcpToolCall"` segment shape instead of requiring legacy `payload.segment_type === "tool_call"` on segment start.
- Codex auto-exec MCP E2E no longer expects a `TOOL_APPROVED` event for auto-executed tools; it verifies execution success and absence of approval requests.
- Codex linked-skill E2E now creates the skill in a resolvable test skill catalog location and tolerates current Codex discoverable-skill preflight avoiding workspace materialization.

## Validation Surfaces / Modes

- GraphQL API create/restore/terminate/query surfaces.
- Agent and team WebSocket runtime command/event streams.
- Live LM Studio AutoByteus execution using `qwen3.6-35b-a3b`.
- Live Codex app-server execution via local `codex` CLI.
- Live Claude Agent SDK/Claude Code execution via local `claude` CLI.
- Mixed AutoByteus + Codex and nested AutoByteus + Codex + Claude teams.
- Server-managed task delegation and task-agent lifecycle.
- External-channel run-output delivery boundary.
- Run-history, memory layout, and file-change projection services.
- Runtime capability and remote browser bridge registration API evidence from Round 1.
- TypeScript build, diff whitespace, and source legacy checks.

## Platform / Runtime Targets

- Host: Darwin arm64 (`Darwin MacBookPro 25.2.0`)
- Node: `v22.21.1`
- pnpm: `10.28.2`
- Codex CLI: `codex-cli 0.137.0`
- Claude Code: `2.1.131`
- LM Studio host: `http://127.0.0.1:1234`
- AutoByteus live model used for final real team/task runs: `qwen3.6-35b-a3b`
- Parser for final AutoByteus tool-call team/task E2Es: `AUTOBYTEUS_STREAM_PARSER=api_tool_call`
- Codex approval env for live runs: `CODEX_APP_SERVER_APPROVAL_POLICY=never` at process level; individual tests still exercise runtime approval policy where configured.

Runtime version evidence from Round 1: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/validation-logs/focused-final/runtime-versions.log`

## Lifecycle / Upgrade / Restart / Migration Checks

- Same-runtime AutoByteus team create, approve, interrupt, terminate, restore, continue, and projection checks passed on mixed backend in Round 2.
- Same-runtime Codex team create, nested delivery, projection, workspace mapping, terminate/continue checks passed on mixed backend in Round 2.
- Same-runtime Claude team create, interrupt, nested delivery, projection, workspace mapping, terminate/restore/continue checks passed on mixed backend in Round 2 after a clean rerun.
- Mixed AutoByteus+Codex create, bidirectional cross-runtime delivery, terminate, restore, and continue checks passed in Round 2.
- Nested AutoByteus+Codex+Claude create, recursive metadata, parent/subteam/child message routing, restore checks passed in Round 2.
- Mixed task delegation AutoByteus coordinator -> Codex task-agent -> completion notification -> `accept_task` lifecycle passed in Round 2.
- Standalone live Codex history title now remains on the first user message across follow-up messages and persisted index reads.

## Coverage Matrix

| ID | Area | Mode | Round 2 Result | Evidence |
| --- | --- | --- | --- | --- |
| E2E-CODEX-TITLE | Codex single-agent history title after follow-up | Live Codex app-server GraphQL/WebSocket | Pass | `validation-logs/round2-resume/codex-single-history-and-token-usage-rerun.log` |
| UNIT-RUN-HISTORY | Agent run history catalog first-summary-only behavior | Unit | Pass | `validation-logs/round2-resume/agent-run-history-catalog-service-unit.log` |
| E2E-TEAM-AUTO | All-AutoByteus team on mixed backend | Live LM Studio `qwen3.6-35b-a3b` GraphQL/WebSocket | Pass | `validation-logs/round2-resume/autobyteus-team-runtime-qwen3.6.log` |
| E2E-TEAM-CODEX | All-Codex team on mixed backend | Live Codex app-server GraphQL/WebSocket | Pass | `validation-logs/round2-resume/codex-team-inter-agent-roundtrip.log` |
| E2E-TEAM-CLAUDE | All-Claude team on mixed backend | Live Claude Agent SDK GraphQL/WebSocket | Pass | Clean rerun: `validation-logs/round2-resume/claude-team-inter-agent-roundtrip-rerun.log`; first attempt ended with a transient SDK abort after all 5 tests had passed: `validation-logs/round2-resume/claude-team-inter-agent-roundtrip.log` |
| E2E-TEAM-MIXED | Mixed AutoByteus+Codex team | Live LM Studio + live Codex | Pass | `validation-logs/round2-resume/mixed-team-runtime-qwen3.6.log` |
| E2E-TEAM-NESTED | Nested AutoByteus+Codex+Claude team | Live LM Studio + live Codex + live Claude | Pass | `validation-logs/round2-resume/nested-mixed-team-runtime-qwen3.6.log` |
| E2E-TASK-MIXED | Server-managed mixed task delegation | Live AutoByteus coordinator + live Codex task agent | Pass | `validation-logs/round2-resume/mixed-task-delegation-qwen3.6.log` |
| E2E-EXTERNAL | External channel team open delivery | Executable API boundary with deterministic backend event source | Pass | `validation-logs/round2-resume/external-channel-team-open-delivery.log` |
| INT-FILE | File-change/run-history projection | Unit/integration | Pass | `validation-logs/round2-resume/file-change-projection-regression.log` |
| STATIC | Whitespace/build/source legacy checks | CLI | Pass | `validation-logs/round2-resume/git-diff-check.log`, `validation-logs/round2-resume/tsc-build-noemit.log`, `validation-logs/round2-resume/source-legacy-grep.log` |
| UNIT-MIXED-TOOLS | Mixed AutoByteus prompt/tool exposure | Unit | Pass in Round 1 and code-review rerun | `validation-logs/focused-final/autobyteus-mixed-tool-exposure.log`; also reviewed in `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/code-review-report.md` |
| INT-TEAM | Team manager/runtime service integrations | Integration/unit | Pass in Round 1 and implementation handoff | `validation-logs/focused-final/team-manager-integration-focused.log` |
| E2E-RUNTIME-META | Runtime capability + remote browser bridge | Executable GraphQL API | Pass in Round 1 | `validation-logs/focused-final/runtime-capability-and-remote-browser.log` |
| E2E-RUNTIME-AGENT | Standalone AutoByteus/Codex/Claude agent runtime | Live broad run plus targeted legacy E2E rerun | Pass after E2E updates in Round 1; FAIL-001 resolved in Round 2 | Broad initial: `validation-logs/focused-final/agent-runtime-graphql-live-all.log`; targeted fixed legacy rerun: `validation-logs/focused-final/agent-runtime-graphql-failed-codex-rerun3.log`; title fix rerun: `validation-logs/round2-resume/codex-single-history-and-token-usage-rerun.log` |

## Test Scope

Focused required scope covered:

- All-AutoByteus teams on mixed backend.
- All-Codex teams on mixed backend.
- All-Claude teams on mixed backend.
- Mixed AutoByteus+Codex team restore and bidirectional messaging.
- Nested mixed AutoByteus+Codex+Claude team recursive metadata, restore, and message routing.
- Mixed AutoByteus prompt/tool exposure, including server-owned team tools and explicit legacy local task-plan tool filtering.
- Server-managed task delegation lifecycle with real AutoByteus and Codex.
- External-channel coordinator output delivery/no worker-output leak.
- File-change projection and memory layout.
- Runtime capability/remote browser bridge APIs.
- Standalone agent runtime sanity across AutoByteus/Codex/Claude; legacy E2E assumptions fixed where uncovered.
- Previously failing standalone Codex history title after follow-up activity.

## Validation Setup / Round 2 Commands

```bash
RUN_CODEX_E2E=1 CODEX_APP_SERVER_APPROVAL_POLICY=never pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts --pool=forks --fileParallelism=false
pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-history-catalog-service.test.ts --pool=forks --fileParallelism=false
RUN_LMSTUDIO_E2E=1 LMSTUDIO_MODEL_ID=qwen3.6-35b-a3b AUTOBYTEUS_STREAM_PARSER=api_tool_call pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --pool=forks --fileParallelism=false
RUN_CODEX_E2E=1 CODEX_APP_SERVER_APPROVAL_POLICY=never pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts --pool=forks --fileParallelism=false
RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts --pool=forks --fileParallelism=false
RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 CODEX_APP_SERVER_APPROVAL_POLICY=never AUTOBYTEUS_STREAM_PARSER=api_tool_call LMSTUDIO_MODEL_ID=qwen3.6-35b-a3b pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts --pool=forks --fileParallelism=false
RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CODEX_APP_SERVER_APPROVAL_POLICY=never AUTOBYTEUS_STREAM_PARSER=api_tool_call LMSTUDIO_MODEL_ID=qwen3.6-35b-a3b pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts --pool=forks --fileParallelism=false
RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 CODEX_APP_SERVER_APPROVAL_POLICY=never AUTOBYTEUS_STREAM_PARSER=api_tool_call LMSTUDIO_MODEL_ID=qwen3.6-35b-a3b pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --pool=forks --fileParallelism=false
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts --pool=forks --fileParallelism=false
pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/run-file-change-projection-service.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts --pool=forks --fileParallelism=false
git diff --check
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false
```

## Tests Implemented Or Updated

Repository-resident durable validation added/updated in Round 1, then returned through `code_reviewer` and approved in Round 3:

- Added `tests/e2e/helpers/websocket-command-helpers.ts` for required websocket message IDs/dedupe keys.
- Added `tests/e2e/helpers/team-run-metadata-helpers.ts` for recursive member metadata flattening.
- Added `tests/e2e/helpers/team-communication-message-helpers.ts` for current team communication websocket assertions.
- Updated runtime E2Es for current team/member route-key GraphQL contracts, `memberTree`, current interrupt events, current Codex segment shapes, and current skill materialization/discovery behavior.
- Updated mixed task delegation E2E to use `qwen3.6-35b-a3b`, `api_tool_call`, and provider-native tool-call requirements.
- Added/updated local-fix validation for first-summary-only run-history titles in `tests/unit/run-history/services/agent-run-history-catalog-service.test.ts` and `tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`; these were approved by code review Round 3 before this validation resume.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated in API/E2E Round 2 after code review Round 3: `No`
- Repository-resident durable validation added or updated earlier in API/E2E Round 1 and local fix: `Yes`
- Earlier validation/local-fix changes returned through `code_reviewer` before delivery: `Yes`, code review Round 3 passed.
- Paths added or updated by API/E2E/local-fix work already reviewed in Round 3 include:
  - `autobyteus-server-ts/tests/e2e/helpers/websocket-command-helpers.ts`
  - `autobyteus-server-ts/tests/e2e/helpers/team-run-metadata-helpers.ts`
  - `autobyteus-server-ts/tests/e2e/helpers/team-communication-message-helpers.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-catalog-service.test.ts`

Because no repository-resident durable validation was added or updated after Round 3 code review, this pass can proceed directly to `delivery_engineer`.

## Other Validation Artifacts

- Round 2 logs directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/validation-logs/round2-resume/`
- Round 1 final focused logs: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/validation-logs/focused-final/`

## Temporary Validation Methods / Scaffolding

No temporary source scaffolding left behind. Validation evidence is retained as task-local logs under the ticket workspace.

## Dependencies Mocked Or Emulated

- Main team runtime scenarios used real LM Studio, Codex, and Claude transports; no LLM mocks were used for all-AutoByteus/all-Codex/all-Claude/mixed/nested/task-delegation coverage.
- External-channel open delivery uses an in-process deterministic `TeamRunBackend` event source to validate channel ingress/output dedupe and worker-output filtering without a real Telegram gateway. This is boundary-local; the real team runtimes are validated separately above.
- Unit/integration checks use normal test doubles where appropriate.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | FAIL-001: Live Codex single-agent history title rewrote to the follow-up user message | Local Fix | Resolved | `validation-logs/round2-resume/codex-single-history-and-token-usage-rerun.log`; `validation-logs/round2-resume/agent-run-history-catalog-service-unit.log`; code review Round 3 report | GraphQL history title and persisted index summary now remain on the first user message after a follow-up. Token usage E2E remains skipped by pre-existing guard. |
| Same Round 1 exploratory | Mixed task delegation with `lmstudio-community/qwen3-next-80b-a3b-thinking` and/or no required provider tool choice did not emit `delegate_tasks` reliably | Test setup/model mismatch | Resolved | `validation-logs/focused-final/mixed-task-delegation-qwen3.6.log`; `validation-logs/round2-resume/mixed-task-delegation-qwen3.6.log` | This directly addresses the user question about the Qwen model. Final validation uses `qwen3.6-35b-a3b`. |
| Same Round 1 broad standalone agent runtime | Codex MCP auto-exec speak E2E expected legacy `segment_type`/`TOOL_APPROVED` behavior | Legacy durable E2E assumption | Resolved | `validation-logs/focused-final/agent-runtime-graphql-failed-codex-rerun3.log` | Current stream has `item.type: "mcpToolCall"` and no approval event for auto-executed tool. |
| Same Round 1 broad standalone agent runtime | Codex linked skill E2E assumed materialization always occurs and created fixture in an unresolved bundled path | Legacy durable E2E assumption | Resolved | `validation-logs/focused-final/agent-runtime-graphql-failed-codex-rerun3.log` | Current Codex may discover configured skills without materializing them into workspace. |

## Passed

- FAIL-001 is resolved: live Codex single-agent history title remains on the initial user message after a follow-up user message.
- Unit run-history catalog coverage passed: 10/10 tests.
- All-AutoByteus live team suite passed: 4/4 tests with `qwen3.6-35b-a3b`.
- All-Codex live team suite passed: 5/5 tests.
- All-Claude live team suite passed on clean rerun: 5/5 tests.
- Mixed AutoByteus+Codex live team E2E passed: 1/1 test.
- Nested AutoByteus+Codex+Claude live team E2E passed: 1/1 test.
- Mixed AutoByteus coordinator -> Codex task-agent delegation E2E passed: 1/1 test.
- External-channel team open delivery passed: 1/1 test.
- File-change projection and memory layout checks passed: 17/17 tests.
- `git diff --check` passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false` passed.
- Source grep found no remaining specialized team backend references in `src`; legacy task-plan tool strings only remain in explicit denylist / user-facing guidance.

## Failed

None in the latest authoritative Round 2 result.

## Observed Transient / Rerun Notes

- The first Round 2 all-Claude live suite attempt completed all 5 tests successfully but Vitest exited non-zero due to a late unhandled `Error: Operation aborted` from the Claude Agent SDK after the interrupt test. Evidence: `validation-logs/round2-resume/claude-team-inter-agent-roundtrip.log`.
- The same all-Claude suite was immediately rerun cleanly and passed with exit status 0. Evidence: `validation-logs/round2-resume/claude-team-inter-agent-roundtrip-rerun.log`.
- This is recorded as an observed transient SDK abort during live transport validation, not a current product validation failure, because the retry produced a clean pass and all scenario assertions passed in both runs.

## Not Tested / Out Of Scope

- Full context-file image attachment E2E was not rerun in Round 2 because the primary task scope is team execution/refactor behavior and the configured final LM Studio text model (`qwen3.6-35b-a3b`) is not a vision-specific target. Context-file websocket command payloads were updated in Round 1 and related projection/file-change coverage passed.
- Real external Telegram/Business API provider integration was not run; external-channel open delivery was validated at the server ingress/output boundary.

## Blocked

None.

## Cleanup Performed

- Test-created temporary app data and workspace roots are cleaned by the E2E tests.
- No temporary scripts or harnesses remain outside ticket logs.

## Classification

`Pass`. No unresolved API/E2E failures remain.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- User concern about model selection is resolved: final AutoByteus team/task E2E used `qwen3.6-35b-a3b` with `AUTOBYTEUS_STREAM_PARSER=api_tool_call`; the screenshot model was only exploratory and is not the final validation basis.
- Because no repository-resident durable validation was added or updated after code review Round 3, no additional code-review loop is required before delivery.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Mixed-only team manager refactor scenarios pass under real AutoByteus/Codex/Claude coverage, FAIL-001 is resolved, and focused projection/build/static checks pass.
