# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed in this conversation, 2026-10-19)
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops/tickets/in-progress/codex-segment-turn-admission-drops/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md` (2026-10-19); project `DESIGN.md` (repository root, 2026-10-19); area contract `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`; prior designs `tickets/done/codex-runtime-event-stream-reconnect/design-spec.md` (willRetry), `tickets/done/segment-lifecycle-error-flood/design-spec.md` (AgentRun rejection accounting pattern).
- Project design-principle conflicts with the general principles, or discrepancies: none. DESIGN.md rule 5 ("remove unnecessary work before adding complexity") shaped the decision to change only logging: the content-loss defect is already fixed, and the residual drops are correct.

## Current-State Read

Codex notifications reach `CodexThread.handleAppServerNotification`. For governed item events (`item/started`, `item/agentMessage/delta`, `item/completed`, `item/reasoning/completed`) the exact-turn gate compares the event's turn ids with `activeTurnId`; a rejected event is logged as one 6-line `[CodexSegmentTurnAdmissionRejected]` block and dropped before conversion. The log has no item type and no turn ids, and nothing bounds it.

Evidence (investigation notes): 88% of the 1,963 lines and all text deltas come from 31 Aug – 2 Sep, when a `willRetry: true` error ended the turn in AutoByteus (fixed by `fb65f564f6`, v1.4.67). The 130 later lines are tool items Codex finishes after their turn ended (mostly after a Stop); the gate rightly refuses to attach them to another turn (BEH-002). The design therefore keeps the admission rule and changes only how rejections are logged (BEH-003).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: 1 new small source file (rejection accounts, ~40 lines), 4 modified source files (`codex-thread.ts` call site and flush, `codex-segment-turn-admission.ts` rejection result carries the event's turn id, `codex-thread-event-debug.ts` two log formats, `codex-thread-manager.ts` one flush call at release), focused unit tests, one doc section.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: diagnostic logging only. Admission outcomes are unchanged (REQ-001, guarded by tests). No contract, persistence, security, concurrency or ownership change: accounts are per `CodexThread`, touched only on the thread's existing single notification path; no new event reaches AgentRun or the client.
- Escalation trigger if implementation or validation discovers new impact: any change to which events are admitted; any need to change AgentRun, the converter, or the web; any test that only passes with a changed admission result.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Log parse | `probes/parse_rejections.py` | 1,727/1,963 lines on 31 Aug – 2 Sep; 0 text deltas since 3 Sep | No new product fix for text loss (DEC-005) | None |
| Rollout correlation | `evidence/residual-rollout-correlation.txt` | Residual lines = late tool items of ended turns, exact match in 43/50 runs | Keep admission (DEC-001) | 8 runs without rollouts (UNK-002) |
| Prior fix | `fb65f564f6`; `tests/unit/.../codex-thread.test.ts` l.1394–1509 | willRetry diagnostic keeps the turn active, tested | REQ-005 preserved | None |
| Gate code | `codex-thread.ts` l.254–283; `codex-segment-turn-admission.ts` | Gate runs before the handler; turn boundary notifications are not governed and always pass | Flush summaries at `turn/started`/`turn/completed` inside the thread | None |
| Release path | `codex-thread-manager.ts` `releasePreparation` | Single cleanup point clears thread registries | Flush there | None |
| Sibling shape | `codex-pending-mcp-tool-call-registry.ts`, `codex-model-call-timing.ts` | Thread composes small per-thread state classes | Same shape for rejection accounts | None |
| AgentRun pattern | `segment-lifecycle/agent-segment-rejection-log.ts` | First detailed line per turn account + count summaries at boundaries | Same semantics (DEC-002); separate implementation per layer | None |

## Intended Change

Bound and enrich the Codex gate's rejection logging: per run thread, keep one rejection account per rejected turn id (or "no turn id"); write a detailed line (with item type, the event's turn id and the active turn id) for an account's first rejection, count later ones, and write one count summary per pending account at the next turn boundary the thread sees and at thread release. Admission is unchanged.

## Change Scope (Mandatory)

- In scope: UC-001 (bounded, informative gate rejection logging) and UC-002 (the documented cause and content-loss answer, in this package and in the doc section). Areas: Codex thread gate call site, admission rejection result, Codex debug-log formats, thread release, one Codex design doc section.
- Deliberately left alone: the admission rule and its outcomes (REQ-001); the willRetry handling (REQ-005); `turn/start` re-adoption guard (`lastTerminalTurnId`); Codex converters; AgentRun segment lifecycle and its logging; web client; run memory.
- Follow-ups:
  - FU-001 (**sent** to `/project_task_manager` on 2026-10-19 at the user's request, ahead of delivery; recorded as Task autobyteus-172, depends on this Task autobyteus-165; do not resend at the delivery receipt) — Codex tool calls that finish after their turn ended (mostly after Stop). Evidence: 97 late items in 50 runs from 3 Sep – 18 Oct (rollouts). The live chat shows such a tool as `interrupted` and its later result is dropped. In 9 cases Codex sent even the tool's *start* after the Stop, so a command that ran (in one sample a `python3` script that wrote files, and an MCP `get_handoff_rules` call) was never shown and is not in history (`solution_designer_05432e34…`, turn `01a11493…`). Also unverified: a background command still open at a normal turn completion may stay "running" in the chat. Suggested Task: "Decide whether and how AutoByteus shows Codex tool calls that complete after their turn was stopped or finished".
  - FU-002 (watch; **held**, not sent: experiment A may show it belongs in this ticket. Per `/project_task_manager` (2026-10-19): decide inside autobyteus-165 if the experiment shows it belongs here; otherwise send it as its own follow-up) — `submitCodexStartInput` refuses to re-adopt a turn id equal to `lastTerminalTurnId`. If any future defect wrongly ends a running Codex turn, a later user message joins that turn and its remaining output is dropped (what happened on 31 Aug). No current trigger is known; the new detailed log line (event turn id vs active turn id) makes a recurrence visible. No action unless observed.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-003 | Operational | REQ-002, REQ-003, REQ-004; AC-001, AC-002, AC-003, AC-005, AC-006, AC-008 | Any gate rejection (SCN-001, SCN-002) | One unbounded 6-line block per event | ≤ 1 detailed line per account + boundary summaries | DS-001, DS-002 |
| BEH-002, BEH-004 | System / Contract | REQ-001; AC-004 | Late tool items; exact-turn admission | Rejected, not attached to another turn | Preserved | DS-001 |
| BEH-001 | System | REQ-005; AC-007 | willRetry error | Diagnostic, turn stays active | Preserved | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/*.py`, `evidence/*.txt` | Read-only log/rollout analysis | REQ-001, REQ-005 | Basis for keeping admission and for the logging-only change | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (diagnostic logging defect), with the content-loss question answered by an existing fix.
- Current design issue found: `Yes` (small)
- Structural triggers that fire, each with evidence: none. Checked and ruled out: *Repeated coordination* (the rejection-account semantics exist at the AgentRun layer too, but the two layers observe different events and must not import each other; sharing would couple the Codex backend to AgentRun event processors — only the semantics are mirrored, documented in both places); *Responsibility overload* (`CodexThread` gains one composed state object and two calls, as with its MCP registry and model-call timing); *Authoritative boundary* (the manager calls a public thread method, no internals).
- Root cause classification: `Missing Invariant` — the gate's diagnostic logging has no bound and lacks identifying fields; owner and boundary are right.
- Refactor needed now: `No`
- Evidence: gate code and the server.log bursts (438 consecutive blocks).
- Design response: add the bound and fields at the existing owner.
- Refactor rationale: N/A.
- Intentional deferrals and residual risk, if any: FU-001, FU-002 (Change Scope).

