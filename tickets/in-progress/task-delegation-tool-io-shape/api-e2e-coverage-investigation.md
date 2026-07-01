# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/design-spec.md`
- Solution Design Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/solution-design-rework-submit-task-result.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Refined code-review pass after the requirement-gap reset added `submit_task_result` to the public tool-result cleanup.
- Prior Investigation Reviewed: Yes. The earlier API/E2E investigation/report in this canonical path covered only `delegate_task` and `review_task_result`; it is superseded and was explicitly marked stale by code review for the refined three-tool scope.
- Latest Authoritative Investigation: Round 2 in this file.

## Current Requirement And Design Basis

The approved refined scope simplifies all three task lifecycle public tool results while preserving existing inputs and rich internal lifecycle/event/notification/websocket/audit payloads.

Required public behavior to prove:

- `delegate_task` success for member and team targets returns exactly `{ task_id, status: "active" }`.
- `delegate_task` activation failure returns `{ task_id, status: "not_started", message }` with a concise activation-failure reason and no target/run-id/execution/activation fields.
- `submit_task_result` success for task-agent and task-team ingress callers returns exactly `{ task_id, status: "awaiting_review" }`.
- `submit_task_result` notification delivery failure still records the submission and returns `{ task_id, status: "awaiting_review", message }`, with no `submission_id`, `notification_delivered`, raw `warnings`, route keys, or run ids in the public result.
- `review_task_result` accept returns exactly `{ task_id, status: "accepted", decision: "accept" }`.
- `review_task_result` request-revision success returns exactly `{ task_id, status: "active", decision: "request_revision" }`.
- `review_task_result` request-revision notification failure returns task id/status/decision plus concise `message`, without raw warning arrays or route/run-id details.
- Hard failures continue through the error path.
- Internal events/notifications/websocket payloads retain execution run ids, submission ids, review ids, notification metadata, and routing identities.
- No backward-compatible public aliases, compatibility wrappers, or legacy verbose public fields are retained.

