# Design Review Report — autobyteus-434

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/requirements-doc.md` (Approved, SR-001; unchanged)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/design-spec.md` (SR-004, status `Ready`)
- Supplemental Task Artifacts Reviewed: `handoff-sr-004.md`, `follow-ups.md` (FU-001, FU-002), `evidence/repro/phone-live-repro.mjs` (evidence only, unchanged)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer handoff for SR-004, the revision for ARCH-REV-002 (2026-11-08)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Fail: AR-001 (c))
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/phone-live-updates-434` at `eebbc2b8ee`, no product change. Rounds 1–2 read the four stream owners, their stores, the run open, hydration and history-read paths, the server stream handlers and the memory recorder chain. Round 3 re-checked `agentRunStore.ts:293-375` (connect and disconnect: the map entry is deleted on disconnect), `runHistoryLoadActions.ts:288-345`, and `AgentStreamingService.ts:117-127, 258-267`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: about 12 production files in two packages, within existing owners. Risk comes from the lifecycle of four live run streams, the agent catch-up that replaces a live conversation, and additive persisted fields.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - REQ-001: never give up while visible, ≤ 30 s between attempts, catch up without user action, on all four stream kinds, desktop and phone.
  - REQ-002: on resume or `online`, attempt at once; after ≥ 30 s hidden, re-sync; no retry while hidden.
  - REQ-004: identity on external-runtime user records.
  - REQ-005: everything else is preserved.
- Relevant existing behavior and evidence confirmed: rounds 1–2 plus the history-read reconnect path (`runHistoryLoadActions.ts:147, 323-329`; desktop 5 s poll `RunSectionPanel.vue:387`, `useRunHistorySectionLoad.ts:50`; phone list and resume reads `:60-66`).
- Scope guardrail confirmed: in scope UC-001…003. Out of scope: 403/416, heartbeat (FU-001), old records, Android shell, new UI. Preserved: BEH-001/002/006/007/008, REQ-005.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`. None remain.
- Statements about existing code the design relies on: verified across rounds. The round-2 inaccuracy (the "active-run recovery" caller) is corrected and the dead code is recorded as FU-002.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass (Team/Org/collaboration snapshot; agent catch-up before open through every connect entry) | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (every success point calls `connected()`, so owner-opened streams re-sync) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass (DS-004) | Confirmed | — |
| BEH-006, 007, 008 | — | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope Clear? | Linked? | Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro/phone-live-repro.mjs` + runs | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| `follow-ups.md` FU-001, FU-002 | Pass | Pass | Pass | Pass | Pass | Solution Designer sends them when the ticket leaves the team |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | Bug fix; triggers listed with citations | — |
| Root cause explicit and evidence-backed | Pass | Duplicated retry policy ×3; identity not written | — |
| Refactor decision explicit | Pass | Yes, bounded | — |
| Supported by concrete sections | Pass | Per-owner table, Agent Connect Rule, bounded local spine, file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner Clear? | Naming Clear? | One Owner Per Node, In Call Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary | Pass | Pass: the timer, a page resume, or a connect request during a loss streak each lead to the attempt; every exit ends in one scheduler call | Pass | Pass | Pass (`AgentRunStreamReconnection` drives load → commit → open) | Pass | Pass |
| DS-004 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stream owners → scheduler | Pass | Pass | Pass | Pass | Stores call owner methods only |
| `agentRunStore.connectToAgentStream` → `AgentRunStreamReconnection.requestConnect()` | Pass | Pass | Pass | Pass | One connect entry. Its state rule gives the open path and the history read the correct result each |
| Accumulator → writer | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `liveStreamLifecycle` | Pass | Pass | Pass | Pass | DOM and timers only |
| `AgentRunStreamReconnection` → service, loader, stores, overlay | Pass | Pass | Pass | Pass | The transport does not reach hydration |
| `agentRunStore` → factory | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Scheduler (`connectionLost`, `connected`, `startOver`, `attemptNow`, `isRecovering`, `dispose`) | Pass | Pass | N/A | Low | Pass |
| `subscribePageResume`, `isPageVisible` | Pass | Pass | N/A | Low | Pass |
| `createAgentRunStream`; `AgentRunStreamReconnection.requestConnect/dispose` | Pass | Pass | Pass | Low | Pass |
| `AgentStreamingService.dropConnection(reason)`; open/loss notifications | Pass | Pass | N/A | Low | Pass |
| `loadRunStoredState(runId, defaults)` | Pass | Pass | Pass | Low | Pass |
| `RuntimeMemoryUserTraceInput.messageId?/dedupeKey?` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

All `Pass`: one scheduler replaces three copies; a page-signal module; a narrow loader extracted from the full loader (one projection reader); the commit reuses the `memberLoader` steps; `RawTraceItem` identity reused.

## Subsystem / Capability-Area Allocation Verdict

All `Pass`: `services/liveStreamLifecycle/` (new), `services/agentStreaming/` (extend), `services/runHydration/` (extend), Org and collaboration services (extend), server `agent-memory` (extend).

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict |
| --- | --- | --- | --- | --- |
| Retry scheduling ×3 | Pass | Pass | Pass | Pass |
| Projection + file-change read | Pass | Pass | Pass | Pass |

## Shared Structure / Data Model Tightness Verdict

All `Pass`: scheduler options; a `loadRunStoredState` result with no config; identity only on the user trace variant.

- Derived consumers of the changed stored structure (Principle 11): `Pass`.
- Vocabulary (Principle 15): `Pass`. *Run stream*, *page resume*, *success point*, *catch-up* and *re-synchronize* are each defined once.

## File Responsibility Mapping Verdict

All `Pass`. The size constraints are explicit: `agentRunStore.ts` does not grow (515), `TeamStreamingService.ts` stays ≤ 500 lines with a named extraction, and `agentOrgStreamingService.ts` gets shorter. One stale line: the `agentRunStore.ts` row still says "`startOver()` on owner connect", which the Agent Connect Rule supersedes (`requestConnect()`). See N-8.

## Subsystem / Folder / File Placement Verdict

All `Pass`.

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `WebSocketClient` reconnect machinery, `RECONNECTING`, dead `autoReconnect` | Pass | Pass | Pass | Pass | Readers verified (transport, types, tests only) |
| Org and collaboration scheduling fields | Pass | Pass | Pass | Pass | `requestRecovery` → `isRecovering()` |
| Duplicate projection read | Pass | Pass | Pass | Pass | — |
| Give-up / `RECONNECTING` tests | Pass | Pass | Pass | Pass | DESIGN.md rule 11 |
| `activeRunRecoveryCoordinator.ts` (outside touched files) | Pass | N/A | Pass | Pass | FU-002 with grep evidence (Principle 7) |

## Legacy / Backward-Compatibility Verdict

All `Pass`: no wrappers or dual paths. The tolerant raw-trace reader is not legacy code.

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| External-runtime user raw-trace records | Directly Usable — No Migration | Pass (`raw-trace-item.ts:72-75, 101-104`; normalizer `:76-78`; real identity-less records load) | Pass | N/A | Pass | DESIGN.md rule 7 holds |

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass | N/A | Pass | Pass. Step 5 covers P-004, P-005, N-6 and N-7. Step 6 covers the Org/collaboration success point, the report, retrying, `requestRecovery`/`connect` during a wait, the re-sync, and error clearing |

## Example Adequacy Verdict

| Topic | Needed? | Present And Clear? | Bad Shape Explained? | Verdict |
| --- | --- | --- | --- | --- |
| Org adoption | Yes | Pass | Pass | Pass |
| Agent catch-up | Yes | Pass | Pass | Pass |
| Agent Connect Rule (state → result table) | Yes | Pass | Pass | Pass |
| Hidden page; owner connect during a wait | Yes | Pass | Pass | Pass |

## Material Premise Validation

| Premise | Round | Status | Resolution |
| --- | --- | --- | --- |
| P-001: live deltas during a post-connect fetch | 1 | No longer applies | The catch-up runs before open (DS-003) |
| P-002: open-then-1011 loop at a 0 s step | 1 | Resolved | First wait 1 s |
| P-003: Org/collaboration failure before the snapshot | 1 | Resolved | Success point at snapshot accepted; pre-success failures count |
| P-004: a history read connects a waiting agent stream without catch-up | 2 | Resolved | Agent Connect Rule: `waiting` → `attemptNow()` (catch-up then open); `held`/`attempting`/`connected` → nothing; only `idle` → plain connect. Step-5 test |
| P-005: an owner-opened agent stream leaves the scheduler `idle` | 2 | Resolved | Every agent socket open calls `connected()`. Step-5 test |

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`. The behavior basis is confirmed and every prior finding is resolved and verified against the code. No in-scope machinery depends on an unsupported premise.