## Terminology

- **Rejection account**: per run thread, the count state of one rejected turn id, or of events without a turn id.
- **Turn boundary**: a `turn/started` or `turn/completed` notification handled by the thread.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the per-event log call in `CodexThread.handleAppServerNotification` and the 4-field log format.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. Accounts live in memory per thread; only server log text changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-003, BEH-004 | Codex app-server item notification | Admitted event to AgentRun, or a bounded log entry | `CodexThread` | Where rejections happen and are logged |
| DS-002 | Bounded Local | BEH-003 | Rejection / turn boundary / release | Detailed line or summary lines | `CodexThread` with `CodexSegmentTurnRejectionAccounts` | The bound and the counts |

## Primary Execution Spine(s)

- DS-001: `Codex app-server → CodexAppServerClient → CodexClientThreadRouter → CodexThread.handleAppServerNotification → exact-turn gate → (accept) notification handler → CodexAgentRunBackend converter → AgentRun | (reject) rejection accounts → server log`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The router delivers a notification to its run's thread. A turn boundary first flushes pending rejection summaries, then proceeds unchanged. A governed item event goes through the unchanged gate; if rejected, the thread records it in the account of the event's own turn id and writes the detailed line only if it is that account's first rejection | Notification, turn, item | CodexThread | Log formats |
| DS-002 | `record(turnId)` → first? detailed line : `pending += 1`. `turn/started`/`turn/completed`/release/client close → `takeSummaries()` returns accounts with `pending > 0` and resets them → one summary line each. Accounts live as long as the thread, so a turn never gets a second detailed line | Rejection account | CodexThread | — |

## Spine Actors / Main-Line Nodes

`CodexClientThreadRouter`, `CodexThread`, exact-turn gate (`resolveCodexSegmentTurnAdmission`), `CodexThreadManager` (release).

