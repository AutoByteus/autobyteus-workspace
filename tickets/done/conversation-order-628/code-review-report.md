# Code Review Report — autobyteus-628 (conversation-order-628)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005; REQ-001…REQ-004, AC-001…AC-006, DEC-001…DEC-004)
- Investigation Notes Reviewed As Context: through the design spec's evidence table
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006: D-1, D-2 and their Data Contract; D-3 and its Data Contract; SR-006)
- Supplemental Task Artifacts Reviewed As Context: `probes/clock-order-reproduction.spec.ts`; `follow-ups.md`
- Relevant Solution Revision IDs: SR-001…SR-006
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003 Pass; notes N-1, N-2, N-4, N-5 applied). It is untracked in the worktree.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (untracked)
- Relevant Architecture Review Revision IDs: ARCH-REV-001…ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004` (CRR-003 was the proportional test review)
- Current Review Round: `3`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round 3): `git diff 54cee15c8e..2cbc1b7852` (after delivery's clean merge of `origin/personal`, which shares no file with the ticket) changes source only in these places:
  - the four memory-recorder files: three are byte-identical to the base again, and the accumulator differs from the base only by SR-006's admission time;
  - `agent-run-event.ts`: `serverTimeMsOf` folded back into `serverTimeOf`, and the `occurredAt` doc;
  - tests: the recorder tests, now with distinct event times, and the three contract packages' own fixtures.
  The web code is unchanged since CRR-002. No other owner changed, so round-1 and round-2 evidence is carried forward for every other check.
- Trigger: Implementation Engineer, IR-003. It covers SR-007 (ARCH-REV-004 Pass), after delivery's DR-001 Blocked Finding 2, and the Local Fix for DR-001 Finding 1
- Prior Review Round Reviewed: 2 (CRR-002, Pass)
- Latest Authoritative Round: 3
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628`, branch `codex/conversation-order-628`, base `origin/personal` `1f761bc8db`.
  - Round 1: code through `6ad8920bd6`.
  - Round 2: pushed head `52d8c1792c`; fix `eaebb94304`, fixtures `8fbffd707f`.
  - Round 3: pushed head `2cbc1b7852`; SR-007 `ba25165c1e`, contract fixtures `2dbfe43c28`; delivery's merge `54cee15c8e`.
- Shared guidance: the team's design principles as updated 2026-11-23 (Principle 17, Data Contract First; "Data And Spine First"). The design spec already carries Data Contract sections for D-1/D-2 and D-3.
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change touches:
  - a shared contract field on three stream boundaries, with rebuilt contract `dist/`;
  - AgentRun's delivery;
  - every web row time;
  - the external trace's stored time;
  - a replay ordering rule.

## Review Scope

- Changed implementation and behavior reviewed:
  - D-1: the window keeps array order and merges compaction rows by time.
  - D-2: `orderPrefaceNoticesAfterTheirInput`, with rules (a) and (b).
  - D-3:
    - contracts: `serverTimeSchema`, `occurred_at` on the timed payloads, `accepted_at` on pending input;
    - node: `stampForDelivery` through `AgentRun.deliverToListeners` (every delivery path); `serverTimeOf` in the `/ws/agent` mapper, the Team projector and the Org/collaboration projector; the adapter's untimed→timed step; the producers outside a run; the memory recorder's trace times;
    - web: parser refusal of a timed frame without `occurred_at`, handlers on `occurred_at`, `accepted_at` for pending input, `null` own sends, `updatedAt` derived, compaction time from `occurred_at`.
  - SR-006: the external user trace at `acceptedAt`; `forwardedAt` removed.
- Files / areas reviewed: every changed source file in `1f761bc8db..6ad8920bd6` (contracts, server, `autobyteus-ts`, web), plus these, read to judge them:
  - `external-runtime-memory-writer.ts` `toTimestampSeconds` and `raw-trace-record-normalizer.ts`, for how stored `ts` is written and read;
  - `agent-run-memory-recorder.ts`, for what the recorder subscribes to;
  - `agentActivityStore.applyConfirmedNativeTermination` and its callers;
  - `agentStreamMutationEffects.ts` and `runHistoryStore.applyRunNavigationEffect`;
  - every web reader of `Message.timestamp` (`grep`).
