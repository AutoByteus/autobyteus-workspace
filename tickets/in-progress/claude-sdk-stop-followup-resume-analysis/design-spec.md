# Design Spec

## Current-State Read

The user clarified the failing action is frontend row-level **Terminate run**, not chat Stop/interrupt. Frontend row terminate already converges on the correct lifecycle owner:

- History row: `WorkspaceHistoryWorkspaceSection.vue` -> `useWorkspaceHistoryMutations.onTerminateRun` -> `agentRunStore.terminateRun(runId)`.
- Running row `×`: `RunningAgentsPanel.deleteAgentRun` -> `agentRunStore.closeAgent(runId,{terminate:true})` -> `agentRunStore.terminateRun(runId)` -> local context removal.
- Follow-up send: `agentRunStore.sendUserInputAndSubscribe()` checks `runHistoryStore.getResumeConfig(runId)` and calls GraphQL `RestoreAgentRun` before reconnecting WebSocket and sending when the run is inactive.

Backend terminate/restore after an idle turn is already healthy for both Claude and Codex. The broken state appears when Claude is terminated while an active SDK turn is pending, especially while a tool approval/control response is in flight.

Current Claude runtime ownership is split incorrectly for active shutdown:

- `ClaudeSession.interrupt()` owns a safe active-turn settlement order and existing interrupt E2E passes.
- `ClaudeSessionManager.terminateRun()` duplicates a separate abort-first cleanup path instead of using the safe active-turn settlement invariant.
- `ClaudeSessionCleanup` is appropriate final resource cleanup, but it is not an active-turn state machine owner.

The live active-terminate probe (`probes/claude-active-terminate-reconnect-live-probe.md`) showed restore/reconnect/follow-up can stream, but the test run fails due to an unhandled Claude SDK `Error: Operation aborted`. Therefore the target design should be a local Claude runtime lifecycle fix, not a frontend restore/send redesign.

## Intended Change

Make Claude SDK row-level terminate settle any active turn through the same safe active-turn shutdown sequence used by interrupt before session-level termination cleanup. Terminate should remain a stronger operation than interrupt: after safe active-turn settlement, it still emits `SESSION_TERMINATED`, closes the run session, and removes the run from active runtime management.

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix
- Current design issue found: Yes
- Root cause classification: Duplicated Policy Or Coordination
- Refactor needed now: Yes, small/local
- Evidence: `ClaudeSession.interrupt()` has the correct pending-tool-approval-safe sequence and live interrupt E2E passes. `ClaudeSessionManager.terminateRun()` uses a separate abort-first path and live active terminate produced an unhandled SDK `Operation aborted` rejection.
- Design response: Move/route active-turn termination through the owned interrupt settlement path or an equivalent single helper; remove the duplicate direct abort/wait logic from terminate.
- Refactor rationale: Leaving two active-turn shutdown policies will preserve the bug and allow future drift.
- Intentional deferrals and residual risk: No frontend UX change in this scope. Immediate terminate before Claude emits a provider session id may resume as a new provider session; that is acceptable because no provider conversation id exists to resume yet.

## Terminology

- **Interrupt / Stop**: WebSocket `STOP_GENERATION`, handled by `activeRun.interrupt(null)` and `ClaudeSession.interrupt()`.
- **Terminate**: GraphQL `TerminateAgentRun`, used by frontend row actions, closes the backend run/session and marks history inactive.
- **Active turn settlement**: Internal Claude runtime process of clearing pending approvals, flushing control responses, aborting/closing the active query, and awaiting the turn task.

## Design Reading Order

1. Data-flow spine from frontend terminate to Claude session manager.
2. Active-turn internal shutdown spine inside Claude session/session manager.
3. Restore/reconnect/follow-up spine already present and retained.
4. Validation coverage.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove/decommission the duplicate direct abort + polling cleanup branch inside `ClaudeSessionManager.terminateRun()` when an active turn exists.
- No compatibility wrapper or dual terminate mode should be retained.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Frontend row terminate | Claude session closed + history inactive | `agentRunStore` frontend, `AgentRunService` backend, `ClaudeSessionManager` runtime | User-facing terminate path. |
| DS-002 | Bounded Local | Active Claude turn pending | Turn settled without unhandled SDK rejection | `ClaudeSession` | Root defect lives here. |
| DS-003 | Primary End-to-End | Follow-up send on inactive run | Restored run receives WebSocket `SEND_MESSAGE` | `agentRunStore` + `AgentRunService` + `AgentStreamHandler` | Confirms terminate recovery. |

