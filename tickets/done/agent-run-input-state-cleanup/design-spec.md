# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001, Solution Designer within the direction (user informed 2026-10-18)
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup/tickets/in-progress/agent-run-input-state-cleanup/investigation-notes.md`
- Authorities read (2026-10-18): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`
- Conflicts or discrepancies: None

## Current-State Read

`AgentRun` owns the input-state projection. `inputStateEvent()` (L424-430) does four things:
1. reads pending entries;
2. calls `compactionRecovery.reconcile()`, which mutates;
3. advances `inputRevision`/`lastInputSignature` when the content changed;
4. builds the event.

It is called by `publishInputState()`, `subscribeToEvents` and `getInputStateSnapshot()`. PB-001's `broadcastUnpublishedInputState` sends each revision once. Three call sites repeat `reconcileRecovery(); publishInputState();` inline. Evidence: investigation notes.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. One production file (private methods only) and edits to 6 test files plus one comment.
- Architectural risk: `Low`. No contract, persistence, concurrency or ownership change; no behaviour change. All calls stay inside the existing `dispatchQueue` tasks in the same order.
- Escalation trigger: any test assertion needs to change, or a publish-only site seems to need a reconcile → return `Design Impact`.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `agent-run.ts` L414-445 | Hidden mutations in a builder | Split into named steps | — |
| Code | `agent-run-compaction-recovery.ts` L22-31 | `reconcile()` mutates | Keep call order | — |
| Code | `agent-run.ts` L94, L291, L383 vs L207, L360; termination L96, L145-148 | Only three consecutive pairs | Consolidate only those | — |
| Probe | `evidence/test-double-drift-typecheck-probe.txt` | Wider drift | Scope split (DEC-001) | — |

## Intended Change

Make the input-state mutation explicit, give "reconcile then publish" one owner, correct one test comment, and put six test doubles on the current `inputCapabilities` contract, without any behaviour change.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002.
  - Production: `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` (private methods only).
  - Tests:
    - `tests/integration/agent/agent-status-websocket.integration.test.ts` (comment + `ScriptedAgentRunBackend`);
    - `tests/unit/agent-execution/agent-run-manager.test.ts`;
    - `tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts`;
    - `tests/integration/agent-execution/agent-run-manager.integration.test.ts`;
    - `tests/unit/services/agent-streaming/agent-stream-handler.test.ts`;
    - `tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts`.
