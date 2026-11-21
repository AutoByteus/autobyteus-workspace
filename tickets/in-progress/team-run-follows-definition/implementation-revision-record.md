# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record keeps the initial baseline and each later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` round 2 (ARCH-REV-002 pass) | N/A | `Initial Baseline` | SR-008, ARCH-REV-002 | Implemented; handed to Code Review |

## Revision Entries

### IR-001 — Team runs follow their Team definition (initial implementation)

- Triggering role, report path, and round: Architecture Reviewer; `tickets/in-progress/team-run-follows-definition/design-review-report.md`; round 2 (ARCH-REV-002, pass, with notes N-5 … N-10).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: commits `19b31ad365` (server core) and `6b46ec5bdd` (tests, a leaving-member fix, web, docs) on `codex/team-run-follows-definition`; the handoff commit follows them.
- Related solution revision IDs: SR-008.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the reviewed design.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-009; AC-001 … AC-010; DS-001 … DS-007; D-SCOPE, D-TRIGGER, D-FORMER, D-ONE-VIEW; DEC-002 … DEC-007.
- Implementation delta:
  - The new `membership/` folder holds the pure planner, the planner service, the committer, the definition-change listener and the notice source.
  - `TeamRunMembership` is the one in-memory view of a run's membership.
  - Former members and `copiedFrom` are optional tree fields.
  - The communication engine distinguishes senders from receivers.
  - Leaving members retire once they are quiet.
  - Former members get the exact refusal.
  - A membership event re-opens the view snapshot in-band.
  - The web view keeps, adds and drops members, and tags a leaving member "Leaving".
  - Docs and glossary are updated.
  - The blocks moved to meet the size limits are listed in the handoff (N-5).
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` § Checks Run (IMP-01 … IMP-09).
- Next recipient or routing: Code Review (`/software_engineering_team/code_reviewer`), for Large / High.
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks. The real-runtime E2E (Verification Intent) is left to API/E2E.