## Primary Execution Spine(s)

DS-001:

`Frontend row button -> agentRunStore.terminateRun -> GraphQL TerminateAgentRun -> AgentRunService.terminateAgentRun -> AgentRun.terminate -> ClaudeAgentRunBackend.terminate -> ClaudeSession.terminate -> ClaudeSessionManager.terminateRun -> closeRunSession`

DS-003:

`activeContextStore.send -> agentRunStore.sendUserInputAndSubscribe -> RestoreAgentRun if inactive -> ensureAgentStreamConnected -> WebSocket SEND_MESSAGE -> AgentStreamHandler.handleSendMessage -> AgentRun.postUserMessage -> ClaudeSession.sendTurn`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | UI row terminate asks the backend to terminate the persisted run; backend routes to the runtime-specific backend and then records termination. | Run row, agent run store, GraphQL mutation, run service, agent run, Claude backend, Claude session manager | `AgentRunService` for backend run lifecycle; `ClaudeSessionManager` for Claude sessions | Frontend local stream teardown/history inactive marking. |
| DS-002 | If a Claude turn is active, termination must first settle that turn using the interrupt-safe order, then session termination proceeds. | Claude session, active turn execution, tool approval coordinator, SDK query | `ClaudeSession` | Tool approval denial events, query close, event emission. |
| DS-003 | A later send on an inactive run restores the backend runtime before reconnecting and sending the user message. | Active context, run history resume config, restore mutation, stream handler | `agentRunStore` frontend; `AgentRunService` backend | Projection hydration, WebSocket connection state. |

## Spine Actors / Main-Line Nodes

- `WorkspaceHistoryWorkspaceSection.vue` / `RunningRunRow.vue`: thin UI buttons.
- `agentRunStore.terminateRun`: frontend lifecycle coordinator for single-run terminate.
- `AgentRunService.terminateAgentRun`: backend single-run lifecycle owner.
- `ClaudeAgentRunBackend.terminate`: runtime backend adapter boundary.
- `ClaudeSessionManager.terminateRun`: Claude run-session lifecycle owner.
- `ClaudeSession.interrupt`: active-turn settlement owner.
- `agentRunStore.sendUserInputAndSubscribe`: frontend restore-before-send coordinator.

## Ownership Map

| Node | Owns |
| --- | --- |
| `agentRunStore.terminateRun` | GraphQL terminate call, local stream teardown, local inactive history state. |
| `AgentRunService.terminateAgentRun` | Backend terminate command, metadata platform id persistence, history termination record. |
| `ClaudeSessionManager` | Session map lifecycle, create/restore/terminate/close session authority. |
| `ClaudeSession` | Active turn execution, interruption sequencing, provider session id adoption, runtime event emission. |
| `ClaudeSessionCleanup` | Final best-effort resource cleanup after session lifecycle decisions are already made. |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Frontend row buttons | `agentRunStore.terminateRun` | UI affordance | Runtime-specific cleanup policy. |
| GraphQL `TerminateAgentRun` | `AgentRunService.terminateAgentRun` | API boundary | Provider session settlement. |
| `ClaudeAgentRunBackend.terminate` | `ClaudeSessionManager` via `ClaudeSession.terminate` | Runtime adapter boundary | Duplicate active-turn cleanup sequence. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Direct abort-first active-turn branch in `ClaudeSessionManager.terminateRun()` | It duplicates and conflicts with `ClaudeSession.interrupt()` sequencing. | `ClaudeSession.interrupt()` or a single extracted active-turn settlement helper owned by `ClaudeSession`. | In This Change | Delete unused polling helper if it becomes unused. |
| Any test/probe-only temporary code in runtime E2E | Temporary investigation edit was reverted. | Durable regression test only. | In This Change | Add permanent focused test, not probe code. |

## Return Or Event Spine(s)

`ClaudeSession.interrupt/terminate -> ClaudeSessionEventConverter -> AgentRunEvent -> AgentStreamHandler.forwardRunEvent -> WebSocket server messages`

Terminate should still emit `SESSION_TERMINATED` after active turn settlement. If an active turn is interrupted as part of terminate, `TURN_INTERRUPTED` may also be emitted before `SESSION_TERMINATED`, matching the stronger terminate semantics.

## Bounded Local / Internal Spines

