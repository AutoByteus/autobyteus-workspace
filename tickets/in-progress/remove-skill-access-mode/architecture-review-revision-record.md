# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` handoff | SR-001, SR-002, SR-003 | N/A | Fail (`Design Impact`) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / revised package SR-004 | SR-004 | Fail (`Design Impact`) | Pass | AR-001, AR-002 (resolved) |
| ARCH-REV-003 | Round 3 / revised package SR-005 after implementation `DI-001` | SR-005 | Pass (SR-004) | Pass | None |

## Revision Entries

### ARCH-REV-001 — Initial baseline: classifier repair rejected, rest of the design sound

- Canonical design review report: `tickets/in-progress/remove-skill-access-mode/design-review-report.md`
- Review round and trigger: Round 1; handoff from `/solution_designer` (2026-09-30)
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-handoff.md`, N/A
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- Baseline established: behavior basis confirmed for BEH-001..006. Routing classification (Large / High) confirmed. Removal plan, contract removals, `Directly Usable — No Migration`, the AF-004 output freeze of `20260824`, and the built-in policy simplification pass. The AF-005 same-ID classifier repair fails the material-premise gate (MP-001 `Not Reachable`): the frozen tree schemas reject current-written trees on the missing `schemaVersion` before the launch-configuration validator runs, so the repair changes no outcome.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (blocking), AR-002 (minor)
- Material classification changes: None
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: a pre-existing, out-of-scope behavior of `20260901` towards current-written trees (since v1.4.91) is recorded in the report as a separate-ticket candidate with `Unclear` reachability; it drives no change here.

### ARCH-REV-002 — Round 2: both findings resolved, design passes

- Canonical design review report: `tickets/in-progress/remove-skill-access-mode/design-review-report.md`
- Review round and trigger: Round 2; revised package from `/solution_designer` (2026-09-30)
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-handoff.md` (SR-004), AR-001, AR-002
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` — `Design Impact` (`ARCH-REV-001`)
- Current authoritative decision: `Pass`
- What changed: behavior basis unchanged (requirements not edited). The classifier repair and its test were removed; released types are standalone copies.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-004 | `design-spec.md`: file-mapping row for `run-execution-tree-shared-record-schemas-v2.ts` keeps the exact released key set; "Frozen validator" example; checklist item 10; sequence step 1; R-1; equivalence test replaces the AF-005 test. `investigation-notes.md` AF-005 corrected. No remaining text describes a repair. |
| AR-002 | Open (minor) | Resolved | SR-004 | `design-spec.md`: Ownership Boundaries forbids import, intersection or extension of current types; file-mapping row for the legacy types; "Frozen type" example; tightness row lists the full released key set. |

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: the pre-existing `schemaVersion` observation on `20260901` stays a separate-ticket candidate for the user.

### ARCH-REV-003 — Round 3: frozen team-run config aggregate for the released V1 migration

- Canonical design review report: `tickets/in-progress/remove-skill-access-mode/design-review-report.md`
- Review round and trigger: Round 3; revised package from `/solution_designer` (2026-09-30)
- Triggering role, report path, and finding IDs: `/implementation_engineer`, `implementation-design-impact-DI-001.md`, `DI-001` (design finding AF-015)
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Pass` (`ARCH-REV-002`, SR-004 only)
- Current authoritative decision: `Pass`
- What changed: the design adds `legacy/released-team-run-config.ts` (frozen copy of the aggregate, clone functions and constructor checks) and repoints the V1 planner and builder to it. Verified in source that the released `20260814` migration uses the current `TeamRunConfig` as a value and would otherwise reject every predecessor team run. Rounds 1 and 2 had checked type and enum imports only; round 3 scanned all value imports of current runtime code under `app-data-migrations/` and found no further dependency on the removed field.

#### Prior Finding Resolution

None open. AR-001 and AR-002 remain resolved; the SR-005 text keeps both resolutions (frozen validators unchanged, released types standalone).

- New or remaining finding IDs: None
- Material classification changes: None (Large / High)
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: allowed-import wording for `TeamBackendKind` / `RuntimeKind` in the frozen copy (non-blocking note in the report); the pre-existing `schemaVersion` observation on `20260901` stays a separate-ticket candidate.
