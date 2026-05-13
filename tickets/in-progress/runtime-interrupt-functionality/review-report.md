# Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/requirements.md`
- Current Review Round: `19`
- Trigger: CR-017 local-fix handoff for commit `8c378202` (`fix(agent): preflight external tool results`).
- Prior Review Round Reviewed: `18`
- Latest Authoritative Round: `19`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/implementation-handoff.md`
- Validation Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/api-e2e-validation-report.md`
- API / E2E Validation Started Yet: `Yes, earlier round passed; paused for implementation local fixes before resumption`
- Repository-Resident Durable Validation Added Or Updated After Prior Review: `No in this Round 19 implementation-review entry point`

## Review Scope

This round re-reviewed the CR-017 local fix and the current implementation state before API/E2E resumes:

- `BaseTool` as the authoritative tool execution/preflight boundary.
- `ToolPhase` use of `BaseTool.prepareExecution(...)` before publishing tool-start lifecycle and before registering/relying on external-result waiters.
- Removal of the phase-local `ToolResultExecutionModeProvider` duck type and old `toolResultExecutionMode` property path.
- External-result positive path, invalid-argument preflight failure path, mode-resolution failure path, and no-waiter rejection path.
- Surrounding final runtime control model: `AgentMessageInbox` / scheduler / typed handlers own inbound dispatch; `AgentTurnRunner` / `LlmPhase` / `ToolPhase` / typed pipelines own normal LLM/tool/continuation progression.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial implementation handoff | N/A | 2 blocking | Changes requested | No | Working-context restore and pending-approval lifecycle/invocation identity blocked API/E2E handoff. |
| 2 | Local fixes handoff | `CR-001`, `CR-002` | 0 blocking | Pass / Ready for API/E2E validation | No | Working-context and approval lifecycle fixes passed re-review. |
| 3 | API/E2E durable-validation re-review | Round 2 pass state plus durable validation additions | 0 blocking | Pass / Ready for delivery | No | API/E2E-added durable validation passed source re-review. |
| 4 | Delivery latest-base reroute | Prior pass state | 0 blocking | Pass / Ready for API/E2E revalidation | No | Latest-base reference-file behavior was integrated without resurrecting legacy handlers. |
| 5 | Deep independent review | Prior pass state | 4 blocking | Changes requested | No | Segment finalization, signal propagation, team backend file size, and dormant lane cleanup. |
| 6 | Local fixes for `CR-003`-`CR-006` | `CR-003`-`CR-006` | 0 blocking | Pass / Ready for API/E2E validation | No | Local fixes passed. |
| 7 | Latest-base reroute | Round 6 pass state | 0 blocking | Pass / Ready for API/E2E validation | No | Team event processor extraction survived latest-base merge. |
| 8 | AgentInputBox addendum | Prior pass state | 2 blocking | Changes requested | No | Lifecycle lane and stop-preemption gaps. |
| 9 | Local fixes for `CR-007`-`CR-008` | `CR-007`, `CR-008` | 0 blocking | Pass / Ready for API/E2E validation | No | First-stage input-box fixes passed. |
| 10 | Independent complete review | Prior pass state | 2 blocking | Changes requested | No | Segment canonicalization and failed stream finalization gaps. |
| 11 | Local fixes for `CR-009`-`CR-010` | `CR-009`, `CR-010` | 0 blocking | Pass / Ready for API/E2E validation | No | Segment/failed-finalization fixes passed. |
| 12 | Approval-spine local fix | Prior pass state | 0 blocking | Pass / Ready for API/E2E validation | No | Approval routing via active turn boundary passed. |
| 13 | Independent complete review | Prior pass state | 3 blocking | Changes requested | No | Late-interrupt seams and approval marker gap. |
| 14 | Local fixes for `CR-011`-`CR-013` | `CR-011`, `CR-012`, `CR-013` | 0 blocking | Pass / Ready for API/E2E validation | No | Interruption seam fences passed. |
| 15 | Message-inbox scheduler implementation commit `d02b0fc3` | `CR-001` through `CR-013` | 3 blocking | Changes requested | No | Scheduler wait race, external result false success, and queued awaitable shutdown settlement. |
| 16 | Round 15 local-fix commit `dbd6bf7a` | `CR-014`, `CR-015`, `CR-016` | 0 new blocking | Changes requested | No | Scheduler/shutdown blockers fixed; external result success path still missing. |
| 17 | Round 16 local-fix commit `e23cc58f` | `CR-015` | 1 new blocking | Changes requested | No | Real `ToolPhase` external-result waiter/continuation path exists, but external-result branch bypasses `BaseTool` argument validation/coercion and uses an implicit duck-typed mode contract. |
| 18 | Round 10 naming addendum commit `d4812094` plus current source re-review | `CR-017` | 0 new blocking | Changes requested | No | `LlmPhase` rename was clean, but `CR-017` remained unresolved. |
| 19 | CR-017 local-fix commit `8c378202` | `CR-017` | 0 blocking | Pass / Ready for API/E2E validation | Yes | External-result mode/preflight now lives in `BaseTool`; invalid args and mode failures become normal failed tool results before started/pending lifecycle. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `CR-001` | Blocking | Still resolved | Interrupted turns still restore working context before settlement. | No regression found. |
| 1 | `CR-002` | Blocking | Still resolved | Approval identity validation remains active-turn scoped through `AgentRuntimeState` and `TurnToolInputPort`. | No regression found. |
| 5 | `CR-003` | Blocking | Still resolved | Interrupted/failed stream finalization remains implemented. | No regression found. |
| 5 | `CR-004` | Blocking | Still resolved | LLM/client signal propagation remains present; build passed. | No regression found. |
| 5 | `CR-005` | Blocking | Still resolved | Changed implementation source files remain below 500 effective non-empty lines. | `ToolPhase`, `BaseTool`, `AgentRuntimeState`, and `AgentWorker` are pressure files. |
| 5 | `CR-006` | Blocking | Still resolved | Old dormant first-stage input-box lanes are absent from active source grep. | No regression found. |
| 8 | `CR-007` | Blocking | Still resolved | Message inbox path rejects unsupported turn-local operational submissions. | No regression found. |
| 8 | `CR-008` | Blocking | Still resolved | Stop preemption remains present in worker/scheduler flow. | No regression found. |
| 10 | `CR-009` | Blocking | Still resolved | Segment canonicalization remains implemented. | No regression found. |
| 10 | `CR-010` | Blocking | Still resolved | Failed stream terminalization remains implemented. | No regression found. |
| 13 | `CR-011` | Blocking | Still resolved | Abort pre-start guards remain implemented. | No regression found. |
| 13 | `CR-012` | Blocking | Still resolved | Post-await interrupt fences remain implemented in runner/phases. | No regression found. |
| 13 | `CR-013` | Blocking | Still resolved | Approval acceptance still requires a pending approval entry. | No regression found. |
| 15 | `CR-014` | Blocking | Still resolved | Scheduler versioned wait/recheck/cancellable waiter implementation remains present; targeted tests passed. | No regression found. |
| 15 | `CR-015` | Blocking | Still resolved | `ToolPhase` still owns a real `external_result` branch backed by `TurnToolInputPort.waitForToolResults(...)`; happy-path runtime test passed. | No regression found. |
| 15 | `CR-016` | Blocking | Still resolved | Queued awaitable shutdown settlement remains implemented. | No regression found. |
| 17 | `CR-017` | Blocking | Resolved | `ToolResultExecutionMode` and `ToolExecutionPreparation` now live in `autobyteus-ts/src/tools/base-tool.ts`; `BaseTool.prepareExecution(...)` performs agent-id setup, coercion, schema/type validation, abort check, and mode resolution without invoking `_execute(...)`; `ToolPhase` calls it before started lifecycle and before registering an external-result waiter; phase-local duck type and `toolResultExecutionMode` property references are absent from active source/tests. | BaseTool and runtime tests cover coercion, missing required args, mode failure, no execution, no started lifecycle, and no result waiter on failure. |

