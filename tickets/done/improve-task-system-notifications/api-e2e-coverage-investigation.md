# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/design-spec.md`
- Requirement Gap Rework Note: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/requirement-gap-rework.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Round-3 code-review pass after Electron-discovered requirement-gap rework for uniform task-delegation activation notification copy.
- Prior Investigation Reviewed: Round 1 API/E2E artifacts at this path and `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/improve-task-system-notifications/api-e2e-execution-coverage-report.md` were read as historical context only. They predate the round-3 rework and are superseded for final validation.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The current approved round-3 behavior requires task-delegation visible notification content to be owned by the backend task-delegation subsystem, carried as display-content metadata, and projected into the one `SYSTEM_TASK_NOTIFICATION.content` surface consumed by the Electron/frontend transcript. Runtime/model input remains separate and actionable. The mixed member boundary must still emit exactly one `SYSTEM_TASK_NOTIFICATION` for each accepted stamped task-delegation system message and must not also emit a duplicate `MEMBER_INPUT_MESSAGE` for the same payload.

The round-3 requirement-gap correction is now authoritative: task-delegation activation visible copy must use one uniform task-centered template for both individual-agent and agent-team targets:

```text
You have a new task.

Task ID: <task_id>

Task:
<task description>

Reference files:
- <reference or None specified>
```

Visible activation content must not reveal whether the original target was a member or a team. It must not contain `New delegated task`, `New delegated team task`, `Accountable team`, `Logical member`, target/team/member names as labels, sender/delegator/reviewer names, execution/run identifiers, task-team instance identifiers, lifecycle/tool protocol text, JSON tool-call snippets, or `send_message_to` warnings. Team/accountability identity remains available in backend metadata/events/tool results for routing and diagnostics only.

Result-submitted and revision-requested visible notifications remain task-centered: result-submitted content must include task id, task description/context, submitted result content, and references while omitting sender/receiver framing and internal ids; revision-requested content must include task id, task description/context, review `comment`, and references while omitting reviewer framing, internal ids, and protocol snippets.

