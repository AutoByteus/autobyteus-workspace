# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-001, approved by the user 2026-09-28 ("Please go ahead. I approve.")
- Behavior-defining supplements and their approval references: N/A — none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/investigation-notes.md`

## Current-State Read

`AgyStreamProcess` owns the AGY child process and NDJSON parsing. It arms a 300 s turn idle timer on `sendUserMessage`, resets it on every non-`result` message and clears it on `result`; expiry calls `fail(...)`, which notifies close listeners and SIGTERMs AGY. `AgyAgentRunBackend.handleClose` then reports `AGY_PROCESS_ERROR` and takes the run offline (BEH-001). AGY withholds in-order step updates while a background step is `RUNNING`, so a healthy, working AGY can be silent for longer than 300 s (CUR-2, CUR-5).

`AgyStreamEventConverter` owns the provider→canonical projection. It emits `TOOL_EXECUTION_STARTED` on the first sighting of a tool step and a terminal event on `DONE`/`ERROR`. On `result` it closes open text segments only, so a daemon step that AGY never finishes remains an open tool invocation (BEH-002, CUR-4).

Ownership is healthy; both defects are local to these two owners.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: two production files in one backend folder (`backends/antigravity/stream/agy-stream-process.ts`, `agy-stream-event-converter.ts`), one existing test file extended and one new focused unit test; one module doc paragraph. No new files in production, no new owners.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: removes a timer (reduces behavior), and adds a terminal event of an existing canonical type with an existing payload shape. No API/GraphQL, persistence schema, security, deployment or ownership change. `provider_state` consumers only interpret `DONE`/`ERROR` for denied results (investigation notes, Codebase facts), so `"RUNNING"` on a succeeded result is inert there. Concurrency unchanged (converter runs on the backend's serialized event queue).
- Escalation trigger if implementation or validation discovers new impact: if any consumer (web tool-card, memory sequencer, replay, token/usage, Org/Team presentation adapters) rejects or mis-renders a `TOOL_EXECUTION_SUCCEEDED` emitted immediately before `TURN_COMPLETED` / turn `ERROR`, or if removing the timer exposes a real hang with no process exit, stop and return `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Incident trace | investigation notes, Source Log row 1 | 300.0 s gap then `TURN_INTERRUPTED` | Remove idle timer (D1) | None |
| Probe P1 | `probes/agy-daemon-stream-order-probe.py` | Daemon step never `DONE`; later steps withheld until `result` | D1; close unfinished steps at `result` (D2) | Future AGY versions may change ordering (design independent of it) |
| Probe P2 | `probes/agy-background-task-turn-end-probe.py` | Non-daemon task holds the turn open; completion notification inside the turn | D1 sufficient; nothing arrives outside a turn | None |
| Backend survey | `backends/{codex,claude,autobyteus}` | No mid-turn idle kill | D1 aligns AGY with platform norm | ACP has same timer (out of scope) |
| Consumer grep | `provider_state` consumers | Only denied classification reads it | D2 payload value is safe | None |

## Intended Change

- D1: Delete the AGY turn idle watchdog entirely from `AgyStreamProcess`. Keep the 60 s startup timeout and all existing failure paths.
- D2: In `AgyStreamEventConverter`, remember each started-but-unfinished tool step's canonical payload for the current turn; when AGY `result` arrives (either branch), emit one `TOOL_EXECUTION_SUCCEEDED` per unfinished step, marking it as a background task still running, before the turn's `TURN_COMPLETED` or turn `ERROR`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002 / AC-001, AC-004 | AGY turn in progress | CUR-3 | No silence-based termination; other end conditions preserved | S1: `AgyAgentRunBackend.dispatchUserInput` → `AgyStreamProcess.sendUserMessage` → stdout NDJSON → listeners → converter; turn ends on `result` / close / Stop |
| BEH-002 | User | REQ-003, REQ-004 / AC-002, AC-003, AC-004 | AGY `result` with an unfinished tool step | CUR-4 | Unfinished step closed as background success; finished steps unchanged | S2: `AgyStreamEventConverter.convert(result)` → canonical events → `AgentRun` pipeline → memory sequencer + web tool card |
| BEH-003 | System | REQ-001, REQ-002 / AC-004 | Non-daemon background task | CUR-5 | Preserved; now works for any duration | S1 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/agy-daemon-stream-order-probe.py` | Real-AGY SCN-001 reproduction | AC-002, AC-004 | Evidence for D1/D2; reusable for AC-004 live check | Evidence; not behavior-defining |
| `probes/agy-background-task-turn-end-probe.py` | Real-AGY SCN-002 reproduction | AC-004 | Evidence for D1 | Evidence; not behavior-defining |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Local Implementation Defect` (a liveness policy that equates stream silence with failure, contrary to AGY's observed stream contract and the platform's runtime norm; plus a missing close for provider steps that never terminate)
- Refactor needed now: `No`
- Evidence: investigation notes CUR-2..CUR-5; backend survey.
- Design response: remove the policy (D1); add the missing terminal projection (D2) inside the existing owner.
- Refactor rationale: owners, boundaries and file placement are healthy; the fix is a deletion plus a small addition.
- Intentional deferrals and residual risk: ACP idle timer; Org/Team Terminate robustness (Ticket B). Residual: a genuinely hung AGY process that never exits and never sends `result` now waits for user Stop — the same contract as Codex/Claude (approved DEC-001).