## Source File Size And Structure Audit

Effective non-empty lines exclude blank lines and comment-only lines. Test files are excluded from the hard-limit audit.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/base-tool.ts` | 296 | Pass | Pressure | `BaseTool` now owns the common execution preparation contract plus existing execution validation/coercion. This strengthens the authoritative tool boundary. | Correct tools subsystem. | Pass with pressure | Avoid unrelated growth; if more mode/preflight policy is added, consider an owned tool-execution contract helper under `tools`. |
| `autobyteus-ts/src/tools/index.ts` | 20 | Pass | Pass | Exports the tool execution/preparation contract types. | Correct tools subsystem barrel. | Pass | None. |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | 351 | Pass | Pressure | `ToolPhase` owns tool-phase sequencing, approval, execution start, external wait, and terminal handling; it now depends on the BaseTool boundary rather than a duck-typed internal shape. | Correct loop folder. | Pass with pressure | Avoid unrelated growth. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 208 | Pass | Pass | Final `LlmPhase` remains focused on LLM execution/finalization. | Correct loop folder. | Pass | None. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | 148 | Pass | Pass | Runner owns turn orchestration and terminal tool lifecycle emission. | Correct loop folder. | Pass | None. |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | 208 | Pass | Pass | Internal turn-scoped tool wait/post primitive. | Correct loop folder. | Pass | None. |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | 401 | Pass | Pressure | Runtime state owns active turn/task plus approval/result validation. | Correct context/state file. | Pass with pressure | Avoid unrelated growth. |
| `autobyteus-ts/src/agent/message-inbox/agent-message-inbox.ts` | 198 | Pass | Pass | Semantic inbox owns typed lane posting and awaitable settlement. | Correct message-inbox folder. | Pass | None. |
| `autobyteus-ts/src/agent/message-inbox/handlers/tool-result-message-handler.ts` | 10 | Pass | Pass | Entry handler delegates active-turn result validation to runtime state. | Correct handlers folder. | Pass | None. |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | CR-017 is now addressed as a bounded ownership-boundary local fix: the tool subsystem owns mode/preflight, and ToolPhase owns runtime sequencing. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | External result path remains `LLM tool call -> ToolPhase -> BaseTool.prepareExecution -> TurnToolInputPort waiter -> runtime.postToolResult -> ToolResultPipeline -> SenderType.TOOL continuation`. | None. |
| Ownership boundary preservation and clarity | Pass | Tool argument preparation and mode selection are now owned by `BaseTool`; `ToolPhase` no longer reads phase-local duck-typed fields. | None. |
| Off-spine concern clarity | Pass | Inbox/scheduler/result handler remain support mechanisms for the active turn rather than competing normal-flow owners. | None. |
| Existing capability/subsystem reuse check | Pass | The fix reused and strengthened `BaseTool` instead of inventing a parallel validation path in `ToolPhase`. | None. |
| Reusable owned structures check | Pass | `ToolResultExecutionMode` and `ToolExecutionPreparation` are exported from the tool subsystem and reused by the phase. | None. |
| Shared-structure/data-model tightness check | Pass | The preparation shape is compact: `toolName`, coerced `args`, and `resultExecutionMode`; no kitchen-sink optional shape was introduced. | None. |
| Repeated coordination ownership check | Pass | Argument validation/coercion policy remains single-owned by `BaseTool`; result waiter acceptance remains single-owned by `TurnToolInputPort` / runtime state. | None. |
| Empty indirection check | Pass | `prepareExecution(...)` owns concrete validation/coercion/mode-preparation policy; it is not a pass-through layer. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Base tool owns tool preparation; phase owns publish/wait/execute sequencing. | None. |
| Ownership-driven dependency check | Pass | `ToolPhase` depends on the authoritative `BaseTool` boundary only, not on `BaseTool` plus private internals. | None. |
| Authoritative Boundary Rule check | Pass | The previous boundary bypass is removed: callers above the tool boundary use `BaseTool.prepareExecution(...)` / `BaseTool.execute(...)`. | None. |
| File placement check | Pass | Contract types and preflight API are in `tools/base-tool.ts`; runtime sequencing remains in `agent/loop/tool-phase.ts`. | None. |
| Flat-vs-over-split layout judgment | Pass | Keeping preparation in `BaseTool` is readable for this scope; no artificial module split was needed. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | `prepareExecution(...)` is explicit and subject-owned; tool result mode is a typed tool-boundary concept. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | `prepareExecution`, `ToolExecutionPreparation`, and `getToolResultExecutionMode` align with the behavior. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Validation/coercion is factored through `prepareArguments(...)`; no duplicate phase-side validation was added. | None. |
| Patch-on-patch complexity control | Pass | The fix removes the prior duck-typed shortcut and keeps the external-result branch bounded. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Active grep found no `ToolResultExecutionModeProvider`, `toolResultExecutionMode`, `executePrepared`, `LlmTurn`, or `llm-turn` references. | None. |
| Test quality is acceptable for the changed behavior | Pass | Tests cover BaseTool preparation/coercion/no-execute, validation errors, mode errors, runtime happy path, invalid args before started/waiter, mode failure before started/waiter, and no-waiter behavior. | None. |
| Test maintainability is acceptable for the changed behavior | Pass | Unit tests cover tool-boundary mechanics; integration tests prove runtime behavior through the real phase and inbox path. | None. |
| Validation or delivery readiness for the next workflow stage | Pass | Implementation review passes; API/E2E should revalidate the latest source state before delivery resumes. | Route to `api_e2e_engineer`. |
| No backward-compatibility mechanisms (no compatibility wrappers/dual-path behavior) | Pass | The old phase-local property path was removed rather than retained as a compatibility branch. | None. |
| No legacy code retention for old behavior | Pass | Old dispatcher/handler normal-flow path remains absent; old LLM phase naming is absent from active source/tests. | None. |

## Review Scorecard

- Overall score (`/10`): `9.3`
- Overall score (`/100`): `93/100`
- Score calculation note: Scores summarize current quality; the pass decision is based on no remaining blocking findings and passing mandatory structural gates.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.4 | The external result spine is now explicit and tested from LLM tool call to same-turn continuation. | API/E2E still needs realistic backend/WebSocket confirmation after source fixes. | Revalidate under API/E2E. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | Tool preflight/mode ownership moved to `BaseTool`; `ToolPhase` no longer bypasses the tool boundary. | `BaseTool` and `ToolPhase` are pressure files. | Avoid unrelated growth and extract only if new owned concerns appear. |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | `prepareExecution(...)` and exported tool preparation/mode types are explicit and subject-owned. | Direct `execute(...)` still prepares in-process tools separately after phase preflight; acceptable but worth keeping idempotent. | Keep mode resolution pure/idempotent; if future cost grows, add an owned prepared-execution API deliberately. |
| `4` | `Separation of Concerns and File Placement` | 9.2 | Tool preparation lives in tools; runtime sequencing lives in loop phase. | Source line pressure remains in `ToolPhase`, `BaseTool`, and `AgentRuntimeState`. | Avoid broadening these files. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | Preparation shape is tight and mode type is reusable from the tool subsystem. | No material weakness. | None beyond ongoing discipline. |
| `6` | `Naming Quality and Local Readability` | 9.4 | New names are discoverable and align with responsibilities; final LLM phase naming remains clean. | Minor indentation inconsistency in adjacent `BaseTool` code pre-existed/continues. | Format opportunistically if touched later. |
| `7` | `Validation Readiness` | 9.3 | Review ran targeted and broader runtime/tool suites plus builds; CR-017 scenarios have durable tests. | Full API/E2E/browser/live-provider coverage is still the next stage, not part of code review. | API/E2E should resume. |
| `8` | `Runtime Correctness Under Edge Cases` | 9.2 | Invalid external args and mode resolver errors now fail normally before started/pending/waiter; interruption/no-waiter paths remain covered. | External-result feature is still relatively new and should be stressed under transport races. | API/E2E should include stale/late/invalid external result cases. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | No legacy dispatcher/handler path, no old mode property branch, and no old LLM naming remain active. | None material. | Maintain clean-cut posture. |
| `10` | `Cleanup Completeness` | 9.3 | Obsolete phase-local mode provider and prepared-execution bypass references are absent. | Existing docs/report artifacts remain staged/unstaged workflow context outside this implementation commit. | Delivery/docs stage should reconcile documentation after API/E2E. |

## Findings

No active blocking findings remain in Round 19.

### `CR-017` — External-result tools bypass the authoritative `BaseTool` execution/preflight contract

- Severity: Previously Blocking
- Current status: `Resolved in commit 8c378202`
- Evidence of resolution:
  - `ToolResultExecutionMode` and `ToolExecutionPreparation` are defined/exported from `autobyteus-ts/src/tools/base-tool.ts`.
  - `BaseTool.prepareExecution(...)` performs argument coercion, schema/type validation, abort check, agent-id setup, and tool-owned mode resolution without invoking `_execute(...)`.
  - `ToolPhase` calls `prepareExecution(...)` before publishing `ToolExecutionStarted` and before registering/relying on an external-result waiter.
  - Preflight and mode-resolution failures return normal failed `ToolResultEvent`s and do not publish started/pending external execution or register result waiters.
  - Active grep found no `ToolResultExecutionModeProvider`, old `toolResultExecutionMode` property, or `executePrepared` bypass references in `autobyteus-ts/src` / `autobyteus-ts/tests`.
  - Durable tests cover BaseTool preparation and runtime invalid/mode-failure external-result behavior.

## Test Quality And Validation-Readiness Verdict

| Area | Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- |
| Validation Readiness | Ready for the next workflow stage (`API / E2E`) | Pass | API/E2E should resume against the latest source state. |
| Tests | Test quality is acceptable | Pass | Unit and runtime integration coverage directly exercise the previously missing CR-017 cases. |
| Tests | Test maintainability is acceptable | Pass | Unit tests stay at the tool boundary; integration tests stay at runtime behavior. |
| Tests | Review findings are clear enough for the next owner before API / E2E or delivery resumes | Pass | No active review findings remain; residual risks are documented for API/E2E. |

Review-local checks run in Round 19:

- `git diff --check HEAD` — passed.
- `grep -R "ToolResultExecutionModeProvider\|toolResultExecutionMode\|executePrepared\|LlmTurn\|llm-turn" -n autobyteus-ts/src autobyteus-ts/tests || true` — no active source/test references found.
- Effective source line audit — passed hard limit; no changed implementation source exceeded 500 effective non-empty lines.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/base-tool.test.ts tests/integration/agent/runtime/agent-runtime.test.ts tests/unit/agent/loop/turn-tool-input-port.test.ts tests/unit/agent/context/agent-runtime-state.test.ts` — passed (`4` files, `39` tests).
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/base-tool.test.ts tests/unit/agent/interruption/abortable-operation.test.ts tests/unit/agent/loop/agent-turn-runner.test.ts tests/unit/agent/loop/turn-tool-input-port.test.ts tests/unit/agent/message-inbox/agent-message-inbox.test.ts tests/unit/agent/message-inbox/agent-message-scheduler.test.ts tests/unit/agent/message-inbox/inbox-queue-store.test.ts tests/unit/agent/context/agent-runtime-state.test.ts tests/unit/agent/runtime/agent-runtime.test.ts tests/unit/agent/runtime/agent-worker.test.ts tests/integration/agent/runtime/agent-runtime.test.ts tests/integration/agent/tool-approval-flow.test.ts` — passed (`12` files, `86` tests).
- `pnpm -C autobyteus-ts run build` — passed, including runtime dependency verification.
- `pnpm -C autobyteus-server-ts run build:full` — passed, including built-in agents bootstrap smoke check.

Not run in Round 19:

- Full browser/Electron E2E.
- Live paid-provider cancellation checks.
- Full API/E2E server protocol validation.

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Old phase-local mode provider/property path is removed instead of retained. |
| No legacy old-behavior retention in changed scope | Pass | Old dispatcher/handler normal-flow path remains absent; old `llm-turn` name is absent from active source/tests. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No obsolete source/test item requiring removal was found. |

## Dead / Obsolete / Legacy Items Requiring Removal

No dead/obsolete/legacy source item requiring immediate removal was found in Round 19.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: Final docs should describe external-result mode as a formal `BaseTool`/tool-boundary contract with preparation/preflight semantics.
- Files or areas likely affected:
  - `tickets/in-progress/runtime-interrupt-functionality/design-spec.md`
  - `tickets/in-progress/runtime-interrupt-functionality/implementation-handoff.md`
  - `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`
  - `tickets/in-progress/runtime-interrupt-functionality/turn-tool-input-port-explainer.html`

## Classification

- Latest Authoritative Result: `Pass`
- Classification: N/A
- Reason: No active blocking findings remain in implementation-owned source review.

## Recommended Recipient

- `api_e2e_engineer`

Routing note: API/E2E should revalidate the latest source state before delivery resumes.

## Residual Risks

- The inbox/scheduler model is a significant concurrency change. API/E2E should stress queued turn-start work, active-turn approval/result messages, interrupt, stop, shutdown, and late/stale messages under realistic backend/WebSocket paths.
- `ToolPhase`, `BaseTool`, `AgentRuntimeState`, and `AgentWorker` are line-pressure files. No hard-limit breach exists, but future fixes should stay narrow.
- External/async tool-result support is now real and code-review clean, but API/E2E should include accepted, invalid/stale/late, and interrupted external result scenarios if practical.
- `ToolPhase` intentionally preflights through `BaseTool.prepareExecution(...)` and then in-process execution still enters `BaseTool.execute(...)`; this preserves the authoritative execution boundary. Keep mode resolution pure/idempotent unless a future owned prepared-execution API is deliberately designed.

## Latest Authoritative Result

- Review Decision: `Pass / Ready for API/E2E validation`
- Score Summary: `9.3/10` (`93/100`)
- Notes: Commit `8c378202` resolves `CR-017`. The external-result mode/preflight contract is now owned by `BaseTool`, `ToolPhase` uses that boundary before started lifecycle and waiter registration, and targeted plus broader runtime checks passed.
