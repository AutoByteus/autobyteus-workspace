# Proposed-Design-Based Runtime Call Stack Review

## Review Meta

- Scope Classification: `Small`
- Current Round: `2`
- Minimum Required Rounds: `1`
- Review Mode: Round 2 gate validation after round-1 write-backs.

## Review Basis

- Runtime Call Stack Document: `tickets/workspace-tree-avatar-hardening/proposed-design-based-runtime-call-stack.md`
- Source Design Basis: `tickets/workspace-tree-avatar-hardening/implementation-plan.md`
- Artifact Versions In This Round:
  - Design Version: `v2`
  - Call Stack Version: `v2`
- Required Write-Backs Completed For This Round: `Yes`

## Round History

| Round | Design Version | Call Stack Version | Focus | Result (`Pass`/`Fail`) | Implementation Gate (`Go`/`No-Go`) |
| --- | --- | --- | --- | --- | --- |
| 1 | v1 | v1 | SoC boundary and fallback behavior validation | Fail | No-Go |
| 2 | v2 | v2 | Re-validation after write-backs | Pass | Go |

## Round Write-Back Log (Mandatory)

| Round | Findings Requiring Updates (`Yes`/`No`) | Updated Files | Version Changes | Changed Sections | Resolved Finding IDs |
| --- | --- | --- | --- | --- | --- |
| 1 | Yes | `tickets/workspace-tree-avatar-hardening/implementation-plan.md`, `tickets/workspace-tree-avatar-hardening/proposed-design-based-runtime-call-stack.md` | plan v1 -> v2, call-stack v1 -> v2 | solution sketch, sequencing, UC-001..003 runtime stacks | N/A (validated in round 2) |
| 2 | No | N/A | v2 -> v2 | N/A | F-001, F-002 |

## Per-Use-Case Review

| Use Case | Terminology & Concept Naturalness (`Pass`/`Fail`) | File/API Naming Intuitiveness (`Pass`/`Fail`) | Future-State Alignment With Proposed Design (`Pass`/`Fail`) | Use-Case Coverage Completeness (`Pass`/`Fail`) | Business Flow Completeness (`Pass`/`Fail`) | Gap Findings | Structure & SoC Check (`Pass`/`Fail`) | Dependency Flow Smells | Remove/Decommission Completeness (`Pass`/`Fail`/`N/A`) | No Legacy/Backward-Compat Branches (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-002 | Pass | Pass | Pass | Pass | Pass | None | Pass | Low | N/A | Pass | Pass |
| UC-003 | Pass | Pass | Pass | Pass | Pass | Residual non-blocking risk: cross-node id collision for avatar cache key | Pass | Medium | N/A | Pass | Pass |

## Findings

- [F-001] Use case: UC-001/UC-003 | Type: Structure | Severity: Blocker | Evidence: Avatar composition in `runHistoryStore.getTreeNodes` relied on component-side preload. | Required update: move avatar-index hydration ownership into run-history store lifecycle. | Status: Resolved in v2.
- [F-002] Use case: UC-002 | Type: Gap | Severity: Blocker | Evidence: Avatar load failure remained sticky with no retry path. | Required update: add refresh-cycle reset and URL-keyed error tracking. | Status: Resolved in v2.

## Blocking Findings Summary

- Unresolved Blocking Findings: `No`
- Remove/Decommission Checks Complete For Scoped `Remove`/`Rename/Move`: `N/A`

## Gate Decision

- Minimum rounds satisfied for this scope: `Yes`
- Implementation can start: `Yes`
- Gate rule checks:
  - Terminology and concept vocabulary is natural/intuitive across in-scope use cases: Yes
  - File/API naming is clear and implementation-friendly across in-scope use cases: Yes
  - Future-state alignment with proposed design is `Pass` for all in-scope use cases: Yes
  - Use-case coverage completeness is `Pass` for all in-scope use cases: Yes
  - All use-case verdicts are `Pass`: Yes
  - No unresolved blocking findings: Yes
  - Required write-backs completed for the latest round: Yes
  - Remove/decommission checks complete for scoped `Remove`/`Rename/Move` changes: N/A
  - Minimum rounds satisfied: Yes
