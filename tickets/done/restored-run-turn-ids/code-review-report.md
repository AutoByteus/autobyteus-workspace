# Code Review Report

## Latest Round: Implementation Review, round 2 (CRR-002) — Pass

### Meta

- Review Entry Point: `Implementation Review` (SR-002 "One identity per notice"; first source review of this ticket, which became Medium / High after ARCH-REV-001)
- Requirements: `requirements-doc.md` (SR-001 basis; REQ-002 / AC-002 drive SR-002)
- Design: `design-spec.md` SR-002 section; `design-review-report.md` ARCH-REV-001 Pass (residuals R-1..R-4); `architecture-review-revision-record.md`
- Implementation: `implementation-handoff.md` (IR-002), `implementation-revision-record.md`
- Prior round: `1` (CRR-001, failure-origin, Design Impact → resolved by SR-002)
- Review Scope: `Full Review` of `2e9ac1e65b..ee5e87495f`:
  - SR-002: `6517199e36` (autobyteus-ts, server producers, memory, projection, wire, contract + dist), `289e3e1539` (web), `491395b89f` (docs), `ee5e87495f` (documents, evidence);
  - SR-001: `10217e9a0b`, `cbea910d08`, read again as part of the full range.
- Task size / risk: `Medium` / `High`, confirmed (a strict wire contract field, every notice producer, memory, projection and the web)

### Behavior basis

| Behavior | Status | Evidence |
| --- | --- | --- |
| BEH-001 / REQ-001 | Confirmed | `MemoryManager` reads the stored corpus once and seeds `TurnTracker.continuingAfter(turnIds)`; the same list feeds `ToolTraceLifecycleState`. AC-001 unit-proven, RR-10 |
| BEH-002 / REQ-002 | Confirmed (was Contradicted in CRR-001) | Each notice has one id on every copy. The preface dispatch uses `preface.id` for both the message metadata `notice_id` and the published `message_id`. Native memory stores it from the preface (`memory-ingest-input-processor`); external runtimes record it from the event (`runtime-memory-event-accumulator`, writer). The trace keeps `message_id` for notice traces (`RawTraceItem`), and the normalizer and projection carry it (`messageId`) to the conversation entry. Mapper, presentation adapter, team projector and contract carry it on the wire. In the web, `handleSystemTaskNotification` adds nothing when the conversation already shows that id, and hydration sets it. The snapshot keeps turn-less stored notices and replays turn frames through the same handler (`agent-stream-snapshot.ts` L25-35, `AgentStreamingService.ts` L265-270), so the stored copy plus the replayed or live frame gives one card. MSP-75 passes (1, 2, 2 cards; failed on base and on SR-001) |
| BEH-003 / REQ-003 | Confirmed | `restartReminderLocalTime` in the card; the agent's text stays UTC |

Producers traced, each one id per notice:
- **Preface:** `preface.id`.
- **Tool-list, skill and background-task services:** the in-flight `id`, passed to both the message builder and the event builder. A returned or retried notice takes a new in-flight id, and an undelivered one was never stored.
- **Restart wake:** its deterministic `restart-resume:<restartedAt>:<run>`. The observer reads it back from the message's metadata. A refused wake falls back to a preface with a new id, never stored twice.
- **Model Router:** one `randomUUID()` per request.
- **Claude background notice:** one per notice, through the converter to the recorder.
- **R-1, the two non-platform producers:** the native unsuppressed SYSTEM emit and the task-delegation notice send `null`. This is recorded as choice 5, and the reason holds: neither has a stored and a live copy of one platform notice.

### Candidate gate

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-07 | `memory-manager.ts`: 498 → 501 non-empty lines counting comments, 494 → 495 effective (non-blank, non-comment) | Reject | Under the 500 limit on the effective measure. The growth is one code line plus a two-line comment. Noted: the file has no room left |
| C-08 | The show-once check scans every message per notice | Reject | O(messages), only per notice frame; trivial |
| C-09 | A legitimately repeated notice id would be hidden | Reject | Every producer makes a fresh id per notice instance (traced above); no supported scenario repeats one |
| C-10 | Stored notices from before this change have no id, so they are not deduped against a live copy | Reject | Their runs have no live copy (design R-4, accepted) |
| C-11 | R-3's smaller snapshot-side alternative | Reject | The design completes 461's existing contract (notices matched by `messageId`); a preferred structure is not a finding |