## Terminology

- Unfinished step: an AGY `tool` step for which the converter emitted `TOOL_EXECUTION_STARTED` in the current turn but saw no `DONE`/`ERROR`.
- Background step: an unfinished step at the moment AGY emits `result`.

## Design Reading Order

Intended Change → Behavior map → Final File Responsibility Mapping → Concrete Examples → Change Sequence.

## Legacy Removal Policy (Mandatory)

Clean cut: remove `TURN_IDLE_TIMEOUT_MS`, the `turnIdleTimer` field, `resetTurnIdleTimer`, `clearTurnIdleTimer`, their call sites and the `AGY_TURN_IDLE_TIMEOUT` error string. No flag, no config switch, no compatibility path.

## Persisted Data / State Transition Decision

- Decision: `No Migration Required`. No schema change. New turns persist a normal tool result for background steps; historical traces are untouched and still replay as before.

## Data-Flow Spine Inventory

- S1 AGY turn lifecycle (input → process → stream → converter → turn end).
- S2 AGY `result` projection (converter → canonical events).

## Primary Execution Spine(s)

S1 and S2 as mapped above; no new nodes.

## Spine Narratives (Mandatory)

- S1: The backend starts a turn and writes the user message to AGY stdin. AGY streams step updates (possibly withheld for long periods while a background step runs). The turn ends only when AGY sends `result`, the process closes/errors/violates the protocol, or the user stops it. No clock participates after startup.
- S2: On `result`, the converter closes open text segments (existing), then closes each background step with a succeeded background result in ascending step order (new), then emits usage/`TURN_COMPLETED` (success) or turn `ERROR` (non-success) as today, and clears turn state.

## Spine Actors / Main-Line Nodes

`AgyAgentRunBackend` (turn owner), `AgyStreamProcess` (process owner), `AgyStreamEventConverter` (projection owner). Unchanged set.

## Ownership Map

- Liveness/termination policy: `AgyStreamProcess` + `AgyAgentRunBackend` (unchanged owners; policy reduced).
- Provider step → canonical tool events, including background closure: `AgyStreamEventConverter`.

## Thin Entry Facades / Public Wrappers

N/A — none.

## Removal / Decommission Plan (Mandatory)

| Item | File | Action |
| --- | --- | --- |
| `TURN_IDLE_TIMEOUT_MS` constant | `agy-stream-process.ts` | Delete |
| `turnIdleTimer` field | same | Delete |
| `resetTurnIdleTimer()` / `clearTurnIdleTimer()` | same | Delete |
| `this.resetTurnIdleTimer()` + catch-path `clearTurnIdleTimer()` in `sendUserMessage` | same | Delete (keep the write and its error propagation) |
| `if (message.event === "result") this.clearTurnIdleTimer(); else if (this.turnIdleTimer) this.resetTurnIdleTimer();` in `acceptStdout` | same | Delete |
| `this.clearTurnIdleTimer()` in `stop()` | same | Delete |
| Any doc/test text describing the 5-minute idle failure | `docs/modules/antigravity_cli_runtime.md`, AGY tests | Update/remove if present |

## Return Or Event Spine(s)

S2 is the event spine; see narrative.

## Bounded Local / Internal Spines

Converter per-turn state: `toolStarts`, `toolTerminals`, and (new) `openTools: Map<number, ToolCommon>`; all cleared in `startTurn`, and `openTools` consumed/cleared on `result` and on `interrupt()`.

## Off-Spine Concerns Around The Spine

- Memory: `runtime-tool-trace-sequencer` persists the new succeeded result as a normal tool result (no change).
- Web tool card: renders a succeeded tool with its `result.output` (no change).
- Diagnostics: no provider-failure diagnostic for background closure (it is not a failure).

## Ownership Boundaries

Unchanged. Converter must not reach into AGY files or the process; process must not interpret step semantics.

## Boundary Encapsulation Map

`openTools` is private to the converter. No new public method.

## Dependency Rules

No new imports.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `AgyStreamProcess` public API (`start`, `subscribe`, `onClose`, `sendUserMessage`, `stop`) | Unchanged signatures |
| `AgyStreamEventConverter` public API (`startTurn`, `convert`, `interrupt`) | Unchanged signatures; `convert(result)` may emit additional `TOOL_EXECUTION_SUCCEEDED` events |
| Canonical `TOOL_EXECUTION_SUCCEEDED` payload | Existing shape reused |

## Interface Boundary Check

No contract widening; one new value (`"RUNNING"`) for the informational `provider_state` field on succeeded results.

## Main Domain Subject Naming Check

