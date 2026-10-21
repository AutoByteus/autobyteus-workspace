# Implementation Revision Record — Nodes → Remote Collaboration page (autobyteus-267)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md` (direct route, SR-003) | N/A | `Initial Baseline` | SR-003 | Implemented; API-REV-001 Fail (F-001) |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-001 (failure origin of API/E2E F-001, API-REV-001) | F-001 | `Local Fix` | CRR-001, API-REV-001 | Fixed; to API/E2E |

## Revision Entries

### IR-001 — Each peer's state and offer on the Nodes page, initial implementation

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/remote-nodes-page/handoff-implementation.md` (design commit `304e49494c`, SR-003; direct route, Medium / Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented in `3a21bcae44`; checks IMP-01 … IMP-13.
- Related solution revision IDs: SR-001 … SR-003
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-501 … BEH-503; REQ-501 … REQ-504, REQ-507 … REQ-511; the UI/UX spec's ST-01 … ST-11 and TR-001 … TR-012.
- Implementation delta:
  - server: `listAvailableAgentsOf` and `peerNodeOffer`;
  - web: the offers store and query; the ported page components; the card triggers; the availability card removed; `addPeer` returns the peer; strings in English and Chinese;
  - docs.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - IMP-01 … IMP-04 pass;
  - IMP-05 full server unit suite: 6460 pass; IMP-06 full web Nuxt suite: 4641 pass;
  - IMP-07 … IMP-13: the live page against a test-owned cluster, compared with VIS-001 … VIS-007.
- Next recipient or routing: API/E2E (direct route, after the lightweight self-review).
- Remaining limitations or risks: RSK-501; an entry without a description and a one-kind peer were not seen live (covered by specs); AC-506 is the user's check.

### IR-002 — A peer asked again while its earlier ask is open (F-001)

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/remote-nodes-page/code-review-report.md` (CRR-001, Low), from API/E2E API-REV-001 (commit `0acfd1451e`, `evidence/api-e2e/F-001-in-flight-peer-not-asked-again.log`).
- Triggering finding IDs: F-001
- Classification: `Local Fix` (classification stays Medium / Low)
- Prior authoritative result: IR-001 (`3a21bcae44`): re-opening the tab or switching off and on while a slow peer's ask was open sent no new request (`thetaAsked {onReturn: 0, onSwitchOnAgain: 0}`), and the new token applied the earlier answer.
- Current authoritative result: `2a6053250a`: every ask sends its own request; the earlier answer is ignored by the token.
- Related solution revision IDs: N/A (the design premise is corrected in the handoff's assumptions)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: Apollo's in-flight deduplication is on by default and is not turned off by `fetchPolicy: 'network-only'`.
- Approved behavior or requirement IDs affected: REQ-504, AC-505; the UI/UX spec's "A peer that takes 20 s therefore shows Checking… again".
- Implementation delta:
  - `stores/remoteCollaborationOffersStore.ts`: `context: { queryDeduplication: false }` on the `peerNodeOffer` query, with a one-line comment (the global Apollo setup is unchanged);
  - `stores/__tests__/remoteCollaborationOffersStore.spec.ts`: the option asserted, plus a spec through a real ApolloClient with a link that holds requests open: two asks of one peer send two operations, and the first answer is ignored. It fails without the option.
- Changed files or areas: the two files above; the handoff (the design premise correction, IMP-14).
- Local validation and result: IMP-14 (18 files, 62 tests; guards pass; the real-client spec fails without the option).
- Next recipient or routing: API/E2E (direct route), to rerun `pnpm -C autobyteus-web test:e2e:remote-nodes-page`; only the web store changed.
- Remaining limitations or risks: as IR-001.

