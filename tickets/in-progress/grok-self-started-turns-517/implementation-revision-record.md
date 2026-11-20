# Implementation Revision Record

The current code and the latest handoff are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-003 (Pass), SR-003 | N/A | `Design Impact` | SR-003; ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | SR-003 items 1-4 implemented; the one-batch hand-over cannot be detected because the ACP SDK delivers the prompt response before earlier extension notifications → Solution Designer |

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