## Ownership Map

- `CodexThread`: owns the gate call, its rejection accounts instance, the moments to flush (turn boundaries, client close) and a public flush method for release.
- `CodexSegmentTurnRejectionAccounts` (new): owns per-account counts and the first/pending rule. No I/O.
- `resolveCodexSegmentTurnAdmission`: unchanged rule; its rejection result now also returns the rejected event's turn id.
- `codex-thread-event-debug.ts`: owns the two log formats.
- `CodexThreadManager.releasePreparation`: calls the thread's flush before clearing it.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Unconditional per-event `logCodexSegmentTurnAdmissionRejection` call | Replaced by account-gated detailed line | DS-002 | In This Change | Same function, extended fields |

## Return Or Event Spine(s) (If Applicable)

N/A — no new events.

## Bounded Local / Internal Spines (If Applicable)

- DS-002, parent `CodexThread`: `rejection → accounts.record(eventTurnId) → (true) detailed line | (false) pending+1`; `turn boundary | release | client close → accounts.takeSummaries() → summary line per pending account`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `CodexSegmentTurnRejectionAccounts` | DS-002 | CodexThread | Count state and first/pending rule | REQ-002/004 | Inline maps in `CodexThread` would grow an already large file with another concern |
| Log formats in `codex-thread-event-debug.ts` | DS-002 | CodexThread | Detailed and summary line shapes | REQ-003 | — |

## Ownership Boundaries