## Findings

None blocking.

Non-blocking notes for implementation:

- N-8: two stale wordings. (1) The `agentRunStore.ts` row in Final File Responsibility Mapping says "`startOver()` on owner connect". (2) The common rule "a store connect request starts a connection at once and cancels the wait". For agent streams, the Agent Connect Rule is authoritative: `requestConnect()` decides per state, and `waiting` → catch-up attempt. Implement the rule, not the older wording.
- N-9: when the open path finds the reconnection `waiting`, it hydrates and then `requestConnect()` loads again (the design accepts this as harmless). Keep it as stated; do not add a "just hydrated" flag unless validation shows a cost.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer gets an informational notice.

## Residual Risks

- Agent read-to-open window: events between the catch-up read and the socket open (one round trip) are not shown until the next catch-up or open. This equals today's open path, and the design's escalation trigger covers it.
- ASM-001 / RSK-002: Android WebView `visibilitychange` on background and screen-off. Validate on the emulator.
- FU-001: a screen-on silently dead stream stays undetected (out of scope).
- DEC-003: a desktop window hidden ≥ 30 s re-syncs every kept stream on becoming visible. Watch the cost with many kept runs.
- In-progress segment at catch-up: the open path behaves the same way today, and the catch-up inherits it.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-003` on SR-004; `task_size: Medium`, `architectural_risk: High`.
