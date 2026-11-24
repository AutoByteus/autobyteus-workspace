# Implementation Handoff

Ticket autobyteus-628 (conversation-order-628). Worktree `<worktree>` (`autobyteus-worktrees/conversation-order-628`), branch `codex/conversation-order-628`, base `origin/personal` `1f761bc8db`. Paths below are relative to the worktree.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: the design is `Large` / `High`, so the architecture review was selected and passed: ARCH-REV-001 (D-1, D-2), ARCH-REV-002 (SR-005, D-3) and ARCH-REV-003 (SR-006). ARCH-REV-003 said: "You can complete the work and hand off D-1, D-2, D-3 and SR-006 together." Implementation routes to code review.
- Requirements doc: `tickets/in-progress/conversation-order-628/requirements-doc.md` (REQ-001…REQ-004, AC-001…AC-006).
- Investigation notes: `tickets/in-progress/conversation-order-628/investigation-notes.md`.
- Solution revision record: `tickets/in-progress/conversation-order-628/solution-revision-record.md` (SR-001…SR-006).
- Design spec: `tickets/in-progress/conversation-order-628/design-spec.md` (D-1, D-2; D-3 section; SR-006 section).
- Supplemental task artifacts:
  - `tickets/in-progress/conversation-order-628/probes/` (the Solution Designer's reproduction);
  - `tickets/in-progress/conversation-order-628/follow-ups.md` (FU-001 resolved here; FU-002 and FU-003, the earlier failures implementation found).
- Design review report: `tickets/in-progress/conversation-order-628/design-review-report.md`.
- Architecture review revision record: `tickets/in-progress/conversation-order-628/architecture-review-revision-record.md`.
  - Both files are the Architecture Reviewer's. They are untracked in the worktree: I did not commit them because they are not mine.
- Triggering rework report: N/A (initial).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-001 was the initial round).
- Implementation revision record: `tickets/in-progress/conversation-order-628/implementation-revision-record.md`.
- Current implementation revision ID: `IR-003` (SR-007 and DR-001 Finding 1). IR-001 is the baseline; IR-002 was CR-001.
- Related solution revision IDs: SR-001…SR-007.
- Related architecture-review revision IDs: ARCH-REV-001…ARCH-REV-004.
- Related code-review revision IDs: CRR-001, CRR-002 (Pass), CRR-003 (API/E2E test-code Pass).
- Related API/E2E revision IDs: API-REV-001 (Pass).
- Related delivery revision IDs: DR-001 (Blocked: Finding 1 Local Fix, Finding 2 Design Impact → SR-007).
- Triggering finding IDs: DR-001 Finding 1 and Finding 2 (SR-007); ARCH-REV-004 N-6 applied. Earlier: CR-001 (IR-002); N-1, N-2, N-4, N-5 (IR-001).

What the change does:

- **D-1:** the conversation window shows rows in the conversation's own order (the array order) and no longer sorts by row times. Compaction rows are merged in by their time, before the first message row with a later time.
- **D-2:** after a reload, a platform notice the node delivered in front of a user's input reads back right after that input. The rule's two cases:
  - (a) external runtimes: the user trace is stored immediately after the notice in the same turn, and `u.ts ≤ n.ts`;
  - (b) native: both traces were written by the input processor (`LLMUserMessageReadyEvent`).
  - Any other notice keeps its stored place.
- **D-3:** the node records every row's time; the app only shows it.
  - AgentRun stamps each event it delivers once.
  - `/ws/agent`, `/ws/agent-team` and the Org presentation carry that time as `occurred_at` on timed messages. A pending input entry carries `accepted_at`.
  - The web takes every row time from those fields. An own send has no time (`null`) until the node confirms it, `updatedAt` is derived from row times, and a timed frame without `occurred_at` is refused at the parser.
- **SR-006:** an external runtime's user trace is stored at the input's admission time (`acceptedAt`, the same value as `accepted_at`), so it never sorts after its own notice.

## Routing Classification (Mandatory)

- Task size: `Large`.
- Architecture risk: `High`.
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk" (SR-004 reclassifies to Large/High) and "D-3 … Classification".
- Classification confirmed or changed: `Confirmed`.
- Evidence and rationale: the implementation matches the design's scope:
  - three stream boundaries and one shared contract field, with rebuilt contract `dist/`;
  - AgentRun's delivery;
  - the web's row times;
  - the external trace's stored time.
  - No new boundary, stored field or migration was needed.
