# Code Review Report — grok-self-started-turns-517

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/grok-self-started-turns-517/requirements-doc.md` (approved SR-001; AC-006 added SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, probes `evidence/grok-acp-probe.jsonl`, `evidence/grok-acp-probe2.jsonl` (frames 171, 211-216, 251, 338-347, 425 checked)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: None
- Relevant Solution Revision IDs: SR-001…SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-005 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-004, ARCH-REV-005
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the round-2 delta `5ab411af71..cc2701af8a` touches product code in one file only, `acp-agent-session.ts` (+4/−6): it removes `AcpTurnOrigin`, moves its doc onto `ActivePrompt` and changes one class-doc reference. Ticket documents and evidence IMP-07 also changed. The delta stays within CR-001: no logic, interface or data-shape change. Round-1 evidence carries forward for every other check.
- Trigger: implementation IR-003 (CR-001 Local Fix), commit `cc2701af8a`. Round 1: IR-002 @ `5ab411af71`, base `origin/personal` @ `ca4317a386`
- Prior Review Round Reviewed: 1 (CRR-001, Fail, CR-001)
- Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change alters the shared ACP connection's inbound ordering (Grok and DeepSeek) and the shared ACP session's turn lifecycle (second origin, hand-over, cancel, idle, held input); several files within existing ownership.

## Review Scope

- Changed implementation and behavior reviewed: SR-005 Intended Change 0-7. Wire-order delivery in the ACP connection; the `prompt_running`/`prompt_completed` effects; the Grok signal interpretation; the session's provider-started turns and one-batch hand-over; the converter notice; sender id and memory set; backend comment; GLOSSARY.md.
- Files / areas reviewed (server paths under `autobyteus-server-ts/`):
  - `src/runtime-management/acp/acp-client-connection.ts`
  - `src/agent-execution/backends/acp/session/acp-agent-session.ts`
  - `src/agent-execution/backends/acp/acp-agent-session-profile.ts`
  - `src/agent-execution/backends/acp/events/acp-session-update-converter.ts`
  - `src/agent-execution/backends/acp/backend/acp-agent-run-backend.ts` (comment; `getLifecycleSnapshot`, `dispatchUserInput` and `interrupt` read for the busy/stop path)
  - `src/agent-execution/backends/grok/grok-build-prompt-signals.ts` (new), `grok-build-session-profile.ts`
  - `src/agent-execution/domain/system-task-notification-senders.ts`, `src/agent-memory/services/runtime-memory-event-accumulator.ts`
  - `GLOSSARY.md`
  - Tests: `acp-provider-started-turns.test.ts`, the connection wire-order cases, `grok-build-session-profile.test.ts`, the memory test, `acp-fake-agent-harness.ts`, `fake-acp-agent.mjs` pause row, `grok-fake-cli.ts`, the replay E2E cases and the gated live case.
  - SDK `@agentclientprotocol/sdk` 1.5.0 `dist/jsonrpc.js` (`receive` :625, `receiveMessage` :724, `processIncomingMessage` :748) and `dist/acp.js` (`extNotification` :1091-1143) read to confirm the reordering premise and that ext methods reach the client unchanged.
- Explicit exclusions: the web (no change; generic `SYSTEM_TASK_NOTIFICATION` rendering, as the design's Derived consumers says); ticket evidence scripts (`evidence/*.mjs`, `evidence/imp-diag/*`, outside the vitest include `tests/**/*.test.ts`).
- Checks rerun: none. IMP-02…IMP-05 ran on the reviewed commits' code, and no finding needed a new check.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Show Grok's self-started turn like a Claude provider turn: notice, content, tool calls, usage, end, busy while it runs, held input, Stop. Recorded in memory. Other runtimes unchanged.
- Design-spec behavior map verified against the implementation: Yes (DS-001, DS-002, DS-003).
- Design review report and round confirmed: ARCH-REV-005 Pass on SR-001…SR-005.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `inboundFrameStage` (:224) → `routeExt` → `AcpAgentSession.onExtNotification` (:230) → Grok profile `interpretGrokQueueChanged` → `applyEffects` (:289) → `onPromptRunning` in `ready` (:373) → `openProviderTurn` (:360: `openTurn` + `converter.notice`) → `emit` → backend `publish`. Then content via `onSessionUpdate` (in turn), and `turn_completed` → `onPromptCompleted` (:393) → `finishTurn` → `ready`. Memory: sender id in `RECORDED_SYSTEM_NOTICE_SENDER_IDS`. Live IMP-04 shows the path end to end. | — |
| BEH-002 | Confirmed | Busy: the backend's `getLifecycleSnapshot` (:101) and `dispatchUserInput` (:137) read `session.activeTurnId`, which is set for the whole provider turn. Hand-over: `finishTurn` (:407-420) emits input end, provider `TURN_STARTED` and the notice in one `emit` and never sets `ready` in between. Probe 2 A frames 211-216 match the bookkeeping: input id, mark completed, pending, response. | — |
| BEH-003 | Confirmed | `interrupt` → `session.cancel` (:188, either origin) → `cancelling` → Grok `turn_completed(cancelled)` → `onPromptCompleted` → `endTurnFor` (`cancelling` → interrupted). Probe 2 B frame 425. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-001 | BEH-001, REQ-001/002/004 | System | Grok Build | A background command ended after the input turn; Grok starts its own prompt | `_x.ai/queue/changed` with a `runningPromptId` while the run is idle | Normal | DS-001 | Turn shown with notice, content, tools, usage, end; notice in memory | probe 1; live IMP-04 | Supported Normal Scenario | Use |
| SC-002 | BEH-002, REQ-003, AC-006 | User + System | User; Grok | A job ends during an input turn while the user's message is held | `turn_completed(input)` → `queue/changed(provider)` → response | Normal | DS-002 / DS-003 | One-batch hand-over; the message is held through the provider turn | probe 2 A frames 211-216 | Supported Normal Scenario | Use |
| SC-003 | BEH-003, REQ-003, AC-002 | User | User | Stop Grok's own turn | Run stop control → `INTERRUPT_GENERATION` | Normal | `interrupt` → `cancel` → `turn_completed(cancelled)` | `TURN_INTERRUPTED`, idle | probe 2 B | Supported Normal Scenario | Use |
| SC-004 | REQ-005, AC-004; connection contract "malformed agent traffic never fails a run" | Contract | Grok / DeepSeek process | Every agent-to-client frame on the ACP stream | ACP stdout | Normal | `inboundFrameStage` → route or SDK | Wire order kept; failures contained | IMP-01; SDK `jsonrpc.js:776-789` | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 (resolved in round 2) | `export type AcpTurnOrigin = "input" \| "provider"` (`acp-agent-session.ts:64`): nothing imports it and no type references it. `ActivePrompt` (:67-69) restates the two literals itself. | Principle 7 (no dead code in touched files); Principle 15 (one concept, one representation) | Engineering contract | A reader takes it for the session's turn-origin contract. It is a second, unused representation of `ActivePrompt.origin`, and the two can drift. | `Grep AcpTurnOrigin` over `autobyteus-server-ts`: one declaration, one doc-comment mention (:79), no type use | Promote | This ticket | CR-001: use it as the origin type in `ActivePrompt`, or remove it and keep the doc on `ActivePrompt`. A one-line fix. |
| CAND-002 | Stop pressed in the gap between `turn_completed(input)` and the input response while a provider prompt is pending. The hand-over still opens the provider turn. | SC-003 combined with SC-002 | — | Frames 211-216 all arrive at t=60.0, so this needs a stop inside a sub-millisecond window. Even then the provider turn opens `prompting`, and Grok's `turn_completed(cancelled)` ends it interrupted. | probe 2 A timing | Reject | — | Artificial timing; the outcome is still coherent. |
| CAND-003 | The inbound stage delivers notifications synchronously but permission requests through the SDK's async chain. A notification after a request on the wire can now reach the session before the request. | SC-004 | Agent sends `session/request_permission` followed by more frames for the same session | Grok and DeepSeek wait for the client's answer before that tool continues. The only thing that could change is the display order of an unrelated parallel tool's card. No turn end can overtake a request. | SDK `receive` :625 (no per-message await); probes show no updates between a request and its answer | Reject | — | No supported path with a material consequence. |
| CAND-004 | A notification right after a response may be handled before the response's continuation (the design's one-direction caveat). | SC-004 | Grok frames after a `session/prompt` response | After a response, the next frames come ≥1 s later (probe 2: 216 → 217 at +1.0 s; 342 → 345 at +2.2 s, summaries the profile ignores). | probe 2 lines 215-220, 341-347 | Reject | — | Documented in the design (RSK-003). Not reachable with a consequence. |
| CAND-005 | Buffered frames are flushed in `registerSession` → `deliver`, outside the stage's `try/catch`. Frames now reach it without SDK schema validation. | SC-004 | Frames for a session that is still opening | Flushed while the session is `opening_*`: `onSessionUpdate` returns before the converter (`!isInTurn()`), and `onExtNotification` already catches profile errors. The flush cannot throw. | `acp-agent-session.ts:222-241` | Reject | — | Not reachable. |
| CAND-006 | Per-frame `try/catch` and minimal `session/update` checks: defensive machinery? | SC-004 | Contract | They replace the SDK's handler catch and schema drop, which the stage now bypasses, and keep the existing contract (REQ-005). | design SR-005 item 0; `jsonrpc.js:776-789` | Reject (as a finding) | — | Required by the approved design. Not speculative. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Design: `Missing Invariant`, no refactor. The implementation extends the session's single-origin model and bypasses nothing. | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | No supplements. Matches design items 0-7 rule by rule (onPromptRunning/onPromptCompleted/finishTurn vs item 3; the stage vs item 0, `$/` pass-through = MP-005). | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…003 are traceable in code, as in the table above. | — |
| Ownership boundary preservation and clarity | Pass | The session alone owns the turn lifecycle and provider turn ids. The profile only reads signals. The converter owns event shape. The connection owns ordering and routing. AgentRun and backend logic are untouched. | — |
| Off-spine concern clarity | Pass | `grok-build-prompt-signals.ts` sits beside the existing `grok-build-mcp-readiness.ts` interpreters. | — |
| Existing capability/subsystem reuse | Pass | Profile effects, `SYSTEM_TASK_NOTIFICATION`, the memory recorded-sender set and `endTurnFor` are all reused. | — |
| Reusable owned structures | Pass | `AcpPromptNotice` is shared by the effect and the pending prompt. | — |
| Shared-structure/data-model tightness | Pass | The two effect kinds are tight. `ActivePrompt` is a discriminated union per origin (`completed` only on input). | — |
| Repeated coordination ownership | Pass | `openTurn` is the one opening step for both origins (it replaces the inline steps of `startTurn`). Every end goes through `finishTurn`. | — |
| Empty indirection check | Pass | No new port, adapter or wrapper. `notice()` builds an event. `deliverNotification` owns validation and containment. | — |
| Separation of concerns / file responsibility | Pass | Each file keeps its concern. | — |
| Ownership-driven dependency check | Pass | Grok backend → domain sender ids; session → profile types; no cycles. | — |
| Visible dependencies (P16) | Pass | No new lookups. `logger` follows the module-level `console.warn` convention (same shape in `acp-agent-run-backend.ts:33`). | — |
| Authoritative Boundary Rule | Pass | AgentRun reaches the session only through the backend. The connection routes to `AcpSessionFrameHandler` only. | — |
| File placement | Pass | The new file is in `backends/grok/`, next to its sibling interpreters. | — |
| Flat-vs-over-split layout | Pass | One new 42-line file with one concern. | — |
| Interface/API boundary clarity | Pass | `prompt_running {promptId, notice}` and `prompt_completed {promptId, stopReason}` have explicit identity. `notice(content, senderId)` sits beside `usage`/`compaction`. | — |
| Naming / one vocabulary (P15) | Pass | The `provider` / `input` origins and "Provider-started turn" are consistent with Claude and the glossary. Since round 2 the origins have one representation, `ActivePrompt` (CR-001 resolved). | — |
| No unjustified duplication | Pass | The opening steps were deduplicated into `openTurn`. | — |
| Patch-on-patch complexity control | Pass | IR-001's blocked work was resolved upstream (SR-004/005), not patched around in the session. | — |
| Dead code removed in touched files (P7) | Pass | `AcpTurnOrigin` removed in `cc2701af8a` (CR-001 resolved). `filterForeignResponses` was correctly replaced. The SDK `sessionUpdate`/`extNotification` no-ops are required by the SDK's `Client` type (design SR-005). | CR-001 |
| Test scenarios and assertions requirement-aligned | Pass | 9 session rules over the real connection: batch shape asserted for the hand-over, state `prompting` after it, `startTurn` refused. Connection cases: IMP-01 order, non-`_` method, `$/`, malformed drop, throwing handler, permission/foreign. E2E: AC-001/002/003/006 with prompt counts and failure checks. | — |
| Test fixtures/helpers reusable and coherent | Pass | `grokProviderTurnScript` orders a-c. The harness adds `batches`. The fake agent's `pause` row is minimal and documented. | — |
| No stale/duplicated/compatibility-only tests | Pass | The memory test is parameterized rather than duplicated. | — |
| API/E2E readiness | Pass | Scripted orders a-c, a gated live case, and the downstream hints in the handoff (AC-006 gap variant, RSK-001). | — |

## Source File Size And Structure Audit

| Source File | Lines Before (base) | Lines After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `acp-agent-session.ts` | 387 | 488 | Pass (under 500) | Pass | Pass. Turn lifecycle stays its concern. It is near the limit, so the next growth should go to an owned file. | Pass | Pass | — (watch: 12 lines of headroom) |
| `acp-client-connection.ts` | 283 | 330 | Pass | Pass (+58/−11) | Pass | Pass | Pass | — |
| `acp-session-update-converter.ts` | 341 | 354 | Pass | Pass (+13) | Pass | Pass | Pass | — |
| `grok-build-session-profile.ts` | 77 | 91 | Pass | Pass | Pass | Pass | Pass | — |
| `grok-build-prompt-signals.ts` | 0 | 42 | Pass | Pass | Pass | Pass | Pass | — |
| `acp-agent-session-profile.ts`, `system-task-notification-senders.ts`, `runtime-memory-event-accumulator.ts`, `acp-agent-run-backend.ts` | — | small deltas | Pass | Pass | Pass | Pass | Pass | — |

(Raw `wc -l` counts; the effective non-empty count is lower.)

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | `filterForeignResponses` replaced. |
| Dead code removed in touched files | Pass | CR-001 resolved (`cc2701af8a`) |
| Persisted-data transition decision followed | Pass | `Not Affected`. The notice is recorded through the existing trace path. |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| (Resolved round 2) `AcpTurnOrigin` — `autobyteus-server-ts/src/agent-execution/backends/acp/session/acp-agent-session.ts:64` | `DeadCode` (unused export) | No importer and no type reference. The only mention is the class doc comment (:79). | It is a second, unused representation of `ActivePrompt.origin` that reads as a contract. | Use it as the type of `ActivePrompt`'s `origin` (e.g. `origin: Extract<AcpTurnOrigin, "input">`), or remove it and move its doc to `ActivePrompt` (and fix the :79 reference). |

## Docs-Impact Verdict

- Docs impact: `Yes`. Done in-ticket: GLOSSARY.md "Provider-started turn".
- Why: it is a new domain term, and DESIGN.md names GLOSSARY.md as the vocabulary authority.
- Files or areas likely affected: none further. Delivery may check whether a user-facing doc on Grok runs mentions background-task wakes.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| RSK-003 (provider content before the input response) | Confirmed | Not observed in probes, scripted orders or the live run (IMP-04). |
| SDK frame-order premise (IR-001) | Confirmed | SDK `receive`/`processIncomingMessage` read. Fixed by the stage. The 7 connection cases fail against base. |

No new premises beyond CAND-002…006 above.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (round 2) (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-001…003 map one to one onto the code. The class doc states the lifecycle. | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | The session alone owns turns of both origins. The profile reads, the connection orders. | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | The effects are named after Grok's signals, with explicit ids. | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Placement is clean. | The session file is at 490/500. | Put the next lifecycle growth in an owned file. |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `ActivePrompt` union, `AcpPromptNotice` shared. | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | The vocabulary is consistent with Claude and the glossary. The origins are named once, in `ActivePrompt`, with its doc. | — | — |
| 7 | API/E2E Readiness | 9.6 | Scripted orders a-c, gated live case, coverage hints. | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Hand-over in one batch. Every end path (`finishTurn`, close, fail, idle) clears the prompts. The stage contains failures and keeps wire order. | One-direction ordering caveat (design-recorded). | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean replacement of `filterForeignResponses`. | — | — |
| 10 | Cleanup Completeness | 9.5 | No dead code is left in the touched files (CR-001 resolved). | — | — |

## Findings

### CR-001 — Unused exported `AcpTurnOrigin` in the session (Local Fix, implementation) — Resolved (round 2)

- Resolution: `cc2701af8a` removes the export, moves its doc onto `ActivePrompt` and changes the class doc to point at `ActivePrompt`. A grep for `AcpTurnOrigin` over server `src`, `tests` and `GLOSSARY.md` finds nothing. IMP-07: `acp-provider-started-turns.test.ts` 9/9; server typecheck PASS (0 production errors, baseline test errors unchanged).

Original finding:

- Where: `autobyteus-server-ts/src/agent-execution/backends/acp/session/acp-agent-session.ts:61-64` (declaration) and :79 (doc mention).
- Basis: CAND-001; Principle 7 (dead code in touched files; "exports that nothing imports") and Principle 15 (one concept, one representation).
- Problem: this change adds `AcpTurnOrigin` as an exported type, but nothing imports it and no type uses it. `ActivePrompt` restates `"input"`/`"provider"` on its own. Readers see a turn-origin contract that nothing follows, and the two representations can drift.
- Required action: make it live, with `ActivePrompt`'s `origin` fields typed from it, or remove it and move its doc to `ActivePrompt`. Keep the class doc's reference consistent. No behavior change, so the existing tests and typecheck are enough (`pnpm -C autobyteus-server-ts typecheck` and `acp-provider-started-turns.test.ts`).

## Follow-ups

- Follow-ups this review added: None. (The implementation's candidate, Grok startup vs the 15 s discovery bound in IMP-06, is the Solution Designer's to record.)

## Classification

- None open. CR-001 (`Local Fix`, implementation-owned) was resolved in round 2.

## Recommended Recipient

- API/E2E engineer (implementation-review pass). The implementation engineer gets the informational pass notice.

## Residual Risks

- One-direction ordering: a frame right after a response may be handled before the response's continuation. This is harmless for the observed Grok timing (≥1 s gap) and recorded as RSK-003.
- RSK-001 (a client prompt at the instant Grok wakes) is recorded, not designed for.
- `acp-agent-session.ts` is at 488 lines. Further session growth should move to an owned file.
- The SDK's own `sessionUpdate`/`extNotification` path is now bypassed (RSK-004). An SDK upgrade must rerun the connection cases and the ACP suites.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 average; every category ≥ 9.4.
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: the design is implemented faithfully. Wire-order delivery, provider-started turns, the one-batch hand-over, cancel/idle/close for both origins, the notice and memory all trace correctly against the probes. Round 2 resolved CR-001, the only finding.
