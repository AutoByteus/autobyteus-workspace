# Implementation Revision Record — projects-left-navigation

The current code and `implementation-handoff.md` are authoritative; this record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | SR-008, ARCH-REV-002; CRR / API-REV / DR: N/A | Implemented; local checks pass; to code review |

## Revision Entries

### IR-001 — Projects mode, runs started under a Project, Project instruction section

- Triggering role, report path, and round: architecture reviewer, `tickets/in-progress/projects-left-navigation/design-review-report.md`, round 2 (ARCH-REV-002 Pass of SR-008).
- Triggering finding IDs: N/A (initial baseline). The report's Residual Risks are answered in the handoff's Known Risks.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete on `codex/projects-left-navigation`; server and web typechecks, guards and unit suites pass; rendered check done on the development stack (see the handoff's Checks Run and Frontend Rendered-Result Check).
- Related solution revision IDs: SR-008.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the reviewed design (Change / Refactor Sequence steps 1–7; step 8, docs, is Delivery's).
- Approved behavior or requirement IDs affected: BEH-001…BEH-008; REQ-001…REQ-016.
- Implementation delta: see the handoff's Reviewed Behavior Implementation Trace and Key Files. Commits: `97706524b1` (refactor: `RunDefinitionGroups.vue` extraction, no behavior change), `2f3cb2f411` (server), `dacdceed36` (web), plus the ticket-documents commit named in the handoff.
- Changed files or areas: server run-history records and reads, run creation, Projects run links, ports and composition, GraphQL, prompt composition and five runtime paths; web left-panel run section, Projects tree and stores, delegated-row scope, New chat chip and draft, launch inputs, strip, icons, localization.
- Local validation and result: see the handoff's Checks Run (IMP-01…IMP-09).
- Next recipient or routing: code reviewer (Large / High).
- Remaining limitations or risks: the handoff's Known Risks and the "Not run" list.
