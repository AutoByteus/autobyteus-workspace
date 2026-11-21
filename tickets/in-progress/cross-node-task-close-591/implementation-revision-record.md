# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, ARCH-REV-003 Pass (SR-008), then ARCH-REV-004 Pass (SR-009) | N/A | `Initial Baseline` | SR-008, SR-009; ARCH-REV-003, ARCH-REV-004 | Implemented; to code review |

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