### Structural / design checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health | Pass | Missing invariant (turn ids) at its source; notice identity given at each producer |
| Matches artifacts | Pass | Steps 1–7 of SR-002 implemented as tabled; R-1 and R-2 handled as the review asked |
| Data-flow spine | Pass | producer → message/trace/projection/wire → one web handler |
| Ownership | Pass | Each producer owns its notice's id; the web handler owns the show-once rule (one place; hydration only reads) |
| Off-spine concerns / reuse | Pass | Reuses `RawTraceItem.messageId`, the preface metadata and the 461 `messageId` matching |
| Shared-structure tightness | Pass | One field, `messageId` / `message_id` / `notice_id`, by each layer's casing. `notice_id` names the preface-metadata key, which is distinct from the message's own `message_id`. The restart wake uses the same value for both, intentionally |
| Repeated coordination / empty indirection | Pass | No new layer |
| Visible dependencies (P16) | Pass | Ids are passed as arguments to the builders; no lookup |
| Authoritative boundary / dependency direction | Pass | — |
| Interface clarity | Pass | Builders take `noticeId`; the observer takes the message |
| Naming / one vocabulary | Pass | "notice id" throughout |
| No duplication / patch-on-patch | Pass | — |
| Dead code in touched files | Pass | The default `new TurnTracker()` and the second corpus read were replaced; nothing left |
| Tests requirement-aligned | Pass | `platform-notice-identity.test.ts` follows the id across copies. Also tested: preface memory and dispatch, restart notice and resumer, model router, Claude session and converter, recorder, native skill history, and the web handler (repeat, stored-copy, null ids) and hydration |
| No stale tests | Pass | Updated fixtures carry `message_id` |
| API/E2E readiness | Pass | — |

### Size, legacy, persisted data

- Sizes: every delta is small. The largest file, `memory-manager.ts`, is 495 effective lines (C-07).
- Legacy: no compatibility path. The strict contract field is required and nullable (DESIGN.md rule 9); older preface metadata and traces read `null`, which is a generic tolerant read.
- Persisted: notice traces gain an existing optional field, `Directly Usable — No Migration`, as reviewed.

### Scorecard

- Overall: `9.38/10`

| # | Category | Score | Note |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.5 | One id from producer to the one web rule |
| 2 | Ownership / Boundaries | 9.5 | Producers own ids; one show-once owner |
| 3 | API / Interface | 9.4 | Required-nullable field, explicit builder parameters |
| 4 | Separation / Placement | 9.4 | — |
| 5 | Data-Model Tightness | 9.3 | Three spellings by layer casing (documented). Weak: none material |
| 6 | Naming / Readability | 9.3 | — |
| 7 | API/E2E Readiness | 9.3 | MSP-75 green. Weak: the desktop V-04 reload of a live run and the live team, Org and Claude paths remain for API/E2E |
| 8 | Runtime Correctness | 9.4 | Every producer traced; the snapshot interplay checked |
| 9 | No Backward Compatibility | 9.4 | — |
| 10 | Cleanup | 9.4 | — |

### Findings

None.

### Result

- Review Decision: `Pass`
- Supported Product Scenario Gate: `Pass`; Material-Premise Gate: `Pass` (BEH-002 now rests on the established cause)
- Recommended Recipient: API/E2E engineer (`/api_e2e_engineer`), for the desktop V-04 (incl. step 5, reload of a live run) on an isolated instance with a real model, DEC-003, the team, Org and Claude notice paths live, and the round's regression set. Then the informational notice to the implementation engineer.
- Notes: `memory-manager.ts` has no room left for growth (C-07).

---