`review_task_result.comment` is the sole model-facing review free-text argument. The legacy `review_task_result.message` argument must not be accepted as an alias. Acceptance free text is `acceptanceComment` in status/domain payloads. Tool schema, parser, manifest/prompt wording, runtime instructions, backend events, live tool calls, and durable tests must use this canonical naming.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanism was introduced, no old review `message` alias is retained, old visible activation labels were removed from source, and round-3 runtime work packets removed non-actionable target-label lines while preserving task id, review owner, description, references, and lifecycle guidance.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Backend task-delegation display-content metadata is projected into `SYSTEM_TASK_NOTIFICATION.content` | Added / Preserved | FR-007, AC-006, design DS-005, implementation handoff | Keep projection/no-duplicate tests and live websocket checks. |
| Member-target activation visible copy is task-centered and no longer raw runtime content | Changed | FR-001, AC-001 | Unit coverage is valid; live member E2E must run post-rework. |
| Team-target activation visible copy is exactly the same template as member-target activation | Changed | FR-001, FR-002, AC-001, AC-002, requirement-gap rework note, code-review downstream focus | Existing unit coverage is valid, but live/Electron-visible team activation coverage is missing; update durable E2E to cover it. |
| Old target-kind and target-name visible activation labels (`New delegated task`, `New delegated team task`, `Accountable team`, `Logical member`, team/member names as labels) are removed | Removed | Requirement-gap rework note; implementation handoff round-3 rework; code-review legacy verdict | Add/strengthen forbidden visible snippet checks in live E2E. |
| Non-actionable target labels in runtime work-packet copy are removed while actionable lifecycle guidance remains | Changed | FR-006, implementation handoff, code-review scope | Unit/integration assertions remain the right durable boundary; execute targeted tests. |
| Result-submitted visible notification remains natural and omits internal/protocol details | Changed / Preserved | FR-003, AC-003 | Existing live member E2E and service tests remain valid; execute. |
| Revision-requested visible notification uses review `comment` and omits internal/protocol details | Changed / Preserved | FR-004, FR-005, AC-004, AC-005 | Existing live member E2E and service tests remain valid; execute. |
| `review_task_result.comment` replaces `message`; `message` is rejected | Removed / Changed | FR-005, AC-005, design legacy removal policy, code-review no-compatibility verdict | Execute parser/schema/runtime-description tests; live E2E approval predicates must continue rejecting `message`. |
| `delegate_task.description` and `review_task_result.comment` descriptions are task-centered | Changed | FR-010, AC-010 | Execute runtime-description/member-instruction tests. |
| Backend lifecycle/status events retain routing/correlation metadata and expose `comment` / `acceptanceComment` where applicable | Preserved / Changed | FR-009, implementation handoff, code-review downstream focus | Execute integration and live event assertions; do not treat visible-content cleanup as metadata removal. |
| Frontend/Electron remains a pass-through renderer of backend `content` | Preserved | Out of scope; investigation notes frontend pass-through; design forbids frontend filtering | Validate backend websocket payload content as the Electron-visible boundary; no frontend heuristic tests required. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` member activation | Verifies runtime work packet remains actionable, display content is the uniform `You have a new task.` template, includes task id/description/references, and omits sender/internal/old target-kind labels. | FR-001, FR-006, FR-007, FR-009; AC-001, AC-007 | Still Valid | Inspected assertions around `delegates repeated singular active work...`; `expectNoInternalNotificationDetails` now includes `New delegated task`, `New delegated team task`, `Accountable team`, `Logical member`. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` team activation | Verifies team-target activation starts a task-team instance, keeps routing metadata, and display content is exactly the same uniform template as member activation without `design_team` or target-kind labels. | FR-001, FR-002, FR-006, FR-007, FR-009; AC-001, AC-002, AC-007 | Still Valid | Inspected `delegates to an explicit team target...`; exact expected display is `You have a new task...`, and assertions reject `coordinator`/`design_team` plus internal/old labels. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` activation sender-framing guard | Verifies named delegator/worker names remain out of visible activation content while runtime can carry actionable review owner. | FR-001, FR-002; AC-001, AC-002 | Still Valid | Inspected `keeps activation visible content task-centered...`. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` submit/revision/accept lifecycle | Verifies result/revision display metadata, no internal notification details, review event `comment`, `acceptanceComment`, warnings, and settlement. | FR-003, FR-004, FR-005, FR-008, FR-009; AC-003, AC-004, AC-009 | Still Valid | Inspected lifecycle assertions around result-submitted, revision-requested, accepted review events. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` parser strictness | Verifies canonical tool list, `comment` accepted, `message` rejected for `review_task_result`, and stale submit/review fields rejected. | FR-005; AC-005 | Still Valid | Inspected parser assertions at end of file. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts` display override/no duplicate | Verifies an accepted stamped task-delegation system message is posted to runtime, one local `SYSTEM_TASK_NOTIFICATION` uses display content, and no member-input echo is emitted. | FR-007, FR-008; AC-006, AC-008 | Still Valid | Inspected display override fixture now uses `You have a new task.`. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts` defensive fallback | Verifies stamped message without display metadata falls back to raw content. | Design tradeoff defensive fallback; AC-006 fallback | Still Valid | Fallback remains explicitly allowed only for old/manual stamped messages and is not a constructor compatibility path. | Execute targeted unit test; do not broaden compatibility behavior. |
| `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` tool manifest/schema/MCP definitions | Verifies canonical task tools, task-centered `delegate_task.description`, `review_task_result.comment`, no `message` review field, and no legacy lifecycle tools. | FR-005, FR-010; AC-005, AC-010 | Still Valid | Reviewed by code review and unchanged by round-3 visible-copy rework. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` runtime task protocol instructions | Verifies task delegation protocol text uses `comment` and task-centered wording, no old revision-message wording. | FR-005, FR-010; AC-005, AC-010 | Still Valid | Reviewed by code review and unchanged by round-3 visible-copy rework. | Execute targeted unit test. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` server-managed member lifecycle | Verifies delegate -> submit -> review -> idle settlement, runtime content cleanup, websocket event mapping keeps execution ids. | FR-006, FR-009; AC-007, AC-009 | Still Valid | Inspected member lifecycle assertions. | Execute integration test. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` child task-agent lifecycle | Verifies nested task-agent delegation/review identity and no non-actionable parent run id in child work packet. | FR-006, FR-009; AC-009 | Still Valid | Existing integration remains relevant. | Execute integration test. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` task-team target lifecycle | Verifies team target activation, ingress tool routing, revision to task-team target, task-team settlement, cleanup, and sequential delegation. | FR-002, FR-004, FR-009; AC-002, AC-004, AC-009 | Still Valid | Inspected `runs task-team target ingress...` scenario; it covers routing/lifecycle but not live websocket display projection. | Execute integration test; supplement with live E2E activation display coverage. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` live mixed member delegation cycle | Starts live Fastify GraphQL/websocket server with AutoByteus coordinator and AutoByteus task-agent worker; delegates to a member target, observes member activation/result-submitted/revision-requested notifications, requires the live `review_task_result.comment` tool argument (and no `message` alias), verifies the revision event carries `comment`, and checks no duplicate member-input surface. A separate scenario keeps Codex App Server in the live mixed boundary for team-target activation projection. Acceptance/settlement and `acceptanceComment` remain covered by unit/integration lifecycle tests rather than live multi-turn model automation. | FR-001, FR-003, FR-004, FR-005, FR-008, FR-009; AC-001, AC-003, AC-004, AC-005, AC-008, AC-009 | Needs Update | Still valid for member activation/result/revision/comment paths, but the prior Codex task-agent submit step repeatedly timed out in this environment after activation, and later model-driven resubmission/acceptance proved nondeterministic. The durable scenario remains the right live websocket visible-content boundary when run with a deterministic AutoByteus worker through the first review request, while unit/integration retain acceptance/settlement coverage and a separate Codex App Server team-target activation scenario covers mixed runtime projection. Round-3 live coverage also lacks team-target activation and current forbidden snippet list lacks explicit old target-kind labels (`New delegated task`, `New delegated team task`, `Accountable team`, `Logical member`). | Update narrow durable E2E coverage, then execute live E2E. |
| `autobyteus-server-ts/tests/unit/api/task-delegation-route.test.ts` task reference content REST route | Serves task-owned reference content and maps errors. | Reference retrieval support, but not changed notification/tool schema boundary | Out Of Scope | No changed notification behavior or `comment` rename covered. | No execution required. |
| Other runtime send-message, agent-runtime, team definition, and frontend tests | General runtime/tool/message/team-definition infrastructure. | Ordinary `send_message_to`, team-definition CRUD, and frontend rendering internals are out of scope. | Out Of Scope | Requirements explicitly exclude ordinary send-message delivery and frontend copy filtering/redesign. | No execution required unless E2E setup exposes a local failure. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior API/E2E investigation and execution-report conclusions treating live model-driven task-team E2E as unnecessary | They predate the Electron-discovered requirement-gap correction and did not validate live/Electron-visible team-target activation after the uniform-template rework. | Code review round 3 explicitly supersedes earlier API/E2E artifacts for final signoff and asks live/Electron-visible member and team activation validation. | Current code-review report; requirement-gap rework note; implementation handoff downstream coverage hints. | Update `mixed-task-delegation.e2e.test.ts` to add live team-target activation visible-content coverage. | N/A |
| None in repository-resident test source for old copy/legacy schema | No obsolete old-copy or legacy-schema assertion remains. | No current repo test asserts old `New delegated team task`, `Accountable team`, `Logical member`, or accepted `review_task_result.message` as desired behavior. | Round-3 source/test inspection and code-review stale-copy grep. | N/A | N/A |
| Live model-driven revised resubmission/acceptance/settlement assertions in `mixed-task-delegation.e2e.test.ts` | The old live E2E required autonomous multi-turn model behavior through revision resubmission, acceptance, `acceptanceComment`, offline status, and task-agent settlement. | The behavior remains required, but this live model-to-model assertion is not the stable boundary for it: repeated local runs showed model nondeterminism after revision while deterministic unit/integration lifecycle tests already cover acceptance, `acceptanceComment`, and settlement. | Current investigation plus repeated local live attempts recorded in execution report. | Unit/integration lifecycle coverage plus live E2E through first review request and visible revision surface. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None as a new file | Existing E2E file is the correct live mixed-runtime websocket boundary. | Existing durable coverage ownership remains appropriate. | N/A | Add/update scenarios in the existing E2E file instead of creating a parallel harness. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-001 | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` live member delegation cycle | Add round-3 forbidden visible activation snippets (`New delegated task`, `New delegated team task`, `Accountable team`, `Logical member`) to the shared forbidden visible-content guard. Keep live member activation/result-submitted/revision-requested/comment assertions through the first `review_task_result` request, using AutoByteus coordinator + AutoByteus worker for deterministic initial submit behavior after repeated Codex-worker submit timeouts in this environment. Leave revised resubmission, acceptance, `acceptanceComment`, and settlement to existing unit/integration lifecycle coverage. | FR-001, AC-001, requirement-gap rework, code-review downstream focus | Narrow durable E2E update after code review means final package must return through `code_reviewer` before delivery. |
| E2E-002 | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` new live team-target activation scenario | Add a live mixed-runtime scenario with an AutoByteus coordinator delegating to an agent-team target whose ingress uses Codex App Server. Validate the child task-team ingress receives exactly one `SYSTEM_TASK_NOTIFICATION` whose content uses the same `You have a new task.` activation template, includes task id and description, and omits target kind/name labels, team/ingress names, sender/delegator names, task-team run id, task-team instance id, internal ids, lifecycle/tool protocol copy, JSON snippets, and duplicate `MEMBER_INPUT_MESSAGE`. | FR-001, FR-002, FR-007, FR-008, FR-009; AC-001, AC-002, AC-006, AC-008; requirement-gap rework; code-review recommended API/E2E focus | Limit live team-target coverage to activation visible surface. Full team-target revision/settlement lifecycle remains covered by integration to avoid a high-flake, multi-model, multi-step live scenario. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| Live model-driven revised resubmission/acceptance/settlement assertions in `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Replace unstable multi-turn model automation with deterministic unit/integration lifecycle coverage; final live E2E stops at the first revision request after proving activation/result/revision visible surfaces and strict `comment`. | Existing unit/integration lifecycle tests cover acceptance, `acceptanceComment`, offline/settlement, task-team settlement, and cleanup; live attempts in this environment showed model nondeterminism rather than an implementation defect. | Replacement: targeted unit/integration execution plus live E2E through revision-requested notification. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-001 | Environment probe: `codex --version` and LM Studio `/v1/models` reachability. | Confirms live E2E prerequisites and candidate model availability before running expensive live tests. | Environment discovery only; not product behavior. |
| PROBE-002 | Targeted stale-symbol greps after E2E update. | Confirms no actionable old activation labels, accepted legacy review `message`, or stale `acceptanceMessage` source paths remain in changed scope. | Static safety check only; durable tests enforce behavior. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live model-driven task-team result submission, revision, resubmission, acceptance, and settlement | Integration coverage already exercises task-team target routing, ingress revision delivery, settlement, and cleanup; live member E2E exercises result/revision visible websocket content and strict `review_task_result.comment` for the first review request. A full team-target live review cycle would add multiple model/tool steps and substantial flake/latency beyond the round-3 activation-copy gap. | Low after adding live team-target activation display coverage plus existing task-team integration lifecycle. | None unless the new team-target activation E2E exposes a task-team-specific defect. |
| Full live model-driven member resubmission, acceptance, `acceptanceComment`, and settlement | Repeated live attempts showed nondeterministic model behavior after revision: Codex worker timed out before initial submit in this environment, and AutoByteus coordinator/worker later produced prose instead of the expected follow-up accept/resubmit tool call. Unit and integration coverage already validate the deterministic backend acceptance/settlement path and `acceptanceComment`; live E2E now stops at the stable first review-request boundary while still validating visible result/revision surfaces and strict `comment`. | Low; the changed round-3 behavior is notification copy/projection and review argument naming, and deterministic unit/integration tests cover acceptance/settlement fields. | None unless future requirements demand fully autonomous model-to-model live acceptance. |
| Native Electron window rendering snapshot | Frontend/Electron remains a pass-through renderer for backend websocket `SYSTEM_TASK_NOTIFICATION.content`; no frontend filtering or UI redesign is in scope. The live backend websocket payload is the Electron-visible content boundary. | Low; prior investigation traced frontend pass-through and code review forbids frontend filtering. | Delivery can re-check docs/release notes; no API/E2E reroute. |
| Task reference REST route | Not changed by notification wording or `review_task_result.comment` rename. | Low | None. |
| Ordinary `send_message_to` delivery | Explicitly out of scope. | Low | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Upstream package is complete, requirement-gap rework is explicit, and round-3 code review passed with no findings. | N/A |

## Execution Plan

1. Update the existing live mixed task-delegation E2E file with the recorded E2E-001/E2E-002 durable coverage changes.
2. Run static and stale-symbol checks for the updated repository state: `git diff --check`, targeted stale-copy/legacy-field greps, and `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
3. Execute targeted unit tests covering service display metadata, no-duplicate projection, strict parser/schema/runtime wording, and runtime instruction `comment` terminology.
4. Execute the integration task-delegation lifecycle test covering member, nested task-agent, task-team target, routing/correlation metadata, comments, warnings, and settlement.
5. Probe live prerequisites (`codex --version`, LM Studio `/v1/models`) and execute the live E2E with `RUN_CODEX_E2E=1`, `RUN_MIXED_TASK_DELEGATION_E2E=1`, `APP_ENV=test`, `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-27b`, and an available Codex model override such as `CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5` for the Codex-backed team-target activation scenario.
6. If live environment setup is unavailable after reasonable probing, record it as blocked/infeasible with all other executable evidence. If a failure reveals implementation behavior mismatch, classify and reroute. If checks pass, update the execution coverage report and return the cumulative package to `code_reviewer` because repository-resident durable E2E coverage changed after the round-3 code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The prior API/E2E reports are superseded by the round-3 requirement-gap rework. Current durable unit/integration coverage is valid, but the existing live E2E needs a narrow update to prove the round-3 live/Electron-visible team-target activation surface, add explicit old target-kind forbidden snippets, and keep live member-result/revision assertions on a deterministic worker runtime after Codex-worker submit attempts and later live resubmit/accept loops proved nondeterministic locally. Because this stage will modify repository-resident durable coverage, a passing result must route back to `code_reviewer` before delivery.
