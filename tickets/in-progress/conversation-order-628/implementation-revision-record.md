# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, design-spec.md (SR-001…SR-006); Architecture Reviewer, design-review-report.md rounds 1–3 | N/A | `Initial Baseline` | SR-001…SR-006, ARCH-REV-001…ARCH-REV-003 | D-1, D-2, D-3 and SR-006 implemented; ready for code review |
| IR-002 | Code Reviewer, code-review-report.md round 1 (CRR-001) | CR-001 | `Local Fix` | CRR-001 | The three second-clock fallbacks removed; the comment corrected; one new case per side; ready for the delta review |
| IR-003 | Delivery Engineer, DR-001 (Blocked); Solution Designer SR-007; Architecture Reviewer ARCH-REV-004 | DR-001 Finding 1 (Local Fix), Finding 2 (Design Impact → SR-007); N-6 | `Design Impact` + `Local Fix` | SR-007, ARCH-REV-004, DR-001 | Stored traces keep their write time (IR-002's recorder half reverted); contract packages' own suites pass |

## Revision Entries

### IR-001 — The conversation keeps its order; every row time is the node's; a stored message never sorts after its own notice

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/conversation-order-628/design-spec.md` (D-1, D-2 from SR-001/SR-002; D-3 from SR-004/SR-005; SR-006); Architecture Reviewer, `design-review-report.md` rounds 1–3 (ARCH-REV-001 for D-1/D-2, ARCH-REV-002 for SR-005 with notes N-1 and N-2, ARCH-REV-003 for SR-006 with notes N-4 and N-5).
- Triggering finding IDs: N/A (baseline). Reviewer notes applied: N-1, N-2, N-4, N-5.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and checked locally; `Large` / `High`, routed to code review.
- Related solution revision IDs: SR-001…SR-006 (SR-003: the Solution Designer's evidence correction after implementation found the read path's time sort).
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff of the ticket. During implementation, two findings went upstream and came back as solution revisions:
  - The read path sorts by time, so D-2's time-only rule misses native runs (SR-002 added the native source-event clause).
  - D-3 made an external notice sort 1 ms before its message after a reopen (SR-006 stores the message at its admission time).
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-003; REQ-001…REQ-004; AC-001…AC-006.
- Implementation delta (commits on `codex/conversation-order-628`, base `1f761bc8db`):
  - `d67b58c740` D-1: `recentEventMonitorWindow.ts` keeps the conversation's array order and merges compactions by time.
  - `1c6f493625` D-2: the replay builder orders a preface notice after its input; `NATIVE_INPUT_TRACE_SOURCE_EVENT` is exported from autobyteus-ts.
  - `2bb11e0874`: phone probe case MSP-105; MSP-99's restart expectation rewritten (the reminder is the message's preface).
  - `33a75a4ae4` D-3 contracts: `serverTimeSchema`; `occurred_at` on timed messages; `accepted_at` on pending input; `dist/` rebuilt.
  - `18a9eb6f34` D-3 server: AgentRun stamps every delivery once; the three stream boundaries write `occurred_at`; producers outside a run stamp their own time.
  - `87d7321915` D-3 web: rows take the node's time; an own send is `null` until confirmed; `updatedAt` is derived; a timed frame without `occurred_at` is refused.
  - `0b60b9f668` SR-006: the forwarded fact carries `acceptedAt`, and the accumulator stores the user trace at it; `forwardedAt` is removed (N-4); test case N-5 added.
  - The last commit: `stampForDelivery` moved from `agent-run.ts` to `agent-run-event.ts`, keeping `agent-run.ts` under 500 effective lines (it was 500 at base). No behavior change.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01…IMP-15 in the handoff's Checks Run table.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-002 — A stored row's time is the node's or none: no second clock in the recorder or hydration

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/conversation-order-628/code-review-report.md`, round 1 (CRR-001, Fail).
- Triggering finding IDs: CR-001.
- Classification: `Local Fix`.
- Prior authoritative result: IR-001, CRR-001 Fail with CR-001.
- Current authoritative result: CR-001 fixed and checked; `Large` / `High`, back to code review for the delta.
- Related solution revision IDs: N/A.
- Related architecture-review revision IDs: N/A.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: CR-001 found three fallbacks to a clock other than the node's. None is reached today, but each would silently record or show another clock's time, which REQ-004 and the handoff ("no fallback") rule out:
  - `extractEventTime` falls back to the payload's time;
  - the provider compaction boundary falls back to `provider_timestamp`;
  - web hydration's `toDate` falls back to the viewer's clock.
- Approved behavior or requirement IDs affected: REQ-004 / AC-006 (BEH-002's stored times).
- Implementation delta (commits `eaebb94304`, then `8fbffd707f` for fixtures):
  - **`agent-run-event.ts`:** `serverTimeMsOf(event)` is the one rule: the event's `occurredAt`, or an error naming the event type. `serverTimeOf` now builds on it.
  - **`runtime-memory-event-payload.ts`:**
    - `extractEventTime(event)` returns `serverTimeMsOf(event) / 1000`.
    - The payload-time fallback is removed, and with it `extractTimestamp` and its normalizer, which have no other caller (Principle 7).
  - **`provider-compaction-boundary-recorder.ts`:** the boundary trace's `ts` is `extractEventTime(event)`. `provider_timestamp` stays only in the stored `toolResult`, as before.
  - **`runProjectionConversation.ts`:** `toServerTime` gives a stored row without `ts` no time (`null`). `createAIMessage` takes `Date | null`.
  - **`raw-trace-to-historical-replay-events.ts`:** D-2's comment now says the external input is stamped at admission (SR-006).
  - **Tests:**
    - new cases: in `agent-run-event-time.test.ts`, the recorder refuses an unstamped notice and an unstamped provider boundary, and stores a stamped one at the run's time, not the payload's; in `runProjectionConversation.spec.ts`, a row without `ts` hydrates with `null`, and the conversation's times come from the timed rows;
    - 62 fixtures that handed events straight to the accumulator now stamp them: the production `stampForDelivery` in the backend replay tests, a node delivery time in the memory test helpers;
    - the founder-shape notice carries its time as `occurredAt`;
    - one marker written directly to the writer takes a node time after the text's.
  - **Integration and e2e fixtures (`8fbffd707f`):** I had not run the server integration suite in IR-001. Run now, it showed 16 failures in 5 files, all fixtures written before D-2 and D-3:
    - unstamped `TeamAgentEvent`s or backend events fed past the run;
    - expectations without `occurred_at`;
    - the native preface notice expected before its message.
    - Each now delivers events with the node's time (`stampForDelivery`, or a stamped builder) or expects the time and D-2's order.
    - The e2e run-projection test and the codex MCP integration test also stamp what they hand to the accumulator.
- Changed files or areas: the five source files above, the web hydration spec, and 12 server test files (`agent-run-event-time`, the accumulator, the sequencer, system-task-notification, restart-notice, preface-notice-order, stopped-tool-call-read-back, two AGY tests, and the Claude, Codex and Grok compaction tests); in `8fbffd707f`, 6 integration test files and 1 e2e file.
- Local validation and result:
  - IMP-16: on the pre-CR-001 source each new case fails; with the fix they pass, as do both suites, both typechecks at baseline, the guards and contract-dist.
  - IMP-17: MSP-105 after rebuilding passes. The clean-environment server e2e and the integration suite pass after the fixture fixes (127 e2e files; 92 integration files, 523 tests). The probe and integration logs hold no "has no occurredAt" refusal.
  - The fix touches no build input, so IMP-14 and IMP-15 still hold.
- Next recipient or routing: `/code_reviewer` (Large/High), the targeted delta review.
- Remaining limitations or risks: a stored row without `ts` now hydrates with no time. Every node writer stores one, so this happens only for a row written outside them.

### IR-003 — Stored traces keep their write time; the contract packages' own suites carry the new fields

- Triggering role, report path, and round:
  - Delivery Engineer, DR-001 (Blocked), evidence `evidence/delivery/DEL-BLOCK-*`;
  - Solution Designer, `design-spec.md` "SR-007";
  - Architecture Reviewer, `design-review-report.md` round 4 (ARCH-REV-004, Pass).
- Triggering finding IDs: DR-001 Finding 1 (Local Fix), DR-001 Finding 2 (Design Impact → SR-007); ARCH-REV-004 N-6.
- Classification: `Design Impact` (SR-007) plus `Local Fix` (Finding 1).
- Prior authoritative result: IR-002, CRR-002 Pass, API-REV-001 Pass; DR-001 Blocked.
- Current authoritative result: SR-007 and Finding 1 implemented and checked; `Large` / `High`.
- Related solution revision IDs: SR-007.
- Related architecture-review revision IDs: ARCH-REV-004.
- Related code-review revision IDs: CRR-001, CRR-002, CRR-003.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: DR-001.
- Why this implementation revision is recorded:
  - **Finding 2:** reading the run's `occurredAt` in the memory recorder (D-3, made strict in IR-002) changed the stored order for traces built from several events. A reasoning trace took its segment's first event time; a tool call completed at its result took the result's time. The reload sorts by `ts`, so they could move.
  - **How the suite missed it:** my fixture helper stamped `Date.now()`, giving every event in a test the same millisecond. With distinct times, 7 accumulator tests fail.
  - **Finding 1:** the three contract packages' own suites had fixtures without the fields D-3 made required.
- Approved behavior or requirement IDs affected: REQ-002 and AC-003 (the stored order), REQ-004 (stored times stay the node's).
- Implementation delta:
  - **`ba25165c1e` (SR-007):**
    - `provider-compaction-boundary-recorder.ts`, `runtime-tool-trace-sequencer.ts`, `runtime-memory-event-payload.ts` and `runtime-memory-event-accumulator.ts` are restored to base: `extractTimestamp(payload)`, then the writer's `Date.now()`.
    - The accumulator's user trace keeps SR-006's `acceptedAt`.
    - `extractTimestamp` gains N-6's comment: node-local times only.
    - `agent-run-event.ts`: IR-002's `serverTimeMsOf` is folded back into `serverTimeOf`, its only caller. The `occurredAt` doc no longer names the memory recorder. The streams still refuse an unstamped timed event.
    - Tests: the accumulator, sequencer and notice helpers stamp strictly increasing, distinct times (7 ms apart, delivery's shape).
    - The recorder case in `agent-run-event-time.test.ts` now shows a trace stored at its write time, not its delivery time, stamped or not.
    - `preface-notice-order`'s notice carries its time in its payload again, and the accumulator test's marker is back to `ts: 2`.
  - **`2dbfe43c28` (Finding 1):**
    - The fixtures of agent-presentation, collaboration-stream and team-stream gain `occurred_at` and `accepted_at`.
    - agent-presentation adds a case: a timed message without `occurred_at`, or with a number, is refused.
- Changed files or areas: the five server source files and five server test files above, and four contract test files.
- Local validation and result:
  - IMP-18:
    - Red on the pre-SR-007 recorder: delivery's same 7 accumulator tests fail, and so do the new case and the D-2 external cases. With SR-007 all pass.
    - The server unit suite passes (1081 files), the typecheck is at baseline, and the integration suite passes (92 files, 523 tests).
    - The three contract suites pass, and `check:contract-dist` passes.
  - IMP-19:
    - The phone cases MSP-66, 75, 76, 77, 99 and 105 pass. MSP-105 is in order live and reopened, with the user trace before its notice in the node's stored order.
    - The clean-environment server e2e result is recorded there.
- Next recipient or routing: from `get_handoff_rules` (Large/High).
- Remaining limitations or risks:
  - A row's stored time and its live `occurred_at` are two node times of one event, milliseconds apart (SR-007).
  - IR-002's fixture stamps (`stampForDelivery` in the backend replay tests, the integration and e2e feeds) stay. They mirror what AgentRun delivers, and the recorder ignores them.