- Explicit exclusions: no recorded check was rerun. The code each one exercises is unchanged since it ran (IMP-01…IMP-15), and the findings below come from reading.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-004 is the user's rule: "the server records a time … the client is only showing … one single source of truth".
- Design-spec behavior map verified against the implementation: Yes (DS-1, DS-2; D-3 per boundary; SR-006).
- Design review report and round confirmed: ARCH-REV-003 Pass on SR-006.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior:
  - A native compaction stopped before it was ever shown (phase `requested`) no longer gets a viewer-clock center-feed time, so it stays out of the conversation (`nativeCompactionActivityReconciliation.ts:16-21`).
  - This follows from REQ-004 (no viewer-clock row) and ARCH-REV-002 N-2. The row was never shown before the stop, so nothing shown disappears. Judged consistent; see CG-04.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `buildRecentEventMonitorPresentation` → `mergeCompactionsIntoConversation` (`recentEventMonitorWindow.ts:181-200`): message descriptors stay in array order; no sort reads message times; the `order` field is removed | — |
| BEH-002 | Confirmed | `orderPrefaceNoticesAfterTheirInput` before the trace loop (`raw-trace-to-historical-replay-events.ts:137-166,192`): rule (a) `input.ts <= notice.ts` within one turn; rule (b) both `NATIVE_INPUT_TRACE_SOURCE_EVENT` (exported from `memory-ingest-input-processor.ts`); `index += 1` after a swap. SR-006: `recordForwardedUserMessage` writes `acceptedAt` (`runtime-memory-event-accumulator.ts:87-88`); `acceptedAt` comes from the admission entry (`agent-run-input-admission-state.ts:120,262`) | — |
| BEH-003 | Confirmed | Compactions merged before the first later message (strict `<`); the compaction time is `new Date(payload.occurred_at)` (`compactionActivityProjection.ts:190-191`); a `null` own send counts as 0, so a compaction waits until the node confirms the send | — |
| REQ-004 (live) | Confirmed | One stamp point: `AgentRun.deliverToListeners` → `stampForDelivery`, covering the processed events, the input state, the canonical status and the subscribe snapshot (`agent-run.ts:223,340,525,529-546`). Every timed wire message reads `serverTimeOf`, which throws when unstamped. The web parser refuses a timed `/ws/agent` frame without `occurred_at`; Team and Org frames are checked by the contract schemas, which now require it. The handlers create rows with `occurred_at`; pending input uses `accepted_at`; an own send is `null` until the echo (`upsertUserMessageByIdentity` spreads the echo's time) or the input state (`existing.timestamp ?? message.timestamp`) | — |
| REQ-004 (recorded and reloaded) | Confirmed (round 3: SR-007; stored times are the node's write times) | The memory recorder subscribes only to the run's delivered events (`agent-run-memory-recorder.ts:40-45`), so `occurredAt` is always set. The external writer stamps the node's time when a trace has none (`external-runtime-memory-writer.ts:10-15`), so a stored `ts` is always present | CR-001 |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…SCN-004 | REQ-001…REQ-004 | User | Founder (phone, desktop) | Read a conversation in order, live and after a reload, whatever the viewer's clock | Phone or desktop conversation | Normal | DS-1, DS-2, D-3 per stream | Rows in conversation order; every row time the node's | requirements-doc.md; Reproduced (probe) | Supported Normal Scenario | Use |
| C-REQ004 | REQ-004; the design's D-3 contract ("a missing stamp fails loudly"; the handoff: "there is no fallback") | Contract | — | One source of time for every recorded and shown row | — | Contract | Every writer and reader of a row time | No row timed by a second clock | User decision DEC-004 | Supported (governing contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CG-01 | This change adds or touches time fallbacks to a second clock, on paths where the one source is always present today | C-REQ004 | — (never reached today) | (1) `extractEventTime` (new, `runtime-memory-event-payload.ts:40-41`) falls back to the payload's own time (a runtime or provider clock) for an unstamped event. (2) The provider compaction boundary recorder falls back to `provider_timestamp` (`provider-compaction-boundary-recorder.ts:47`, a line this change wrote). (3) The web hydration's `toDate` falls back to `new Date()`, the viewer's clock, for a stored entry with no `ts` (`runProjectionConversation.ts:31-36`, in a file this change edited). None is reached today: the recorder only sees delivered, stamped events, and the writer always stores a node `ts`. But each keeps a silent path to a second clock that the ticket's contract forbids. A future unstamped producer would be recorded at another clock's time instead of failing, and reload order would break silently, the bug this ticket fixes | Code read (lines cited); recorder subscription; writer `toTimestampSeconds` | Promote | This ticket | Principle 7 (branches that never run, in touched files) and the "no silent fallback" rule that holds in every context. Bounded: read `occurredAt` and fail loudly on the server (as `serverTimeOf` does); `null`, not `now`, on the web |
| CG-02 | D-2's doc comment says the external input "is stamped when it was forwarded" | SR-006 | — | After SR-006 the input is stamped at admission. The comment explains rule (a) with a time the code no longer writes, which misleads the next reader of the ordering rule | `raw-trace-to-historical-replay-events.ts:141-142` | Promote | This ticket | One-line correction, part of CR-001 |
| CG-03 | (Question 1) `agent-run.ts` was 500 effective lines at base; `stampForDelivery` moved to `agent-run-event.ts` | Size rule | — | 500 → 498 effective. `agent-run-event.ts` owns `occurredAt` and `serverTimeOf`, so it is the natural owner | Line count | Reject (no finding) | — | Placement correct and within the limit |
| CG-04 | A native compaction stopped while only `requested` is no longer shown in the conversation | REQ-004, BEH-003 preserved ("the compaction rows themselves") | Native run stopped during a requested compaction | It never had a center-feed row before the stop; giving it one at the stop used the viewer's clock. It still appears in Activity (`updatedAt: at`). The rows that were shown are unchanged | `nativeCompactionActivityReconciliation.ts:16-21`; ARCH-REV-002 N-2 | Reject (no finding) | — | Consistent with REQ-004; no shown row is lost |
| CG-05 | (Question 2) `Message.timestamp` is nullable | REQ-004 | — | Every production reader handles `null`: the window (0), the reconciliation (skips), hydration's created/updated times, `updatedAt` (skips), the pending merge, and `timeOfSegmentMessage` (throws, because an AI message always has its frame's time). No component renders a message timestamp (`grep`) | Code read; typecheck at baseline (IMP-08) | Reject (no finding) | — | — |
| CG-06 | (Question 3) Producers outside a run stamp their own time | D-3 contract | — | Each sets `occurredAt: Date.now()` (node clock) or the input's `received_at`. A missing one throws in `serverTimeOf` or the adapter. `receivedAtOf` falls back to the node's `Date.now()` for an echo without a receipt time: still the node's clock | Code read | Reject (no finding) | — | — |
| CG-07 | The run list's live navigation time is still the viewer's clock (`conversationMutationEffects` default `new Date()`, `agentStreamMutationEffects.ts:53` → `applyRunNavigationEffect`) | REQ-004 covers conversation rows, not the run list | — | The run list can order runs by a mix of node and viewer times | Code read | Promote → follow-up | Follow-up FU-004 | Outside REQ-004's rows |
| CG-08 | `runProjectionActivityHydration.ts` `toDate` falls back to `new Date()` for an activity without `ts` | REQ-004 (tool and compaction rows) | — (never reached: stored `ts` is always present) | Same shape as CG-01 (3), in a file this change does not touch | Code read | Promote → follow-up | Follow-up FU-005 | Dead fallback outside the touched files (Principle 7: elsewhere is a follow-up) |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Order is taken from its owner (the array, the replay); time has one writer (the run's delivery) | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | The reproduction became `recentEventMonitorWindow.clockOrder.spec.ts` (IMP-01: base 4 fail, fix 9 pass) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-1, DS-2 and D-3's three boundaries traced | — |
| Ownership boundary preservation and clarity | Pass | AgentRun owns the event time; the mappers only format it; the web only reads it | — |
| Off-spine concern clarity | Pass | `conversationRowTimes.ts` derives `updatedAt` | — |
| Existing capability/subsystem reuse check | Pass | `dispatchRuntimeEvent` reused inside `deliverToListeners` | — |
| Reusable owned structures check | Pass | One `serverTimeSchema`; one `occurredAt` spread in the contract | — |
| Shared-structure/data-model tightness check | Pass | `occurred_at` only on timed types; `UntimedAgentPresentationEvent` before the adapter attaches the time | — |
| Repeated coordination ownership check | Pass | One stamping rule (`stampForDelivery`); one formatting rule (`serverTimeOf`) | — |
| Empty indirection check | Pass | `deliverToListeners` owns the stamping; `deliver` passed to the dispatcher is the run's own step | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | The server replay imports `autobyteus-ts`'s exported constant (an existing dependency direction) | — |
| Visible dependencies check | Pass | No lookup added | — |
| Authoritative Boundary Rule check | Pass | — | — |
| File placement check | Pass | CG-03 | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `dispatchProcessedAgentRunEvents({ deliver })` replaces listeners plus an error callback | — |
| Naming quality and one vocabulary | Pass | `occurredAt` / `occurred_at`, `acceptedAt` / `accepted_at`; `forwardedAt` removed | — |
| No unjustified duplication in changed scope | Pass | The web and server `TIMED_MESSAGE_TYPES` lists sit on two sides of one wire, each checking its own side | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass (round 2) | CR-001 resolved. `extractEventTime` = `serverTimeMsOf(event) / 1000`, which throws when the event is unstamped. The boundary recorder uses it. `extractTimestamp` and its normalizer have no caller left and are removed (`grep`; `run-projection-utils.ts` keeps its own local helper). Web `toServerTime` gives `null` | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Each fix reproduced red first: IMP-01, IMP-02, IMP-03a, IMP-07, IMP-09 | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests retained in changed scope | Pass | Specs asserting viewer-clock times rewritten (rule 11) | — |
| API/E2E readiness for the next workflow stage | Pass | CR-001 resolved; the integration suite now passes (IMP-17) | — |

## Source File Size And Structure Audit

| Source File | Effective Before | Effective After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | 500 | 498 | Pass | Pass | Pass | Pass | — (close to the limit) | — |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` | 457 | 462 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | 454 | 457 | Pass | Pass | Pass | Pass | — | — |
| All other changed source files | ≤ 439 | ≤ 430 | Pass | Pass (largest delta 43) | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | A node without `occurred_at` is refused (DESIGN.md rule 9) |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass (round 2) | CR-001 resolved |
| Approved persisted-data transition decision is followed | Pass | `Not Affected`: read-side D-2; SR-006 only changes the time the writer chooses; old traces read as before (IMP-02) |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `extractEventTime`'s fallback to `extractTimestamp(event.payload)` (`autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-payload.ts:40-41`) | LegacyBranch (never runs) | The recorder receives only delivered, stamped events (`agent-run-memory-recorder.ts:40-45`; `agent-run.ts` `deliverToListeners`) | A silent second clock for a recorded trace's time; the contract says an unstamped event is a defect | Read `occurredAt` and fail loudly when it is missing (as `serverTimeOf` does); stamp any test fixture that feeds the accumulator |
| `provider-compaction-boundary-recorder.ts:47` fallback to `boundary.provider_timestamp ?? extractTimestamp(...)` | LegacyBranch (never runs) | Same subscription | The provider's clock was what N-2 removed on the web side | Same |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts:31-36` `toDate` → `new Date()` for a missing `ts` | LegacyBranch (never runs) | The external writer always stores a node `ts` (`external-runtime-memory-writer.ts:10-15`); native writes its own | The viewer's clock for a reloaded row, which REQ-004 forbids | Return `null` (the row has no node time), as an unconfirmed send does |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: stream payloads gained `occurred_at`, pending input gained `accepted_at`, the run stamps each delivery, and the external user trace is timed at admission.
- Files or areas likely affected (handoff, for delivery's sync):
  - `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`;
  - `docs/modules/agent_streaming.md`;
  - `docs/modules/agent_execution.md`;
  - plus `autobyteus-web/docs` on the conversation window's order (design).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV-001…003 decisions | Confirmed | — |

None new.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | Order and time each traced from their one owner to every surface | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One stamp point, in the run's delivery; formatting at each boundary; readers only read | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | `deliver` replaces listeners plus an error callback; timed contract types are explicit | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | `stampForDelivery` beside `occurredAt` | `agent-run.ts` at 498 | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | One `serverTimeSchema`, only on timed types; an untimed event type before adaptation | — | — |
| 6 | Naming Quality and Local Readability | 9.4 (round 2) | Clear time names; D-2's comment now explains rule (a) by admission (SR-006) | — | — |
| 7 | API/E2E Readiness | 9.4 | Red-first proofs for D-1, D-2, D-3, SR-006; MSP-105 live and reopened | Real runtimes left to API/E2E | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 (round 2) | Every live, recorded and reloaded row time is the node's or none; an unstamped event fails on every path (streams and recorder alike) | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | Clean cut: no fallback for frames without `occurred_at` | — | — |
| 10 | Cleanup Completeness | 9.4 (round 2) | Round 1's removals, plus the second-clock fallbacks, `extractTimestamp` and its normalizer (no caller left) | FU-005 outside the touched files | — |

## Round 2 (IR-002): CR-001

- **One rule.** `serverTimeMsOf(event)` in `agent-run-event.ts` returns `occurredAt` or throws, naming the event type. `serverTimeOf` (the streams) and `extractEventTime` (the recorder: the accumulator, the tool-trace sequencer, the provider boundary recorder) both build on it. No runtime or provider clock stands in on the server, and `provider_timestamp` stays only in the boundary's `toolResult`.
- **Web.** `toServerTime` hydrates a stored row without `ts` (or with the normalizer's `0`) as `null`; `createAIMessage` accepts `Date | null`. Every reader of a `null` time was confirmed in round 1 (CG-05).
- **Comment.** D-2's comment now explains rule (a) by admission (SR-006).
- **Tests.**
  - `agent-run-event-time.test.ts` adds three cases: the recorder refuses an unstamped notice and an unstamped provider boundary, and stores a stamped notice at the run's time, not the payload's.
  - `runProjectionConversation.spec.ts` adds a row without `ts` hydrating with `null`.
  - Both cases are red on the pre-fix source (IMP-16).
- **Fixtures (`8fbffd707f`).**
  - Unit, integration and e2e fixtures that fed events past the run now stamp them, either with the production `stampForDelivery` or with a node time in the memory test helpers.
  - Expectations include `occurred_at`.
  - `native-skill-notice-history` now expects the message before its preface notice, the order REQ-002 approves (rewritten under DESIGN.md rule 11, like MSP-99).
  - These are test changes only. They show the strict rule holds across the suites that exercise the recorder.
- **A gap closed in this round.** The implementer had not run the server integration suite in IR-001. It now passes: 92 files, 523 tests (IMP-17). The clean-environment e2e passes too, and the probe and integration logs show no "has no occurredAt" refusal.
- No build input changed in round 2, so the fresh-start build and the release run (IMP-14, IMP-15) still hold.

## Round 3 (IR-003): SR-007 and DR-001 Finding 1

- **Why the ruling changes ("Rulings hold" unless new evidence).** CRR-001 asked, and CRR-002 accepted, that the memory recorder read the event's `occurredAt` and fail without it (CR-001, server half). Delivery's DR-001 Finding 2 is new evidence that this shape is wrong:
  - a trace built from several events took one event's delivery time: a reasoning segment took its first event's, and a tool call written at its result took the result's;
  - the reload sorts by `ts` (`raw-trace-record-normalizer.ts:121-130`), so stored order departed from write order;
  - with distinct event times 7 ms apart, 7 of 25 accumulator tests fail (`evidence/delivery/DEL-BLOCK-accumulator-distinct-event-times/`).
  The suite had passed only because every fixture event shared one millisecond, from `Date.now()` in the helper IR-002 added at CR-001's request. SR-007 (ARCH-REV-004 Pass) is the design's answer, and this round follows it.
- **Review gap, owned here.** Rounds 1 and 2 traced `occurredAt` from the run's stamp to every stream, but not into a trace the recorder assembles from several events. CR-001 tightened the recorder toward the delivery time without asking which event's time a multi-event trace takes, or whether a time sort over those times keeps write order. A review that tests a time rule should check it with distinct times, which is what delivery did.
- **SR-007 as built (`ba25165c1e`).**
  - `provider-compaction-boundary-recorder.ts`, `runtime-tool-trace-sequencer.ts` and `runtime-memory-event-payload.ts` are byte-identical to the base again (`git diff 1f761bc8db 2cbc1b7852`), apart from N-6's comment on `extractTimestamp`.
  - The accumulator differs from the base only by SR-006's `acceptedAt` for the user trace.
  - Each trace keeps its payload's own time, else the writer's `Date.now()` (`external-runtime-memory-writer.ts:10-15`). All are node times. N-6 says every current producer sets these fields on the node's machine, and a spot check agrees: Claude's `createdAt` is `nowTimestampSeconds()`.
  - D-2 rule (a) holds by construction: the user trace is at admission, its notice at its later write.
  - `serverTimeMsOf` had only one caller left, so it is folded back into `serverTimeOf` (Principle 7). The streams still refuse an unstamped timed event.
  - CR-001's web half stays: hydration gives `null` for a row without `ts`.
- **Tests.**
  - The accumulator, sequencer and notice fixtures now stamp strictly increasing, distinct times 7 ms apart, so no test can pass by a tie.
  - The CR-001 recorder case is rewritten: with fake time, a trace is stored at its write time whether or not the event was stamped.
  - On the pre-SR-007 recorder, delivery's 7 cases, the new case and the D-2 external cases fail; with SR-007 they pass (IMP-18).
- **Finding 1 (`2dbfe43c28`).**
  - The three contract packages' own fixtures carry `occurred_at` and `accepted_at`.
  - `agent-presentation-contracts` adds a case refusing a timed message without `occurred_at` or with a number.
  - All three `pnpm -C <package> test` pass, and `check:contract-dist` passes with `dist/` unchanged (IMP-18). Test-only.
- **Checks (implementation).**
  - IMP-18: server unit suite 1081 files; typecheck at baseline; clean integration suite 92 files / 523 tests; the three contract suites.
  - IMP-19: phone cases MSP-66, 75, 76, 77, 99 and 105, with MSP-105 in order live and reopened; clean server e2e 127 files.
- **Stored time and live time.** A row's live time (`occurred_at`) and its stored time (the write time) are two node times of the same event, milliseconds apart. Order does not depend on them: live keeps array order (D-1), and the reload keeps write order. REQ-004 holds because no time is the app's own clock. The requirements never asked stored and live times to be equal (SR-007).

## Findings

| ID | Finding | Classification | Owner | Status (round 3) |
| --- | --- | --- | --- | --- |
| CR-001 | Second-clock fallbacks | Local Fix | Implementation | Resolved in round 2. Its server half (the recorder reads `occurredAt`) is superseded by SR-007 on delivery's evidence; the web half stays |

No open findings.

## Follow-ups

- Follow-ups this review added (round 1):
  - FU-004: the run list's live navigation time comes from the viewer's clock.
  - FU-005: `runProjectionActivityHydration.ts` `toDate` falls back to `new Date()`.
- The ticket's own `follow-ups.md` also carries DEC-005's follow-up (one timestamp per event), recorded by the Solution Designer.

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E Engineer (`/api_e2e_engineer`): after an implementation-owned fix, API/E2E runs again. Implementation Engineer gets the informational notice. Delivery resumes with DR-002 after API/E2E.

## Residual Risks

- N-6: a future runtime that puts a remote provider's time in `ts`, `timestamp`, `createdAt` or `created_at` would bring a second clock into the reload order. The comment at `extractTimestamp` keeps that visible.
- The live Claude and native cases (MSP-106/107) were not rerun on the merged tree. Delivery notes this, and the recorder change affects them.
- Real runtimes, same-version deploy, and FU-002, FU-004, FU-005 as before.
- The architecture-review documents have uncommitted reviewer edits in the worktree.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 3, `Targeted Delta Review`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (N-6 accepted with its comment)
- Score Summary: 9.4 average; every category ≥ 9.4 (Runtime Correctness 9.4 with SR-007; Cleanup 9.4)
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - CR-001's recorder half is reversed by SR-007 on new evidence (delivery's distinct-time reproduction). That was a review gap in rounds 1 and 2, owned here.
  - Finding 1 is fixed in the contract tests.