- Selected route: `Code Review`.
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High).
- New design impact or escalation trigger: `None` open. Two were raised during implementation and resolved upstream: SR-002 (native preface) and SR-006 (external trace time).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, AC-001, AC-002, AC-005) | The live window shows the conversation's order whatever the viewer's clock | `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts`: `buildRecentEventMonitorPresentation` keeps the message descriptors in array order, and `mergeCompactionsIntoConversation` inserts compactions. The `order` field is removed | Pass: IMP-01 (4 of 9 fail on base, 9 of 9 with the fix), IMP-03 (MSP-105 fails on the base window and passes with the fix), IMP-10 |
| BEH-002 (REQ-002, AC-003) | A preface notice reads back right after its input, as it shows live | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`: `isPrefaceOfInput` and `orderPrefaceNoticesAfterTheirInput`, applied before the trace loop. `NATIVE_INPUT_TRACE_SOURCE_EVENT` is exported from `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`. For external runtimes, `runtime-memory-event-accumulator.ts` stores the user trace at `acceptedAt` (SR-006) | Pass: IMP-02, IMP-09 (the N-5 case), IMP-10 (reopened order equals live order in 3 of 3 rounds) |
| BEH-003 (REQ-003, AC-004) | A compaction row never reorders messages; it is placed by its time | `mergeCompactionsIntoConversation` (strict `<`: at an equal time the message comes first). The compaction time is the frame's `occurred_at` (`compactionActivityProjection.ts`, N-2) | Pass: IMP-01 (the compaction cases), IMP-07 |
| REQ-004 / AC-006 (BEH-001, BEH-003) | Every row time the app keeps is the node's; the app stamps none with its own clock | Contracts: `schema-helpers.ts` `serverTimeSchema`, `agent-presentation-message-dtos.ts`, `agent-input-state-dto.ts`. Node: `agent-run-event.ts` (`occurredAt`, `stampForDelivery`, `serverTimeOf`), `agent-run.ts` `deliverToListeners`, the three mappers, and the producers outside a run. Web: `messageParser.ts`, the handlers, `userMessageProjection.ts` (N-1: `accepted_at`), `localUserSubmission.ts` (`null` until confirmed), `conversationRowTimes.ts` (`updatedAt` derived) | Pass: IMP-06, IMP-07 (all 4 cases fail on the pre-D-3 web and pass with the fix), IMP-08, IMP-09 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- **D-1 (web):**
  - `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts`.
- **D-2 (server):**
  - `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`;
  - `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` (the exported constant only).
- **D-3 contracts:**
  - `autobyteus-agent-presentation-contracts/src/{schema-helpers,agent-presentation-message-dtos,agent-input-state-dto}.ts`;
  - `dist/` rebuilt for agent-presentation, team-stream and collaboration-stream (`pnpm check:contract-dist` passes).
- **D-3 node, the one stamp point:**
  - `src/agent-execution/domain/agent-run-event.ts`;
  - `src/agent-execution/domain/agent-run.ts` (`deliverToListeners`; the subscribe snapshot);
  - `src/agent-execution/events/dispatch-processed-agent-run-events.ts` (takes `deliver`).
- **D-3 node, the wire:**
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts` (`TIMED_MESSAGE_TYPES`);
  - `src/services/agent-streaming/team-agent-event-websocket-projector.ts`;
  - `src/agent-collaboration/execution/events/{agent-presentation-event,agent-presentation-message-projector,collaboration-agent-presentation-adapter}.ts`.
- **D-3 node, producers outside a run** (each stamps its own time):
  - `collaboration-agent-presentation-event-adapter.ts`, `member-input-presentation-event-builder.ts`;
  - `team-agent-status.ts`, `team-flat-execution-callbacks.ts`, `team-run-agent-access.ts`;
  - `unsent-input-failure-observer.ts`;
  - `models.ts` `createErrorMessage`, `agent-team-stream-handler.ts`, `team-tool-approval-command-handler.ts`;
  - `peer-run.ts`, `peer-run-stream-session.ts`;
  - `agent-stream-handler.ts` (send acks).
