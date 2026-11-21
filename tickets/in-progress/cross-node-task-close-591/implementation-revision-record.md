# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, ARCH-REV-003 Pass (SR-008), then ARCH-REV-004 Pass (SR-009) | N/A | `Initial Baseline` | SR-008, SR-009; ARCH-REV-003, ARCH-REV-004 | Implemented; to code review |
| IR-002 | Architecture reviewer, ARCH-REV-006 Pass (SR-010, SR-011), after CRR-002 and API-REV-001 | CR-591-001, CR-591-002, CR-591-003 (F-2, F-2 b, F-1); AR-003; the stale test title | `Requirement Gap` (resolved upstream), implemented | SR-010, SR-011; ARCH-REV-005, ARCH-REV-006; CRR-001, CRR-002; API-REV-001 | Implemented; to code review |

## Revision Entries

### IR-001 — A closed Task's remote run stops on its node; a follow-up Task brings it back

- Triggering role, report path, and round: the architecture reviewer, `design-review-report.md` (ARCH-REV-003 Pass for SR-008, then ARCH-REV-004 Pass for SR-009); the first implementation round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A (during this round the implementation engineer raised the Design Impact on DN-6 that SR-009 resolved)
- Current authoritative result: implemented, with the checks in `implementation-handoff.md` § Checks Run.
- Related solution revision IDs: SR-001 … SR-009
- Related architecture-review revision IDs: ARCH-REV-001 … ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation of DN-1 … DN-8.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-006; BEH-001 … BEH-006; AC-001 … AC-007.
- Implementation delta:
  - A: `PeerRunStateNotices` (new), the owed mark `peerNoticeOwed` (domain, schema, service), the release's notice in place of the `FENCED_REMOTE` skip, and the re-delegation of a remote run (`toExistingRun`) through the extracted `deliverMessageToPeerRun`.
  - Link: `POST /rest/remote/delegated-run-states` (request types, peer client, gateway, route).
  - B: `ClosedDelegations` (new), `DelegatedRunStateHandler` (new), the inbound S-5 clear, the run list filter, and the delete hook.
  - Docs: collaboration model, glossary, node access model, and four module docs.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas. Commits: `77ca417ac3` (implementation), `9968ee0c73` (AC-004 alternate test), `9abe7086fd` (NAS-41 test names).
- Local validation and result (`implementation-handoff.md` § Checks Run):
  - server and web typecheck pass;
  - the focused tests (139 + 17) and the four touched E2E files pass;
  - the full server unit suite had one failure, the node access scan finding the new NAS-41 named in no test; `9abe7086fd` names it, and the architecture suites pass.
- Next recipient or routing: `/code_reviewer` (Medium / High).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks.

### IR-002 — The assigner's message continues a closed remote run (DN-9)

- Triggering role, report path, and round: the architecture reviewer, `design-review-report.md` Rounds 5–6 (ARCH-REV-006 Pass for SR-010 and SR-011). Before that: CRR-002 (`code-review-report.md`) and API-REV-001 (`api-e2e-execution-coverage-report.md`, F-1, F-2). Round 2.
- Triggering finding IDs: CR-591-001 (local continuation read backwards), CR-591-002 (REQ-002's reopen clause), CR-591-003 (the tree row), AR-003 (the gate missed the sender root's endpoint path), and CRR-002's stale "fences" test title.
- Classification: `Requirement Gap`, corrected upstream at SR-010 and SR-011; this round implements the corrected basis.
- Prior authoritative result: IR-001, passed by CRR-001, then failed API/E2E round 1 on F-1 and F-2 (requirement origin).
- Current authoritative result: implemented, with IMP-07 … IMP-10 passing.
- Related solution revision IDs: SR-010, SR-011
- Related architecture-review revision IDs: ARCH-REV-005, ARCH-REV-006
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: SR-010 corrected the local rule. After a reopen, the assigner's message continues the run, and `delegate_task` with the same Task is refused. DN-9 makes the remote run follow that rule through one gate in the router.
- Approved behavior or requirement IDs affected: REQ-006 / BEH-006 / AC-007, SCN-005; REQ-002 (already as implemented); REQ-004, AC-001, AC-006 (unchanged code, text aligned).
- Implementation delta:
  - `CrossRunMessageDelivery.admitPeerRun`:
    - an open run is admitted;
    - the last `assigned` entry's delegator gets `assertReopenable`, `reopenAssignment`, then `peerNotices.changed` (B confirms "open"), then admitted;
    - otherwise `TASK_AGENT_RESOURCE_CLOSED`;
    - a target that isn't a peer run is `not_peer`.
  - `GlobalAgentRunMessageRouter.deliver` calls it once, first, before the endpoint, `node` and `route` paths.
  - `closedPeerRunRefusal` and `route`'s peer branch are removed, and `deliverMessageToPeerRun` checks no Task.
  - The composition passes the notices to `CrossRunMessageDelivery`.
  - Docs follow.
  - Two deviations are in the handoff (Known Risks 7 and 8): `changed` in place of `settled`, and the refusal's added sentence.
- Changed files or areas: `src/agent-collaboration/communication/cross-run-message-delivery.ts`, `src/agent-communication/services/global-agent-run-message-router.ts`, `src/agent-communication/services/peer-run-message-delivery.ts`, `src/compositions/collaboration-composition.ts`; tests and docs as in the handoff. Commit `a811f94348`.
- Local validation and result: server typecheck pass (IMP-07); the DN-9 focused and remote suites, 283 tests, pass (IMP-08); the full server unit suite passes, 8688 tests (IMP-09); the web typecheck passes (IMP-10).
- Next recipient or routing: `/code_reviewer` (Medium / High), then API/E2E to rerun F-1 and F-2.
- Remaining limitations or risks: see the handoff's Known Risks (the ordering note for a second message while "open" is in flight).
