# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/done/singular-delegate-task/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/done/singular-delegate-task/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/done/singular-delegate-task/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/done/singular-delegate-task/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/done/singular-delegate-task/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/done/singular-delegate-task/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review handoff requesting API/E2E coverage investigation and execution for FR-009 / AC-008 after implementation review passed.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a clean-cut public/model-facing task-delegation API replacement: `delegate_tasks({ tasks: [...] })` is removed and `delegate_task({ member_name, description, reference_files? })` is the active backend agent tool. One successful call creates one delegated-task ledger record, activates at most one task-agent for that record, returns a direct single-task result, and preserves the existing `submit_task_result` / `review_task_result` lifecycle. Multiple independent delegations are represented by repeated `delegate_task` calls, not a batch array. Tool descriptions, parameter schemas, runtime instructions, docs, and durable coverage must use positive-only singular guidance and must not preserve the noisy negative field list. The design and code review explicitly reject compatibility aliases, dual parser paths, retained public `tasks[]` envelopes, and all-runnable activation for the singular flow.

FR-009 / AC-008 require API/E2E evidence beyond unit/service/manifest tests. The real evidence must create a team run through product-facing GraphQL/runtime paths, expose `delegate_task` as a configured tool, execute `delegate_task`, observe task-agent activation, observe `submit_task_result`, and complete `review_task_result` revision and acceptance flow through runtime/websocket events.

Implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility mechanisms introduced, old behavior not retained, dead/obsolete code removed in scope, and source/docs/tests no longer actively reference old public identifiers outside historical ticket artifacts. Static inspection during this investigation found no active `delegate_tasks`, `DelegateTasks*`, `delegateTasks`, `delegate-tasks`, `createdTasks`, or `activationResults` references under active source/tests/docs, except event payload/test assertions for accepted internal `tasks` arrays and an intentional parser rejection assertion for legacy `tasks` input.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Public task-delegation tool name is `delegate_task` | Changed | FR-001, AC-001, AC-004; design removal plan; code review pass | Durable runtime/E2E must observe `delegate_task` as the tool called/executed, and old `delegate_tasks` must not appear in active public catalog/exposure checks. |
| Public input is direct `member_name`, `description`, optional `reference_files` | Changed | FR-002, AC-001, AC-006; design examples | Durable coverage must assert direct schema shape and no `tasks` envelope in the model-facing tool schema. |
| One call creates one task record and starts at most one task-agent | Changed | FR-003, AC-002; design DS-001 | Durable coverage must observe one activation event with one task id for one `delegate_task` call. |
| Multiple tasks use repeated singular calls | Changed | FR-005, AC-003; design DS-003 | Existing unit/integration coverage remains the right place for repeated-call fan-out; live E2E can remain focused on the full one-task result/review lifecycle. |
| Direct single-task result shape replaces `createdTasks` / `activationResults` arrays | Changed/Removed | FR-004; implementation handoff; code review | Unit/integration coverage must assert direct result shape; E2E observes downstream lifecycle from the direct `delegate_task` execution. |
| `submit_task_result` and `review_task_result` lifecycle continues for tasks created by `delegate_task` | Preserved | FR-007, AC-005, AC-008; design DS-002 | Real E2E must drive both result submission and review revision/acceptance after creation. |
| Positive-only delegation input guidance | Changed | FR-006, AC-006; requirements and design | Runtime description/unit coverage must assert absence of noisy field list; live E2E should not rely on old negative guidance. |
| No public backward compatibility for `delegate_tasks`/`tasks[]` | Removed | Out of scope/constraints, design Legacy Removal Policy, implementation handoff compatibility check | Coverage must not add/retain compatibility-only tests. Parser rejection of old `tasks` input is acceptable as a clean-cut validation check, not compatibility coverage. |
| Internal websocket task-delegation event payload arrays (`taskIds`, `tasks`) remain projection shape | Preserved | Design residual risk accepted; code review residual risks | Relevant E2E assertions should require one task in the activation event but should not force event schema singularization in this ticket. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live mixed AutoByteus + Codex team run through GraphQL/websocket; coordinator calls `delegate_task`; task-agent submits; coordinator requests revision and accepts; websocket lifecycle events observed. | FR-009 / AC-008; design DS-004; code-review routing note | Needs Update | Static read shows the file was updated from `delegate_tasks` to `delegate_task` and direct JSON; it already observes approval, tool execution, activation, submit, revision, revised submit, acceptance, offline/settlement. It should also assert product-facing tool catalog/schema exposure for `delegate_task` and absence of `delegate_tasks` in the same E2E path to make the requested "tool listing/exposure" evidence explicit. | Update this file narrowly before final execution. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Server-managed manifest/tool-service/lifecycle integration for repeated singular delegation, submit/review/idle settlement, child delegation, rejected activation scoping, canonical tool list. | AC-002, AC-003, AC-005; DS-001/DS-002/DS-003 | Still Valid | Diff/read shows repeated `executeDelegateTask` calls, direct `DelegateTaskResult`, one-task activation payloads, and rejection of stale activation behavior. | Run as focused supporting executable coverage. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Lifecycle service unit coverage for repeated singular active work, result/review/revision, failed activation, nested task-agent delegation, parser direct shape and legacy `tasks` rejection. | FR-002/FR-003/FR-004/FR-005/FR-007; AC-002/AC-003/AC-005 | Still Valid | Diff/read shows `delegateTask` direct input, direct result, repeated calls, and `parseDelegateTaskInput({ tasks: [...] })` rejection. | Run as focused supporting executable coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Canonical manifest names, direct parameter schema, description positive-only guidance, MCP adapter definitions. | FR-001/FR-002/FR-006; AC-001/AC-004/AC-006 | Still Valid | Diff/read shows canonical list starts with `delegate_task`, no `tasks` parameter, no `Do not pass`, no `completion_criteria`. | Run as focused supporting executable coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` | Agent Tools MCP catalog includes configured backend task-delegation tools by active names. | AC-001/AC-004; public tool exposure | Still Valid | Diff shows `delegate_task` replaces `delegate_tasks` in catalog expectations. | Run as supporting exposure coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts` | Configured tool exposure resolves task-delegation tool names into the task-delegation exposure bucket. | AC-001/AC-004; runtime configured exposure | Still Valid | Diff shows `delegate_task` in enabled configured names and filtered task-delegation names. | Run as supporting exposure coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts` | AutoByteus mixed runtime exposes configured task-delegation tools alongside other allowed tools. | AC-001/AC-008 exposure support | Still Valid | Diff shows expected mixed exposure includes `delegate_task`. | Run as supporting exposure coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Claude session gating exposes task-delegation local/MCP names only when configured. | AC-001/AC-004 exposure support | Still Valid | Diff shows local and MCP names updated to `delegate_task` / `mcp__autobyteus_agent_tools__delegate_task`. | Run as supporting exposure coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Codex member bootstrap instructions include singular task delegation protocol and omit noisy negative guidance. | FR-006/AC-006; runtime instruction exposure | Still Valid | Diff shows `Use delegate_task`, repeated-call guidance, and no `do not pass delegator`. | Run as supporting runtime-instruction coverage. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` | Team member runtime instruction composer emits singular positive task-delegation protocol. | FR-006/AC-006/AC-007 | Still Valid | Diff shows positive repeated-call wording and absence of `completion_criteria` / noisy negative text. | Run as supporting runtime-instruction coverage. |
| `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | Generic GraphQL tool catalog cleanup excludes removed local tools. | General tool-management E2E, not task delegation lifecycle | Out Of Scope | Existing file is not tied to task delegation runtime lifecycle and does not exercise team runs/tool execution. | Do not modify for this task; add the task-delegation catalog assertion to the mixed runtime E2E instead. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None identified during API/E2E investigation | N/A | Implementation already updated or removed active plural-contract tests before code review. | Code review pass and `rg` over active source/tests/docs. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-001-catalog | Product-facing GraphQL/local tool catalog exposes `delegate_task` with direct `member_name`, `description`, optional `reference_files`, and does not expose `delegate_tasks`. | AC-001, AC-004, AC-008; code-review request explicitly names tool listing/exposure | Update `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Makes tool listing/schema exposure explicit in the real mixed-runtime E2E candidate instead of relying only on unit catalog tests plus observed tool approval. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-001 | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Add a narrow GraphQL `tools(origin: LOCAL)` assertion after `loadAllAgentTools()`/schema setup and before runtime tool execution, checking direct singular parameter list and absence of `delegate_tasks`. Preserve existing runtime creation, `delegate_task`, activation, `submit_task_result`, revision, acceptance, and settlement assertions. | FR-009 / AC-008; AC-001 / AC-004 | This is a repository-resident durable coverage update after code review; on pass or environment-blocked execution it must be routed back through code review before delivery. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-ENV-001 | `codex --version` / environment variable inspection and focused vitest invocation of the live E2E with required flags | Determines whether the local machine has enough live runtime/model setup to execute AC-008 honestly. | Environment availability is task-run evidence, not durable product behavior. |
| PROBE-SKIP-001 | If live E2E cannot be forced because model/provider setup is absent, run the e2e file without live flags to prove it compiles and records skip status separately from AC-008 sign-off. | Confirms test syntax/import validity but not FR-009. | A skipped live E2E is not acceptable durable validation evidence for AC-008; it is only diagnostic. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| None decided infeasible at investigation time | Live E2E environment has not yet been executed in this API/E2E stage. | Real model/provider setup may be unavailable. | Execute after durable coverage update; if unavailable, record a `Blocked` execution result with exact evidence rather than substituting mocks. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution | N/A | Requirements/design/implementation/code review agree on required behavior and no compatibility alias was observed in static inspection. | N/A |