- **D-3 node, batch items:**
  - the three `websocket-egress/*-sequenced-shape.ts` files;
- **Memory (after SR-007):** the recorder files match base, except `runtime-memory-event-accumulator.ts`, whose user trace takes `acceptedAt` (SR-006), and `extractTimestamp`'s N-6 comment in `runtime-memory-event-payload.ts`.
- **D-3 input state:**
  - `src/agent-execution/input/agent-run-input-admission-state.ts` (`acceptedAt`, `accepted_at`).
- **D-3 web:**
  - `types/conversation.ts` (`Message.timestamp: Date | null`);
  - `utils/conversation/conversationRowTimes.ts`;
  - `services/agentStreaming/protocol/{messageParser,messageTypes,compactionTypes,agentCommandTypes,memberInputMessageTypes}.ts`, `teamStreamDtoAdapters.ts`;
  - handlers: `segmentHandler`, `toolActivityProjection`, `toolLifecycleHandler`, `systemTaskNotificationHandler`, `teamHandler`, `agentStatusHandler`, `memberInputMessageHandler`, `compactionActivityProjection`, `userMessageProjection`;
  - `agentStreamMessageProjector.ts`, `services/runSubmission/localUserSubmission.ts`;
  - hydration: `runProjectionConversation.ts`, `teamMemberToolStateReconciliation.ts`, `services/activity/nativeCompactionActivityReconciliation.ts`;
  - `demo/runtime.ts`.
- **SR-006:**
  - `src/agent-execution/input/agent-run-input-contract.ts` (`forwarded.acceptedAt`), `agent-run-input-admission-state.ts`;
  - `src/agent-execution/domain/agent-run-command-observer{,-dispatch}.ts` (`acceptedAt` replaces `forwardedAt`);
  - `src/agent-memory/services/runtime-memory-event-accumulator.ts`.
- **New tests:**
  - web: `services/eventMonitor/__tests__/recentEventMonitorWindow.clockOrder.spec.ts`, `services/agentStreaming/__tests__/serverRowTimes.spec.ts`;
  - server: `tests/unit/run-history/projection/preface-notice-order.test.ts`, `tests/unit/agent-execution/agent-run-event-time.test.ts`;
  - in `tests/unit/agent-execution/agent-run.test.ts`, the case "tells the forwarding observers the input's admission time…".
