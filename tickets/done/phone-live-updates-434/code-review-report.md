# Code Review Report — autobyteus-434

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (through the design spec's citations)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `evidence/repro/phone-live-repro.mjs` (R7 added), `follow-ups.md` (FU-001…FU-003)
- Relevant Solution Revision IDs: SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 (Medium / High → code review)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`, branch `codex/phone-live-updates-434`, range `eebbc2b8ee..d5f0735904`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. 18 production files in two packages, all within existing owners. It changes the connection lifecycle of all four run streams and replaces a live agent conversation from the stored state, so the risk stays `High`. No correction.

## Review Scope

- Changed implementation and behavior reviewed: the reconnect scheduler and page-resume signal; `WebSocketClient` reduced to a plain socket; scheduler adoption in Team, agent (new `AgentRunStreamReconnection`), Org and collaboration; the agent Connect Rule in `agentRunStore`; the `runStoredStateLoader` extraction; the `teamSendAdmission` extraction; server identity on external-runtime user records.
- Files / areas reviewed: every production file in the range (listed in the size audit); the new and rewritten specs (`liveStreamReconnectScheduler.spec.ts`, `agentRunStreamReconnection.spec.ts`, `TeamStreamingService.reconnect.spec.ts`, `agentRunCollaborationStreamingService.reconnect.spec.ts`, `agentOrgRetainedRecovery.spec.ts`, `agentOrgStreamingService.spec.ts`, `WebSocketClient.spec.ts`, server `external-runtime-user-message-identity.test.ts`); evidence IMP-01, IMP-11, IMP-12.
- Callers traced: `connectToTeamStream`, `replaceFailedTeamStream`, `disconnectTeamStream` (`agentTeamRunStore.ts:98-206`); `connectToAgentStream`, `ensureAgentStreamConnected`, `disconnectAgentStream` (`agentRunStore.ts:294-366`); `reconcileRetainedHistory` → `requestRecovery` (`agentOrgContextsStore.ts:216-222`); `memberLoader.ts:110-141` (the commit sequence the agent catch-up copies); every `new AgentStreamingService`/`new TeamStreamingService`/`.disconnect()` site in `autobyteus-web` (the agent service is built only by `createAgentRunStream` and disconnected only by `disconnectAgentStream`).
- Checks not rerun: everything in the handoff's Checks Run table ran on `feb69495a5`. `d5f0735904` changes only the ticket folder, and no finding needs a new check.
- Explicit exclusions: evidence logs and screenshots (read as evidence, not as source); the probe script (evidence only).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001 (never give up while visible, ≤ 30 s), REQ-002 (resume attempts, re-sync after ≥ 30 s hidden, nothing while hidden), REQ-004 (identity on stored user records), REQ-005 (preserve the rest).
- Design-spec behavior map verified against the implementation: Yes. The Per-Owner table, the Agent Connect Rule and the scheduler's transitions are implemented as written, apart from the two decisions reviewed below (D-1, D-2).
- Design review report and round confirmed: ARCH-REV-003 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Dispatch path untouched; R1 40–47 ms (IMP-12) | — |
| BEH-002 | Confirmed | Team/Org/collab: scheduler attempt → snapshot → `connected()`. Agent: `AgentRunStreamReconnection.attempt` → `loadRunStoredState` → `commitStoredState` (same steps as `memberLoader.ts:122-141`) → `service.connect`. R2 7.2 s (IMP-12) | — |
| BEH-003 | Confirmed | `LiveStreamReconnectScheduler.connectionLost` uses `RECONNECT_DELAYS_MS` (last step repeats) and has no give-up. Each owner calls it from its loss and failed-attempt paths. R3: attempts at +1, 3, 7, 15, 31, 61 s, shown by itself (IMP-12) | — |
| BEH-004 | Confirmed | `pageResumeSignal` → `handleResume`: `waiting`/`held` → `attemptNow`; `connected` with `hiddenForMs ≥ 30 000` → owner `resynchronize`. A timer that fires while hidden → `held`. R7: no socket opened while hidden, event shown 104 ms after visible (IMP-12) | — |
| BEH-005 | Confirmed | `recordForwardedUserMessage` passes `normalizeAcceptedInputIdentity(metadata)` → writer user branch → `RawTraceItem`. R6 one copy, `hasMessageId: true` (IMP-12); old record still loads (IMP-02) | — |
| BEH-006/007/008 | Confirmed | Untouched paths; server suite incl. route-policy tests green (IMP-03) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, 008 | User | Phone user | Watch a running run | Run screen | Normal | DS-001 | Live events | R1 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, 003 | System | Network / node | Path drops > 30 s and returns while the page is visible | Run screen open | Normal | DS-002 → owner attempt → catch-up | Catches up without the user | R3 | Supported Normal Scenario | Use |
| SCN-003 | BEH-004 | User | Phone user | Come back after sleep or background | `visibilitychange` / `online` | Normal | DS-002 resume branch | Current within 5 s | R7 | Supported Normal Scenario | Use |
| SCN-004 | BEH-005 | User | User | Load a run during the turn his message started | Open / reload | Normal | DS-004 | One copy, in place | R6 | Supported Normal Scenario | Use |
| CTR-1 | P-004 | Contract | History read (`reconcileDiscoveredActiveRuns`) / open path | Connect request during a loss streak | `connectToAgentStream` | Normal | `requestConnect()` | Catches up; never a plain connect | `runHistoryLoadActions.ts:288-345`; spec "a history read during a wait…" | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 (D-1) | The agent `attempt` returns with no scheduler call when the socket is no longer `DISCONNECTED` after the load. The design (N-7) lists `startOver()` here. | Agent Connect Rule (N-7) | None in production: `connectToAgentStream` is the only connect entry and does nothing while `attempting` | If a socket were started, its own open calls `connected()` and its loss calls `connectionLost()`. A `startOver()` after an open that already happened would reset a connected stream to `idle` and lose the P-005 re-sync | `agentRunStreamReconnection.ts:93-95`; spec "N-7: a socket started during the load…" | Reject (as a finding) | — | The deviation is correct and keeps N-7's intent: every exit ends in one scheduler call, and here the socket's own open or loss is that call. A defensive branch with a documented reason. No action. |
| C-2 (D-2) | A Team candidate stream gets no retry before readiness. After promotion its snapshot made it `connected`, so it reconnects like a kept stream. | Design Per-Owner row "Team candidate stream: no scheduler" | `replaceFailedTeamStream` | Before readiness: `handleDisconnect` returns before `connectionLost` and fails the candidate (10 s timeout unchanged). After promotion: a loss leads to `connectionLost` → `attemptReconnect` (`teamRunId` and `teamContext` were set by `prepareConnection`). A failed candidate is `disconnect()`ed, which disposes its scheduler | `TeamStreamingService.ts:111-127, 268-275, 327`; `agentTeamRunStore.ts:180-197`; spec "a candidate stream is not retried before readiness" | Reject (as a finding) | — | Matches the design. Without it, a promoted stream would lose the old transport's retries entirely. No action. |
| C-3 (D-3) | `loadRunStoredState` is split into `readRunStoredState` and `buildRunStoredState` | Design "one projection reader" | Open path; agent catch-up | Both read through `readRunStoredState`; the full loader still reads in parallel with the resume config | `runStoredStateLoader.ts`; `runContextHydrationService.ts:34-107` | Reject (as a finding) | — | Still one reader with no added policy, and it avoids a latency regression on the open path. No action. |
| C-4 (D-4) | Org and collaboration tests rewritten (1 s first retry, no give-up, `requestRecovery` during a streak defers to the scheduler) | DESIGN.md rule 11; design Per-Owner Org row | — | The tests now observe the behavior the design approves. RET-04 still proves that a duplicate history reconcile starts no second recovery and that the stream recovers later | `agentOrgRetainedRecovery.spec.ts` diff | Reject (as a finding) | — | Correct per rule 11. |
| C-5 | Agent catch-up read hangs on a silently dead pooled HTTP connection (FU-003). The scheduler stays `attempting`, and a run re-open's `requestConnect()` also does nothing until that read fails | SCN-002 / SCN-003 | Only with a connection that stays dead while new connections work (the harness's permanent blackhole, IMP-11) | Agent stream not reconnected until the OS fails the read | IMP-11 (Team member reload, permanent blackhole only); R3 (`refuse` outage) and R7 (WebSocket blackholed) both recover | Reject (as a finding) | Follow-up (FU-003, extended) | Under a realistic outage the consequence is not shown: a dead connection is answered with a reset, and R3 recovers. Not approved scope (no read-timeout policy). I added the re-open consequence to FU-003. The AC-002 agent-run probe and the AC-003 emulator check in API/E2E are where this would show. |
| C-6 | Collaboration `recoveryFailed` returns early when `!isCurrent()` without `startOver()`. The handoff (Known Risks) says it stops "now explicit (startOver)" | Existing ownership rule (node switched) | A node switch while the collaboration view is kept | The scheduler can stay `connected`/`attempting`. A later resume → `resynchronize` → `attempt` → `!isCurrent()` → `startOver()`. No socket opens and nothing visible changes | `agentRunCollaborationStreamingService.ts:76-80, 273-278` | Reject | — | No consequence. Only the handoff wording is slightly inexact: the stop is explicit in `attempt`, not in `recoveryFailed`. |
| C-7 | Agent success point is the socket open, so a node that accepts and then closes at once (retryable) would retry every 1 s | Design AR-002(a)/P-002 | No supported node behavior closes an accepted agent stream with a retryable code while healthy (run not found is 4004, non-retryable) | — | `agent-stream-handler.ts` per the design read | Reject | — | Unsupported/contrived; accepted by the design. |
| C-8 | An orphaned stream (store map entry dropped without `disconnect()`) would retry forever now that the give-up is gone | — | None found: every removal from the maps calls `disconnect()` (`agentRunStore.ts:358-366`, `agentTeamRunStore.ts:200-206`, `agentOrgContextsStore.ts:92-93`, `agentRunCollaborationStore.ts:130, 149-150` with the service's own `disconnect()` after `onInactive`). The agent and Team attempts also end `idle` when their context is gone | — | Code read | Reject | — | Not reachable. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Duplicated Policy (three retry copies removed, one scheduler) + Local Defect (identity), as designed | — |
| Implementation matches approved behavior-defining supplements | Pass | No behavior-defining supplements; the probe is evidence | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-002 is a single state machine in `liveStreamReconnectScheduler.ts`. DS-003 is one owner (`AgentRunStreamReconnection.attempt`): load → commit → open. DS-004 is the accumulator → writer → `RawTraceItem` chain | — |
| Ownership boundary preservation and clarity | Pass | The scheduler owns *when* and holds no socket. Owners keep *how*, their success point and their catch-up. The transport no longer retries | — |
| Off-spine concern clarity | Pass | `pageResumeSignal` serves only schedulers; `runStoredStateLoader` serves the open path and the catch-up | — |
| Existing capability reuse | Pass | Reuses `overlayPendingUserMessages`, the `memberLoader` commit steps, `normalizeAcceptedInputIdentity`, `RawTraceItem` identity fields | — |
| Reusable owned structures | Pass | One scheduler replaces three copies; one projection reader | — |
| Shared-structure tightness | Pass | Scheduler options are three callbacks. `RunStoredState` has no config. `PendingTeamSend` lost its unused `messageId`/`dedupeKey` fields. Identity is optional on the user trace variant only | — |
| Repeated coordination ownership | Pass | Retry policy has one owner; no owner keeps a counter or timer | — |
| Empty indirection | Pass | `createAgentRunStream` builds both objects and owns their pairing; `loadRunStoredState` composes the two steps for the catch-up | — |
| Separation of concerns / file responsibility | Pass | `teamSendAdmission.ts` is the design-named extraction; `TeamStreamingService.ts` 446 → 418 non-empty lines | — |
| Ownership-driven dependencies | Pass | `liveStreamLifecycle/*` imports nothing from the app. `AgentStreamingService` imports no hydration. The reconnection depends on what the design lists | — |
| Authoritative Boundary Rule | Pass | Stores reach schedulers only through owners. `agentRunStore` uses `reconnection.requestConnect()`/`dispose()` plus the service API it already used, and never touches the scheduler. No caller bypasses a boundary | — |
| File placement | Pass | `services/liveStreamLifecycle/`, `services/agentStreaming/agentRunStreamReconnection.ts`, `services/runHydration/runStoredStateLoader.ts` as designed | — |
| Flat-vs-over-split layout | Pass | Two-file lifecycle folder; no artificial splitting | — |
| Interface boundary clarity | Pass | `onDisconnect(reason, retryable)`; `onConnectionChange` (notifications only); `dropConnection(reason)`; `requestConnect()`; `isRecovering()` | — |
| Naming / one vocabulary | Pass | "re-synchronize", "catch-up", "success point", "page resume" are used as defined in the design's Terminology, in code comments and in identifiers | — |
| No unjustified duplication | Pass | The agent commit repeats the six `memberLoader` steps, as the design directs (different subject: standalone run vs Team member with live-tool reconciliation) | — |
| Patch-on-patch complexity | Pass | Clean replacement; no layering over the old transport retry | — |
| Dead code removed in touched files | Pass | Full removal list verified (the `RECONNECTING`/options/counters/timers grep is empty). Unused `AgentRuntimeKind` import and `disconnectAgentStream` locals removed | — |
| Test scenarios clear and requirement-aligned | Pass | Scheduler spec covers every transition in the bounded local spine. Per-owner specs name AC/P/N IDs. AR-001(a), P-004 (through the store), P-005, N-6 and N-7 are each covered | — |
| Test fixtures/helpers reusable and coherent | Pass | `pageVisibilityTestControl.ts`, `fakeSocketClient.ts` shared across specs | — |
| No stale or compatibility-only tests | Pass | Give-up and `RECONNECTING` tests rewritten or removed (rule 11) | — |
| API/E2E readiness | Pass | Builds green (IMP-13). The agent-run phone probe (AC-002), the durable mobile-shell cases and the emulator check (ASM-001) are clearly handed on | — |

## Source File Size And Structure Audit

| Source File | Non-Empty Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `web/services/liveStreamLifecycle/liveStreamReconnectScheduler.ts` | 0 | 111 | Pass | Pass (+128) | One state machine | Correct | Pass | — |
| `web/services/liveStreamLifecycle/pageResumeSignal.ts` | 0 | 55 | Pass | Pass | One DOM concern | Correct | Pass | — |
| `web/services/agentStreaming/agentRunStreamReconnection.ts` | 0 | 141 | Pass | Pass (+151) | DS-003 owner + factory | Correct | Pass | — |
| `web/services/agentStreaming/teamSendAdmission.ts` | 0 | 80 | Pass | Pass | Pending Team sends | Correct | Pass | — |
| `web/services/runHydration/runStoredStateLoader.ts` | 0 | 76 | Pass | Pass | One reader | Correct | Pass | — |
| `web/services/agentStreaming/TeamStreamingService.ts` | 446 | 418 | Pass | Pass (+47/−77) | Team stream | — | Pass | — |
| `web/services/agentStreaming/AgentStreamingService.ts` | 314 | 340 | Pass | Pass (+33/−2) | Agent socket | — | Pass | — |
| `web/services/agentStreaming/transport/WebSocketClient.ts` | 177 | 113 | Pass | Pass (+18/−95) | Plain socket | — | Pass | — |
| `web/services/agentStreaming/transport/types.ts`, `transport/index.ts`, `agentStreaming/index.ts` | 44 / 7 / 28 | 36 / 6 / 28 | Pass | Pass | Types/exports | — | Pass | — |
| `web/services/agentOrgExecution/agentOrgStreamingService.ts` | 490 | 483 | Pass | Pass (+37/−45) | Org stream | — | Pass | — |
| `web/services/agentCollaboration/agentRunCollaborationStreamingService.ts` | 263 | 278 | Pass | Pass (+41/−24) | Collab stream | — | Pass | — |
| `web/services/runHydration/runContextHydrationService.ts` | 177 | 128 | Pass | Pass (+13/−66) | Full hydration | — | Pass | — |
| `web/stores/agentRunStore.ts` | 452 | 448 | Pass | Pass (+22/−31) | Agent run store | — | Pass | — |
| `server/src/agent-memory/` (3 files) | 114 / 277 / 149 | 117 / 282 / 151 | Pass | Pass | Recorder / types / writer | — | Pass | — |

Physical line counts also meet the design's constraints: `agentRunStore.ts` 515 → 506, `TeamStreamingService.ts` 486 → 456, `agentOrgStreamingService.ts` 524 → 516.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | Transport retry, `RECONNECTING` and the Org/collab counters and timers removed |
| Dead code removed in touched files | Pass | See the structural check |
| Persisted-data decision followed without unnecessary migration | Pass | `Directly Usable — No Migration`. The writer adds optional keys. IMP-02 loads an identity-less record next to a new one |
| No version-specific dual reads/writes or fallback | Pass | — |
| Transition mechanics match the design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `No` (beyond delivery's normal check)
- Why: no API, protocol, UI or configuration change; the stream lifecycle is documented in code comments and the design spec.
- Files or areas likely affected: delivery may check whether any web streaming doc mentions "max reconnection attempts" (none found in the source grep).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (catch-up while socket closed, no revision guard) | Confirmed | `attempt` loads, commits, then opens; spec AR-001(a) |
| P-002 (no 0 s step) | Confirmed | `RECONNECT_DELAYS_MS[0] = 1_000` |
| P-003 (failure before success point counts) | Confirmed | Team/Org/collab `connected()` only at snapshot; per-owner specs |
| P-004 (connect during a loss streak catches up) | Confirmed | `requestConnect` switch; store-level spec |
| P-005 (every agent open is the success point) | Confirmed | `onConnectionChange('opened')` → `connected()`; spec |

No new or reclassified premise. C-5 is recorded in the candidate gate as a follow-up.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-002 and DS-003 each have one readable owner, implemented exactly as spined | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | When vs how is split cleanly; the transport is reduced to a socket; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Small explicit interfaces (`retryable` flag, `requestConnect`, `dropConnection`, `isRecovering`) | `RunProjectionPayload` stays exported though only its own file uses it (trivial) | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Design-named extractions; all touched files shrank or stay well under limits | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One scheduler, one reader, tight result types | The agent commit repeats the `memberLoader` steps (designed, different subject) | A later shared commit helper could be considered if a third copy appears |
| 6 | Naming Quality and Local Readability | 9.3 | Names follow the design's Terminology; comments explain why | The handoff's wording on collaboration `startOver` (C-6) is slightly inexact | — |
| 7 | API/E2E Readiness | 9.3 | Builds, suites and the repro are green; remaining probes clearly named | The agent-run phone path (AC-002) is validated only by unit tests so far | API/E2E's agent-run probe |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | All transitions traced for four owners; exits of the agent attempt verified; R3/R6/R7 fixed | FU-003 dependency on the agent path (C-5), out of scope | FU-003 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut; give-up tests rewritten, not kept | — | — |
| 10 | Cleanup Completeness | 9.5 | Full removal list verified by grep; dead locals/imports removed | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None new. I extended FU-003 with the re-open consequence on the agent path (C-5).

## Classification

N/A (Pass).

## Recommended Recipient

API/E2E (primary pass rule); implementation notified (informational pass rule).

## Residual Risks

- Agent read-to-open window (accepted in the design): not yet observed on the agent path. API/E2E's AC-002 agent-run probe should look for a missing event right after a reconnect.
- FU-003 (C-5): on the agent path, a catch-up read that hangs keeps the scheduler `attempting`, and a run re-open does not connect the stream until that read fails. The emulator check (AC-003, screen off ≥ 2 min) is the realistic case to watch.
- ASM-001 (WebView `visibilitychange`) remains open for the emulator.
- DEC-003 cost on desktop windows with many kept streams (one reconnect + catch-up each after ≥ 30 s hidden).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E
- Notes: Implementation decisions D-1…D-4 accepted (C-1…C-4). No findings.
