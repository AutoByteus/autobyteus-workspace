# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/design-spec.md`
- Solution Design Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/solution-design-rework-submit-task-result.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Round-3 code-review pass after the latest clarification removed public `review_task_result.decision`.
- Prior Investigation Reviewed: Yes. Earlier API/E2E investigations/reports in this canonical path covered prior public result shapes and are superseded/stale for round 3.
- Latest Authoritative Investigation: Round 3 in this file.

## Current Requirement And Design Basis

The approved round-3 scope simplifies all three task lifecycle public tool results while preserving existing inputs and rich internal lifecycle/event/notification/websocket/audit payloads.

Required public behavior to prove:

- `delegate_task` success for member and team targets returns exactly `{ task_id, status: "active" }`.
- `delegate_task` activation failure returns `{ task_id, status: "not_started", message }` with a concise activation-failure reason and no target/run-id/execution/activation fields.
- `submit_task_result` success for task-agent and task-team ingress callers returns exactly `{ task_id, status: "awaiting_review" }`.
- `submit_task_result` notification delivery failure still records the submission and returns `{ task_id, status: "awaiting_review", message }`, with no `submission_id`, `notification_delivered`, raw `warnings`, route keys, or run ids in the public result.
- `review_task_result` accept returns exactly `{ task_id, status: "accepted" }` with no public `decision` echo.
- `review_task_result` request-revision success returns exactly `{ task_id, status: "active" }` with no public `decision` echo.
- `review_task_result` request-revision notification failure returns `{ task_id, status: "active", message }`, without public `decision`, raw warning arrays, or route/run-id details.
- Hard failures continue through the error path.
- Internal events/notifications/websocket payloads retain execution run ids, submission ids, review ids, review decisions, notification metadata, and routing identities.
- No backward-compatible public aliases, compatibility wrappers, or legacy verbose public fields are retained.

