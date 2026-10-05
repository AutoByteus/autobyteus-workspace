# Design Spec — agent-run-termination-extraction

## Solution And Approval Basis
- Current solution revision ID: `SR-004` (architecture design).
- Approved requirements: `requirements-doc.md`, Approved in SR-003 (2026-10-05). The user said "you decide. you have
  the design princples to follow. lets go. approve". The basis is SR-002 with DEC-003 as recommended.
- Behavior-defining supplements: none. Contract preserved: predecessor SR-006 § 11 (F-1–F-4), read-only at
  `origin/personal:tickets/done/standalone-agent-run-root/design-spec.md`.
- Design status: `Ready`.
- Investigation notes: `investigation-notes.md` (E-A1–E-A11, E-X1–E-X3).
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction`.
  - Branch `codex/agent-run-termination-extraction`.
  - Base `origin/personal` @ `03d5db06b`. Target `personal`.

## Current-State Read
- `AgentRun` (`src/agent-execution/domain/agent-run.ts`, 498 effective lines) is the public boundary for one run. It
  owns event fan-out and status, input admission and dispatch, interrupts (via `AgentRunInterruptState`), compaction
  recovery (via `AgentRunCompactionRecovery`), and, inline, **termination** and **root-shutdown fence attempt
  selection** (E-A2, E-A8).
- **Termination** works as follows:
  - Prepare: input quiesces, or in a recoverable block is root-fenced and interrupted; FIFO drains; this yields a
    one-shot `PreparedAgentRunTermination` that can be cancelled (reopens input) or committed.
  - Finish: `backend.terminate()`; if accepted, release the run-local state on the dispatch lane, then detach from the
    backend source. A non-accepted finish can be retried.
  - Coalescing: one try-if-quiescent in flight, one preparation in flight, one prepared object, one finish in flight.
- **Root-shutdown fence:**
  - `fenceInputAndInterruptForRootShutdown` root-fences input on the lane and selects the current
    `AgentRunRootShutdownFence` attempt: reuse it while pending or accepted, replace it once ended.
  - It interrupts directly only in the recoverable-block-without-turn case, then schedules a microtask evaluation and
    returns the attempt's result.
  - Four AgentRun-internal points schedule re-evaluation (E-A9).
  - The attempt class already lives in its own file, with the F-1–F-4 rules; the attempt *selection* and the quiescence
    predicates live in `AgentRun`.
- **Coupling:** the termination code (157 lines) reads and writes AgentRun-private state across both clusters (E-A8,
  E-A9). Nothing outside `AgentRun` touches that state (E-A10).
- **Constraints to respect:**
  - all lane work stays on `dispatchQueue` in the same order;
  - evaluation stays a microtask that evaluates the *current* attempt at run time;
  - `interrupt()` keeps routing through `AgentRun.interrupt` (recoverable-block branch);
  - the public method signatures and their async-ness are unchanged, as is promise sharing (coalescing).

## Task Size And Architectural Risk (Mandatory)
- **Task size: `Medium`.** One owner extracted inside an existing boundary: one new file, one modified file
  (`agent-run.ts`), one new test, and docs. No caller, contract, route or persistence changes; the importer set is
  unchanged (E-A10).
- **Architectural risk: `High`.** Code size is not the concern; the risk is concurrency and blast radius. Termination
  and the root-shutdown fence sit on every AgentRun Stop, delete, archive and shutdown, for every root and runtime.
  Correctness depends on dispatch-lane ordering, microtask evaluation timing and promise-sharing semantics that a
  mechanical move could subtly alter (a promise identity, an extra `async` hop, or capturing a stale attempt). The F-02
  race (E-A4) shows how timing-sensitive this path is.
- **Escalation triggers:**
  - any existing Part A assertion must change to pass;
  - the move needs an AgentRun state change, an extra lane hop or reordering;
  - `agent-run.ts` cannot reach ≤ 400 lines without moving a concern other than termination and fence;
  - LE-O1 on Codex fails in the 10-run gate.

## Architecture Investigation Evidence
- Project design guideline applied: `DESIGN.md` (root). It requires the smallest coherent owner, no empty forwarding
  layers, no bypass of a public owner, and no collapsing of real lifecycle boundaries (E-A6). No closer guideline.
- Guideline conflicts: none.

| Source | Path | Observation | Decision supported | Uncertainty |
| --- | --- | --- | --- | --- |
| E-A8 | `agent-run.ts` 66–74, 219–285, 398–493 | 157 effective lines of termination and fence code; `reconcileUncertainDispatch` is input-owned | Exact moving set; `agent-run.ts` ≈ 365 after wiring | ±10 lines |
| E-A9 | same | Needs 5 state collaborators, 6 private operations, input dispatch state; 4 internal evaluation triggers | The options port (Interface Boundary Mapping) | — |
| E-A7 | `agent-run-interrupt-state.ts`, `agent-run-compaction-recovery.ts` | Internal collaborators take state collaborators plus closures via `options` | Same construction pattern | — |
| E-A10 | grep over src, tests, test-support, web | No private access; importers depend only on unchanged exports | Keep all existing paths and exports; zero test edits expected | — |
| E-A11 | `docs/modules/agent_execution.md` 227–262 | Docs describe behavior at the `AgentRun` boundary | Docs: name the internal owner only | — |

## Intended Change
- Add **`AgentRunTermination`** (`src/agent-execution/domain/agent-run-termination.ts`). It is AgentRun's internal owner
  of the run's termination lifecycle and root-shutdown fence attempts. It takes over every member listed in E-A8, with
  identical bodies, rewritten from `this.x` to `this.options.x` or its own fields.
- `AgentRun` constructs it once, after `interruptState`, and keeps its four public methods as plain delegations:
  `prepareTermination`, `tryPrepareTerminationIfQuiescent`, `fenceInputAndInterruptForRootShutdown`, `terminate`.
  `AgentRun`'s four internal triggers call `termination.scheduleRootShutdownEvaluation()`.
- `AgentRunRootShutdownFence` (per-attempt latch, F-1–F-4) and `createPreparedAgentRunTermination` stay exactly as they
  are, in their files.
- Docs name the owner. Add one coalescing test.

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | Kind | Requirement and ACs | Trigger | Existing behavior | Change or preserved outcome | Target path and spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-003; AC-001, AC-003, AC-004 | Root Stop or end (SCN-001); single-run Stop, delete, archive, `stopAll` (SCN-002) | E-A2, E-A4, E-A8 | Ownership moves; every result, timing, retry, event and diagnostic is preserved | DS-001, DS-002, DS-003, DS-004 |
| BEH-002 | Contract | REQ-002; AC-002 | Size guardrail | 498 lines (E-A1) | ≤ 400 | — |

## Relevant Supplemental Task Artifacts
| Path | Purpose | REQ/AC | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/baseline-server-failures.txt` | Baseline failing tests | AC-009 | Comparison by name and message | Evidence |
| Predecessor `design-spec.md` § 11 (read-only) | F-1–F-4 contract | REQ-003 | Preserved, unchanged in `agent-run-root-shutdown-fence.ts` | Finalized |