## Earlier Round: API/E2E Failure-Origin Review, round 1 (CRR-001) — Design Impact

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (Cause; U-1)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001)
- Design Spec Reviewed As Context: `design-spec.md` (Ready, SR-001)
- Supplemental Task Artifacts Reviewed As Context: `handoff.md`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route, Medium / Low)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E engineer, round 1 Fail (F-1), 2026-11-18
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (round 1)
- Project testing guideline: `/TESTING.md`, as the coverage investigation records it; no conflict
- Failing Scenario IDs: MSP-75 (phone, production bundle); V-04 desktop (isolated app, live model); REQ-002 / AC-002
- Exact Failing Commands / Execution Mode: MSP-75 via `mobile-shell-probe.mjs` (wired from `tests/e2e/mobile-restored-run-cases.mjs`); desktop by hand on an isolated instance (V-04 README)
- Failure Evidence Paths: `evidence/V-03-phone-MSP-75/results.log`, `evidence/V-04-desktop/` (`02-live-after-restart-2.png`, `03-after-reload.png`, `README.md`), `evidence/V-01-RR-10/RR-10-head-frame-order.json`, `evidence/V-02-RR-11/RR-11.json`

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `Low` (unchanged)
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: the fix this failure needs is outside the design's stated change (see below); the Solution Designer re-sizes it with the revised design.

## Review Scope

- Changed implementation and behavior reviewed: the failure's path only, the restart reminder card on the web, live and on reload. This covers the live notice handler, the conversation hydration of a stored notice, and the stream snapshot apply. The IR-001 changes (`10217e9a0b` turn numbering, `cbea910d08` card time) were read for how they relate to the failure.
- Explicit exclusions: no general review of the test suites (outside this entry point), and AC-001/AC-003, which pass.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-002 says each turn shows once after two restarts, desktop and phone, live and after a reload, with "the reminder once per restart". The behavior is approved and unambiguous.
- Behavior-basis status: `Confirmed` for the requirement. The design's path for it is `Contradicted` (below).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 | Confirmed | `TurnTracker.continuingAfter` seeded from the stored corpus; RR-10 shows `turn_0001..0003` live and stored (fails on base) | — |
| BEH-002 / REQ-002 (card once) | Contradicted | Design: "follows from unique ids; no reader changed" (design Change Scope, handoff trace) | The card doubles with unique ids: phone live 2 cards after one restart, 3 after two (the newest twice). Desktop: the same live, and still 3 after a reload of the live run. Base `2e9ac1e65b` shows the same counts, so turn ids are not this card's cause. The hidden-reply half of BEH-002 is fixed |
| BEH-003 / REQ-003 | Confirmed | `restartReminderLocalTime` in the card; CET shown, the agent's text stays UTC | — |

## Supported Product Scenario And Reachability Gate

| Scenario | Kind | Actor | Trigger | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN (REQ-002) | User / Operational | the user | restart the node with an idle native run, then talk to the run (desktop or phone), and reload | real built server, production phone bundle, isolated desktop app with a live model | the reminder card shows once per restart | MSP-75, V-04 | Supported Normal Scenario | Use |

