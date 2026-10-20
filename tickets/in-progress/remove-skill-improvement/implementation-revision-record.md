# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation baseline and later rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer, ARCH-REV-002 (pass) | N/A | `Initial Baseline` | SR-001..SR-004; ARCH-REV-001..ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | Feature removed (server, web, docs, tests); migration `20261020_remove_skill_improvement_data` (M1..M6) and settings retirement implemented; ready for code review |

## Revision Entries

### IR-001 — Remove Skill Improvement and delete its data once (initial baseline)

- **Triggering role, report path, and round:** architecture_reviewer, `tickets/in-progress/remove-skill-improvement/design-review-report.md`, ARCH-REV-002 (pass).
- **Triggering finding IDs:** N/A. The review's residual risks R-2..R-4 are addressed in `implementation-handoff.md`.
- **Classification:** `Initial Baseline`.
- **Prior authoritative result:** N/A.
- **Current authoritative result:** implementation complete against SR-004. Checks IMP-01..IMP-13 pass (`evidence/IMP-00-summary.txt`).
- **Related solution revision IDs:** SR-001..SR-004.
- **Related architecture-review revision IDs:** ARCH-REV-001, ARCH-REV-002.
- **Related code-review revision IDs:** N/A.
- **Related API/E2E revision IDs:** N/A.
- **Related delivery revision IDs:** N/A.
- **Why this baseline is recorded:** it is the first implementation handoff.
- **Approved behavior or requirement IDs affected:** BEH-001..BEH-005; REQ-001..REQ-005; AC-001..AC-004. REQ-006 / AC-005 (release notes) are the design's supplement and are unchanged.
- **Implementation delta, in commits on `codex/remove-skill-improvement` from `04aac13a77`:**
  - `1f12b46b8b` server:
    - feature, GraphQL API, built-in improver, settings, grants, `launchPurpose` removed;
    - settings retired;
    - the new migration, with its tests and fixtures;
    - shared tests and docs updated.
  - `fc46a7b5fc` web: the card, CTA, stores, GraphQL documents and types removed; generated types trimmed; i18n, specs, probes and docs updated.
  - `a71e93a7f2` two registry-order tests updated for the new last migration.
  - Plus this handoff commit (documents and evidence).
- **Changed files or areas:** see `implementation-handoff.md`, Key Files Or Areas.
- **Local validation and result:** IMP-01..IMP-13, all passing; see `implementation-handoff.md`, Checks Run.
- **Next recipient or routing:** `/software_engineering_team/code_reviewer` (Large / High).
- **Remaining limitations or risks:** see `implementation-handoff.md`, Known Risks; follow-ups FU-001 (designer), FU-002 (generated GraphQL drift and the web typecheck tooling).