- **Phone probe:**
  - `autobyteus-web/tests/e2e/mobile-conversation-order-cases.mjs` (MSP-105, registered in `mobile-shell-probe.mjs`);
  - `mobile-restored-run-cases.mjs` (MSP-99's restart expectation).

## Important Assumptions

- **Old runs are read as they are** (Persisted data: Not Affected).
  - An external run stored before SR-006 has the user trace at its forwarding time.
  - D-2's rule (a) and the time sort read it as before. The founder's stored shape reads in order (IMP-02).
- **The web and the node deploy at the same version** (DESIGN.md rule 9).
  - A node without `occurred_at` is not supported: the web parser refuses its timed frames.
- **`null` row times.** An own send's row has `null` until the echo (Team: `received_at`) or the input state (standalone: `accepted_at`) gives the node's time. The readers of the nullable `Message.timestamp`, and what each does:
  - `conversationRowTimes.refreshConversationUpdatedAt` skips null rows;
  - `runProjectionConversation` (createdAt/updatedAt) takes only non-null times;
  - `teamMemberToolStateReconciliation` skips AI messages without a time;
  - `segmentHandler.timeOfSegmentMessage` throws: an AI message is always created with its frame's time;
  - `userMessageProjection` merge keeps the time already shown (`existing.timestamp ?? message.timestamp`);
  - the recent window (`toRecentWindowTimestampMs`) reads null as 0. Only compaction placement uses it, so a compaction waits after an unconfirmed send until the node confirms it.
  - A local error row (a send the node never took) stays `null`: the node never recorded it.
  - A reloaded row stored without `ts` hydrates with `null`, not the viewer's clock (`toServerTime`, IR-002). Every node writer stores a `ts`.
- **`TOOL_LOG` and the send ack are timed.** `TOOL_LOG` creates and times a tool row; a send ack's ERROR becomes a row. Both carry `occurred_at`.
- **No fallback to another clock anywhere this change writes a row time:**
  - native compaction: the provider-timestamp and viewer-clock fallbacks in `compactionActivityProjection.ts` and `nativeCompactionActivityReconciliation.ts` were removed (N-2);
  - stored traces (SR-007, IR-003): the memory recorder does not read `occurredAt`. Each trace is stored at its payload's own time, else its write time, as on base, so the stored order is the write order. These are node-local times (N-6). Only the user trace takes its admission time `acceptedAt` (SR-006). IR-002's strict `occurredAt` read was reverted: a trace built from several events took an earlier event's time and moved on reload (DR-001 Finding 2);
  - hydration: see the `null` row times above.

## Known Risks

- **A row's stored time and its live time are two node times of the same event, milliseconds apart** (SR-007). The order is the same; the app shows each as given. For a user row:
  - Live, a Team member's message shows its echo's `received_at`, and after a reload, its stored `acceptedAt`.
  - Both are the node's times, and the order is the same.
- **A producer outside a run that forgets to stamp its time** makes its message fail loudly: the mapper throws, and the Team and Org adapters reject the event. The memory recorder does not depend on it (SR-007).
  - Every such producer found is listed above, and the suites cover them.
  - A new producer added later must stamp its own time.
- **Typecheck baselines are unchanged:** the server's test-file errors stay at 972 in 299 files, the web's at 86 in 36.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (D-1, D-2) plus the approved contract change D-3 (REQ-004).
- Reviewed root-cause classification: `Local Implementation Defect` (the window's sort) plus a `Missing Invariant` (the projection's preface order). D-3 removes the second clock everywhere.
- Reviewed refactor decision: `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `Yes`, twice. Both returned as SR-002 and SR-006.
- Evidence / notes:
  - The read path's time sort (`raw-trace-record-normalizer.ts:121-130`) meant the founder's external shape already read in order on the base. D-2 is needed for native runs and for equal times (SR-003).
  - A standalone echo carries no `received_at`, so the bug shows only on a Team member; MSP-105 uses one.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. A timed frame without `occurred_at` is refused, not given a fallback time.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed (IR-003 restores `extractTimestamp`, which the recorder uses again, and folds IR-002's `serverTimeMsOf` back into `serverTimeOf`, its only caller):
  - the window's `order` field;
  - the compaction projection's `now` input and provider-timestamp helper;
  - the viewer-clock fallback in native compaction reconciliation;
  - `AgentRunUserMessageForwardedPayload.forwardedAt` and its `new Date()` (N-4; `rg forwardedAt` over `autobyteus-server-ts/src` and `tests` finds nothing);
  - `onListenerError` on the processed-event dispatcher (`deliver` replaces it).
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes`.
  - `occurred_at` is only on timed message types (one `serverTimeSchema`).
  - Presentation events use `UntimedAgentPresentationEvent` before the adapter attaches the time.
- Canonical shared design guidance was reapplied during implementation: `Yes`.
- Deviations from a design principle decided during implementation: `None`.
- Changed source implementation files stayed within the size guardrails: `Yes`.
  - `agent-run.ts` was 500 effective lines at base. D-3 took it to 501, so `stampForDelivery` moved to `agent-run-event.ts`, the owner of `occurredAt` and `serverTimeOf`. It is now 498.
  - No source file has a changed-line delta above 220; the largest is `agent-run.ts` at 43.
- Notes: many spec fixtures gained `occurred_at` or `occurredAt`. Specs that asserted the old behavior were rewritten to the approved behavior (DESIGN.md rule 11): `updatedAt` equal to the viewer's clock, and a navigation time equal to `updatedAt`.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`.
- Design-spec decision reference: "Persisted Data / State Transition Decision"; D-3 "Persisted data"; SR-006 "Contract" (no stored field added; only the writer's chosen time changes).
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence: IMP-02 reads the founder's stored shape (written before this change) through the real projection provider.
- Migration implementation: N/A.
- Deviation: `None`.

## Environment Or Dependency Notes

- macOS arm64, Node v22.23.1, pnpm.
- A fresh worktree needs `pnpm -C autobyteus-ts build` before the web suite: a cross-package web spec fixture imports autobyteus-ts's `dist/`.
- The phone probe needs `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` first.
  - A stale built server made two server e2e startup files fail once; rebuilding fixed them (Rule 9: found, not a product failure).
- The server e2e must run with `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR"` (TESTING.md "Clean environment elsewhere"): this shell carries the live app's variables. IMP-12 is the clean run.
- The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are local build output, not part of the change.
- No real provider keys were used: every probe and e2e run used scripted runtimes.
- No run touched the user's running AutoByteus or `~/.autobyteus`. The founder's run data was read as evidence only, during investigation.

## Checks Run

Evidence is under `tickets/in-progress/conversation-order-628/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run services/eventMonitor/__tests__/recentEventMonitorWindow.clockOrder.spec.ts`, on the base window, then the fix | base window file; `d67b58c740` | macOS, Node 22, fake timers | the live handlers + `buildRecentEventMonitorPresentation` | BEH-001, BEH-003, AC-001, AC-002, AC-004 | Pass (base: Fail 4/9, as expected) | `IMP-01-d1-window-order.log` | base `4 failed`; fix `9 passed` |
| IMP-02 | `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/run-history/projection/preface-notice-order.test.ts`, on the base, the time-only rule, then the fix | base; `1c6f493625` | macOS, Node 22 | the real writers, the file stores, `LocalMemoryRunViewProjectionProvider`, the replay | BEH-002, AC-003 | Pass | `IMP-02-d2-preface-order.log` | fix `8 passed` |
| IMP-03 | MSP-105 on a phone bundle with the base window (a), then the fix (b): `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-105` | base window, `2bb11e0874` | macOS, Chrome headless 390x844, loopback node, scripted AGY | the whole stack: Team stream → phone window | BEH-001, AC-001, AC-002 | (a) Fail as expected (phone behind: message drawn after notice and reply); (b) Pass | `IMP-03-msp-105-base-window/`, `IMP-03-msp-105-fix/` | `MSP-105-phone-order-behind-sends-live.png` in each |
| IMP-04 | the web and server unit suites, the autobyteus-ts input-processor tests, both typechecks, the three web guards | tree = `2bb11e0874` | macOS, Node 22 | D-1, D-2 | AC-005 | Pass | `IMP-04-suites-typechecks-guards.log` | `[typecheck] PASS` ×2 |
| IMP-05 | the probe's conversation and notice cases (MSP-66, 75, 76, 77, 99, 102, 103, 105); MSP-99 rewritten | tree = `2bb11e0874` | as IMP-03; native node delta | the notice rows, restored runs | AC-005, BEH-002 | Pass after MSP-99's rewrite (its restart reminder is a preface) | `IMP-05-probe-conversation-and-notice-cases/` | `run-msp-99-rewritten.log`: `MSP-99 Pass` |
| IMP-06 | `pnpm exec vitest run tests/unit/agent-execution/agent-run-event-time.test.ts` | `18a9eb6f34` (+ `33a75a4ae4`) | macOS, Node 22 | AgentRun stamping; the three stream mappers | REQ-004, AC-006 | Pass | `IMP-06-d3-server-event-time.log` | `4 passed` |
| IMP-07 | `NUXT_TEST=true pnpm exec vitest run services/agentStreaming/__tests__/serverRowTimes.spec.ts`, on the pre-D-3 web, then the fix | `b45ef33694` web; `87d7321915` | macOS, Node 22, the viewer's clock ±2 s | the handlers, the input state, the parser, the window | REQ-004, AC-006, N-1 | Pass (pre-D-3: Fail 4/4, as expected) | `IMP-07-d3-web-row-times.log` | fix `4 passed` |
| IMP-08 | the web and server unit suites, both typechecks, the three guards, `pnpm check:contract-dist`, tracked-imports | tree = `87d7321915` | macOS, Node 22 | D-1…D-3 | AC-005, AC-006 | Pass | `IMP-08-d3-suites-typechecks-guards.log` | `803 passed`; `1074 passed \| 5 skipped` |
| IMP-09 | SR-006: the focused tests; a red run with the 5 SR-006 source files stashed; then the web and server suites, both typechecks, the guards, contract-dist | tree = `0b60b9f668` | macOS, Node 22 | the forwarded fact, the accumulator, the replay | BEH-002, AC-003, N-4, N-5 | Pass (red run: 11 fail, as expected) | `IMP-09-sr006-admission-time.log` | `97 passed`; `1074 passed \| 5 skipped`; `803 passed` |
| IMP-10 | rebuild the server and the phone bundle; `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-105` | `0b60b9f668` | as IMP-03 | the whole stack, live and reopened | AC-001, AC-002, AC-003, AC-006 | Pass | `IMP-10-msp-105-sr006/` | `nodeOrder`: user before notice in all 3 rounds |
| IMP-11 | the whole phone probe, after rebuilding the server and the phone bundle; base comparison of its failing cases | `0b60b9f668` build | as IMP-03 | the whole stack | AC-005; MSP-105 for AC-001…AC-003 | Pass for this change: 97 Pass, 6 Fail, all six failing on the base too (MSP-17/58/65/82/87 = FU-002; MSP-61 = autobyteus-609 FU-006) | `IMP-11-whole-phone-probe/` | `unknownBrowserErrors: 0`; `MSP-105: Pass` |
| IMP-12 | `cd autobyteus-server-ts && env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm exec vitest run tests/e2e`, after `build` and `test:integration:prepare` | `6ad8920bd6` | macOS, Node 22, clean environment, scripted runtimes | the whole server over HTTP/WebSocket | AC-005 | Pass | `IMP-12-server-e2e-clean-env.log` | `Test Files  127 passed \| 165 skipped`, `Tests  573 passed` |
| IMP-13 | the agent-execution, agent-streaming, team-execution, agent-memory and run-history unit folders; server typecheck | `6ad8920bd6` | macOS, Node 22 | the `stampForDelivery` move | REQ-004 | Pass | `IMP-13-stamp-move.log` | `320 passed \| 4 skipped`; `[typecheck] PASS` |
| IMP-14 | fresh `--no-local` clone; `pnpm install --frozen-lockfile`; `pnpm build:electron:mac -- --arm64` with the job's env; the job's Prisma and terminal-runtime verify steps | `3e4c6322a4` (code = `6ad8920bd6`) | macOS arm64, Node 22, `env -i` | the release build's gates, packaging, the contract `dist/` as build inputs | DESIGN.md rule 12 | Pass | `IMP-14-fresh-start-build.log` | `build=0`, `verify-prisma=0`, `verify-terminal=0`, `[typecheck] PASS` |
| IMP-15 | `pnpm release:test --ref codex/conversation-order-628`; `gh run watch 45293566395 --exit-status` | `5c598ffca8` (code = `6ad8920bd6`) | GitHub Actions, release-desktop.yml, build only | all five desktop targets | DESIGN.md rule 12 | Pass | `IMP-15-build-only-desktop-release.log` | `conclusion: success`; 6 build jobs success; sign and publish skipped |
| IMP-16 | the two new CR-001 cases and their files, on the fix and with the 4 CR-001 source files stashed; then `pnpm test:unit` (server), the web suite, both typechecks, the three guards, `pnpm check:contract-dist` | `eaebb94304` | macOS, Node 22 | `serverTimeMsOf`, the memory recorder, the provider boundary recorder, hydration | REQ-004, AC-006, CR-001 | Pass (pre-fix: each new case fails, as expected) | `IMP-16-cr001-no-second-clock.log` | red `1 failed` ×2; `1074 passed \| 5 skipped`; `803 passed` |
| IMP-17 | rebuild; MSP-105; `env -i … pnpm exec vitest run tests/e2e`; `env -i … pnpm test:integration` (after `test:integration:prepare`) | `eaebb94304` (MSP-105, whole e2e); `8fbffd707f` (integration suite; the one fixed e2e file) | macOS, Node 22, clean environment, scripted runtimes | the strict recorder on real paths; the integration fixtures | AC-001…AC-003, AC-005, AC-006, CR-001 | Pass after fixture fixes (no product change) | `IMP-17-cr001-runtime-checks/` | MSP-105 `Pass`; integration `92 passed`, `523 passed`; 0 refusals |
| IMP-18 | the memory, run-history, execution and restart folders; a red run with the 5 SR-007 source files stashed; `pnpm test:unit`; server typecheck; clean `pnpm test:integration`; `pnpm -C <each contract package> test`; `pnpm check:contract-dist` | `ba25165c1e`, `2dbfe43c28` | macOS, Node 22 | the recorder's trace times; the contract packages' own suites | REQ-002, AC-003, REQ-004, DR-001 Findings 1–2, N-6 | Pass (red: delivery's 7 accumulator tests + the new case + D-2 external cases fail, as expected) | `IMP-18-sr007-write-time-and-contract-suites.log` | `1081 passed \| 5 skipped`; integration `523 passed`; contracts `# fail 0` ×3 |
| IMP-19 | rebuild; `mobile-shell-probe.mjs --cases=MSP-66,MSP-75,MSP-76,MSP-77,MSP-99,MSP-105`; clean `vitest run tests/e2e` | `ba25165c1e` (+ `2dbfe43c28`) | macOS, Chrome headless, loopback nodes, scripted runtimes; clean env | the whole stack, live and reopened; the server over HTTP/WebSocket | AC-001…AC-003, AC-005 | Pass | `IMP-19-sr007-phone-and-e2e/` | `mobile-shell probe: Pass`; MSP-105 user before notice ×3; e2e `127 passed` |

- Not run, and why:
  - real provider runtimes (left to API/E2E; the probes use scripted runtimes);
  - signing and notarization (the build-only run skips them; they need the release's secrets). Packaging for Windows, Linux and macOS x64 ran in IMP-15;
  - the iOS and Android apps (the phone surface checked is the mobile web bundle the probe serves).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the conversation window (desktop and phone), live and reopened. A Team member's conversation is watched or sent to with the viewer's clock behind or ahead of the node's. Notice rows, compaction rows.
- Approved references: requirements-doc.md AC-001…AC-006; design-spec.md D-1, D-3.
- Existing components reviewed: no component or style changed. The change is in the window's ordering and the row times it reads; the existing notice and message rows render as before.
- Surface used: the phone probe (TESTING.md's phone surface: the mobile web bundle on a loopback node, Chrome headless 390x844 with touch), with the phone's clock offset by an init-script `Date` shift.
- States inspected: live and reopened; phone sending and only watching; clock 2 s behind and 2 s ahead; the MSP-99 restart and wake notices live and after a reload. The screenshots in IMP-03, IMP-05 and IMP-10 were opened and checked: previous reply, the message, "Tools updated", the reply.
- Visual or interaction issues found and corrected: the order defect itself (IMP-03a shows it). No layout change.
- Remaining limitations: the desktop Electron window was not opened. It uses the same `buildRecentEventMonitorPresentation`, which the web specs drive.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-001/AC-002 on a real runtime:** a Team member on Claude or Codex, with the phone's clock behind, a tool-list change (which brings the "Tools updated" preface), live and after a reopen.
- **AC-003 on native AutoByteus:** a skill update before a message, then a reload (D-2 rule (b)).
- **AC-006:** with the viewer's clock offset, every row's shown time (hover/time labels) equals the node's time; a standalone own send shows its time once the input state arrives.
- **A queued message during a restart notice's own turn** (N-5) on a real external runtime, reloaded.
- **An older client against this node, or the reverse,** is not supported (same-version deploy). Confirm the desktop bundles the matching web and node.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E owns the executable coverage of AC-001…AC-006 on real runtimes, and the fresh-start build of TESTING.md for the final commit if the code changes after IMP-14.
- **Earlier phone probe failures:**
  - MSP-17, MSP-58, MSP-65, MSP-82, MSP-87 fail identically on the base `1f761bc8db`, on the pre-D-3 code and on this change (FU-002).
  - MSP-61 is autobyteus-609's open FU-006. Its case file is unchanged, and this branch does not touch Run Settings.
- **FU-003 is withdrawn (sent to the Solution Designer).** My earlier server e2e runs used the inherited shell instead of TESTING.md's `env -i` clean environment. In the clean environment every file passes (IMP-12). No live data was written; IMP-12 records how that was checked.
- The Brief Studio e2e files need `pnpm -C autobyteus-server-ts test:integration:prepare` first.
- **Docs sync for delivery:** the stream payloads gained `occurred_at` and pending input entries `accepted_at`. Update:
  - `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`;
  - `autobyteus-server-ts/docs/modules/agent_streaming.md`;
  - `autobyteus-server-ts/docs/modules/agent_execution.md` (the run stamps each delivery; the external user trace's time is its admission).
