# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/incomplete-tool-call-resume-recovery/tickets/done/incomplete-tool-call-resume-recovery/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/incomplete-tool-call-resume-recovery/tickets/done/incomplete-tool-call-resume-recovery/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/incomplete-tool-call-resume-recovery/tickets/done/incomplete-tool-call-resume-recovery/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/incomplete-tool-call-resume-recovery/tickets/done/incomplete-tool-call-resume-recovery/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/incomplete-tool-call-resume-recovery/tickets/done/incomplete-tool-call-resume-recovery/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/incomplete-tool-call-resume-recovery/tickets/done/incomplete-tool-call-resume-recovery/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass handed to API/E2E for required coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1, this artifact.

## Current Requirement And Design Basis

The approved behavior is a provider-safety recovery invariant for OpenAI-compatible native tool-call history after abrupt shutdown. A persisted working context may contain an assistant `ToolCallPayload` with one or more call ids and no immediately following `ToolResultPayload`, followed by user retry/continue messages. Before any provider render/send, and during snapshot restore, the runtime must repair that history into provider-safe native order by keeping the assistant tool-call message and inserting immediate native `role: tool` results for missing call ids. Synthetic results must truthfully say execution was interrupted by runtime shutdown, completion status is unknown, and no tool output is available in memory. Completed native pairs must remain native and unchanged. Partial batches must preserve real completed facts and synthesize only missing calls. Repair must be idempotent, must record durable recovery markers, and must preserve raw `tool_call` traces for auditability. The downstream coverage signal in the implementation handoff explicitly asks API/E2E to validate a real persisted restore/resume path where one additional user prompt kicks off LLM execution again with provider-safe rendered history.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced; legacy text-fencing behavior was removed; dead/obsolete code in scope was removed. Source inspection for this investigation found the old `working-context-llm-safe-projector.ts` deleted and the steady repair path centralized in `MemoryManager.ensureWorkingContextToolProtocolSafeForNextLlm(...)` via `memory-manager-tool-protocol-safety.ts` and `working-context-tool-protocol-repairer.ts`; no compatibility wrapper, provider-specific DeepSeek branch, fake success branch, or dual text-fence/native repair switch was observed in the changed scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Memory-owned repair inserts native synthetic interrupted/unknown `ToolResultPayload`s for incomplete assistant native tool calls. | Added | REQ-ITC-002, REQ-ITC-006, AC-ITC-002, AC-ITC-005; design `Intended Change`; implementation handoff `What Changed`. | Retain unit repairer and MemoryManager marker/idempotency coverage; execute targeted suite. |
| Snapshot restore no longer treats schema-valid cached snapshots as provider-safe without protocol repair. | Changed | REQ-ITC-003; design DS-002; implementation handoff `Wired ... into snapshot bootstrap`. | Existing bootstrap unit coverage is valid; add integrated API/E2E coverage that starts from an actual persisted cached snapshot before one-prompt LLM resume. |
| Request assembly repairs pre-compaction and pre-render, including already-poisoned contexts with user messages appended after a missing tool result. | Changed | REQ-ITC-004; AC-ITC-006; design DS-001; implementation handoff `Wired ... into request pre-compaction and request pre-render`. | Retain assembler and LlmPhase coverage; execute targeted suite. |
| Completed native tool-call/result pairs remain native and unchanged. | Preserved | REQ-ITC-007; AC-ITC-004; design constraints; code review test-quality verdict. | Retain unit/integration coverage for complete pairs and compaction tool tails. |
| Partial batches preserve real completed facts and synthesize only missing call ids. | Added | AC-ITC-005; design Off-Spine completed raw result lookup; implementation handoff downstream hints. | Retain unit coverage; no broader API/E2E required because this is a memory-transform/local persistence boundary. |
| Obsolete text-fencing projector is removed as the primary incomplete native tool-call repair. | Removed | Design legacy removal policy; implementation handoff `Removed`; code review cleanup verdict. | No durable compatibility coverage should be retained for text-fence repair; execute grep/static check as evidence. |
| Exact reported one-additional-user-prompt symptom no longer blocks LLM execution. | Changed | AC-ITC-001, AC-ITC-008; user approval note; design review direct answer #4. | Add integrated persisted snapshot + bootstrap + LlmPhase coverage to prove provider-safe render and LLM stream invocation in one flow. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/working-context-tool-protocol-repairer.test.ts` / missing call id, idempotency | Pure repairer inserts one synthetic result immediately after assistant tool-call and second pass does not duplicate. | REQ-ITC-002, REQ-ITC-006; AC-ITC-002; design DS-003. | Still Valid | Test asserts role order `USER -> ASSISTANT -> TOOL -> USER`, synthetic content, repair report, and second pass `didRepair=false`. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/working-context-tool-protocol-repairer.test.ts` / completed pair | Completed assistant tool-call + tool result remains unchanged. | REQ-ITC-007; AC-ITC-004. | Still Valid | Test asserts same message array returned and no repairs. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/working-context-tool-protocol-repairer.test.ts` / partial batch | Completed raw fact is inserted/preserved, missing call gets synthetic interrupted result. | AC-ITC-005; design completed raw result lookup. | Still Valid | Test supplies `completedToolResultsByCallId` for call A and expects call B synthetic only. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` / crash-recovered incomplete call | MemoryManager repairs incomplete tool call, persists one synthetic result and exactly one recovery marker across repeated calls. | REQ-ITC-005, REQ-ITC-006; AC-ITC-003; idempotency residual risk. | Still Valid | Test uses real FileMemoryStore raw trace plus working context and asserts one marker with `WorkingContextToolProtocolRecovery`. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` / explicit interruption projection | Graceful interruption closes incomplete calls with source-accurate non-shutdown wording and appends operation-boundary note. | Design review residual risk about source-accurate wording; preserve explicit interruption behavior. | Still Valid | Test asserts non-runtime-shutdown content and boundary note. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` / complete native history with boundary | Operation-boundary notes do not degrade completed native pair. | REQ-ITC-007; AC-ITC-004. | Still Valid | Test ingests tool intent/result, projects, and asserts native call/result remain. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` / partial native tool batches | Completed raw tool result remains a native result and missing call gets synthetic result with interruption wording. | AC-ITC-005. | Still Valid | Test appends two-call assistant payload, stores only call A result, and expects call A real result plus call B synthetic. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` / valid cache path calls safety boundary | Bootstrapper runs schema gate, restores cache, and calls MemoryManager safety boundary. | REQ-ITC-003; design DS-002. | Still Valid | Mock verifies call to `ensureWorkingContextToolProtocolSafeForNextLlm({ recoverySourceEvent: 'WorkingContextSnapshotBootstrapper' })`. | Retain and execute. |
| `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` / cached snapshot repair | Schema-valid cached snapshot with missing native result is repaired during bootstrap, persisted, and marker recorded. | REQ-ITC-003; AC-ITC-002, AC-ITC-003. | Still Valid | Test uses real FileMemoryStore + WorkingContextSnapshotStore and asserts `SYSTEM -> ASSISTANT -> TOOL -> USER` and marker. | Retain and execute. |
| `autobyteus-ts/tests/unit/agent/llm-request-assembler.test.ts` / pre-compaction sequencing | Assembler calls safety repair before pending compaction and before final render. | REQ-ITC-002, REQ-ITC-004; design pre-compaction/backstop. | Still Valid | Mock invocation order asserts repair before compaction and two total repair calls. | Retain and execute. |
| `autobyteus-ts/tests/unit/agent/llm-request-assembler.test.ts` / poisoned native tool-call history | Already-poisoned context with prior user retry renders as assistant tool-call -> synthetic tool result -> prior user -> current user. | AC-ITC-001, AC-ITC-002, AC-ITC-006, AC-ITC-008. | Still Valid | Test uses `OpenAIChatRenderer` and asserts provider payload shape. | Retain and execute. |
| `autobyteus-ts/tests/unit/agent/loop/llm-phase-tool-protocol-recovery.test.ts` / one prompt kicks off LLM execution | LlmPhase calls a capturing LLM exactly once after one additional user prompt and renders provider-safe history. | AC-ITC-001, AC-ITC-008; design review direct answer #4. | Still Valid but not sufficient alone | It proves request/LLM execution with an in-memory poisoned context, but it does not begin from a persisted cached snapshot/bootstrap restore. | Retain and execute; add integrated persisted restore/resume coverage. |
| `autobyteus-ts/tests/integration/memory/working-context-snapshot-restore.test.ts` / valid cache, fallback, schema reset | General snapshot restore integration remains valid for non-tool contexts. | Existing restore behavior outside changed native-tool scope. | Still Valid | Tests guard cache/fallback/schema reset behavior and were lightly updated to keep safety call harmless. | Retain and execute as part of targeted restore suite. |
| `autobyteus-ts/tests/integration/agent/memory-compaction-runtime-e2e.test.ts` / compaction LLM lifecycle and tool continuation | Runtime compaction surfaces do not degrade native tool calls/results or replace them with aggregate text. | Request-assembly pre-compaction invariant; REQ-ITC-007. | Still Valid | Tests assert native tool continuation payload and no raw frontier/aggregate text. | Retain and execute. |
| `autobyteus-ts/tests/integration/agent/memory-compaction-tool-tail-flow.test.ts` | Pending compaction retains live tool suffix as canonical messages and renders native tool-call/result tail. | REQ-ITC-007; design compaction preflight risk. | Still Valid | Test asserts latest assistant/tool result native payload remains after compaction. | Retain and execute. |
| `autobyteus-ts/tests/integration/agent/memory-tool-call-flow.test.ts` / live LM Studio tool-call flow | Live optional integration ingests real tool calls/results and follow-up responses when LM Studio config is present. | Broader native tool flow; not required for crash-recovery because external config-dependent. | Out Of Scope | It is skipped without LM Studio config and does not cover incomplete persisted resume. | Do not include in required final command. |
| `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts` | Tool continuation with media carries context files into next request. | Tool-result continuation media behavior; not changed by native protocol repair. | Out Of Scope | No incomplete native tool-call/snapshot restore behavior. | Do not include in required final command. |
| Deleted `autobyteus-ts/src/memory/working-context-llm-safe-projector.ts` and any old tests expecting text-fencing | Old primary repair converted unsafe native tool calls to assistant text. | Design legacy removal policy; no-backward-compatibility rule. | Stale / Remove | File is deleted and no `working-context-llm-safe-projector` references are present in changed source/tests during inspection. | No test retention; verify by grep/static check. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/working-context-llm-safe-projector.ts` / text-fencing primary repair expectations, if any remain | Incomplete native tool calls should be converted to plain assistant text. | Approved repair shape is native synthetic interrupted/unknown tool-result insertion; no dual repair modes should remain. | Design `Legacy Removal Policy`, `Backward-Compatibility Rejection Log`; implementation handoff `Removed`; code review cleanup verdict. | `working-context-tool-protocol-repairer` tests plus MemoryManager/assembler/LlmPhase provider-shape tests. | N/A; obsolete assertion must not remain. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-ITC-001 | Persisted cached snapshot + raw incomplete `tool_call` restored through `WorkingContextSnapshotBootstrapper`, then one additional user prompt runs `LlmPhase` and captures a provider-safe OpenAI-compatible payload. Re-running safety/request preparation must not duplicate synthetic tool results or recovery markers. | REQ-ITC-001, REQ-ITC-002, REQ-ITC-003, REQ-ITC-004, REQ-ITC-005, REQ-ITC-009; AC-ITC-001, AC-ITC-002, AC-ITC-003, AC-ITC-006, AC-ITC-008; implementation handoff downstream coverage hint. | `autobyteus-ts/tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts` | Existing coverage proves restore repair and LlmPhase resume separately. The downstream API/E2E requirement asks for a single executable persisted restore/resume path, so this integrated coverage should live durably in the repository. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Existing relevant tests remain valid. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None found during investigation | N/A | N/A | Deleted text-fencing source is already removed by implementation; no remaining durable test removal is planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-ITC-STATIC-001 | `rg` static check for `working-context-llm-safe-projector`, text-fencing imports, provider-specific recovery branches, and synthetic wording. | Confirms no stale text-fence path or provider-specific compatibility branch remains in changed scope. | Static grep output is evidence only; durable regression is covered by repository tests. |
| TEMP-ITC-CMD-001 | `git diff --check` and `pnpm run build`. | Whitespace/build health after adding API/E2E coverage. | These are standard executable checks, not repository-resident coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live DeepSeek/OpenAI network request against the original user-local run. | The requirement is provider payload validity and resume execution; a deterministic local capturing LLM can prove no provider-invalid shape is sent without using secrets or external model access. | Low; OpenAI-compatible renderer shape is asserted directly. | None for this task. |
| UI activity-card transition from old `PARSED` state to interrupted/recovered state. | Explicitly out of runtime/provider-safety scope in upstream residual risks. | Low for provider safety; possible later UX polish. | None for this task. |
| Malformed native tool calls with no usable call id. | Upstream implementation/code review marks this out of scope; repairer cannot truthfully synthesize a result for an absent id. | Low for normal parser-created OpenAI-compatible tool calls; separate requirement needed if product scope changes. | None. |
| Recovery marker de-duplication across archived raw traces. | Code review records that de-duplication consults active raw traces only. | Low/known residual; not part of accepted requirements. | None. |
| Full team-run lifecycle through the application server. | The changed invariant is in shared memory/request path for standalone/team members; local runtime objects exercise the same MemoryManager/bootstrapper/LlmPhase path without requiring app server credentials/state mutation. | Medium-low; integrated local API/E2E covers the authoritative boundary. | None unless delivery requires manual incident repair outside this ticket. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Upstream requirements/design/code review are consistent; legacy check is clean; coverage gap can be resolved by durable integration coverage. | N/A |

## Execution Plan

1. Add `autobyteus-ts/tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts` with scenario `APIE2E-ITC-001` using `FileMemoryStore`, `WorkingContextSnapshotStore`, `WorkingContextSnapshotBootstrapper`, `MemoryManager`, `LlmPhase`, `OpenAIChatRenderer`, and a capturing local `BaseLLM`.
2. The test will write a schema-current cached snapshot containing `SYSTEM -> ASSISTANT(tool_calls=[call_resume_missing]) -> USER(prior failed continue)` and a matching raw `tool_call` with no raw `tool_result`; bootstrap will restore/repair it, then one current user prompt will run `LlmPhase` and assert a final outcome plus one captured provider-safe payload.
3. Assert provider payload order is `assistant(tool_calls)` -> `tool(tool_call_id=call_resume_missing, interrupted/unknown content)` -> prior user -> current user, and assert raw trace auditability: original `tool_call` remains and exactly one recovery `operation_boundary` marker exists after an additional idempotency preflight.
4. Execute targeted durable coverage: new integration test plus existing relevant unit/integration suites listed above.
5. Execute temporary/static checks: grep for removed text-fence projector references, `git diff --check`, and `pnpm run build`.
6. Write/update the execution coverage report with results. Because repository-resident durable coverage will be added after the earlier code review, route the cumulative package back to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing component coverage is valid and should be retained. A single integrated persisted restore/resume API/E2E test is required to satisfy the downstream coverage hint and acceptance criteria without relying on a live external provider.