- Parent owner: `ClaudeSession`
- Chain: `activeTurnExecution -> clear pending approvals -> flush denial response -> abort controller -> close active query -> await settledTask -> clear active turn -> emit TURN_INTERRUPTED`
- Why it matters: This is the provider-control-safe sequence that prevents the unhandled SDK `Operation aborted` rejection.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| History projection refresh | DS-001, DS-003 | `agentRunStore`, `AgentRunHistoryIndexService` | Show active/inactive state | UI history view | Could confuse runtime lifecycle with display state. |
| Metadata platform id persistence | DS-001, DS-003 | `AgentRunService` | Persist Claude session id / Codex thread id | Restore needs runtime reference | Runtime adapters should not write history directly. |
| Tool approval denial eventing | DS-002 | `ClaudeSessionToolUseCoordinator` | Resolve pending approvals as denied | Provider callback must receive a decision | Direct abort can leave provider control flow rejected. |
| Live E2E gating | DS-001..DS-003 | Test suite | Avoid requiring live providers in normal tests | Claude/Codex binaries and credentials are external | Ungated tests would be flaky/slow. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Safe active Claude turn settlement during terminate | `ClaudeSession.interrupt()` | Reuse/extend | It already owns active-turn settlement and passes live interrupt validation. | N/A |
| Session lifecycle removal | `ClaudeSessionManager.closeRunSession()` | Reuse | Already removes map entry and runs cleanup. | N/A |
| Frontend restore-before-send | `agentRunStore.sendUserInputAndSubscribe()` | Reuse | Already correct and tested. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web` single-agent run store | UI terminate/restore/send orchestration | DS-001, DS-003 | `agentRunStore` | Reuse | No change indicated. |
| Server agent run lifecycle | GraphQL terminate/restore, metadata/history | DS-001, DS-003 | `AgentRunService` | Reuse | No API shape change. |
| Claude SDK runtime session subsystem | Active-turn settlement, session terminate/cleanup | DS-002 | `ClaudeSession`, `ClaudeSessionManager` | Extend/refactor | Main change. |
| Runtime E2E tests | Live provider regression | DS-001..DS-003 | Vitest suites | Extend | Add active terminate regression. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/claude/session/claude-session-manager.ts` | Claude SDK runtime session | Session lifecycle owner | Route active terminate through safe active-turn settlement, then terminate session. | Existing manager owns session map and terminate lifecycle. | `ClaudeSession.interrupt()` |
| `src/agent-execution/backends/claude/session/claude-session.ts` | Claude SDK runtime session | Active turn owner | Optional extraction of an explicit active-turn settlement helper if direct `interrupt()` naming is too broad for terminate. | Existing file owns active turn execution. | Existing active turn types. |
| `tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | Claude session tests | Unit coverage | Prove terminate of active session invokes interrupt-safe settlement and emits terminate. | Existing manager tests. | Existing test helpers. |
| `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` or focused Claude E2E | Runtime E2E | Live regression | Active tool-approval terminate -> restore -> reconnect -> follow-up without unhandled rejection. | Existing GraphQL runtime harness already has helpers. | Existing helper functions. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Active turn shutdown order | Prefer existing `ClaudeSession.interrupt()`; optional private method in `claude-session.ts` | Claude SDK runtime session | Same sequence needed by interrupt and terminate. | Yes | Yes | A generic cleanup utility detached from session state. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ClaudeActiveTurnExecution` | Yes | N/A | Low | Reuse existing active turn object; do not add parallel terminate flags. |
| `ClaudeAgentRunContext.sessionId` | Yes | N/A | Medium | Preserve current provider-id semantics: placeholder run id is not passed as Claude resume id. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | Claude SDK runtime session | Session lifecycle | In `terminateRun`, if a turn is active/stale, call `await state.interrupt()` (or equivalent private session-owned helper), then emit `SESSION_TERMINATED`, then close session. Remove direct abort/wait branch. | Manager already owns terminate session lifecycle. | `ClaudeSession.interrupt()` |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude SDK runtime session | Active turn | Keep `interrupt()` as active-turn settlement owner; optionally expose a clearly named internal method if implementation wants semantic clarity. | Existing active-turn owner. | Existing helper methods. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | Tests | Unit regression | Add active terminate test verifying pending active turn is interrupted/settled before session removal and `SESSION_TERMINATED` emits. | Existing manager tests. | Existing context factory. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` or new focused file | Tests | Live E2E regression | Add live-gated Claude active tool-approval terminate -> restore -> reconnect -> follow-up test. | Existing runtime harness is already close; focused file may be cleaner if helper reuse gets awkward. | Existing GraphQL/WebSocket helpers. |

## Ownership Boundaries

- Frontend must not know Claude-specific cleanup policy; it should keep using `TerminateAgentRun` and `RestoreAgentRun`.
- `AgentRunService` must remain runtime-neutral; it should not special-case Claude active turns.
- `ClaudeSessionManager` owns session lifetime but should not duplicate active-turn shutdown details already owned by `ClaudeSession`.
- `ClaudeSessionCleanup` remains final best-effort cleanup and should not be the primary mechanism for settling an active turn.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `agentRunStore.terminateRun` | GraphQL terminate + local teardown | UI row components | UI directly calling GraphQL then manipulating stream maps | Add/extend store action. |
| `AgentRunService.terminateAgentRun` | Active run lookup, runtime terminate, metadata/history | GraphQL resolver | Resolver calling runtime manager directly | Extend service method. |
| `ClaudeSessionManager.terminateRun` | Active session termination lifecycle | `ClaudeSession.terminate()` | Backend manually closing sessions/query maps | Add manager/session method. |
| `ClaudeSession.interrupt` | Active turn settlement | `ClaudeSessionManager.terminateRun`, WebSocket interrupt path | Manager directly aborting active controller and polling | Extract private session-owned helper if naming clarity needed. |

## Dependency Rules

- `ClaudeSessionManager` may call methods on the `ClaudeSession` it owns.
- `ClaudeSession` may use `ClaudeSessionToolUseCoordinator`, SDK client/query, and message cache to settle the turn.
- `ClaudeSessionCleanup` may close residual resources but must not decide active-turn lifecycle ordering.
- No frontend file may import or branch on Claude SDK runtime internals for this bug.
- No GraphQL resolver may bypass `AgentRunService` for terminate/restore.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `terminateRun(runId)` frontend | Single agent run | User row terminate action | AutoByteus run id | Runtime-neutral. |
| `TerminateAgentRun(agentRunId)` GraphQL | Single agent run | Backend terminate command | AutoByteus run id | Runtime-neutral. |
| `ClaudeSessionManager.terminateRun(runId)` | Claude session | Close one Claude run session safely | AutoByteus run id | Must settle active turn first. |
| `ClaudeSession.interrupt()` | Active Claude turn | Safe active-turn settlement | Current session object | Reused by Stop and active terminate. |
| `RestoreAgentRun(agentRunId)` GraphQL | Single agent run | Restore inactive run from metadata | AutoByteus run id | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ClaudeSessionManager.terminateRun` | Yes | Yes | Low | Keep runtime session lifecycle there. |
| `ClaudeSession.interrupt` used by terminate | Mostly yes | N/A | Low/Medium due naming | If reviewer objects to naming, extract private `settleActiveTurnForClosure()` used by both interrupt and terminate while keeping public behavior unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Active turn settlement | `interrupt()` / optional `settleActiveTurnForClosure()` | `interrupt` is user-action-specific; helper name would be clearer. | Medium | Prefer helper extraction if implementation can do so cleanly. |
| Session termination | `terminateRun` | Yes | Low | Keep. |

