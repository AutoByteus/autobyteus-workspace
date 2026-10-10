# Architecture Review Revision Record — draft-run-id-validation

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 — Architecture Design Complete (initial baseline) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 — revised design (SR-003) | SR-003 | Fail | Pass | AR-001 (resolved), AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: codec trust-boundary hardening

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/design-review-report.md`
- Review round and trigger: Round 1. `Architecture Design Complete` from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: solution_designer; `solution-handoff.md`; N/A.
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- Baseline established:
  - The behavior basis (BEH-001..008) is confirmed in code at `d28c56d5d`.
  - Every entry point goes through the codec.
  - D1, D3, D4 and D5 are sound.
  - Data continuity is verified: `buildStoredFilename` is the only producer and has not changed since `d39b26e37`, and there are no other descriptor producers.
  - D2 as written admits `.`, which reaches `unlink(ownerDir)` and returns a 500 (MP-001).

#### Prior Finding Resolution

None

- New or remaining finding IDs:
  - AR-001 (Medium, blocking): add the approved "not dot-only" condition to D2 and its example, plus `.`/`%2E` tests.
  - AR-002 (Low): add the dead exports `getStoredFilenameFromLocator` and `getDisplayNameFromStoredFilename` to the removal plan.
- Material classification changes: None. Small/High stands.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: on Windows, drive-designator IDs are caught only by the guard, which now gives a 400. TTL cleanup runs before a guard trip. PB-001 is pre-existing.

### ARCH-REV-002 — Round 2: dot-only filename rule and dead-export removal

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/design-review-report.md`
- Review round and trigger: Round 2. Revised `Architecture Design Complete` from `/software_engineering_team/solution_designer` (SR-003).
- Triggering role, report path, and finding IDs: architecture_reviewer ARCH-REV-001 `design-review-report.md`; AR-001, AR-002.
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: `Fail` (Design Impact)
- Current authoritative decision: `Pass`
- What changed:
  - I verified the D2 dot-only rejection in the Intended Change, the Interface table and the Example.
  - I verified the `.`/`%2E` tests at the unit, integration and probe levels.
  - I verified that the dead exports are in the removal plan and the file mapping.
  - The AC-008 wording change only names a case that REQ-008 already required, so no re-approval is needed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-003 | `design-spec.md` lines 61, 177, 213, 215, 218 and 242; `requirements-doc.md` AC-008 |
| AR-002 | Open (Low) | Resolved | SR-003 | `design-spec.md` lines 150–151, 210 and 213 |

- New or remaining finding IDs: None. One non-blocking implementation note: `%2E` is the test case that exercises the dot-only rule, because a literal `/.` may be normalized before routing. Run that test against an existing owner folder.
- Material classification changes: None. Small/High stands.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: Windows drive-designator IDs are caught only by the guard, which now returns 400. TTL cleanup runs before a guard trip. PB-001 is pre-existing.