Use "background" consistently (`openTools`, `backgroundToolResult`, output text "Started as a background task; still running when the turn ended.").

## Existing Capability / Subsystem Reuse Check

Reuses existing `TOOL_EXECUTION_SUCCEEDED`, `common` payload construction, and `event()` helper. No new subsystem.

## Subsystem / Capability-Area Allocation

`autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/` only.

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

`common` payload (`turn_id, invocation_id, tool_name, arguments`) is already built in `tool()`; store that exact object in `openTools` so the background closure is identical in identity fields to the start event.

## Shared Structure / Data Model Tightness Check

No shared type change.

## Final File Responsibility Mapping

| File | Responsibility After Change |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | Spawn AGY, 60 s startup readiness, NDJSON parse, stdin writes, close/error/protocol failure → `fail`. No turn timer. |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` | Existing projection + record open tool steps + close them as background on `result`. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` | Add AC-002/AC-003 cases. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts` (new) | AC-001: mocked `node:child_process.spawn` + fake timers; after init and `sendUserMessage`, advancing > 5 min must not kill the child or notify close listeners. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-turn-lifecycle.test.ts` | Optional AC-003 regression: process close mid-turn with an open tool still yields interruption, not background success. |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Short note: turns have no idle timeout; unfinished (daemon) steps are closed as background at turn end; AGY may withhold progress while a background step runs. |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

No moves; files as listed above.

## Folder Boundary Check

All changes stay in the existing AGY backend folder, its tests folder and its module doc.

## Concrete Examples / Shape Guidance

Converter additions (shape only):

```ts
private readonly openTools = new Map<number, Record<string, unknown>>(); // stepIndex -> common

// startTurn(): also this.openTools.clear();

// tool(): after building `common`
if (!this.toolStarts.has(stepIndex)) { this.toolStarts.add(stepIndex); this.openTools.set(stepIndex, common); events.push(STARTED) }
if (state === "ACTIVE") return events;
this.toolTerminals.add(stepIndex); this.openTools.delete(stepIndex);
// ... existing terminal branches unchanged

// result(): right after `const events = this.closeText(turnId);`
events.push(...this.closeBackgroundTools());
// both SUCCESS and non-SUCCESS branches then continue exactly as today

private closeBackgroundTools(): AgentRunEvent[] {
  const events = [...this.openTools.entries()].sort(([a], [b]) => a - b).map(([, common]) =>
    this.event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      ...common, provider_state: "RUNNING",
      result: { provider_state: "RUNNING", output: BACKGROUND_TOOL_OUTPUT },
    }));
  this.openTools.clear();
  return events;
}
// interrupt(): also this.openTools.clear();  (interruption semantics unchanged)

const BACKGROUND_TOOL_OUTPUT = "Started as a background task; still running when the turn ended.";
```

Expected canonical sequence for probe P1 (daemon at step 2): `TOOL_EXECUTION_STARTED(step2)` … later steps' events … on `result`: `TOOL_EXECUTION_SUCCEEDED(step2, provider_state RUNNING)` → `TOKEN_USAGE_UPDATED` → `TURN_COMPLETED`.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Reason |
| --- | --- | --- |
| Keep idle timer behind a flag or raise to 30–60 min | Rejected | User-approved DEC-001; silence is a normal AGY state; platform norm has no mid-turn idle kill |
| Emit a new event type / status for background tools | Rejected | Existing SUCCEEDED + output text is sufficient; avoids contract change across web/memory/replay |
| Read AGY transcript files for live progress | Rejected | Approved exclusion (DEC-002); undocumented provider internals |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Converter: add `openTools`, `closeBackgroundTools`, wire into `startTurn`/`tool`/`result`/`interrupt`; add converter tests (AC-002, AC-003).
2. Process: delete idle timer per Removal plan; add `agy-stream-process.test.ts` (AC-001).
3. Run the AGY unit suites (`pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch`) and typecheck.
4. Update the module doc.
5. Live check (AC-004) is owned by API/E2E; the preserved probes show the real-AGY pattern.

## Key Tradeoffs

- No safety timer: a hypothetical AGY hang without process exit waits for user Stop — accepted, consistent with other runtimes.
- Background steps show as succeeded rather than a distinct state — simplest faithful representation without contract change.

## Risks

- AGY might later emit `DONE` for a daemon after `result` of the same turn: the converter would see it outside a turn and fail (`AGY_UNEXPECTED_EVENT_OUTSIDE_TURN`). Not observed in P1 (no events after `result` within 125 s while the server ran). API/E2E should keep the P1 pattern running ≥ 2 minutes after `result` to confirm; if observed, escalate as `Design Impact`.
- ACP/Grok retains its own idle timer (separate ticket).

## Guidance For Implementation

- Keep the diff minimal; do not restructure the converter or the process class.
- Do not change `AgyAgentRunBackend` unless a test proves it necessary; `handleClose`/`interrupt` semantics must stay as-is.
- Emit background closures only from `result`; never from `interrupt()`.