Implementation handoff legacy/compatibility check is clean for the refined scope: no backward-compatibility mechanisms, no retained old public behavior, and obsolete public-result fields removed from source/tests. Code review round 2 passed with no findings and confirmed previous API/E2E artifacts were stale for this refined three-tool scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `delegate_task` successful public result | Changed, preserved from first pass | REQ-004; AC-001/AC-002; design DS-001; implementation handoff | Existing service/unit and tool lifecycle integration assertions must remain exact minimal objects. |
| `delegate_task` activation failure public result | Changed, preserved from first pass | REQ-005; AC-003; design message semantics | Activation-failure tests must continue asserting `not_started` + concise `message` by exact equality. |
| `submit_task_result` successful public result | Changed in refined scope | REQ-006; AC-004/AC-005; rework note; design DS-002 | Existing submit assertions must no longer expect `submission_id`, `notification_delivered`, or `warnings`; exact minimal task-agent and task-team ingress coverage is required. |
| `submit_task_result` notification failure public result | Changed in refined scope | REQ-007; AC-006; rework note | Existing notification-failure coverage must assert concise public `message` only; internal submitted event/metadata must still retain submission id and route identity. |
| `review_task_result` accept public result | Changed, preserved from first pass | REQ-008; AC-007 | Existing service/unit and integration tests must assert exact minimal accept result and still observe settlement side effects internally. |
| `review_task_result` request-revision public result | Changed, preserved from first pass | REQ-009; AC-008 | Existing service/unit and integration tests must assert exact minimal revision result and still observe notification delivery internally. |
| `review_task_result` request-revision notification failure public result | Changed / edge coverage from first pass | REQ-010; AC-009 | Existing service/unit coverage must assert concise public `message`; no raw `warnings` or route/run ids in public result. |
| Parser/schema inputs for all three lifecycle tools | Preserved | REQ-001/REQ-002/REQ-003; AC-010 | Existing parser/default/strictness tests remain valid and must continue passing. |
| Hard tool failures | Preserved | REQ-011 | Existing unauthorized/stale-state/parser/service error assertions remain valid. |
| Internal lifecycle event/notification/websocket richness | Preserved | REQ-012; AC-011; design DS-004 | Existing internal-rich assertions remain valid and must continue passing. |
| Legacy verbose public fields for all three tools | Removed | Design removal/decommission plan; code review legacy verdict | Do not add or retain coverage expecting old public fields; exact-object assertions should catch reintroduction. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — repeated member delegation | Service returns exact `{ task_id, status: "active" }`; internal task-agent start identity, notification metadata, activation event payload remain rich. | REQ-004, REQ-012, AC-001, AC-011 | Still Valid | Source inspection shows exact equality on public result and internal assertions for `taskAgentRunId`, metadata, event payload. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — explicit team target delegation | Service returns exact `{ task_id, status: "active" }`; internal task-team identity, metadata, activation payload remain rich. | REQ-004, REQ-012, AC-002, AC-011 | Still Valid | Exact equality for public result; internal `task_team_run_id` and event assertions remain. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — submit/revise/resubmit/accept lifecycle | `submit_task_result` success returns exact minimal object; review revision/accept return exact minimal objects; notifications/events/settlement still use internal metadata. | REQ-006, REQ-008, REQ-009, REQ-012, AC-004, AC-007, AC-008, AC-011 | Still Valid | Submit/resubmit assertions now expect only task id/status; internal `submission_id`, review ids, route keys, and notification metadata assertions remain. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — submit notification failure | Public submit result includes only concise `message`; internal result-submitted event retains `submissionId`; duplicate submit hard error still fails. | REQ-007, REQ-011, REQ-012, AC-006, AC-011 | Still Valid | Test now uses exact public object `{ task_id, status, message }` and separate internal event assertion for `submissionId`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — revision notification failure | Public review revision result includes only concise `message`; internal review event still carries review/submission ids. | REQ-010, REQ-012, AC-009, AC-011 | Still Valid | Exact expected object contains task id/status/decision/message and no warning array. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — parser/tool exposure strictness | `delegate_task`, `submit_task_result`, `review_task_result` names and parsers; defaults for `reference_files`; rejects legacy/extra inputs and missing revision comment. | REQ-001, REQ-002, REQ-003, REQ-011, AC-010 | Still Valid | Test asserts accepted/defaulted inputs and rejects `member_name`, `tasks`, `task_id` on submit, `message`/`submission_id` on review, etc. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — rejected/throwing activation | Public delegate result is `not_started` with concise `message`; no active event or directory entry is published for rejected task. | REQ-005, AC-003 | Still Valid | Exact equality on public result; activation event/directory assertions cover lifecycle side effects. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — manifest/tool lifecycle, member target | Executes manifest parser + tool service + task delegation service; member delegate/submit/review public outputs exact minimal; websocket event projection remains rich. | REQ-001 to REQ-012; AC-001, AC-004, AC-007, AC-011 | Still Valid | Integration helpers execute `getTaskDelegationToolManifestEntry(...).parseInput/execute`; public submit assertion now exact minimal and internal submitted event retains `submissionId`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — task-agent child delegation/review | Task-agent context can delegate/submit/review child; public delegate/review results minimal; internal child delegator identity remains rich. | REQ-004, REQ-008, REQ-012, AC-001, AC-007, AC-011 | Still Valid | Exact public result assertions plus internal `taskAgentRunId`/delegator payload checks. Submit public result is executed but not directly asserted in this scenario; member lifecycle scenario covers exact submit shape. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — team target/ingress submit/revision/settlement/sequential delegation | Team-target `delegate_task`, task-team ingress `submit_task_result`, revision, accept paths return minimal public objects; task-team run ids/submission ids/notification metadata remain internal. | REQ-004, REQ-006, REQ-008, REQ-009, REQ-012, AC-002, AC-005, AC-007, AC-008, AC-011 | Still Valid | Exact public assertions for team delegate, team ingress submit, review revision/accept; identity retrieved from internal start/events instead of public result. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — activation failure | First delegate returns `not_started` + `message`; later delegate succeeds; stale rejected task cannot be reviewed. | REQ-005, REQ-011, AC-003 | Still Valid | Exact public assertion on rejected result and hard-error path for review. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — Agent Tools MCP `delegate_task` envelope | Codex converter projects MCP JSON text envelope to direct minimal `{ task_id, status }`, strips MCP envelope fields. | REQ-004; AC-001/AC-002 | Still Valid | Fixture is minimal delegate result; asserts result lacks `content`, `structuredContent`, `_meta`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — Agent Tools MCP `review_task_result` envelope | Codex converter projects MCP JSON text envelope to direct minimal `{ task_id, status, decision }`, strips MCP envelope fields. | REQ-008/REQ-009; AC-007/AC-008 | Still Valid | Fixture is minimal accept result and current input spelling. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` — Agent Tools MCP task-delegation envelope | Claude converter projects MCP JSON text envelope to direct minimal task result and strips MCP envelope fields. | REQ-004; AC-001/AC-002 | Still Valid | Generic Claude MCP projection path is tool-agnostic; delegate fixture asserts minimal result. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` — live member/task-team runtime E2E | With external LMStudio/Codex flags, exercises GraphQL/team websocket/runtime tool approval; verifies inputs, task notifications, internal events, and no legacy lifecycle tool names. | Broad API/E2E confidence for REQ-001/REQ-002/REQ-003/REQ-012 and activation/submission/revision runtime flow | Still Valid | Existing live E2E remains aligned. It asserts internal `submissionId` event data and notification surfaces, but does not assert exact public submit/review tool-result payloads. It is environment gated by `RUN_MIXED_TASK_DELEGATION_E2E` or LMStudio+Codex flags. | Run the file as an environment-gated executable check; expect local skip when flags are absent. Do not edit. |
| Prior API/E2E artifacts in this task folder | Earlier two-tool coverage investigation/execution report | Superseded by refined three-tool scope | Replace | Code review explicitly says prior artifacts are stale and must not be final evidence. | Overwrite canonical investigation/report paths with round 2 refined content. |
| Documentation and prior delivery artifacts | Durable docs/report files from prior downstream pass | Delivery-owned after refined API/E2E | Out Of Scope | Code review says docs and prior downstream artifacts are stale/refinement-impacted. | No API/E2E coverage action; delivery must refresh integrated docs/handoff. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior API/E2E investigation/report content in `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` | Treated only `delegate_task` and `review_task_result` as in scope, with `submit_task_result` out of scope/preserved. | Refined requirements now put `submit_task_result` in scope and code review explicitly marked earlier API/E2E artifacts stale. | Requirements REQ-002/REQ-006/REQ-007; solution design rework note; code review round 2. | This round-2 updated canonical investigation and forthcoming execution report. | N/A |
| Old public submit-result test assertions expecting `submission_id`, `notification_delivered`, `warnings` | Public submit result previously exposed internal telemetry. | The refined design removes those fields from public output without compatibility retention. | Requirements REQ-006/REQ-007; design removal plan; implementation handoff. | Current service and integration tests assert exact minimal submit output and separately assert internal submitted event/metadata. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Existing reviewed durable coverage already covers the required delegate/submit/review public result shapes, parser stability, hard-error paths, concise notification-failure messages, internal-rich event/notification payloads, and provider MCP projection. | Code review round 2 confirms focused tests cover exact public result assertions and internal-rich assertions for all three lifecycle tools. | N/A | Adding duplicate tests in API/E2E would broaden coverage code after code review without a current uncovered behavior. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Implementation already updated necessary durable coverage before refined code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in current review-passed source/tests | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-001 | Focused Vitest command for reviewed service/tool lifecycle/provider converter tests. | Current durable coverage passes against the refined review-passed implementation. | Uses existing durable tests only; no temporary code. |
| APIE2E-002 | Environment-gated live E2E file `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`. | Confirms the live E2E artifact remains loadable and records whether local environment executes or skips it. | Existing durable E2E; no new temporary code. Local environment is not expected to have live flags. |
| APIE2E-003 | Source build TypeScript check `tsc -p tsconfig.build.json --noEmit`. | Changed source compiles under build config. | Existing compiler check; no temporary code. |
| APIE2E-004 | Full `pnpm -C autobyteus-server-ts typecheck` to reclassify known baseline status. | Confirms whether the known TS6059 rootDir/test include baseline still blocks full typecheck. | Existing command; expected failure is baseline and not a durable coverage artifact. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live multi-runtime E2E with actual LMStudio/Codex model execution | Environment flags and external model/server setup are not guaranteed locally; the durable live E2E is gated by `RUN_MIXED_TASK_DELEGATION_E2E`, `RUN_LMSTUDIO_E2E`, and `RUN_CODEX_E2E`. | Low-to-medium residual runtime-provider risk; mitigated by integration harness exercising manifest/service/runtime lifecycle and converter tests exercising MCP result projection. | If delivery or user requires live provider proof, rerun with required live E2E environment flags. No implementation reroute needed. |
| Exact public `submit_task_result` payload assertion in live websocket E2E | Existing live E2E waits for tool success and validates internal submitted event/notification surfaces but does not inspect the public tool-result payload. | Low; exact public submit shape is covered through service and manifest/tool lifecycle integration, while live E2E mainly covers runtime orchestration. | No reroute; possible future live E2E enhancement if provider-result payload inspection becomes required. |
| Durable docs synchronization for changed public result contract | Delivery owns docs sync after refined API/E2E validation and integrated refresh. | Docs may remain stale until delivery. | Delivery should refresh docs and prior delivery artifacts against refined scope. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified | N/A | Requirements/design/implementation/code review consistently require clean-cut public result simplification across all three tools and internal payload preservation; no compatibility wrapper observed in inspected changed source. | N/A |

## Execution Plan

1. Confirm generated Prisma client if needed: `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`.
2. Run whitespace check: `git diff --check`.
3. Run focused durable coverage: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts`.
4. Run environment-gated live E2E file for load/skip evidence: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`.
5. Run source TypeScript build check: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
6. Rerun full typecheck to document known baseline failure classification: `pnpm -C autobyteus-server-ts typecheck`.
7. Write canonical execution coverage report with round-2 evidence and route to `delivery_engineer` if no repository-resident durable coverage was added, updated, or removed during API/E2E.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable coverage is sufficient for the refined three-tool public result cleanup. No stale repository-resident coverage remains in the review-passed source/tests, and no API/E2E-authored durable coverage changes are planned.
