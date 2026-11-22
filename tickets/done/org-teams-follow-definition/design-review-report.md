# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (Approved, unchanged)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md`
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (SR-001..SR-018)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-018, commit `f076e0e0a7`; § SR-016, § SR-017 and § SR-018 Revisions)
- Supplemental Task Artifacts Reviewed: `org-container-storage-contract.md` (§10 UC-004 row), `contract-validation.md`, `release-deployment-report.md` (DR-001)
- Relevant Solution Revision IDs: SR-016, SR-017, SR-018
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-013`
- Current Review Round: `13`
- Trigger: SR-018 after ARCH-REV-012 Fail (AR-012)
- Prior Review Round Reviewed: 12 (`ARCH-REV-012`, Fail)
- Latest Authoritative Round: 13
- Current-State Evidence Basis: the ticket's implemented migration at HEAD. Read:
  - `app-data-migrations/migrations/agent-org-units-own-runs-v1/org-conversion.ts:50-100`: plan the split from the released log; renames; unit files; `writeUnitLogs`, then `removeOrgLog`; the container file written last;
  - `org-log-split.ts:95-127`: each unit log is written whole and deterministically with `writeFileAtomic`, replacing an interrupted attempt's output;
  - `org-unit-targets.ts:137-138`: temporary sibling, then a rename.
  
  ARCH-REV-011/012 evidence on `f2c0d2a902` still holds.

## Routing Classification Review

- Task size `Large`; architectural risk `High`. Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The requirements are unchanged.
- SR-018 gates the node-wide path rewrite. It is completion-gated by the container file, the single marker, written last per Org:
  - every attempt classifies (tree v1 = pending, container = done) and runs steps 2–5 for pending Orgs, where per-unit recognition skips only the rename and the unit file;
  - it then runs **one** node pass with the union of all pending Orgs' prefix maps. The maps are derived from tree v1 and include every committed rename (target present, source gone), and they also cover step 4's unit logs;
  - step 6 writes the container file only after that Org's part of the pass succeeded.
  
  A crash anywhere before step 6 leaves tree v1, and the next attempt repeats steps 2–5 and the whole pass (pre-check, idempotent).
- The writers of files the pass touches join R-4 (c), with the `waiting_for_<id>` wait and a parameterized follow-up that re-runs the pass with maps from container files. The registry test enforces the list.
- The implemented split is compatible. Unit logs are written whole and deterministically (`org-log-split.ts:113-120`), so a repeated step 4 writes the same bytes and the following pass re-maps them. When the Org log was already removed in an earlier attempt, the retry skips the split (`hadLog` false) and keeps the unit logs that attempt wrote, and the pass still visits them.

| Behavior ID | Status | Notes |
| --- | --- | --- |
| BEH-001..BEH-005, REQ-006, REQ-009, DEC-006, DEC-007 | Confirmed | As ARCH-REV-010/011 (SR-016 runtime mapping) |
| BEH-006 conversion including 587 received-file references (REQ-007, AC-006) | Confirmed | SR-017 rewrite plus SR-018 gating |

## Supplemental Artifact Coherence Verdict

| Artifact | Verdict | Notes |
| --- | --- | --- |
| `org-container-storage-contract.md` | Pass | §10 UC-004 row states the marker and the re-run rule |
| `contract-validation.md` | Pass | SR-017 note stands (values, not shapes) |

## Structural Verdicts

All structural sections of ARCH-REV-010..012 stand. The row ARCH-REV-012 failed now passes:

| Section | Row | Verdict | Notes |
| --- | --- | --- | --- |
| Persisted-Data Transition | Interruption and completion gating of the node-wide rewrite | Pass | Container file as the single marker, written last. The pass re-runs every attempt with maps covering every committed rename. Tests: interrupt before and after the pass, a third start changes nothing, a late writer predecessor |
| Persisted-Data Transition | Predecessors of the newly touched files | Pass | R-4 (c) extended with `waiting_for_<id>` and follow-ups from container-file maps |

## Material Premise Validation

- `MP-12`: resolved by SR-018's gating.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. AR-011 and AR-012 are resolved, and AR-001..AR-010 stay resolved.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation, per the handoff rules: the SR-016 re-integration with `origin/personal` `f2c0d2a902` or newer, plus SR-017 and SR-018.

## Residual Risks

Notes for implementation:

- **Doc comment:** `org-log-split.ts` `removeOrgLog` says it runs once "the container file is in place", but `org-conversion.ts` calls it before the container file is written. The order is harmless under SR-018. Align the comment with the code.
- **Step order:** the node pass runs between steps 2–5 and step 6 for every pending Org in each attempt, so it must come after `writeUnitLogs`. Do not place it inside the per-unit rename loop.
- **Cost:** measure one node pass on the synthetic large Org plus a node with the user's layout sizes as synthetic data, never a copy.
- Earlier notes (ARCH-REV-005/007/009/010) still apply.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes:
  - SR-016's runtime mapping holds: units are ordinary runs, and the container hosts no agent and answers `remoteNodeOf: null`.
  - SR-017's typed rewrite of released received-file paths holds: exact prefix map, frozen visitor, readers unchanged.
  - SR-018 gates the rewrite with the container file as the single completion marker.
  - Classification is Large / High.