- Deliberately left alone:
  - `agent-run-termination.ts` (its calls are not consecutive pairs or are publish-only);
  - `broadcastUnpublishedInputState` (PB-001's rule);
  - `compactionRecovery`;
  - test assertions.
- Follow-ups:
  - FU-001 (to the PTM, for autobyteus-65): 49 backend-contract type errors in 14 test files (`evidence/test-double-drift-typecheck-probe.txt`). They include missing `hasRunningBackgroundTasks`/`dispatchUserInput`, factory doubles without `beginPreparation`, and `autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` calling removed APIs (`postUserMessage`, `llmFactory`, private `createBackend`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Change / Preserved | Target Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-002, REQ-005 / AC-001, AC-002, AC-005 | Run activity, subscribe, pull read | PB-001 | Preserved; structure only | DS-001 |
| BEH-002 | Operational | REQ-004 / AC-004, AC-005 | Test runs | Drifted doubles | Same outcomes | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/test-double-drift-typecheck-probe.txt` | Drift list | FU-001 | Scope boundary | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `Yes`
- Structural triggers:
  - Repeated coordination: the reconcile+publish pair is repeated (3×) → one owner.
  - No boundary, placement or shared-structure triggers apply, because everything stays private inside `AgentRun`.
- Root cause classification: `Missing Invariant` (side effects not owned by an explicitly named step) plus a small `Duplicated Policy Or Coordination`.
- Refactor needed now: `Yes` (this Task is the refactor)
- Evidence: notes
- Design response: see Target shape.
- Intentional deferrals: FU-001 (autobyteus-65).

## Legacy Removal Policy (Mandatory)

- Removed: the side-effecting `inputStateEvent()` (replaced in place). No compatibility paths kept.

## Persisted Data / State Transition Decision

- `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | BEH-001 | publish / subscribe / pull read | input-state DTO or event | `AgentRun` | Where the refactor lives |

## Primary Execution Spine(s)

Unchanged from PB-001: `Runtime batch -> AgentRun -> listeners -> egress`.

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | `refreshInputState()`: read content (`readInputStateContent()`, which calls `compactionRecovery.reconcile()` as before), then `advanceInputRevision(content)`, then return the DTO. `inputStateEvent(state)` builds the event with no side effects. Publish = refresh → event → `broadcastUnpublishedInputState`. Subscribe = reconcileRecovery → refresh → event → broadcast-unpublished → add listener → deliver. Pull read = reconcileRecovery → refresh → return. | `AgentRun` | `AgentRun` | — |

## Spine Actors / Main-Line Nodes

`AgentRun` only.

## Ownership Map

`AgentRun` owns `inputRevision`, `lastInputSignature` and `publishedInputRevision`. Only `advanceInputRevision` writes the first two; only `broadcastUnpublishedInputState` writes the third.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Side-effecting `inputStateEvent()` | Hidden mutation | `refreshInputState()` + `readInputStateContent()` + `advanceInputRevision()` + pure `inputStateEvent(state)` | In This Change | — |
| Three inline `reconcileRecovery(); publishInputState();` pairs | Duplication | `reconcileAndPublishInputState()` | In This Change | L94, L291, L383 only |
| `{ kind: "start_only" }` and missing `inputCapabilities` in 6 test doubles | Stale contract | `{ activeTurnAppend: "unsupported" }` | In This Change | Same runtime behaviour (undefined behaved as unsupported) |
| Wider test-double drift | Out of scope | — | Follow-up (FU-001 → autobyteus-65) | Evidence file |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

DS-001 above.

## Off-Spine Concerns Around The Spine

None.

## Ownership Boundaries

Unchanged; all new methods are private to `AgentRun`. The termination callbacks keep their names and meaning.

## Boundary Encapsulation Map

| Boundary | Internal Mechanisms | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `AgentRun` public API (`subscribeToEvents`, `getInputStateSnapshot`) | revision, signature, published revision | consumers | — | — |

## Dependency Rules

Unchanged.

## Interface Boundary Mapping

| Method (private unless noted) | Subject | Responsibility | Notes |
| --- | --- | --- | --- |
| `readInputStateContent(): { entries, recoverableBlock }` | input content | Pending entries + `compactionRecovery.reconcile()` (same call, same order as today) | Doc comment names the reconcile side effect |
| `advanceInputRevision(content): number` | revision | Compare the signature; bump `inputRevision` if changed; return the current revision | Only writer of the revision/signature |
| `refreshInputState(): AgentInputStateDto` | input state | read → advance → DTO | Name signals mutation |
| `inputStateEvent(state): AgentRunEvent` | event | Pure builder | — |
| `reconcileAndPublishInputState(): void` | publication | `reconcileRecovery()` then `publishInputState()` | Used at the 3 former pairs |
| `getInputStateSnapshot()` (public) | pull read | `reconcileRecovery()` then `refreshInputState()` | Signature unchanged |

## Interface Boundary Check

All singular, `Low` risk.

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Mutating observe | `refreshInputState` | Yes | Low | — |
| Revision step | `advanceInputRevision` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

Reuse `AgentRun` itself; nothing new.

## Subsystem / Capability-Area Allocation

`agent-execution/domain` (Modify).

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

`AgentInputStateDto` unchanged.

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `src/agent-execution/domain/agent-run.ts` | DS-001 refactor |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` | CC-003 comment: "`AGENT_INPUT_STATE` frames are left out of this status/content trace on purpose. A changed input state is a cadence boundary (it flushes pending content first); the PB-001 cases below assert that directly." `ScriptedAgentRunBackend`: `inputCapabilities = { activeTurnAppend: "unsupported" }`, `hasRunningBackgroundTasks(): boolean { return false; }`, and `dispatchUserInput` rejecting with "not used by this harness" |
| 5 other test files | `inputCapabilities` → `{ activeTurnAppend: "unsupported" }` (add it where missing) |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As above; no new files.

## Folder Boundary Check

Unchanged.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Pull read | `getInputStateSnapshot() { this.reconcileRecovery(); return this.refreshInputState(); }` | A read that returns new entries with the old revision | Revision identifies content |
| Publish-only sites | L207, L360 and termination L96 keep `publishInputState()` alone | Switching them to `reconcileAndPublishInputState()` | It would add a lifecycle reconcile, which is a behaviour change |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `inputStateEvent()` as a wrapper | Fewer edits | Rejected | Replaced in place |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Refactor `agent-run.ts` as mapped.
2. Fix the comment and the six doubles.
3. Run: `agent-run.test.ts` and the other `tests/unit/agent-execution` input-state tests; `agent-status-websocket.integration.test.ts` and `chat-socket-content-cadence.integration.test.ts` (×3 each, as they are timing-based); each edited test file; server `typecheck`, `test:unit`, `test:integration:prepare` + `test:integration`.
4. `grep -rn 'start_only' tests` returns nothing.

## Key Tradeoffs

- More, smaller private methods versus one opaque method: readability wins; no runtime cost.

## Risks

- RSK-001/RSK-002 (notes), guarded by AC-001/AC-002 and the unchanged tests.

## Guidance For Implementation

- Do not change any test assertion. If one fails, stop and report (`Design Impact`).
- Keep `compactionRecovery.reconcile()` inside `readInputStateContent()`, before the signature comparison, exactly as today.