The manager uses only `CodexThread.flushSegmentTurnRejectionSummaries()`; it never touches the accounts object. The accounts object has no logger and no knowledge of Codex events.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThread` | `CodexSegmentTurnRejectionAccounts` | `CodexThreadManager`, router | Manager reading the accounts | Add a thread method |

## Dependency Rules

- `codex/thread/codex-thread.ts` may import `codex-segment-turn-rejection-accounts.ts` and `events/codex-thread-event-debug.ts` (already does).
- `codex-segment-turn-rejection-accounts.ts` imports nothing beyond the standard library.
- The Codex backend must not import `agent-execution/events/processors/segment-lifecycle/*` (layer rule; semantics mirrored, not shared).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CodexSegmentTurnAdmission` rejection variant `{ accepted: false; reason; eventTurnId: string \| null }` | rejected event | reason + the event's own turn id | first explicit turn id (trimmed), or null when none/invalid | Accepted variant unchanged |
| `CodexSegmentTurnRejectionAccounts.record(turnId: string \| null): boolean` | account | returns true for the account's first rejection; otherwise counts | turn id or null | |
| `CodexSegmentTurnRejectionAccounts.takeSummaries(): { turnId: string \| null; count: number }[]` | accounts | pending counts, reset to 0 | — | Accounts kept |
| `CodexThread.flushSegmentTurnRejectionSummaries(): void` | thread | take + log summaries | — | Called by thread at boundaries/client close and by manager at release |
| `logCodexSegmentTurnAdmissionRejection(input)` | log line | `[CodexSegmentTurnAdmissionRejected] { runtimeKind, runId, nativeEventName, reasonCode, itemType, turnId, activeTurnId }` | — | Modify |
| `logCodexSegmentTurnAdmissionRejectionSummaries(context, summaries)` | log line | `[CodexSegmentTurnAdmissionRejectedSummary] { runtimeKind, runId, turnId, count }` | — | Add |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `record` / `takeSummaries` | Yes | Yes | Low | — |
| rejection `eventTurnId` | Yes | Yes | Low | Named `eventTurnId` to distinguish from the active turn |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Accounts | `CodexSegmentTurnRejectionAccounts`, file `codex-segment-turn-rejection-accounts.ts` | Yes (matches `codex-segment-turn-admission.ts`) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Log formats | `codex/events/codex-thread-event-debug.ts` | Extend | Existing owner of this line | — |
| Account state | AgentRun segment state accounting | Create New (small) | Different layer; importing AgentRun processors into the Codex backend would invert dependencies | Codex thread is the owner of its gate |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/codex/thread` | Gate, accounts, flush moments, release | DS-001, DS-002 | CodexThread | Extend | |
| `backends/codex/events` | Log formats | DS-002 | CodexThread | Extend | |

## Draft File Responsibility Mapping

See final mapping.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | — | — | — | — | — | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `{ turnId: string \| null; count: number }` summary | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex/thread/codex-segment-turn-rejection-accounts.ts` (Add) | codex/thread | accounts | Count state, first/pending rule | One small state class | — |
| `codex/thread/codex-segment-turn-admission.ts` (Modify) | codex/thread | gate rule | Rejection carries `eventTurnId` | Existing | — |
| `codex/thread/codex-thread.ts` (Modify) | codex/thread | CodexThread | Account-gated logging, flush at boundaries/client close, public flush | Existing | accounts |
| `codex/events/codex-thread-event-debug.ts` (Modify) | codex/events | log formats | Detailed line fields; summary format | Existing | — |
| `codex/thread/codex-thread-manager.ts` (Modify) | codex/thread | release | Call `flushSegmentTurnRejectionSummaries()` before clearing the thread | Existing | — |

## Applied Patterns (If Any)

Small per-owner state object (as the MCP registry).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-segment-turn-rejection-accounts.ts` | File | accounts | as above | Next to the gate | Logging, Codex event parsing |
| `.../codex/thread/codex-segment-turn-admission.ts` | File | gate | + `eventTurnId` on rejection | — | Logging |
| `.../codex/thread/codex-thread.ts` | File | CodexThread | gate call site, flush | — | Count maps inline |
| `.../codex/events/codex-thread-event-debug.ts` | File | log formats | two formats | — | State |
| `.../codex/thread/codex-thread-manager.ts` | File | release | one flush call | — | — |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-segment-turn-rejection-accounts.test.ts` (Add); `codex-thread.test.ts` (Modify: AC-001..AC-004, AC-006, AC-008); `codex-thread-manager.test.ts` (Modify: AC-005) | Tests | — | ACs | — | — |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` (Modify) | Doc | — | Short "Exact-turn admission rejections" section: what is rejected (incl. late tool items after a Stop/turn end), that they are dropped, and the bounded log lines | Area contract | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/codex/thread` | Main-Line Domain-Control | Yes | Low | Gate and its accounts together |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Whole-turn rejection | No active turn; 438 governed events of T → 1 `[CodexSegmentTurnAdmissionRejected] { …, reasonCode: INACTIVE, itemType: "agentMessage" or null for deltas, turnId: T, activeTurnId: null }`; `turn/started(U)` → 1 `[CodexSegmentTurnAdmissionRejectedSummary] { turnId: T, count: 437 }` | 438 blocks (today) | AC-001 |
| Late tool items | Active U; late `item/completed(commandExecution)` of T1, T2, T3 → 3 detailed lines (CONFLICT, `activeTurnId: U`), no summaries | One shared "late items" account hiding which turns | AC-002, AC-006 |
| Late events after a summary | T's account warned and summarized; 2 more T events → no new detailed line; next boundary → `{ turnId: T, count: 2 }` | A second "first" line for T | AC-008 |
| Release | 5 pending for T; run closed → manager release → 1 summary `{ T, 5 }` | Counts dropped on release | AC-005 |
| Item type | `itemType` = `params.item.type` as sent (e.g. `commandExecution`, `mcpToolCall`, `agentMessage`); `null` when the event has no `item` (`item/agentMessage/delta`) | Logging the item's content | REQ-003; no user content in logs |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep per-event logging behind a debug flag | Raw visibility | Rejected | `RUNTIME_RAW_EVENT_DEBUG`/`CODEX_THREAD_EVENT_DEBUG` already log raw events when needed |

## Derived Layering (If Useful)

N/A

## Change / Refactor Sequence

1. Add `CodexSegmentTurnRejectionAccounts` with unit tests (first/pending, summaries reset, accounts kept, null account).
2. Add `eventTurnId` to the admission rejection (first explicit trimmed id; null for none or EXPLICIT_INVALID).
3. Extend the detailed log format and add the summary format.
4. In `CodexThread`: own an accounts instance; on rejection `record` and log only when first; at `turn/started`/`turn/completed` (before normal handling) and in `handleClientClosed`, flush; add public `flushSegmentTurnRejectionSummaries()`.
5. Call the flush in `CodexThreadManager.releasePreparation` before `clearListeners()`.
6. Thread and manager unit tests (AC-001..AC-006, AC-008); doc section.
7. `pnpm -C autobyteus-server-ts test:unit` and `typecheck` (AC-007), plus the Codex thread/event integration tests that exist (`tests/integration/runtime-execution/codex-app-server/...` that run without a live Codex).

## Key Tradeoffs

- Accounts per rejected turn id (not per reason): one line identifies the turn; the reason of later rejections of the same turn is only counted. Acceptable: a turn's rejections share one cause in the evidence.
- Mirrored rather than shared accounting with AgentRun: avoids a cross-layer import for ~40 lines.

## Risks

- A thread with very many distinct rejected turns keeps one small account each for its lifetime (bounded by turns; same trade as AgentRun).
- FU-001/FU-002 residuals (Change Scope).

## Guidance For Implementation

- Do not change any accept/reject result; keep existing gate tests green and add the `eventTurnId` assertions.
- Log only ids and the item type; never item text, command or arguments.
- Use `vi.spyOn(console, "warn")` in tests as existing Codex tests do; assert exact line counts.
- Keep TESTING.md isolation; no live Codex is needed for these ACs.