Implementation handoff legacy/compatibility check is clean for round 3: no backward-compatibility mechanisms, no retained old public behavior, and obsolete public-result fields removed from source/tests. Code review round 3 passed with no findings and confirmed previous API/E2E artifacts were stale for the latest public result shapes.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `delegate_task` successful public result | Changed, preserved from prior pass | REQ-004; AC-001/AC-002; implementation handoff | Existing service/unit and tool lifecycle integration assertions must remain exact minimal objects. |
| `delegate_task` activation failure public result | Changed, preserved from prior pass | REQ-005; AC-003 | Activation-failure tests must continue asserting `not_started` + concise `message` by exact equality. |
| `submit_task_result` successful public result | Changed, preserved from round 2 | REQ-006; AC-004/AC-005; rework note | Existing submit assertions must not expect `submission_id`, `notification_delivered`, or `warnings`; exact minimal task-agent and task-team ingress coverage is required. |
| `submit_task_result` notification failure public result | Changed, preserved from round 2 | REQ-007; AC-006 | Existing notification-failure coverage must assert concise public `message` only; internal submitted event/metadata must still retain submission id and route identity. |
| `review_task_result` accept public result | Changed in round 3 | REQ-008; AC-007 | Existing service/unit, integration, and provider projection fixtures must assert exact `{ task_id, status: "accepted" }` with no `decision`. |
| `review_task_result` request-revision public result | Changed in round 3 | REQ-009; AC-008 | Existing service/unit and integration tests must assert exact `{ task_id, status: "active" }`; internal reviewed event must still carry `decision`. |
| `review_task_result` request-revision notification failure public result | Changed in round 3 | REQ-010; AC-009 | Existing service/unit coverage must assert `{ task_id, status: "active", message }`; no public `decision`, warnings, route keys, or run ids. |
| Parser/schema inputs for all three lifecycle tools | Preserved | REQ-001/REQ-002/REQ-003; AC-010 | Existing parser/default/strictness tests remain valid; review input still requires `decision`. |
| Hard tool failures | Preserved | REQ-011 | Existing unauthorized/stale-state/parser/service error assertions remain valid. |
| Internal lifecycle event/notification/websocket richness | Preserved | REQ-012; AC-011 | Existing internal-rich assertions remain valid; reviewed-event decision assertions are required. |
| Legacy verbose public fields for all three tools, including review `decision` echo | Removed | Design/removal plan; code review legacy verdict | Do not add or retain coverage expecting old public fields; exact-object assertions should catch reintroduction. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — repeated member delegation | Service returns exact `{ task_id, status: "active" }`; internal task-agent start identity, notification metadata, activation event payload remain rich. | REQ-004, REQ-012, AC-001, AC-011 | Still Valid | Source inspection shows exact equality on public result and internal assertions for `taskAgentRunId`, metadata, event payload. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — explicit team target delegation | Service returns exact `{ task_id, status: "active" }`; internal task-team identity, metadata, activation payload remain rich. | REQ-004, REQ-012, AC-002, AC-011 | Still Valid | Exact equality for public result; internal `task_team_run_id` and event assertions remain. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — submit/revise/resubmit/accept lifecycle | `submit_task_result` success returns exact minimal object; review revision/accept public results omit `decision`; notifications/events/settlement still use internal metadata and decisions. | REQ-006, REQ-008, REQ-009, REQ-012, AC-004, AC-007, AC-008, AC-011 | Still Valid | Submit assertions expect only task id/status; review assertions omit decision; internal reviewed-event assertions include `decision`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — submit notification failure | Public submit result includes only concise `message`; internal result-submitted event retains `submissionId`; duplicate submit hard error still fails. | REQ-007, REQ-011, REQ-012, AC-006, AC-011 | Still Valid | Test uses exact public object `{ task_id, status, message }` and separate internal event assertion for `submissionId`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — revision notification failure | Public review revision result includes only task id/status/message; internal review event still carries review/submission ids and decision. | REQ-010, REQ-012, AC-009, AC-011 | Still Valid | Exact expected object no longer contains `decision`; internal event assertion includes `decision: "request_revision"`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — parser/tool exposure strictness | Tool names and parsers; defaults for `reference_files`; rejects legacy/extra inputs and missing revision comment. | REQ-001, REQ-002, REQ-003, REQ-011, AC-010 | Still Valid | Test asserts accepted/defaulted inputs and rejects stale fields such as `message`/`submission_id` on review. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — rejected/throwing activation | Public delegate result is `not_started` with concise `message`; no active event or directory entry is published for rejected task. | REQ-005, AC-003 | Still Valid | Exact equality on public result; activation event/directory assertions cover lifecycle side effects. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — manifest/tool lifecycle, member target | Executes manifest parser + tool service + task delegation service; member delegate/submit/review public outputs exact minimal; websocket event projection remains rich. | REQ-001 to REQ-012; AC-001, AC-004, AC-007, AC-011 | Still Valid | Integration helpers execute `parseInput/execute`; public review accept assertions now omit `decision`, while event assertions retain internal decisions where needed. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — task-agent child delegation/review | Task-agent context can delegate/submit/review child; public review accept omits `decision`; internal child reviewed event carries `decision: "accept"`. | REQ-004, REQ-008, REQ-012, AC-001, AC-007, AC-011 | Still Valid | Exact public result assertions plus internal `decision`, `taskAgentRunId`, and delegator payload checks. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — team target/ingress submit/revision/settlement/sequential delegation | Team-target delegate, task-team ingress submit, revision, accept paths return minimal public objects; task-team run ids/submission ids/decisions/notification metadata remain internal. | REQ-004, REQ-006, REQ-008, REQ-009, REQ-012, AC-002, AC-005, AC-007, AC-008, AC-011 | Still Valid | Public revision/accept assertions omit `decision`; identity and events are retrieved from internal start/events instead of public result. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — activation failure | First delegate returns `not_started` + `message`; later delegate succeeds; stale rejected task cannot be reviewed. | REQ-005, REQ-011, AC-003 | Still Valid | Exact public assertion on rejected result and hard-error path for review. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — Agent Tools MCP `delegate_task` envelope | Codex converter projects MCP JSON text envelope to direct minimal `{ task_id, status }`, strips MCP envelope fields. | REQ-004; AC-001/AC-002 | Still Valid | Fixture is minimal delegate result; asserts result lacks `content`, `structuredContent`, `_meta`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — Agent Tools MCP `review_task_result` envelope | Codex converter projects MCP JSON text envelope to direct minimal `{ task_id, status }`, strips MCP envelope fields. | REQ-008/REQ-009; AC-007/AC-008 | Still Valid | Round-3 fixture removed public `decision` from `reviewResult`; input still contains `decision`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` — Agent Tools MCP task-delegation envelope | Claude converter projects MCP JSON text envelope to direct minimal task result and strips MCP envelope fields. | REQ-004; AC-001/AC-002 | Still Valid | Generic Claude MCP projection path is tool-agnostic; delegate fixture asserts minimal result. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` — live member/task-team runtime E2E | With external LMStudio/Codex flags, exercises GraphQL/team websocket/runtime tool approval; verifies inputs, task notifications, internal events, and no legacy lifecycle tool names. | Broad API/E2E confidence for REQ-001/REQ-002/REQ-003/REQ-012 and activation/submission/revision runtime flow | Still Valid | Existing live E2E remains aligned. It asserts internal reviewed-event `decision` and submitted-event `submissionId`, but does not assert exact public review result payload. It is environment gated. | Run the file as an environment-gated executable check; expect local skip when flags are absent. Do not edit. |
| Prior API/E2E artifacts in this task folder | Earlier coverage investigation/execution reports | Superseded by round-3 scope | Replace | Code review explicitly says prior API/E2E artifacts are stale and must not be final evidence. | Overwrite canonical investigation/report paths with round-3 content. |
| Documentation and prior delivery artifacts | Durable docs/report files from prior downstream passes | Delivery-owned after round-3 API/E2E | Out Of Scope | Code review says docs in worktree still contain stale public review-result wording. | No API/E2E coverage action; delivery must refresh integrated docs/handoff. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior API/E2E investigation/report content in `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` | Earlier reports treated public `review_task_result.decision` as required or otherwise reflected prior shapes. | Round-3 requirements remove public `decision` and code review explicitly marked earlier API/E2E artifacts stale. | Requirements REQ-008/REQ-009/REQ-010; implementation handoff; code review round 3. | This round-3 updated canonical investigation and forthcoming execution report. | N/A |
| Old public review-result test assertions expecting `decision` | Public review result previously echoed caller input. | The latest design removes `decision` from public output without compatibility retention; internal reviewed events retain decision. | Requirements REQ-008/REQ-009/REQ-010; code review round 3. | Current service, integration, and Codex provider tests assert exact public review output without `decision`, plus internal event decision where required. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Existing reviewed durable coverage already covers the required delegate/submit/review public result shapes, parser stability, hard-error paths, concise notification-failure messages, internal-rich event/notification payloads including review decisions, and provider MCP projection. | Code review round 3 confirms focused tests cover exact public result assertions and internal-rich assertions for all three lifecycle tools. | N/A | Adding duplicate tests in API/E2E would broaden coverage code after code review without a current uncovered behavior. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Implementation already updated necessary durable coverage before round-3 code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in current review-passed source/tests | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-001 | Focused Vitest command for reviewed service/tool lifecycle/provider converter tests. | Current durable coverage passes against the round-3 review-passed implementation. | Uses existing durable tests only; no temporary code. |
| APIE2E-002 | Environment-gated live E2E file `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`. | Confirms the live E2E artifact remains loadable and records whether local environment executes or skips it. | Existing durable E2E; no new temporary code. Local environment is not expected to have live flags. |
| APIE2E-003 | Source build TypeScript check `tsc -p tsconfig.build.json --noEmit`. | Changed source compiles under build config. | Existing compiler check; no temporary code. |
| APIE2E-004 | Full `pnpm -C autobyteus-server-ts typecheck` to reclassify known baseline status. | Confirms whether the known TS6059 rootDir/test include baseline still blocks full typecheck. | Existing command; expected failure is baseline and not a durable coverage artifact. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live multi-runtime E2E with actual LMStudio/Codex model execution | Environment flags and external model/server setup are not guaranteed locally; the durable live E2E is gated by `RUN_MIXED_TASK_DELEGATION_E2E`, `RUN_LMSTUDIO_E2E`, and `RUN_CODEX_E2E`. | Low-to-medium residual runtime-provider risk; mitigated by integration harness exercising manifest/service/runtime lifecycle and converter tests exercising MCP result projection. | If delivery or user requires live provider proof, rerun with required live E2E environment flags. No implementation reroute needed. |
| Exact public `review_task_result` payload assertion in live websocket E2E | Existing live E2E waits for tool success and validates internal reviewed event/notification surfaces but does not inspect the public tool-result payload. | Low; exact public review shape is covered through service, manifest/tool lifecycle integration, and provider converter fixtures, while live E2E mainly covers runtime orchestration. | No reroute; possible future live E2E enhancement if provider-result payload inspection becomes required. |
| Durable docs synchronization for changed public result contract | Delivery owns docs sync after round-3 API/E2E validation and integrated refresh. | Docs currently in worktree may remain stale until delivery. | Delivery should refresh docs and prior delivery artifacts against round-3 scope. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified | N/A | Requirements/design/implementation/code review consistently require clean-cut public result simplification across all three tools, public removal of review `decision`, and internal payload preservation; no compatibility wrapper observed in inspected changed source. | N/A |

## Execution Plan

1. Confirm generated Prisma client if needed: `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`.
2. Run whitespace check: `git diff --check`.
3. Run focused durable coverage: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts`.
4. Run environment-gated live E2E file for load/skip evidence: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`.
5. Run source TypeScript build check: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
6. Rerun full typecheck to document known baseline failure classification: `pnpm -C autobyteus-server-ts typecheck`.
7. Write canonical execution coverage report with round-3 evidence and route to `delivery_engineer` if no repository-resident durable coverage was added, updated, or removed during API/E2E.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable coverage is sufficient for the round-3 public result cleanup. No stale repository-resident coverage remains in the review-passed source/tests, and no API/E2E-authored durable coverage changes are planned.