## Applied Patterns

- **Single lifecycle owner**: Active-turn shutdown order belongs in `ClaudeSession`, not split between session manager and cleanup.
- **Thin frontend facade**: UI buttons call the run store; no runtime-specific branching in Vue components.
- **Live-gated provider E2E**: Provider-specific regressions stay behind `RUN_CLAUDE_E2E` / `RUN_CODEX_E2E`.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Folder | Claude SDK runtime session subsystem | Session, active turn, cleanup, tool approval coordination. | Existing ownership. | Frontend or GraphQL resolver concerns. |
| `.../claude-session-manager.ts` | File | Session lifecycle | Terminate sessions using session-owned active-turn settlement. | Existing session manager. | Direct duplicate active-turn abort policy. |
| `.../claude-session.ts` | File | Active turn | Keep/extract safe settlement logic. | Existing active-turn owner. | Session map management. |
| `.../claude-session-cleanup.ts` | File | Final cleanup | Best-effort residual cleanup after lifecycle decisions. | Existing cleanup resource owner. | Primary active-turn state machine. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/` | Folder | Claude session unit tests | Fast lifecycle sequencing coverage. | Existing tests. | Live provider calls. |
| `autobyteus-server-ts/tests/e2e/runtime/` | Folder | Runtime E2E | Live GraphQL/WebSocket validation. | Existing runtime harness. | Ungated provider assumptions. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-execution/backends/claude/session` | Main-Line Domain-Control | Yes | Low | Runtime session lifecycle already grouped here. |
| `tests/e2e/runtime` | Mixed Justified | Yes | Low | Runtime E2E spans GraphQL, WebSocket, and provider runtime by design. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active terminate sequencing | `if (state.activeTurnId) await state.interrupt(); emit SESSION_TERMINATED; closeRunSession(runId);` | `abort(); clearPendingApprovals(); wait 2s; close query` | The good shape reuses the proven flush-before-abort invariant. |
| Frontend behavior | Keep `agentRunStore.sendUserInputAndSubscribe()` restore-before-send | Add Claude-specific condition in Vue button or send box | Root is backend runtime cleanup, not UI branching. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep abort-first terminate path and add retry on follow-up send | Could mask the symptom | Rejected | Fix terminate cleanup order. |
| Frontend special-case Claude terminate by calling Stop first | Might avoid active terminate failure | Rejected | Runtime terminate must be correct independent of UI. |
| Swallow global SDK `Operation aborted` unhandled rejections | Would make tests pass superficially | Rejected | Prevent the rejection by settling pending approval/control flow safely. |