### Candidate gate

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | The second card is made in the web, not by the server: the server sends one `SYSTEM_TASK_NOTIFICATION` per restart (before `TURN_STARTED`), and the stored conversation holds each reminder once | REQ-002 | RR-10 frame order (one notice frame per restart session); `getRunProjection` lists each once (RR-10) | Promote | This ticket | See below |
| C-02 | A notice segment has no identity. `handleSystemTaskNotification` pushes `{type, senderId, content}` onto `findOrCreateAIMessage(context)`, with no `turn_id` and no segment id (`services/agentStreaming/handlers/systemTaskNotificationHandler.ts` L13-21). Hydration builds the same identity-less segment from the stored entry (`services/runHydration/runProjectionConversation.ts` L275-281). So the dedupe that unique turn ids restore (segment identity = `turnId` + segment id) cannot apply to a notice: any second delivery path shows a second card | REQ-002 | Read. The live card goes into the last incomplete AI message or a new one; the stored copy sits before the user's input. That matches the phone's two placements ("ends the previous reply above You" and "starts the new reply"). `applyAgentStreamSnapshot` (`AgentStreamingService.ts` L265-270) combines a run's stored part with the frames after its base, which matches the desktop reload of a live run still showing 3 | Promote as the leading lead. The exact second path (snapshot stored part + replayed frame, or a projection merge into the live context) is not reproduced | This ticket | For the Solution Designer to establish (it was U-1 in the investigation) |
| C-03 | An implementation defect in IR-001 | — | IR-001 changes only the tracker seed and the card's time text; the card's count is identical on base | Reject | — | Not the origin |
| C-04 | The test is invalid or stale | — | MSP-75 asserts the approved REQ-002, and the desktop by-hand check agrees | Reject | — | Valid failure |
| C-05 | Environment | — | stop-budget and AGY discovery timeouts under load were retried; the card counts are stable across phone, desktop and base | Reject | — | Not the origin |
| C-06 | Pre-existing and unrelated, so a follow-up | ticket-scope.md | The bug exists on base, but it is this ticket's in-scope behavior (REQ-002 and AC-002 name the reminder once per restart, live and after a reload), so the ticket cannot pass without it | Reject as a follow-up | This ticket | — |

## Failure Origin

- Origin: `Design Impact`.
  - The design attributed BEH-002 entirely to reused turn ids ("Every layer assumes one id per turn; fixing the source restores that invariant", DEC-001) and left the readers alone ("Derived consumers: none change").
  - It did so while the investigation recorded the doubling layer as unknown (U-1, "not needed for the source fix").
  - Validation shows the card's doubling has a second, id-independent cause in the web's notice handling. That matches the design's escalation trigger.
  - Fixing it means choosing an owner and mechanism in the web (or the stream contract) that the design deliberately left unchanged, for example giving a notice an identity that hydration, snapshot and live delivery share. That is a design decision, not a bounded local fix.
- Not an implementation defect: IR-001 is correct for what the design asked (AC-001 and AC-003 pass, and the hidden reply is fixed).
- Review gap: none at code review, because this direct-route ticket had no source review. The premise was unvalidated at design time (U-1 left open). The design's own escalation trigger caught it in validation, as intended.

## Findings

### CR-001 (= API/E2E F-1): the restart reminder card shows twice live (and three times after a desktop reload of a live run) with unique turn ids

- Basis: REQ-002 / AC-002 (approved). Candidates C-01 and C-02.
- Evidence: MSP-75 and V-04 (2 then 3 cards live; desktop reload of the live run 3). The same counts on base `2e9ac1e65b`. The server frame order shows one notice per restart, and the stored conversation holds each once.
- Classification: `Design Impact`, owned by the Solution Designer.
- What the designer needs to settle:
  - which delivery path produces the second card: the snapshot's stored part plus the replayed notice frame, the projection merged into a live context, or the live handler's placement;
  - the owner of a notice's identity across live, snapshot and hydration (C-02 is the leading lead: notice segments carry no id).
  The evidence and MSP-75 (which fails until fixed) are the reproduction to start from.

## Follow-ups

- Follow-ups this review added: None.
- Noted for autobyteus-448: the API/E2E engineer warned that 448's renumbered MSP-67 would collide with autobyteus-522. That was already resolved in 448 (IR-006 renamed it MSP-73; reviewed in 448's CRR-010). No action is needed.

## Classification

- `Design Impact` (CR-001).

## Recommended Recipient

- Solution Designer (`/solution_designer`; rule: Design Impact, Requirement Gap or Unclear needs upstream revision).

## Residual Risks

- DEC-003: runs restored before the fix keep their merged old turns in turn-grouped views (reported by API/E2E, RR-11; the user to be told, as decided).

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin found upstream)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Fail` (the premise "unique turn ids make every layer show the reminder once" does not hold)
- Failure Origin: `Design Impact`
- Recommended Recipient: Solution Designer
- Notes: AC-001, AC-003, the hidden-reply fix, DEC-003's check, RR-01..06 and the typecheck stay valid for the next round.