## Task Design Health Assessment (Mandatory)
- Change posture: `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `File Placement Or Responsibility Drift`. `AgentRun` mixes five lifecycle concerns, and
  the termination and fence logic has no owner of its own (E-A2).
- Refactor needed now: `Yes`. It is the approved scope, and `AgentRun` cannot take its next change under the guardrail.
- Evidence: E-A1, E-A2, E-A8, E-A9; F-02 history (E-A4).
- Design response: one internal owner for termination and fence attempts, following the existing internal-collaborator
  pattern (E-A7). The public boundary is unchanged.
- Rationale: termination and fence logic is a coherent state machine with its own state (five fields) and lifecycle
  (prepare → cancel/commit → finish; attempt → settle → replace). It is a real owner, not a forwarding layer. The
  other concerns are left in place (approved scope; DESIGN.md "smallest coherent owner").
- Deferrals and residual risk: input admission and dispatch, interrupt and compaction stay in `AgentRun`, at about 365
  lines after this change. The stale-local-turn residual (ARCH-REV-004 N-1) is unchanged by design (non-goal).

## Terminology
- **Termination lifecycle:** reversible preparation, then commit, then finish, with coalescing.
- **Fence attempt:** one `AgentRunRootShutdownFence` instance. **Attempt selection:** reuse it while pending or
  accepted, replace it once ended (F-3).

## Design Reading Order
Standard.

## Legacy Removal Policy (Mandatory)
- No backward compatibility. The moved members are **deleted** from `AgentRun`; there are no aliases or dual paths.
  `AgentRun` keeps only the four public methods as one-line delegations, because they are its public API (REQ-001).

## Persisted Data / State Transition Decision
- `Not Affected`. Only in-memory ownership moves; no stored shape, reader or writer changes.

## Data-Flow Spine Inventory
| Spine | Scope | BEH | Start | End | Owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | User Stop of a Team, Org or standalone root | Root terminated, AgentRuns finished | Root (Team/Org/standalone), then AgentRun | F-02 path; fence semantics |
| DS-002 | Primary End-to-End | BEH-001 | Single-run Stop, delete, archive, or server `stopAll` | AgentRun finished, resources released | `AgentRunManager`, then AgentRun | Prepare, commit, finish, cancel |
| DS-003 | Bounded Local | BEH-001 | AgentRun lifecycle change (event dispatch, input dispatch settle or result, interrupt release) | Current attempt evaluated or settled | `AgentRunTermination` | Microtask evaluation timing |
| DS-004 | Return-Event | BEH-001 | Accepted finish | Offline canonical status to listeners; source detached | `AgentRunTermination` via AgentRun ops | Observable status |

## Primary Execution Spine(s)
- DS-001: `Stop (web/API) → Root.terminate → FrozenRootTerminationScope.fence → ConfiguredAgentExecutionHandle.fenceForRootShutdown → AgentRun.fenceInputAndInterruptForRootShutdown → AgentRunTermination.fenceForRootShutdown → AgentRunRootShutdownFence attempt → {accepted} → scope.finish → AgentRun.prepareTermination → … → backend.terminate`
- DS-002: `Stop/delete/stopAll → AgentRunManager.prepareAgentRunTermination → AgentRun.prepareTermination → AgentRunTermination.prepare → PreparedAgentRunTermination.commit().finish() → AgentRunTermination.finishCommitted → backend.terminate → release on lane → detach`

## Spine Narratives (Mandatory)
| Spine | Narrative | Main nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | A root stop first fences every hosted AgentRun. AgentRun hands the request to its termination owner, which root-fences input on the lane, selects the attempt, and returns the attempt's result after evaluation. The root then finishes each run through DS-002. | Root, frozen scope, handle, AgentRun, AgentRunTermination, fence attempt | Root (orchestration); AgentRunTermination (per-run fence) | Diagnostics (warn); timers (inside the fence) |
| DS-002 | The caller prepares through AgentRun. The termination owner quiesces or fences input, drains FIFO, and returns the one prepared capability. Commit and finish call the backend; acceptance releases run-local state on the lane and detaches. | Manager, AgentRun, AgentRunTermination, PreparedAgentRunTermination, backend | AgentRunTermination | Event pipeline release |
| DS-003 | Any AgentRun lifecycle change schedules a microtask that evaluates whichever attempt is current at that moment. | AgentRun trigger, AgentRunTermination, fence attempt | AgentRunTermination | — |

## Spine Actors / Main-Line Nodes
`AgentRun` (public run boundary), `AgentRunTermination` (new internal owner), `AgentRunRootShutdownFence` (attempt
latch), `PreparedAgentRunTermination` (capability), `AgentRunBackend.terminate`.

## Ownership Map
- **`AgentRun`:**
  - owns the public run API;
  - owns the state collaborators (lane, lifecycle, input admission, interrupt, segment, compaction) and input dispatch;
  - constructs `AgentRunTermination` and exposes termination only through its four public methods.
  - It is a governing owner for the run, and a *thin facade* only for those four termination methods.
- **`AgentRunTermination`** owns:
  - the termination lifecycle state (`tryingQuiescent`, `preparing`, `prepared`, `finishing` promise);
  - the current fence attempt;
  - `recoveryShutdownFenced`;
  - the root-shutdown quiescence predicates;
  - the prepare and finish sequencing;
  - fence attempt selection and evaluation scheduling.
  - It does **not** own input dispatch, interrupts or status building; it uses AgentRun's operations.
- **`AgentRunRootShutdownFence`:** one attempt's F-1–F-4 rules (unchanged).
- **`PreparedAgentRunTermination`:** one-shot cancel/commit capability (unchanged).

## Thin Entry Facades / Public Wrappers
| Facade | Owner behind it | Why it exists | Must not secretly own |
| --- | --- | --- | --- |
| `AgentRun.prepareTermination`, `tryPrepareTerminationIfQuiescent`, `fenceInputAndInterruptForRootShutdown`, `terminate` | `AgentRunTermination` | The public run API (26 importers, unchanged); callers must not reach the internal owner | Any termination state or sequencing |

## Removal / Decommission Plan (Mandatory)
| Item | Why unnecessary | Replaced by | Scope |
| --- | --- | --- | --- |
| `AgentRun` fields `recoveryShutdownFenced`, `rootShutdownFence`, `tryingQuiescentTermination`, `preparingTermination`, `preparedTermination`, `termination` | Owned by the new unit | `AgentRunTermination` fields | In this change |
| `AgentRun` private `createRootShutdownFence`, `waitForActiveInputDispatch`, `prepareTerminationOnce`, `createTerminationPreparation`, `isRootShutdownQuiescent`, `isFencedRecoveryWithoutTurn`, `scheduleRootShutdownFenceEvaluation`, `finishCommittedTermination`, `finishCommittedTerminationOnce` | Same | `AgentRunTermination` methods | In this change |
| `AgentRun` imports of `AgentRunRootShutdownFence`, `createPreparedAgentRunTermination` (the value) and `getDefaultAgentRunEventPipeline`, if unused afterwards | Same | `agent-run-termination.ts` imports | In this change |

## Return Or Event Spine(s)
- DS-004: `backend.terminate accepted → lane: settle uncertain input, settleAcceptedTermination, interruptState.clear, lifecycleState.terminate, segment release, pipeline release, dispatchCanonicalStatus (offline) → detach source`. The order is unchanged.

## Bounded Local / Internal Spines
- **DS-003** (parent `AgentRunTermination`): `AgentRun trigger (4 sites) → scheduleRootShutdownEvaluation → queueMicrotask → this.attempt?.evaluate() → fence settle/interrupt`. The microtask must read the current attempt at execution
  time, not capture it at scheduling time.
- **Termination lifecycle** (parent `AgentRunTermination`):
  `prepare → [tryingQuiescent?] → preparing → prepared → cancel (reopen; clear prepared; drain) | commit → finish → accepted (release; detach) | not accepted (finish retryable)`.

## Off-Spine Concerns Around The Spine
| Concern | Spines | Serves | Responsibility | Risk if on the main line |
| --- | --- | --- | --- | --- |
| Fence diagnostics (warn) | DS-001 | Fence attempt | Turn state at rejection and expiry | — (unchanged) |
| Event pipeline release | DS-004 | AgentRunTermination | Release per-run pipeline state | — |

## Ownership Boundaries
- Authority for termination stays at `AgentRun` for all external callers. `AgentRunTermination` is an internal owned
  mechanism, in the same position as `AgentRunInterruptState` and `AgentRunCompactionRecovery`.
- `AgentRunTermination` reaches AgentRun state only through its constructor options. It never imports or receives the
  `AgentRun` instance.

## Boundary Encapsulation Map
| Boundary | Internal mechanisms | Callers that must use it | Forbidden bypass | If too thin |
| --- | --- | --- | --- | --- |
| `AgentRun` | `AgentRunTermination`, `AgentRunRootShutdownFence`, `AgentRunInterruptState`, input admission | Managers, handles, registries, roots (E-A3) | Any import of `agent-run-termination.ts` outside `agent-run.ts` | Add an `AgentRun` method |

## Dependency Rules
- `agent-run.ts` → `agent-run-termination.ts` (only importer).
- `agent-run-termination.ts` → `agent-run-root-shutdown-fence.ts`, `prepared-agent-run-termination.ts`,
  `agent-operation-result.ts`, the state collaborator types, and `default-agent-run-event-pipeline.ts`.
- Forbidden:
  - `agent-run-termination.ts` importing `agent-run.ts` (cycle);
  - any other file importing `agent-run-termination.ts`;
  - `AgentRunTermination` calling `interruptState.interrupt` directly; it must use the `interrupt` option, which is
    `AgentRun.interrupt` with its recoverable-block branch.

## Interface Boundary Mapping
| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `new AgentRunTermination(options)` | One AgentRun's termination | Construction | Bound to `options.runId` | Options below |
| `prepare(): Promise<PreparedAgentRunTermination>` | Termination lifecycle | Former `prepareTermination` body (non-async; returns the shared promise) | — | Same coalescing |
| `tryPrepareIfQuiescent(): Promise<PreparedAgentRunTermination \| null>` | Same | Former `tryPrepareTerminationIfQuiescent` (non-async) | — | |
| `fenceForRootShutdown(): Promise<AgentOperationResult>` | Fence attempts | Former `fenceInputAndInterruptForRootShutdown` (async) | — | |
| `terminate(): Promise<AgentOperationResult>` | Termination lifecycle | Former `terminate` (async) | — | |
| `scheduleRootShutdownEvaluation(): void` | Fence attempts | `queueMicrotask(() => this.attempt?.evaluate())` | — | Called by AgentRun's 4 triggers |

**Options** (constructor; follows the E-A7 pattern):
```ts
type AgentRunTerminationOptions = Readonly<{
  runId: string;
  backend: Pick<AgentRunBackend, "getLifecycleSnapshot" | "terminate">;
  dispatchQueue: AgentRunEventDispatchQueue;
  lifecycleState: AgentTurnLifecycleState;
  segmentLifecycleState: AgentSegmentLifecycleState;
  inputAdmissionState: AgentRunInputAdmissionState;
  interruptState: AgentRunInterruptState;
  inputDispatch: Readonly<{
    active(): Promise<void> | null;                    // AgentRun.activeInputDispatch
    uncertainClaim(): AgentRunInputDispatchClaim | null; // AgentRun.uncertainInputDispatch?.claim
    clearUncertain(): void;                             // AgentRun.uncertainInputDispatch = null
  }>;
  interrupt(): Promise<AgentOperationResult>;          // AgentRun.interrupt() (recoverable-block branch kept)
  reconcileRecovery(): void;
  publishInputState(): void;
  drainInput(): Promise<void>;                         // drainInputAfterLifecycleChange
  dispatchCanonicalStatus(): void;
  detachFromBackendSource(): void;                     // lazy: () => this.unsubscribeFromBackendSource()
  warn(message: string): void;                         // the fence warn sink (console.warn today)
}>;
```

## Interface Boundary Check
| Interface | Singular? | Identity explicit? | Ambiguity risk | Action |
| --- | --- | --- | --- | --- |
| `AgentRunTermination` methods | Yes | Yes (bound run) | Low | — |
| Options | Yes (only what E-A9 lists) | Yes | Low | Do not pass the whole `AgentRun` |

## Main Domain Subject Naming Check
| Subject | Name | Natural? | Drift risk | Action |
| --- | --- | --- | --- | --- |
| Internal termination owner | `AgentRunTermination` (`agent-run-termination.ts`) | Yes; matches `AgentRunInterruptState`, `PreparedAgentRunTermination` | Low | — |
| Fence attempt | `AgentRunRootShutdownFence` (kept) | Yes | — | — |

## Existing Capability / Subsystem Reuse Check
| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Per-attempt fence rules | `AgentRunRootShutdownFence` | Reuse unchanged | Already a tight owner |
| Prepared capability | `createPreparedAgentRunTermination` | Reuse unchanged | Same |
| Termination lifecycle and attempt selection | — (inline in `AgentRun`) | Create New (`AgentRunTermination`) | No existing owner; `PreparedAgentRunTermination` is a capability, not a lifecycle owner |

## Subsystem / Capability-Area Allocation
| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-execution/domain` | AgentRun and its internal run-lifecycle collaborators | DS-001–DS-004 | Extend (new file beside `agent-run-interrupt-state.ts`) |