## Execution Plan

1. Update `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` to add product-facing GraphQL/local tool catalog assertions for `delegate_task` direct schema and absence of `delegate_tasks`.
2. Run focused supporting coverage suites:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
3. Run `git diff --check` for the API/E2E durable coverage update.
4. Run the mixed runtime E2E with live flags, expected command:
   - `RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
5. If the live E2E fails due missing Codex binary/model/provider setup, record exact blocker evidence and optionally run the same file without live flags as a compile/skip diagnostic only.
6. Write the canonical execution coverage report at `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/done/singular-delegate-task/api-e2e-execution-coverage-report.md`.
7. Because durable repository-resident E2E coverage will be updated after code review, route the cumulative package back to `code_reviewer` before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The real mixed-runtime E2E remains the authoritative AC-008 candidate. It will be updated narrowly for explicit tool listing/schema exposure, then executed if the live environment is available. No stale/obsolete coverage removal is planned.

## Investigation Update After Initial Live E2E Attempts (2026-06-25)

After the initial planned E2E update and live execution attempts, two additional execution-environment/candidate-test validity facts were discovered before further durable coverage edits:

| Evidence | Observation | Coverage Decision Impact |
| --- | --- | --- |
| `RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Default LM Studio selection did not produce a `delegate_task` approval request before timeout. A direct LM Studio probe showed `qwen3.6-27b-mtplx-optimized-speed` was listed but failed to load, while `google/gemma-4-26b-a4b` responded. | Use an exact loaded LM Studio model for live reruns; this is environment selection, not a product behavior failure. |
| Rerun with `LMSTUDIO_MODEL_ID=google/gemma-4-26b-a4b:lmstudio@127.0.0.1:1234` | `delegate_task` approval/execution and task-agent activation occurred, but Codex worker did not execute `submit_task_result`; stderr showed `Agent tool MCP session is unavailable` from `/mcp/agent-tools/...`. Static comparison with `all-runtime-send-message-matrix.e2e.test.ts` showed this E2E was only registering a websocket-only Fastify app and was not registering Agent Tools MCP routes or seeding `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` to the in-process test server. Codex therefore connected to the ambient server URL, whose in-memory MCP session registry did not contain the test-created session. | The mixed task-delegation E2E candidate remains valid but needs a second narrow durable update: start one in-process runtime Fastify server with both Agent Tools MCP routes and team websocket, seed the internal server base URL during `beforeAll`, and restore it in `afterAll`. This is coverage harness correctness, not implementation compatibility behavior. |

