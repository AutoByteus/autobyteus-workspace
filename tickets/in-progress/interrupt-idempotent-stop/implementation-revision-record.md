# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-003 (requirements SR-002), ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | Implemented; ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 (Fail) | CR-001 | `Local Fix` | SR-003, ARCH-REV-002, CRR-001; API-REV N/A; DR N/A | Fixed; back to code review (delta) |

## Revision Entries

### IR-001 — Stop is harmless to repeat: node answers nothing-to-stop as accepted; one web owner for a Stop

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented on `codex/interrupt-idempotent-stop`; see `implementation-handoff.md`.
- Related solution revision IDs: SR-003 (requirements unchanged at SR-002).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation round of the approved design.
- Approved behavior or requirement IDs affected: REQ-001…REQ-007; BEH-001…BEH-010; AC-001…AC-011.
- Implementation delta:
  - Server (commit `ff16e5de85`): `userInterruptOutcome` / `NOTHING_TO_INTERRUPT` at the five user interrupt boundaries; not-running run / Team / Org answers accepted for an interrupt; Claude, Codex and native backends answer `NO_ACTIVE_TURN` when `turnId` is not the active turn; `NO_ACTIVE_TURN` / `RUN_NOT_ACTIVE` domain constants; durable e2e from the reproduction.
  - Web (commit `1f92302096`): `InterruptOutcome`; `runInterrupt`; `AgentContext.interruptPending` and primary action `stopping`; outcome-returning routes for every run kind; `InterruptsAwaitingRebind` in the three streaming services (D-W7); `orgInterruptOutcome`, `AgentOrgConnectionLostError`; `targetDisplayName`; localized texts; presenters, callbacks and old keys removed; docs.
  - Test baseline fix (commit `45cae5ebd2`): the interrupt-result-presentation probe answers the window's newer requests.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md`, Checks Run (IMP-01…IMP-10).
- Next recipient or routing: Code Reviewer (Medium / High).
- Remaining limitations or risks: see `implementation-handoff.md`, Known Risks; the phone case in `test:e2e:mobile-shell` and the durable real-stack browser probe are left to API/E2E.

### IR-002 — CR-001: the native turn-gone answer carries no runtime turn id

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, CRR-001 (round 1, Fail).
- Triggering finding IDs: CR-001.
- Classification: `Local Fix`.
- Prior authoritative result: IR-001. The native backend mapped `turn_mismatch` to `NO_ACTIVE_TURN` but kept `turnId: result.turnId`, the runtime's other active turn. `AgentRunInterruptState.execute` (`agent-run-interrupt-state.ts:93-100`) turned that into `AGENT_RUN_INTERRUPT_PROVIDER_PROTOCOL_VIOLATION`, so the Stop ended `refused` with "Could not stop {name}". The unit test used `turnId: null` for all three statuses, which the runtime never sends for `turn_mismatch`.
- Current authoritative result: `autobyteus-agent-run-backend.ts` returns `{ accepted: false, code: NO_ACTIVE_TURN, message }` for `no_active_turn`, `already_settled` and `turn_mismatch`, without the runtime's turn id, as Claude and Codex do. The test gives each status the runtime's real shape (`null`, the asked turn, the other turn), asserts the mapped result, then puts it through a real `AgentRunInterruptState` and `userInterruptOutcome`: the AgentRun applies `NO_ACTIVE_TURN` and the Stop is accepted.
- Related solution revision IDs: SR-003.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: the Local Fix for CR-001.
- Approved behavior or requirement IDs affected: REQ-001, AC-005 (native runtime).
- Implementation delta: one return statement in the native backend's `interrupt` (plus a comment); the native turn-gone unit test rewritten.
- Changed files or areas: `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`; `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts`.
- Local validation and result: IMP-11. The backend test file passes (20/20). With the old mapping restored temporarily, the three new cases fail (3 failed / 17 passed). Server and web typechecks are at baseline.
- Next recipient or routing: Code Reviewer (targeted delta review), then API/E2E.
- Remaining limitations or risks: unchanged from IR-001.
