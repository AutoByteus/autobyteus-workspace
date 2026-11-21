# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, ARCH-REV-003 Pass (SR-008), then ARCH-REV-004 Pass (SR-009) | N/A | `Initial Baseline` | SR-008, SR-009; ARCH-REV-003, ARCH-REV-004 | Implemented; to code review |
| IR-002 | Architecture reviewer, ARCH-REV-006 Pass (SR-010, SR-011), after CRR-002 and API-REV-001 | CR-591-001, CR-591-002, CR-591-003 (F-2, F-2 b, F-1); AR-003; the stale test title | `Requirement Gap` (resolved upstream), implemented | SR-010, SR-011; ARCH-REV-005, ARCH-REV-006; CRR-001, CRR-002; API-REV-001 | Implemented; to code review |
| IR-003 | Delivery engineer, latest-base integration blocked (`release-deployment-report.md`) | 3 merge conflicts; the router semantics check | `Local Fix` (integrate the latest base) | CRR-003; API-REV-002; DR (delivery report) | Merged and checked; to code review (merge review), then API/E2E |

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

### IR-003 — Latest base integrated (origin/personal 6533d7be04)

- Triggering role, report path, and round: the delivery engineer, `release-deployment-report.md`. Delivery was blocked at the latest-base integration. Round 3.
- Triggering finding IDs: three conflicts (`remote-delegation-two-server.e2e.test.ts`, `global-agent-run-message-router.test.ts`, `docs/design-cases.md`), and the request to check that 22's router change and DN-9 hold together.
- Classification: `Local Fix` (integrate the latest base).
- Prior authoritative result: IR-002, passed by CRR-003, then API/E2E round 2 (API-REV-002) Pass.
- Current authoritative result: merged as `037e6bec5c` (`git merge --no-ff origin/personal`, parents `0d13d37f86` and `6533d7be04`), with IMP-11 … IMP-14 passing.
- Related solution revision IDs: N/A (no requirement or design change)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-002
- Related delivery revision IDs: the delivery engineer's integration report (`release-deployment-report.md`)
- Why this implementation revision is recorded: the base moved past the merge base `7591aa307f` with v1.5.14-beta.6 and tickets 583, 594, 15, 16 and 22.
- Approved behavior or requirement IDs affected: none changed.
- Implementation delta:
  - **Conflicts:**
    - `docs/design-cases.md`: both cases kept. Base's 583 case stays Case 25, because done tickets cite that number. This ticket's CRR-002 case becomes Case 26 (nothing in this ticket cites its number).
    - Router unit test: 22's `ownsAgentRun` together with DN-9's `admitPeerRun` stub.
    - Two-server E2E: 22's new team-follows-definition case is kept before RC-23, with this ticket's RC-23 title. No other lines differed.
  - **Merge-induced fixes:**
    - 22's `team-run-follows-definition.integration.test.ts` stubbed the removed `closedPeerRunRefusal`; it now stubs `admitPeerRun: "not_peer"`.
    - DN-9's router test root now implements 22's `ownsAgentRun`.
  - **Router semantics:** 22 changed the sender-root branch from `hasAgentExecution` to `ownsAgentRun`.
    - `ownsAgentRun` is `hasAgentExecution` on standalone and Org roots, and on a Team root it adds its former members. So a root's peer endpoints still take that branch, and DN-9's endpoint continuation is unchanged.
    - Former members are local runs, which `admitPeerRun` answers `not_peer`, so 22's "no longer a member" refusal is unchanged.
    - `admitPeerRun` still runs first, once, before every path.
    - The other files both sides changed (`task-delegation.ts`, `collaboration-composition.ts`, `build-studio-server.ts`, `start-standalone-application-host.ts`, docs, `typecheck-baseline.json`) changed independently.
- Changed files or areas: the merge commit `037e6bec5c`.
- Local validation and result, all on `037e6bec5c`:
  - server typecheck (IMP-11);
  - the full server unit suite, 8761 tests (IMP-12);
  - the web typecheck (IMP-13);
  - 22's integration test (IMP-14).
- Next recipient or routing: `/code_reviewer` (merge review), then API/E2E on the merged state (the two-server suite at least).
- Remaining limitations or risks: **two cases are now both named `RC-51`** in `remote-delegation-two-server.e2e.test.ts`: base's team-follows-definition case and this ticket's `RC-51 591 AC-007…` case. Both run, but `record()` merges their receipts into one `evidence.cases["RC-51"]` object, and a `-t "RC-51 "` filter selects both. Renumbering is API/E2E's to decide: base's number is cited by done tickets, and this ticket's RC-51 … 53 by its requirements, design and API/E2E evidence.
