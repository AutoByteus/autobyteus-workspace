# Implementation Revision Record

The current code and the latest handoff are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-003 (Pass), SR-003 | N/A | `Design Impact` | SR-003; ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | SR-003 items 1-4 implemented; the one-batch hand-over cannot be detected because the ACP SDK delivers the prompt response before earlier extension notifications → Solution Designer |
| IR-002 | Architecture reviewer, `design-review-report.md` ARCH-REV-005 (Pass), SR-005 | N/A | `Implementation complete` | SR-004, SR-005; ARCH-REV-004, ARCH-REV-005; CRR N/A; API-REV N/A; DR N/A | SR-005 Intended Change 0-7 implemented on dd79100fbb/3076e1d6fb; unit, scripted E2E and live Grok pass → code reviewer (Medium/High) |

## Revision Entries

### IR-001 — SR-003 implemented up to the hand-over; frame order premise does not hold

- Triggering role, report path, and round: architecture reviewer, `tickets/in-progress/grok-self-started-turns-517/design-review-report.md` (ARCH-REV-003 Pass), implementation round 1.
- Triggering finding IDs: N/A
- Classification: `Design Impact` (a premise of the reviewed design; escalation trigger of the design's kind: "frames differ … in scripted checks").
- Prior authoritative result: `N/A`
- Current authoritative result: work in progress, commit `dd79100fbb`. Not ready for code review.
  - Implemented: SR-003 Intended Change 1-4. The two effect kinds; `grok-build-prompt-signals.ts` and the Grok profile wiring and comments; in `AcpAgentSession`, both origins through one private opening step, a provider turn opened in `ready`, the input prompt's id and completion bookkeeping, the pending provider prompt, the one-batch hand-over at the response, the provider end on its own prompt id, and close/fail clearing; the converter's `notice()`; `GROK_PROVIDER_TURN_NOTICE_SENDER_ID`.
  - Not started: the memory set entry, GLOSSARY.md, the backend comment, the scripted Grok CLI and E2E.
- Related solution revision IDs: `SR-003`; architecture-review `ARCH-REV-003`; others `N/A`.
- Why recorded: the design's hand-over relies on the session seeing Grok's frames in wire order. Measured, it does not:
  - `evidence/IMP-01-sdk-delivery-order.log`: wire order u1, ext 2, ext 3, u4, response; the session sees u1, u4, ext 2, **response**, ext 3.
  - The SDK resolves a response synchronously (`jsonrpc.js` `handleResponse`, :831). A notification goes through `processIncomingMessage` (:748), which awaits each handler in turn.
  - So frame 212 (`queue/changed`, the provider prompt running) can reach the session after frame 215 (the response).
- Approved behavior or requirement IDs affected: REQ-003, AC-006 (and the AR-005 rule); REQ-001/AC-001 when Grok's content follows its wake closely.
- Implementation delta: the files above, plus the test harness `batches` field and `acp-provider-started-turns.test.ts` (9 cases).
- Local validation and result: `acp-provider-started-turns.test.ts`: 6 passed, 3 failed. Each failure is the reordering:
  - the hand-over batch holds the input end only;
  - two cases see a provider turn opened in `ready` from a `queue/changed` that came before the response on the wire.
  - `tsc --noEmit -p tsconfig.build.json`: no errors.
- Next recipient or routing: `get_handoff_rules` → Design Impact → `/solution_designer`.
- Remaining limitations or risks: as above; the round continues after the design decision.

### IR-002 — SR-005 implemented: wire-order delivery, provider-started turns end to end

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` (ARCH-REV-005 Pass on SR-001…SR-005), implementation round 2.
- Triggering finding IDs: N/A (IR-001's Design Impact, resolved by SR-004/SR-005).
- Classification: implementation complete; routing `Medium` / `High` → code review.
- Prior authoritative result: IR-001 (work in progress at `dd79100fbb`; 3 of 9 session-rule tests failing by the SDK's reordering).
- Current authoritative result: commits `0401d75bf3` (Intended Change 0), `eb7dcef228` (items 4, 5, 6 and Grok signal tests), `39686a67ac` (item 7: scripted Grok, E2E, live case), plus the documents commit. `implementation-handoff.md` is the authority.
- Related solution revision IDs: `SR-004`, `SR-005`; architecture-review `ARCH-REV-004`, `ARCH-REV-005`.
- Implementation delta:
  - `acp-client-connection.ts`: `inboundFrameStage` replaces `filterForeignResponses`. Each notification is delivered synchronously, in wire order (`session/update` after the minimal checks → `routeUpdate`, otherwise `ACP_FRAME_DROPPED`; any other method → `routeExt` unchanged), each inside a `try/catch` logging `ACP_FRAME_HANDLER_FAILED`. Responses and agent requests pass on; foreign responses are dropped; `$/` protocol notifications pass on to the SDK (the reviewer's optional MP-005). The SDK client's `sessionUpdate`/`extNotification` are commented no-ops.
  - Memory: `GROK_PROVIDER_TURN_NOTICE_SENDER_ID` in `RECORDED_SYSTEM_NOTICE_SENDER_IDS`. `GLOSSARY.md` gets "Provider-started turn". The backend comment narrows turn id allocation to input turns.
  - Tests: the connection's wire-order cases, Grok signal cases, the memory test parameterized over Claude and Grok, the fake agent's pause row, `grokProviderTurnScript` (orders a-c), 3 replay E2E cases, 1 gated live case.
- Local validation and result:
  - Units: 39 files / 299 tests pass, `acp-provider-started-turns.test.ts` 9/9 among them (IMP-05).
  - Typechecks: server and web pass at baseline (IMP-05).
  - Replay E2E: 9/9 (IMP-02).
  - Grok compaction replay 3/3; DeepSeek scripted provider (real dsh) 6/6 (IMP-03).
  - Live Grok (AC-005): pass on attempt 3; attempts 1-2 failed at model discovery from Grok's 4-35 s startup, base alike (IMP-04, IMP-06).
  - Every in-process E2E file's `afterAll` timed out in `app.close()` under the machine's FSEvents backlog, base cases alone included (IMP-02 run 2).
- Next recipient or routing: `get_handoff_rules` → `/code_reviewer`.
- Remaining limitations or risks: RSK-003 (provider content before the input prompt's response) not observed in probes, scripted orders or the live run. Candidate follow-up: discovery bound vs Grok startup (IMP-06).