## Draft File Responsibility Mapping
| File | Area | Owner | Concern |
| --- | --- | --- | --- |
| `agent-run-termination.ts` (new) | domain | `AgentRunTermination` | Termination lifecycle, fence attempt selection and scheduling, quiescence predicates |
| `agent-run.ts` (modify) | domain | `AgentRun` | Everything else; constructs and delegates |

## Reusable Owned Structures Check
N/A. Nothing is repeated; the extraction moves single-owner code.

## Shared Structure / Data Model Tightness Check
| Structure | One meaning per field? | Redundant? | Overlap risk | Action |
| --- | --- | --- | --- | --- |
| `AgentRunTerminationOptions` | Yes | No (each E-A9 need once) | Low | Pass `uncertainClaim`, not the whole `ClaimedInputDispatch`; termination needs only the claim |

## Final File Responsibility Mapping
| File | Owner | Concern | Size target |
| --- | --- | --- | --- |
| `src/agent-execution/domain/agent-run-termination.ts` (Add) | `AgentRunTermination` | As drafted | ≈ 190, ≤ 400 |
| `src/agent-execution/domain/agent-run.ts` (Modify) | `AgentRun` | Remove the E-A8 set; construct; 4 delegations; 4 triggers call `scheduleRootShutdownEvaluation` | ≈ 365, ≤ 400 |
| `src/agent-execution/domain/agent-run-root-shutdown-fence.ts` | — | Unchanged | — |
| `src/agent-execution/domain/prepared-agent-run-termination.ts` | — | Unchanged | — |
| `tests/unit/agent-execution/agent-run.test.ts` (Modify: one added test only) | — | Coalescing test (Guidance) | — |
| `docs/modules/agent_execution.md` (Modify) | — | Name `AgentRunTermination` in "Published-Run Termination…" and "Root Shutdown Fence" | — |