## Derived Layering

- UI layer: Vue components and Pinia stores remain runtime-neutral.
- API/service layer: GraphQL and `AgentRunService` remain runtime-neutral lifecycle boundaries.
- Runtime adapter layer: Claude SDK session subsystem owns provider-specific active-turn termination details.
- Test layer: unit tests cover sequencing; live E2E covers real SDK behavior.

## Migration / Refactor Sequence

1. Add or adjust `ClaudeSessionManager` unit coverage to describe target active terminate behavior.
2. Refactor `ClaudeSessionManager.terminateRun()` active-session branch to call `await state.interrupt()` or an extracted `ClaudeSession` helper before session termination.
3. Remove now-obsolete direct abort/polling logic and unused `waitForActiveTurnToSettle` if no longer referenced.
4. Keep final `SESSION_TERMINATED` emission and `closeRunSession()` cleanup.
5. Add live-gated active terminate -> restore -> reconnect -> follow-up regression based on the probe.
6. Run targeted unit, frontend, Claude live interrupt, Claude live terminate, and Codex live terminate regression commands.

## Key Tradeoffs

- Calling `interrupt()` during terminate may emit `TURN_INTERRUPTED` before `SESSION_TERMINATED`; this is acceptable and more truthful than silently aborting.
- A private helper name may be cleaner than reusing `interrupt()` directly, but it should not create two sequences. If extracted, both public `interrupt()` and manager terminate must call the same helper.
- Live active terminate E2E adds provider time/cost; keep it gated and targeted.

## Risks

- If `interrupt()` waits indefinitely on a pathological SDK query, terminate could hang. Existing interrupt behavior already depends on this; implementation can keep final cleanup as a safety net, but should avoid reintroducing abort-first duplication.
- If a turn has not emitted a Claude provider session id before terminate, follow-up cannot resume provider context; it should still start a fresh provider session under the same AutoByteus run.
- Event ordering changes may affect tests expecting only `SESSION_TERMINATED`; update tests to allow/expect `TURN_INTERRUPTED` before termination for active turns.

## Guidance For Implementation

- Keep the change local to Claude SDK session lifecycle unless implementation finds new evidence.
- Prefer a single active-turn settlement implementation. Do not duplicate the flush/abort/close/wait sequence in manager and session.
- Use the investigation probe as the blueprint for a durable live-gated regression.
- Required minimum validation:
  - `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts`
  - `RUN_CLAUDE_E2E=1 pnpm --dir autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "creates a run, restores it, and continues streaming on the same websocket" --reporter=verbose`
  - Live active terminate regression added by implementation.
  - `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=180000 CLAUDE_LIVE_INTERRUPT_STEP_TIMEOUT_MS=90000 pnpm --dir autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts -t "uses the real Claude SDK" --reporter=verbose`
  - `RUN_CODEX_E2E=1 pnpm --dir autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "creates a run, restores it, and continues streaming on the same websocket" --reporter=verbose`
  - Frontend targeted terminate/restore tests after `pnpm --dir autobyteus-web exec nuxi prepare`.
