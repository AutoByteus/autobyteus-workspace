# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation baseline and later rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer, ARCH-REV-003 → ARCH-REV-007 (initial implementation, including the DI-001 and DI-002 rounds) | N/A | `Initial Baseline` | SR-001..SR-008; ARCH-REV-003..ARCH-REV-007; CRR N/A; API-REV N/A; DR N/A | Implemented D-1..D-9 and M0..M5; ready for code review |

## Revision Entries

### IR-001 — Delegated copies restore from their own file (initial baseline)

- **Triggering role, report path, and round:** architecture_reviewer passes:
  - ARCH-REV-003: initial;
  - ARCH-REV-004: after DI-001, D-8;
  - ARCH-REV-006: SR-007 test plan;
  - ARCH-REV-007: after DI-002, D-9.

  The report is `tickets/in-progress/delegated-copy-restore-from-own-file/design-review-report.md`.
- **Triggering finding IDs:** N/A. The two implementation escalations folded into this baseline are DI-001 (`implementation-design-impact-DI-001.md`, resolved by D-8) and DI-002 (`implementation-design-impact-DI-002.md`, resolved by D-9). The reviewer notes applied are R-2, R-7 and R-9 (a, b).
- **Classification:** `Initial Baseline`.
- **Prior authoritative result:** N/A.
- **Current authoritative result:** implementation complete against SR-008. Implementation-scoped checks pass on `3b6f970cfa`; see `implementation-handoff.md`, Checks Run.
- **Related solution revision IDs:** SR-001..SR-008.
- **Related architecture-review revision IDs:** ARCH-REV-003..ARCH-REV-007.
- **Related code-review revision IDs:** N/A.
- **Related API/E2E revision IDs:** N/A.
- **Related delivery revision IDs:** N/A.
- **Why this baseline is recorded:** it is the first implementation handoff.
- **Approved behavior or requirement IDs affected:** BEH-001..BEH-008; REQ-001..REQ-012; AC-001..AC-009 and AC-011. AC-010 belongs to delivery.
- **Implementation delta, in commits on `codex/delegated-copy-restore-from-own-file` from base `f171032e88`:**
  - `3ed550595c`: the released own-file shapes frozen into `legacy/…/released-task-agent-own-files-with-origin.ts`; 10-17 repointed to them (step 1).
  - `35675e3b5e`: both stream contracts make `source` required, Team copy members carry their launch and `follows_team`/`followsTeam`, and the `configured` origin is added. The address-based member helpers are removed and both `dist/` folders rebuilt.
  - `65ae647bc9`: server:
    - every copy records its source (D-1, D-4, D-5, D-6);
    - one projection path, with the resolvers and the `readTaskSource` port removed (D-2, D-3);
    - location services, the run view and the indexes resolve copies by their own source;
    - the new migration `20261019_delegated_copy_own_file_complete_v1` (M0..M5);
    - the D-8 bridge;
    - docs.
  - `7d689455ad`: web: sources looked up by run ID, delegated launch rows read only the copy's source, the D-7 display names, fixtures and probe pages.
  - `2997ff0b9a`: the ticket folder, DI-002 and the first evidence round.
  - `3b6f970cfa`: D-9, the same-ID repair of 10-17's ownership recognition, plus the R-9 tests.
  - `2253b8044b`: browser probe case DLP-006 models an upgrade through the own-file completion.
  - Plus this handoff commit (documents and the D-9 evidence round).
- **Changed files or areas:** see `implementation-handoff.md`, Key Files Or Areas.
- **Local validation and result:** IMP-01..IMP-14 (`evidence/IMP-00-summary.txt`). All pass on the commits listed in the handoff.
- **Next recipient or routing:** `/software_engineering_team/code_reviewer` (Large / High).
- **Remaining limitations or risks:** see `implementation-handoff.md`, Known Risks.