## Applied Patterns
- **State machine** inside `AgentRunTermination` (the termination lifecycle) and in each fence attempt (unchanged).
- **Internal collaborator with an options port**, following E-A7.

## Target Subsystem / Folder / File Mapping
| Path | Kind | Owner | Responsibility | Must not contain |
| --- | --- | --- | --- | --- |
| `src/agent-execution/domain/agent-run-termination.ts` | File | `AgentRunTermination` | Above | Input dispatch, interrupt mechanics, status building, any `AgentRun` import |

## Folder Boundary Check
| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-execution/domain` | Main-line domain-control | Yes | Low | Holds `AgentRun` and its existing internal collaborators; a subfolder for one file would over-split |

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Delegation keeps promise identity and tick count | `prepareTermination() { return this.termination.prepare(); }` (non-async) | `async prepareTermination() { return await this.termination.prepare(); }` | An extra `async` hop changes promise identity (coalescing) and microtask ordering |
| Evaluate the current attempt | `queueMicrotask(() => this.attempt?.evaluate())` | `const a = this.attempt; queueMicrotask(() => a?.evaluate())` | A replaced attempt must not be evaluated, and a new one must be |
| Interrupt route | `options.interrupt()` → `AgentRun.interrupt` | `options.interruptState.interrupt()` | Loses the recoverable-block branch (`agent-run.ts:213-217`) |
| Lazy detach | `detachFromBackendSource: () => this.unsubscribeFromBackendSource()` | Passing `this.unsubscribeFromBackendSource` before it is assigned | It is assigned at the end of the constructor |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Why considered | Decision | Plan |
| --- | --- | --- | --- |
| Keep the moved private methods in `AgentRun` as forwarding aliases | Smaller diff | Rejected | Delete; only the 4 public methods delegate |
| Re-export `AgentRunTermination` from `agent-run.ts` | Convenience | Rejected | Internal only |

## Derived Layering
N/A.

## Change / Refactor Sequence
1. Add `agent-run-termination.ts` with the options type and the moved members, with bodies copied verbatim (only
   `this.` targets change).
2. In `agent-run.ts`:
   - construct `this.termination` right after `interruptState` (its `onReservationReleased` calls
     `this.termination.scheduleRootShutdownEvaluation()` lazily);
   - replace the four public methods with plain delegations of the same async-ness as the owner method;
   - point the three other triggers (300, 339, 385) at `scheduleRootShutdownEvaluation`;
   - delete the moved fields, methods and now-unused imports.
3. Add the coalescing test. Run the Part A suites unchanged, then the full baseline comparison (AC-009).
4. Update the docs.
5. Live: LE-O1 on Codex ×10; the two live suites on Claude and Codex (AC-004).

## Key Tradeoffs
- **Options port versus passing `AgentRun`:** the port is a little more wiring, but it avoids a cycle and makes the
  dependency set explicit and reviewable.
- **Keeping `AgentRunRootShutdownFence` separate** rather than merging it into the new owner: it is already a tight
  per-attempt owner with its own unit test, so the fence test stays untouched.
- **`AgentRun` stays the facade** for four methods instead of callers using the owner: this preserves the public API
  and the authoritative boundary.

## Risks
- Subtle ordering drift (an async hop, promise identity, a stale attempt). Mitigations: the shape rules above, the
  unchanged suites, the new coalescing test and the live gate (AC-004).
- Size: the estimate is about 365 lines. If `agent-run.ts` lands above 400, use the escalation trigger. Do not squeeze
  other concerns out.
- Base failures (E-X1), especially `agent-run-manager` (16), sit near this code. Compare by test name and message.

## Guidance For Implementation
- Copy bodies verbatim. Do not "improve" logic, reorder lane work or merge methods in this ticket.
- Keep the async-ness of each owner method equal to the original AgentRun method. Public wrappers are non-async plain
  `return`s.
- **New test** (`agent-run.test.ts`, additive): concurrent `prepareTermination()` calls resolve to the same prepared
  object, and a second `terminate()` while the first is in flight returns the same result without a second
  `backend.terminate` call. This pins the delegation semantics (REQ-003).
- AC-003: zero edits to existing assertions are expected (all paths and exports unchanged, E-A10). Any needed edit is
  an escalation trigger.
- Check with grep that `agent-run-termination` is imported only by `agent-run.ts`, including `test-support/`
  (E-X2).
- Report effective line counts of both files in the implementation handoff.
- ARCH-REV-001 notes:
  - N-1: the coalescing test asserts promise identity (`toBe`), not just equal resolved values; equality would not
    catch an added `async` wrapper.
  - N-2: `warn` and the other AgentRun callbacks are passed as lazy closures.
  - N-3: the wait loop re-reads `inputDispatch.active()` on every iteration, as
    `while (this.activeInputDispatch) await this.activeInputDispatch` does today.