Additional durable coverage update now required:

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-001-mcp-server | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Register `registerAgentToolsMcpRoutes` on the same in-process Fastify runtime server as the websocket, seed `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` from that listen address before Codex task-agent startup, and restore the prior env value after the suite. | AC-008 requires real Codex task-agent `submit_task_result` execution through the runtime/tool-exposure path; Codex Agent Tools MCP sessions are process-local and must be served by the same test process. | Proceed with this narrow test-harness update before rerunning the live E2E. This is repository-resident durable coverage code and must return through code review. |

Additional live-run harness evidence after registering the in-process MCP route: the loaded LM Studio model may emit extra or malformed `delegate_task` approval requests before the exact requested call. The durable E2E should not approve malformed calls that do not match the exact JSON arguments under test. A narrow harness update will deny mismatched approval requests and only approve the tool invocation whose arguments match the scenario's expected input. This preserves the behavior under test and avoids false failures caused by model over-eager multi-tool output.

Additional live-run harness evidence after the MCP route fix: the coordinator can start an automatic notification-response turn after `TASK_DELEGATION_RESULT_SUBMITTED` and may request an unrelated `delegate_task` call despite test instructions. The E2E's existing deterministic-settlement helper denied such requests but waited only for `TURN_COMPLETED`; this left the suite exposed to a running unprompted turn. The helper will now interrupt the coordinator after denying unprompted tool requests and accept either `TURN_COMPLETED`, `TURN_INTERRUPTED`, or coordinator idle as settlement evidence before issuing the explicit review instruction. This keeps the test focused on the explicit revision/acceptance flow required by AC-008.

## Investigation Update After Final Durable E2E Harness Refinement (2026-06-25)

Further live execution showed that the real mixed-runtime path is valid, but the candidate test needed one more deterministic-flow refinement. The local LM Studio model selected for the authoritative run can follow exact tool-call instructions, but explicit manual review prompts after denying an automatic coordinator review created unnecessary model-state churn. The more faithful product flow is to let framework result-submitted notifications drive the delegator's review decisions.

| Evidence | Observation | Coverage Decision Impact |
| --- | --- | --- |
| Live run with `LMSTUDIO_MODEL_ID=qwen3.5-27b-claude-4.6-opus-distilled-mlx:lmstudio@127.0.0.1:1234` after MCP route seeding | Initial `delegate_task` executed and Codex submitted the first task result. The coordinator naturally began a result-notification review turn. Denying that automatic review and then sending a second manual review prompt made the model spend the later turn in reasoning without producing a matching approval before timeout. | Update the durable E2E to use the real result-notification review path instead of suppressing it: coordinator instructions now request revision on the first submitted-result notification and accept on the revised-result notification. The harness still approves only `review_task_result` calls whose exact arguments match the expected task id, decision, and revision message. |
| Direct LM Studio tool-call probes and final live E2E run | `google/gemma-4-26b-a4b` can emit malformed extra `delegate_task` calls; `qwen3.5-27b-claude-4.6-opus-distilled-mlx` produced exact tool calls and the final live E2E passed. | The execution report should record the exact model override used for authoritative AC-008 evidence and classify earlier failures as environment/model-selection and test-harness determinism issues, not implementation failures. |

Final durable coverage update for `E2E-001`:

- Keeps the GraphQL `tools(origin: LOCAL)` catalog assertion for `delegate_task` direct schema and no `delegate_tasks`.
- Serves Agent Tools MCP routes and websocket from one in-process Fastify runtime server and seeds `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` so Codex task-agents execute `submit_task_result` against the same session registry.
- Uses strict approval predicates for `delegate_task` and both `review_task_result` calls, denying mismatched approval requests.
- Drives the review lifecycle from real task-result notifications: first submitted result -> `request_revision`; revised submitted result -> `accept`.
- No stale coverage was removed. The only repository-resident durable coverage changed in the API/E2E stage remains `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`.
